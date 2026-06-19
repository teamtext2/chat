// IndexedDB Storage Manager for Text2Chat
let db;

function dbInit() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Text2ChatDB", 1);
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            // Messages store: key is id. Index on chatPartner for fast listing.
            if (!database.objectStoreNames.contains("messages")) {
                const msgStore = database.createObjectStore("messages", { keyPath: "id" });
                msgStore.createIndex("chatPartner", "chatPartner", { unique: false });
                msgStore.createIndex("timestamp", "timestamp", { unique: false });
            }
            // Contacts store: key is username (lowercase)
            if (!database.objectStoreNames.contains("contacts")) {
                database.createObjectStore("contacts", { keyPath: "username" });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = (e) => {
            console.error("IndexedDB load error:", e.target.error);
            reject(e.target.error);
        };
    });
}

// Database helper functions
function dbSaveMessage(msg) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readwrite");
        const store = tx.objectStore("messages");
        store.put(msg);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function dbGetMessages(chatPartner) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readonly");
        const store = tx.objectStore("messages");
        const index = store.index("chatPartner");
        const request = index.getAll(chatPartner);
        request.onsuccess = () => {
            // Return sorted by timestamp
            const sorted = request.result.sort((a, b) => a.timestamp - b.timestamp);
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
}

function dbClearMessages() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readwrite");
        const store = tx.objectStore("messages");
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function dbSaveContact(contact) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("contacts", "readwrite");
        const store = tx.objectStore("contacts");
        store.put(contact);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function dbGetContacts() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("contacts", "readonly");
        const store = tx.objectStore("contacts");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGetContact(username) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("contacts", "readonly");
        const store = tx.objectStore("contacts");
        const request = store.get(username.toLowerCase());
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Database Seeder
async function seedDatabaseIfEmpty() {
    const contacts = await dbGetContacts();
    if (contacts.length === 0) {
        const initialContacts = [
            {
                username: "hoanhatanh",
                name: "HOA NHAT ANH",
                avatar: "https://text2.co/post/hoanhatanh/apple-touch-icon.png",
                status: "online",
                phone: "+84 912 345 678",
                email: "hoanhatanh@text2.co",
                bio: "Learning every day, coding non-stop. 🚀",
                muted: false,
                blocked: false
            },
            {
                username: "facebook",
                name: "facebook",
                avatar: "https://facebook.com/favicon.ico",
                status: "away",
                phone: "Hidden",
                email: "support@facebook.com",
                bio: "Connecting people all around the world.",
                muted: false,
                blocked: false
            },
            {
                username: "text2",
                name: "Text2",
                avatar: "https://text2.co/favicon.ico",
                status: "online",
                phone: "1800-TEXT2",
                email: "hello@text2.co",
                bio: "Official Text2 Chat account. We are here to support.",
                muted: false,
                blocked: false
            }
        ];

        for (const contact of initialContacts) {
            await dbSaveContact(contact);
        }

        const now = Date.now();
        const initialMessages = [
            { id: "m1", chatPartner: "hoanhatanh", type: "incoming", text: "Hello! How are you doing today?", timestamp: now - 3600000 * 3 },
            { id: "m2", chatPartner: "hoanhatanh", type: "outgoing", text: "I'm good, working on a super smooth web app.", timestamp: now - 3600000 * 2 },
            { id: "m3", chatPartner: "hoanhatanh", type: "incoming", text: "Oh really? Let me see!", timestamp: now - 3600000 * 1 },
            { id: "m4", chatPartner: "hoanhatanh", type: "outgoing", text: "Here, check it out, it's as smooth as a native app!", timestamp: now },

            { id: "m5", chatPartner: "facebook", type: "incoming", text: "Welcome to Facebook!", timestamp: now - 3600000 * 4 },
            { id: "m6", chatPartner: "facebook", type: "outgoing", text: "Hello Facebook.", timestamp: now - 3600000 * 3 },
            { id: "m7", chatPartner: "facebook", type: "incoming", text: "Would you like to connect with more friends?", timestamp: now - 3600000 * 2 },
            { id: "m8", chatPartner: "facebook", type: "outgoing", text: "Maybe later.", timestamp: now - 3600000 * 1 },

            { id: "m9", chatPartner: "text2", type: "incoming", text: "Welcome to Text2Chat!", timestamp: now - 3600000 * 5 },
            { id: "m10", chatPartner: "text2", type: "outgoing", text: "This app is really fast.", timestamp: now - 3600000 * 4 },
            { id: "m11", chatPartner: "text2", type: "incoming", text: "Thank you! We always optimize for maximum performance.", timestamp: now - 3600000 * 3 },
            { id: "m12", chatPartner: "text2", type: "outgoing", text: "Awesome!", timestamp: now - 3600000 * 2 }
        ];

        for (const msg of initialMessages) {
            await dbSaveMessage(msg);
        }
    }
}

