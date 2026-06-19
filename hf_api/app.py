import os
import json
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from botocore.config import Config

app = FastAPI(title="Text2Chat HF Realtime API", version="1.0.0")

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User Profile Model
class UserProfile(BaseModel):
    name: str
    username: str
    bio: str
    email: str
    status: str
    avatar: str
    google_id: str = ""

# Cloudflare R2 Setup
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")

r2_client = None

if CLOUDFLARE_ACCOUNT_ID and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    endpoint_url = f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
    try:
        r2_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4")
        )
        print("Cloudflare R2 client initialized successfully!")
    except Exception as e:
        print(f"Failed to initialize Cloudflare R2 client: {e}")
else:
    print("Cloudflare R2 credentials not fully configured in environment. Fallback to local files.")

# Fallback Local Directory for storage
LOCAL_DIR = "./data/profiles"
os.makedirs(LOCAL_DIR, exist_ok=True)

# Helper to save profile to Cloudflare R2 / Local
def save_profile(username: str, profile_data: dict):
    filename = f"profiles/{username}.json"
    if r2_client and R2_BUCKET_NAME:
        try:
            r2_client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=filename,
                Body=json.dumps(profile_data),
                ContentType="application/json"
            )
            print(f"Profile for @{username} saved to Cloudflare R2.")
            return True
        except Exception as e:
            print(f"Error saving @{username} to Cloudflare R2: {e}. Trying local fallback.")
    
    # Save locally as fallback
    local_path = os.path.join(LOCAL_DIR, f"{username}.json")
    try:
        with open(local_path, "w", encoding="utf-8") as f:
            json.dump(profile_data, f, ensure_ascii=False, indent=2)
        print(f"Profile for @{username} saved locally.")
        return True
    except Exception as err:
        print(f"Failed to save profile locally: {err}")
        return False

# Helper to get profile
def get_profile(username: str):
    filename = f"profiles/{username}.json"
    if r2_client and R2_BUCKET_NAME:
        try:
            response = r2_client.get_object(
                Bucket=R2_BUCKET_NAME,
                Key=filename
            )
            return json.loads(response["Body"].read().decode("utf-8"))
        except Exception as e:
            print(f"Error reading @{username} from Cloudflare R2: {e}. Trying local fallback.")
    
    # Check local fallback
    local_path = os.path.join(LOCAL_DIR, f"{username}.json")
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as err:
            print(f"Failed to read local profile: {err}")
    return None

# Active WebSocket connections: username -> WebSocket connection
active_connections: Dict[str, WebSocket] = {}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Text2Chat Realtime Server",
        "cloudflare_r2_active": r2_client is not None,
        "active_users": list(active_connections.keys())
    }

@app.post("/api/profile")
def api_save_profile(profile: UserProfile):
    username = profile.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    
    success = save_profile(username, profile.dict())
    if success:
        return {"status": "success", "message": f"Profile for @{username} synced."}
    else:
        raise HTTPException(status_code=500, detail="Failed to save profile to database")

@app.get("/api/profile/{username}")
def api_get_profile(username: str):
    username = username.strip().lower()
    profile = get_profile(username)
    if profile:
        return profile
    else:
        raise HTTPException(status_code=404, detail="Profile not found")

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.strip().lower()
    await websocket.accept()
    
    # Register connection
    active_connections[username] = websocket
    print(f"User connected: @{username}")
    
    try:
        # Keep receiving and routing messages
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)
            
            # Expected JSON format:
            # {
            #     "type": "message",
            #     "sender": "userA",
            #     "recipient": "userB",
            #     "text": "Hello world",
            #     "senderAvatar": "...",
            #     "senderEmail": "...",
            #     "timestamp": 123456789
            # }
            msg_type = data.get("type")
            if msg_type == "message":
                recipient = data.get("recipient", "").strip().lower()
                sender = data.get("sender", "").strip().lower()
                text = data.get("text", "")
                
                # Check if recipient is online
                if recipient in active_connections:
                    recipient_ws = active_connections[recipient]
                    await recipient_ws.send_text(json.dumps({
                        "type": "message",
                        "sender": sender,
                        "recipient": recipient,
                        "text": text,
                        "senderAvatar": data.get("senderAvatar", ""),
                        "senderEmail": data.get("senderEmail", ""),
                        "timestamp": data.get("timestamp")
                    }))
                    
                    # Notify sender of successful delivery
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "status": "delivered",
                        "recipient": recipient,
                        "text": f"Delivered to @{recipient}."
                    }))
                else:
                    # Recipient is offline. Let the sender know.
                    # Since we don't save messages on server, they are stored offline locally.
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "status": "offline",
                        "recipient": recipient,
                        "text": f"@{recipient} is offline. Message will be delivered when they connect."
                    }))
                    
    except WebSocketDisconnect:
        # Deregister connection on disconnect
        if username in active_connections:
            del active_connections[username]
        print(f"User disconnected: @{username}")
    except Exception as e:
        print(f"Error in WebSocket session for @{username}: {e}")
        if username in active_connections:
            del active_connections[username]
