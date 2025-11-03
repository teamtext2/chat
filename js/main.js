// Hamburger menu for mobile
const hamburger = document.getElementById('hamburger-menu');
const navLinks = document.querySelector('.nav-links');
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('show');
});
document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
    }
});

document.getElementById("sendButton").addEventListener("click", sendMessage);
document.getElementById("userInput").addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
});

function addBotMessage(text) {
    const chatBox = document.getElementById("chat-box");
    const row = document.createElement("div");
    row.className = "message-row bot";
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = "media/img/logochatai.png";
    avatar.alt = "Bot";
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    
    // Hide content within <think></think> tags
    text = text.replace(/<think>(.*?)<\/think>/gs, '<span class="think-content">$1</span>');
    
    messageDiv.innerHTML = text;
    row.appendChild(avatar);
    row.appendChild(messageDiv);
    chatBox.appendChild(row);
    setTimeout(() => {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function addLoadingMessage() {
    const chatBox = document.getElementById("chat-box");
    const row = document.createElement("div");
    row.className = "message-row bot";
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = "media/img/logochatai.png";
    avatar.alt = "Bot";
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading-dots";
    loadingDiv.innerHTML = '<div></div><div></div><div></div>';
    
    messageDiv.appendChild(loadingDiv);
    row.appendChild(avatar);
    row.appendChild(messageDiv);
    chatBox.appendChild(row);
    
    setTimeout(() => {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
    
    return row;
}

function addUserMessage(text) {
    const chatBox = document.getElementById("chat-box");
    const row = document.createElement("div");
    row.className = "message-row user";
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh5LuD_XG7VyKFAB5_BRi5mzAMcWryXulgGkieIvpWHodNSJI0Kt1dwLEjhRWEfwbEjAIvXupv6ZzkQ5gg_5pRCPvlU-RfxqMh1jEBVHEzxLjn1f5MgL_QU9MVBU1ILcpvpCf9sckb7nwhd88ICWuUB1BFMubxYshCQKN7_gb7QarltypYUTgFRQIybRlM/s320/icon-7797704_640.png";
    avatar.alt = "User";
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user-message";
    messageDiv.textContent = text;
    row.appendChild(avatar);
    row.appendChild(messageDiv);
    chatBox.appendChild(row);
    setTimeout(() => {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

window.onload = function () {
    addBotMessage("Hello there! ✨ I'm Text2's AI, what can I help you with?");
};

const keywordResponses = {
    "nhat anh": "Nhat Anh is the CEO of 504 Media, specializing in AI, blogging, and social media.",
    "504 media": "504 Media is a company specializing in AI technology and digital content.",
    "created": "I was created by Nhat Anh, CEO of 504 Media and Text2.",
    "hello": "Hello there! What's up?",
    "thank you": "You're welcome! 🫶",
    "anh tu": "A student at VTV College and a close friend of Nhat Anh!",
    "chu hung": "Chu Hung Photo Studio - a great place in Ben Tre!",
    "adobe": "Here's the Adobe crack link from 2020 to 2025: https://www.text2.click/p/ban-crack-adobe.html",
    "huy hoang": "An upcoming singer, follow him now!",
    "who are you": "I'm Text2's awesome AI assistant! 💚",
};

async function sendMessage() {
    const userInput = document.getElementById("userInput");
    const chatBox = document.getElementById("chat-box");
    let message = userInput.value.trim();
    let messageLower = message.toLowerCase();
    if (!message) return;
    
    addUserMessage(message);
    userInput.value = "";
    
    for (const keyword in keywordResponses) {
        if (messageLower.includes(keyword)) {
            addBotMessage(keywordResponses[keyword]);
            return;
        }
    }
    
    // Show loading animation
    const loadingRow = addLoadingMessage();
    
    const WORKER_URL = "https://cloudflare-llm.text2team.workers.dev"; 
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: `answer briefly under 700 characters in a teen style, and play as you are text2 chat ai of text2: ${message}`
            })
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server lỗi (${response.status}): ${errText}`);
        }
        
        const data = await response.json();
        
        // 👉 Worker trả về dạng { reply: { response: "..." } }
        let botReply = data?.reply?.response || data?.reply || "Oops, didn't understand that 😅";
        botReply = botReply.replace(/Qwen|Together/g, "Text2");
        botReply = botReply.replace(/\*+/g, "");
        
        // Remove loading message and add actual response
        loadingRow.remove();
        addBotMessage(botReply);
    } catch (error) {
        // Remove loading message and show error
        loadingRow.remove();
        addBotMessage("Sorry, I'm having trouble connecting right now. Please try again later! 😅");
    }
}