// Current User Profile State
let userProfile = JSON.parse(localStorage.getItem('user-profile')) || null;
let activeChatUser = null; // { username, avatar, displayName }
let socket = null;
let reconnectTimer = null;

// Initialize Settings
function initSettings() {
    const savedTheme = localStorage.getItem('chat-theme') || 'dark';
    applyTheme(savedTheme);

    const savedWallpaper = localStorage.getItem('chat-wallpaper') || 'default';
    applyWallpaper(savedWallpaper);

    // Apply notification and read receipts switch states
    const notifSound = localStorage.getItem('setting-notif-sound') !== 'false';
    const readReceipts = localStorage.getItem('setting-read-receipts') !== 'false';
    document.getElementById('setting-notif-sound').checked = notifSound;
    document.getElementById('setting-read-receipts').checked = readReceipts;

    // Apply Hugging Face Space URL setting label
    const hfUrl = localStorage.getItem('hf-space-url') || 'http://localhost:7860';
    document.getElementById('current-hf-url-label').innerText = hfUrl;
}

// Theme functions
function applyTheme(theme) {
    const container = document.querySelector('.app-container');
    container.classList.remove('theme-light', 'theme-neon');
    if (theme !== 'dark') {
        container.classList.add(`theme-${theme}`);
    }

    const themeLabels = {
        dark: 'Dark',
        light: 'Light',
        neon: 'Neon Glass'
    };
    document.getElementById('current-theme-label').innerText = themeLabels[theme] || 'Dark';

    document.querySelectorAll('.theme-dot').forEach(dot => {
        if (dot.dataset.theme === theme) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    localStorage.setItem('chat-theme', theme);
}

// Wallpaper functions
const wallpapers = ['default', 'neon', 'classic', 'emerald'];
const wallpaperLabels = {
    default: 'Default',
    neon: 'Neon Blur',
    classic: 'Classic Black',
    emerald: 'Emerald Green'
};

function applyWallpaper(wp) {
    const container = document.querySelector('.app-container');
    wallpapers.forEach(w => container.classList.remove(`wp-${w}`));
    if (wp !== 'default') {
        container.classList.add(`wp-${wp}`);
    }
    document.getElementById('current-wallpaper-label').innerText = wallpaperLabels[wp] || 'Default';
    localStorage.setItem('chat-wallpaper', wp);
}

// WebSocket Connection Management
function connectWebSocket() {
    if (!userProfile || !userProfile.username) return;
    
    // Clear any active reconnect timer
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    const hfUrl = localStorage.getItem('hf-space-url') || 'http://localhost:7860';
    // Convert HTTP/HTTPS URL to WS/WSS URL
    let wsUrl = hfUrl.replace(/^http/, 'ws');
    if (!wsUrl.endsWith('/')) {
        wsUrl += '/';
    }
    wsUrl += `ws/${userProfile.username}`;

    console.log("Connecting WebSocket to:", wsUrl);
    
    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connected successfully.");
            showToast("Connected to server");
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'message') {
                    // Assemble Message
                    const msg = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        chatPartner: data.sender,
                        type: 'incoming',
                        text: data.text,
                        timestamp: data.timestamp || Date.now(),
                        sender: data.sender,
                        recipient: data.recipient
                    };

                    // Save message to IndexedDB
                    await dbSaveMessage(msg);

                    // Add sender to contacts if they don't exist
                    let contact = await dbGetContact(data.sender);
                    if (!contact) {
                        contact = {
                            username: data.sender,
                            name: data.sender.toUpperCase(),
                            avatar: data.senderAvatar || 'https://text2.co/favicon.ico',
                            status: 'online',
                            phone: 'Unknown',
                            email: data.senderEmail || `${data.sender}@gmail.com`,
                            bio: 'Hey there! I am using Text2Chat.',
                            muted: false,
                            blocked: false
                        };
                        await dbSaveContact(contact);
                        await loadChatListFromDB();
                    }

                    // Append to active chat if chat view is open with sender
                    if (activeChatUser && activeChatUser.username === data.sender) {
                        appendMessageBubble(msg);
                        if (localStorage.getItem('setting-notif-sound') !== 'false') {
                            playPopSound();
                        }
                    } else {
                        // Just update last message text in list
                        updateChatListItemLastMsg(data.sender, data.text);
                        if (localStorage.getItem('setting-notif-sound') !== 'false') {
                            playPopSound();
                        }
                        showToast(`New message from @${data.sender}`);
                    }
                } else if (data.type === 'status') {
                    console.log("Status update from server:", data.text);
                }
            } catch (e) {
                console.error("Error parsing websocket message data:", e);
            }
        };

        socket.onclose = (event) => {
            console.warn("WebSocket closed. Attempting reconnect in 5s...", event.reason);
            socket = null;
            reconnectTimer = setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (error) => {
            console.error("WebSocket encountered an error:", error);
            if (socket) socket.close();
        };

    } catch (e) {
        console.error("Failed to connect WebSocket:", e);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
    }
}

function disconnectWebSocket() {
    if (socket) {
        socket.onclose = null; // Unbind events to prevent loops
        socket.onerror = null;
        socket.close();
        socket = null;
        console.log("WebSocket connection closed intentionally.");
    }
}

// Send profile updates to HF space (backed by Cloudflare R2)
async function syncProfileWithCloud(profile) {
    const hfUrl = localStorage.getItem('hf-space-url') || 'http://localhost:7860';
    try {
        const response = await fetch(`${hfUrl}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profile)
        });
        
        if (response.ok) {
            console.log("Profile successfully backed up on Cloudflare R2 bucket.");
        } else {
            console.warn("Failed to sync profile. Server responded with:", await response.text());
        }
    } catch (e) {
        console.warn("Could not sync profile to cloud. Offline mode activated.", e);
    }
}

// Load Chat conversations list from IndexedDB
async function loadChatListFromDB() {
    const listContainer = document.querySelector('.chat-list');
    listContainer.innerHTML = ''; // Clear items

    const contacts = await dbGetContacts();
    
    // Sort contacts: we can sort them alphabetically or based on last message timestamp
    // For now, let's render them
    for (const contact of contacts) {
        const msgs = await dbGetMessages(contact.username);
        const lastMsgText = msgs.length > 0 ? msgs[msgs.length - 1].text : "No messages yet";
        
        const item = document.createElement('div');
        item.className = 'chat-item';
        if (contact.status === 'online') {
            item.classList.add('has-status-border');
        }
        item.setAttribute('data-username', contact.username);
        
        item.innerHTML = `
            <div class="avatar-wrapper">
                <img class="chat-avatar" src="${contact.avatar}" alt="${contact.name}">
            </div>
            <div class="chat-info">
                <h2 class="chat-name">${contact.name}</h2>
                <span class="chat-last-msg">${lastMsgText}</span>
            </div>
        `;
        
        item.addEventListener('click', () => {
            openChat(contact.username, contact.avatar);
        });
        
        listContainer.appendChild(item);
    }
}

// Open chat window
async function openChat(username, avatar) {
    const contact = await dbGetContact(username);
    const displayName = contact ? contact.name : username;
    
    activeChatUser = { username, avatar, displayName };
    document.getElementById('chat-view-avatar').src = avatar;
    document.getElementById('chat-view-title').innerText = displayName;

    await loadChatMessages(username);
    window.location.hash = '#chat';
}

// Close chat window
function closeChat() {
    activeChatUser = null;
    document.getElementById('chat-message-input').value = '';
    document.getElementById('plus-icon').style.display = 'block';
    document.getElementById('send-icon').style.display = 'none';
}

// Load chat messages from IndexedDB dynamically
async function loadChatMessages(username) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = ''; // Clear

    const messages = await dbGetMessages(username);

    messages.forEach((msg, index) => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble-placeholder bubble-${msg.type === 'incoming' ? 'left' : 'right'}`;
        bubble.innerText = msg.text;
        bubble.style.animationDelay = `${index * 0.03}s`;
        container.appendChild(bubble);
    });

    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

// Append a single message bubble to UI
function appendMessageBubble(msg) {
    const container = document.getElementById('chat-messages-container');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble-placeholder bubble-${msg.type === 'incoming' ? 'left' : 'right'}`;
    bubble.innerText = msg.text;
    container.appendChild(bubble);
    
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

// Update chat list item last message text
function updateChatListItemLastMsg(username, text) {
    const item = document.querySelector(`.chat-item[data-username="${username}"]`);
    if (item) {
        item.querySelector('.chat-last-msg').innerText = text;
    }
}

// Send Message
async function sendUserMessage() {
    const messageInput = document.getElementById('chat-message-input');
    const text = messageInput.value.trim();
    if (!text || !activeChatUser) return;

    const recipientUsername = activeChatUser.username;
    
    // Assemble Message Object
    const msg = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        chatPartner: recipientUsername,
        type: 'outgoing',
        text: text,
        timestamp: Date.now(),
        sender: userProfile.username,
        recipient: recipientUsername
    };

    // Save to local IndexedDB
    await dbSaveMessage(msg);
    
    // Render in UI
    appendMessageBubble(msg);
    updateChatListItemLastMsg(recipientUsername, text);

    // Clear input box
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('plus-icon').style.display = 'block';
    document.getElementById('send-icon').style.display = 'none';

    // Play tick sound
    if (localStorage.getItem('setting-notif-sound') !== 'false') {
        playTickSound();
    }

    // Send through WebSocket to Hugging Face space
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'message',
            sender: userProfile.username,
            recipient: recipientUsername,
            text: text,
            senderAvatar: userProfile.avatar,
            senderEmail: userProfile.email,
            timestamp: msg.timestamp
        }));
    } else {
        showToast("Server offline. Message saved locally.");
    }

    // Interactive Bot reply simulator for built-in accounts (facebook, text2)
    if (recipientUsername === 'facebook' || recipientUsername === 'text2') {
        setTimeout(async () => {
            if (activeChatUser && activeChatUser.username === recipientUsername) {
                const replies = [
                    "A bit busy, will reply you later! 🚀",
                    "Alright 👍",
                    "Message received! 💬",
                    "Truly smooth, right? 😂",
                    "Wow, this realtime chat is amazing."
                ];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];

                const replyMsg = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    chatPartner: recipientUsername,
                    type: 'incoming',
                    text: randomReply,
                    timestamp: Date.now(),
                    sender: recipientUsername,
                    recipient: userProfile.username
                };

                await dbSaveMessage(replyMsg);
                appendMessageBubble(replyMsg);
                updateChatListItemLastMsg(recipientUsername, randomReply);

                if (localStorage.getItem('setting-notif-sound') !== 'false') {
                    playPopSound();
                }
            }
        }, 1000 + Math.random() * 800);
    }
}

// Audio mock functions
function playTickSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch(e) {}
}

function playPopSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch(e) {}
}

// Synchronize UI profile displays
function updateProfileUI() {
    if (!userProfile) return;
    
    // Top Profile Pill
    document.getElementById('main-avatar-img').src = userProfile.avatar;

    // Settings Profile Card
    document.getElementById('settings-avatar-img').src = userProfile.avatar;
    document.getElementById('user-display-name').innerText = userProfile.name;
    document.getElementById('user-display-username').innerText = '@' + userProfile.username;

    // Profile View Form
    document.getElementById('profile-edit-avatar').src = userProfile.avatar;
    document.getElementById('profile-name-input').value = userProfile.name;
    document.getElementById('profile-username-input').value = userProfile.username;
    document.getElementById('profile-bio-input').value = userProfile.bio;
    document.getElementById('profile-email-input').value = userProfile.email;
    document.getElementById('profile-status-select').value = userProfile.status;

    // Profile status indicator
    const statusColors = {
        online: '#10b981',
        away: '#f59e0b',
        dnd: '#ef4444',
        offline: '#6b7280'
    };
    document.getElementById('profile-status-indicator').style.backgroundColor = statusColors[userProfile.status] || '#10b981';
}

// Show personal profile editor view
function showPersonalProfileView() {
    document.getElementById('profile-view-title').innerText = "Profile";
    document.getElementById('avatar-edit-badge-label').style.display = 'flex';
    document.getElementById('profile-form').style.display = 'flex';
    document.getElementById('contact-details-actions').style.display = 'none';
    updateProfileUI();
}

// Show contact detail card
async function showContactProfileView(contactUsername) {
    const contact = await dbGetContact(contactUsername);
    if (!contact) return false;

    document.getElementById('profile-view-title').innerText = contact.name;
    document.getElementById('avatar-edit-badge-label').style.display = 'none';
    document.getElementById('profile-form').style.display = 'none';

    const detailsActions = document.getElementById('contact-details-actions');
    detailsActions.style.display = 'flex';

    // Set avatar
    document.getElementById('profile-edit-avatar').src = contact.avatar;

    const statusColors = {
        online: '#10b981',
        away: '#f59e0b',
        dnd: '#ef4444',
        offline: '#6b7280'
    };
    document.getElementById('profile-status-indicator').style.backgroundColor = statusColors[contact.status] || '#10b981';

    // Contact Details
    document.getElementById('contact-phone-val').innerText = contact.phone || "Unknown";
    document.getElementById('contact-email-val').innerText = contact.email || "Unknown";

    // Mute Notifications State
    const muteLabel = document.getElementById('contact-mute-label');
    const muteIconContainer = document.getElementById('contact-mute-icon-container');
    if (contact.muted) {
        muteLabel.innerText = "Unmute Notifications";
        muteIconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
                <path d="M18 8a6 6 0 0 0-9.33-5"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
        `;
        document.getElementById('contact-btn-mute').style.background = 'rgba(239, 68, 68, 0.15)';
    } else {
        muteLabel.innerText = "Mute Notifications";
        muteIconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
        `;
        document.getElementById('contact-btn-mute').style.background = '';
    }

    // Block Contact State
    const blockBtn = document.getElementById('contact-btn-block');
    if (contact.blocked) {
        blockBtn.innerText = "Unblock Contact";
        blockBtn.style.background = '#ff3b30';
        blockBtn.style.color = '#ffffff';
    } else {
        blockBtn.innerText = "Block Contact";
        blockBtn.style.background = 'transparent';
        blockBtn.style.color = '#ff3b30';
    }

    return true;
}

// Single Page Application Router
async function handleRouting() {
    const hash = window.location.hash;
    const container = document.querySelector('.app-container');

    container.classList.remove('chat-active', 'settings-active', 'profile-active');
    document.getElementById('chat-view').classList.remove('active');
    document.getElementById('settings-view').classList.remove('active');
    document.getElementById('profile-view').classList.remove('active');

    if (hash === '#chat') {
        if (activeChatUser) {
            container.classList.add('chat-active');
            document.getElementById('chat-view').classList.add('active');
        } else {
            window.location.hash = '';
        }
    } else if (hash === '#settings') {
        container.classList.add('settings-active');
        document.getElementById('settings-view').classList.add('active');
    } else if (hash === '#profile') {
        showPersonalProfileView();
        container.classList.add('profile-active');
        document.getElementById('profile-view').classList.add('active');
    } else if (hash.startsWith('#contact-')) {
        const contactUsername = decodeURIComponent(hash.substring(9));
        const loaded = await showContactProfileView(contactUsername);
        if (loaded) {
            container.classList.add('profile-active');
            document.getElementById('profile-view').classList.add('active');
        } else {
            window.location.hash = '';
        }
    } else {
        closeChat();
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load database
    try {
        await dbInit();
        await seedDatabaseIfEmpty();
    } catch (e) {
        console.error("Could not load IndexedDB", e);
        showToast("Database error. Messages cannot be stored locally.");
    }

    // 2. Settings & UI
    initSettings();
    updateProfileUI();

    // 3. Load Chat List from IndexedDB
    await loadChatListFromDB();

    // 4. WebSocket setup
    connectWebSocket();

    // 5. Setup Router
    handleRouting();
    window.addEventListener('hashchange', handleRouting);

    // Click handler to open chat
    document.addEventListener('click', (e) => {
        const chatItem = e.target.closest('.chat-list .chat-item');
        if (chatItem) {
            const username = chatItem.getAttribute('data-username');
            const avatar = chatItem.querySelector('.chat-avatar').src;
            openChat(username, avatar);
        }
    });

    // Back buttons click handlers
    document.getElementById('btn-chat-back').addEventListener('click', () => {
        const input = document.getElementById('chat-message-input');
        if (input) input.blur();
        window.history.back();
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => {
        window.history.back();
    });
    document.getElementById('btn-profile-back').addEventListener('click', () => {
        window.history.back();
    });

    // View contact profile from Chat room
    document.getElementById('btn-chat-profile').addEventListener('click', () => {
        if (activeChatUser) {
            window.location.hash = '#contact-' + encodeURIComponent(activeChatUser.username);
        }
    });

    // Settings page triggers
    document.getElementById('btn-main-settings').addEventListener('click', () => {
        window.location.hash = '#settings';
    });
    document.getElementById('btn-main-profile').addEventListener('click', () => {
        window.location.hash = '#profile';
    });
    document.getElementById('settings-profile-trigger').addEventListener('click', () => {
        window.location.hash = '#profile';
    });

    // Search header toggle functionality
    const btnMainSearch = document.getElementById('btn-main-search');
    const searchContainer = document.getElementById('header-search-container');
    const searchInput = document.getElementById('main-search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');

    btnMainSearch.addEventListener('click', () => {
        const header = document.getElementById('main-header');
        if (!header.classList.contains('searching')) {
            header.classList.add('searching');
            searchInput.focus();
        } else {
            closeSearchInput();
        }
    });

    function closeSearchInput() {
        const header = document.getElementById('main-header');
        if (header) {
            header.classList.remove('searching');
        }
        searchInput.value = '';
        btnClearSearch.style.display = 'none';
        filterChatList('');
    }

    searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        btnClearSearch.style.display = val !== '' ? 'block' : 'none';
        filterChatList(val);
    });

    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        btnClearSearch.style.display = 'none';
        searchInput.focus();
        filterChatList('');
    });

    document.addEventListener('keydown', (e) => {
        const header = document.getElementById('main-header');
        if (e.key === 'Escape' && header && header.classList.contains('searching')) {
            closeSearchInput();
        }
    });

    document.addEventListener('click', (e) => {
        const header = document.getElementById('main-header');
        if (header && header.classList.contains('searching')) {
            if (!searchContainer.contains(e.target) && !btnMainSearch.contains(e.target)) {
                closeSearchInput();
            }
        }
    });

    // Custom filtering allowing adding new contacts by username
    async function filterChatList(query) {
        const normalized = query.toLowerCase().trim();
        const listContainer = document.querySelector('.chat-list');
        
        // Remove helper item
        const existingHelper = document.getElementById('start-chat-helper');
        if (existingHelper) existingHelper.remove();

        let visibleCount = 0;
        document.querySelectorAll('.chat-list .chat-item').forEach(item => {
            const name = item.querySelector('.chat-name').innerText.toLowerCase();
            const username = item.getAttribute('data-username') || '';
            if (name.includes(normalized) || username.toLowerCase().includes(normalized)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Add start new chat helper if no exact matches exist
        if (normalized !== '') {
            const cleanQuery = normalized.replace(/^@/, '');
            let exactMatch = false;
            
            document.querySelectorAll('.chat-list .chat-item').forEach(item => {
                const username = (item.getAttribute('data-username') || '').toLowerCase();
                if (username === cleanQuery) {
                    exactMatch = true;
                }
            });

            if (!exactMatch) {
                const helper = document.createElement('div');
                helper.id = 'start-chat-helper';
                helper.className = 'chat-item helper-item';
                helper.style.border = '1px dashed rgba(16, 185, 129, 0.4)';
                helper.style.background = 'rgba(16, 185, 129, 0.05)';
                helper.innerHTML = `
                    <div class="avatar-wrapper">
                        <div class="chat-avatar" style="display: flex; justify-content: center; align-items: center; background: #10b981; font-weight: bold; font-size: 20px;">+</div>
                    </div>
                    <div class="chat-info">
                        <h2 class="chat-name">Start chat with @${cleanQuery}</h2>
                        <span class="chat-last-msg">Click to send a real-time message</span>
                    </div>
                `;
                
                helper.addEventListener('click', async () => {
                    // Create new contact in local DB
                    const newContact = {
                        username: cleanQuery,
                        name: cleanQuery.toUpperCase(),
                        avatar: 'https://text2.co/favicon.ico',
                        status: 'offline',
                        phone: 'Unknown',
                        email: `${cleanQuery}@gmail.com`,
                        bio: 'New contact added.',
                        muted: false,
                        blocked: false
                    };
                    await dbSaveContact(newContact);
                    await loadChatListFromDB();
                    closeSearchInput();
                    openChat(newContact.username, newContact.avatar);
                });
                
                listContainer.appendChild(helper);
            }
        }
    }

    // Message input interactions
    const messageInput = document.getElementById('chat-message-input');
    const btnChatSend = document.getElementById('btn-chat-send');
    const plusIcon = document.getElementById('plus-icon');
    const sendIcon = document.getElementById('send-icon');

    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim() !== '') {
            plusIcon.style.display = 'none';
            sendIcon.style.display = 'block';
        } else {
            plusIcon.style.display = 'block';
            sendIcon.style.display = 'none';
        }
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage();
        }
    });

    btnChatSend.addEventListener('mousedown', (e) => e.preventDefault());
    btnChatSend.addEventListener('touchstart', (e) => e.preventDefault());
    btnChatSend.addEventListener('click', () => {
        if (messageInput.value.trim() !== '') {
            sendUserMessage();
            messageInput.focus();
        }
    });

    // Theme selector dots
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.dataset.theme;
            applyTheme(theme);
        });
    });

    // Wallpaper Cycle events
    document.getElementById('setting-wallpaper-trigger').addEventListener('click', () => {
        const savedWallpaper = localStorage.getItem('chat-wallpaper') || 'default';
        const currentIndex = wallpapers.indexOf(savedWallpaper);
        const nextIndex = (currentIndex + 1) % wallpapers.length;
        const nextWallpaper = wallpapers[nextIndex];
        applyWallpaper(nextWallpaper);
        
        showToast(`Wallpaper: ${wallpaperLabels[nextWallpaper]}`);
    });

    // Hugging Face API URL change event
    document.getElementById('setting-hf-url-trigger').addEventListener('click', () => {
        const currentUrl = localStorage.getItem('hf-space-url') || 'http://localhost:7860';
        const newUrl = prompt("Enter Hugging Face Space URL:", currentUrl);
        if (newUrl !== null) {
            const cleanUrl = newUrl.trim();
            if (cleanUrl) {
                localStorage.setItem('hf-space-url', cleanUrl);
                document.getElementById('current-hf-url-label').innerText = cleanUrl;
                showToast("Server URL updated. Reconnecting WebSocket...");
                
                // Reconnect WebSocket
                disconnectWebSocket();
                connectWebSocket();
                
                // Sync profile immediately to the new server
                syncProfileWithCloud(userProfile);
            }
        }
    });

    // Switch toggles listener
    document.getElementById('setting-notif-sound').addEventListener('change', (e) => {
        localStorage.setItem('setting-notif-sound', e.target.checked);
        showToast(e.target.checked ? "Sounds enabled" : "Sounds disabled");
    });

    document.getElementById('setting-read-receipts').addEventListener('change', (e) => {
        localStorage.setItem('setting-read-receipts', e.target.checked);
        showToast(e.target.checked ? "Read receipts enabled" : "Read receipts disabled");
    });

    // Clear history handler
    document.getElementById('setting-clear-chats').addEventListener('click', async () => {
        if (confirm("Delete all messages on this device? This cannot be undone.")) {
            await dbClearMessages();
            if (activeChatUser) {
                await loadChatMessages(activeChatUser.username);
            }
            await loadChatListFromDB();
            showToast("Chat history cleared.");
        }
    });

    // Logout Handler
    document.getElementById('setting-logout').addEventListener('click', () => {
        if (confirm("Log out of this device?")) {
            showToast("Logging out...");
            disconnectWebSocket();
            setTimeout(() => {
                localStorage.removeItem('user-profile');
                window.location.reload();
            }, 1000);
        }
    });

    // User Profile Edit Avatar handler
    const fileInput = document.getElementById('avatar-file-input');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                document.getElementById('profile-edit-avatar').src = dataUrl;
                userProfile.avatar = dataUrl;
                showToast("Avatar loaded locally. Save changes to sync.");
            };
            reader.readAsDataURL(file);
        }
    });

    // User Profile Save button
    document.getElementById('btn-profile-save').addEventListener('click', async () => {
        const nameInput = document.getElementById('profile-name-input').value.trim();
        const usernameInput = document.getElementById('profile-username-input').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const bioInput = document.getElementById('profile-bio-input').value.trim();
        const statusVal = document.getElementById('profile-status-select').value;

        if (!nameInput || !usernameInput) {
            showToast("Please enter Display Name and Username");
            return;
        }

        const saveBtn = document.getElementById('btn-profile-save');
        saveBtn.classList.add('loading');
        saveBtn.innerText = "Saving...";

        const oldUsername = userProfile.username;
        const usernameChanged = (oldUsername !== usernameInput);

        // Update local object
        userProfile.name = nameInput;
        userProfile.username = usernameInput;
        userProfile.bio = bioInput;
        userProfile.status = statusVal;

        // Save local
        localStorage.setItem('user-profile', JSON.stringify(userProfile));

        // Sync with Hugging Face Space (Cloudflare R2 backup)
        await syncProfileWithCloud(userProfile);

        // Disconnect and reconnect WebSocket if username changed
        if (usernameChanged) {
            console.log("Username changed from", oldUsername, "to", usernameInput, ". Reconnecting websocket...");
            disconnectWebSocket();
            connectWebSocket();
        }

        updateProfileUI();

        setTimeout(() => {
            saveBtn.classList.remove('loading');
            saveBtn.innerText = "Save Changes";
            showToast("Profile updated successfully!");
            setTimeout(() => {
                window.history.back();
            }, 300);
        }, 800);
    });

    // Contact Action triggers (Mute, Block, mock calls)
    document.getElementById('contact-btn-message').addEventListener('click', () => {
        if (activeChatUser) {
            openChat(activeChatUser.username, activeChatUser.avatar);
        }
    });

    const callMock = (type) => {
        if (activeChatUser) {
            showToast(`Calling ${activeChatUser.displayName} (${type})...`);
        }
    };
    document.getElementById('contact-btn-call').addEventListener('click', () => callMock('voice'));
    document.getElementById('contact-btn-video').addEventListener('click', () => callMock('video'));

    document.getElementById('contact-btn-mute').addEventListener('click', async () => {
        if (activeChatUser) {
            const contact = await dbGetContact(activeChatUser.username);
            if (contact) {
                contact.muted = !contact.muted;
                await dbSaveContact(contact);
                await showContactProfileView(activeChatUser.username);
                showToast(contact.muted ? `Muted @${contact.username}` : `Unmuted @${contact.username}`);
            }
        }
    });

    document.getElementById('contact-btn-block').addEventListener('click', async () => {
        if (activeChatUser) {
            const contact = await dbGetContact(activeChatUser.username);
            if (contact) {
                contact.blocked = !contact.blocked;
                await dbSaveContact(contact);
                await showContactProfileView(activeChatUser.username);
                showToast(contact.blocked ? `Blocked @${contact.username}` : `Unblocked @${contact.username}`);
            }
        }
    });

    // Mobile soft keyboard helpers
    const chatInput = document.getElementById('chat-message-input');
    const appContainer = document.querySelector('.app-container');
    
    if (chatInput && appContainer) {
        chatInput.addEventListener('focus', () => {
            appContainer.classList.add('keyboard-open');
            const chatContent = document.getElementById('chat-messages-container');
            setTimeout(() => {
                if (chatContent) {
                    chatContent.scrollTop = chatContent.scrollHeight;
                }
            }, 300);
        });
        
        chatInput.addEventListener('blur', () => {
            appContainer.classList.remove('keyboard-open');
        });

        // Auto-growing textarea logic
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    // Viewport listener
    if (window.visualViewport && appContainer) {
        window.visualViewport.addEventListener('resize', () => {
            appContainer.style.height = `${window.visualViewport.height}px`;
            window.scrollTo(0, 0); 
            document.body.scrollTop = 0;
            
            const chatContent = document.getElementById('chat-messages-container');
            if (chatContent) {
                chatContent.scrollTop = chatContent.scrollHeight;
            }
        });
    }
});

// Toast Helper
function showToast(message) {
    const existing = document.querySelector('.toast-notif');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notif';
    toast.innerText = message;
    
    Object.assign(toast.style, {
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        background: 'rgba(0, 80, 57, 0.85)',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '24px',
        fontSize: '13px',
        fontWeight: '600',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        zIndex: '9999',
        opacity: '0',
        transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        textAlign: 'center',
        whiteSpace: 'nowrap'
    });

    document.querySelector('.app-container').appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    }, 50);

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}
