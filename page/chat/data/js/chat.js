// JavaScript for page/chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-message-input');
    const appContainer = document.querySelector('.app-container');
    const chatContent = document.querySelector('.chat-content');
    const btnSend = document.getElementById('btn-chat-send');
    
    if (chatInput && appContainer) {
        chatInput.addEventListener('focus', () => {
            appContainer.classList.add('keyboard-open');
            // Smoothly scroll message container to bottom after virtual keyboard transitions
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

    // Handle mock send message
    const sendMessage = () => {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // Append user bubble
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble-placeholder bubble-right';
        userBubble.innerText = text;
        chatContent.appendChild(userBubble);

        // Clear input and reset height
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Scroll to bottom
        chatContent.scrollTop = chatContent.scrollHeight;

        // Mock automated response
        setTimeout(() => {
            const replies = [
                "Awesome! This input is so smart! 👍",
                "It adjusts perfectly without shifting the header at all.",
                "Looks absolutely like a native app now! 🔥"
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            const responseBubble = document.createElement('div');
            responseBubble.className = 'chat-bubble-placeholder bubble-left';
            responseBubble.innerText = randomReply;
            chatContent.appendChild(responseBubble);
            chatContent.scrollTop = chatContent.scrollHeight;
        }, 1000);
    };

    if (btnSend) {
        // Prevent keyboard from closing on tap
        btnSend.addEventListener('mousedown', (e) => e.preventDefault());
        btnSend.addEventListener('touchstart', (e) => e.preventDefault());
        btnSend.addEventListener('click', () => {
            sendMessage();
            if (chatInput) chatInput.focus();
        });
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    const btnBack = document.querySelector('.btn-back');
    if (btnBack && chatInput) {
        btnBack.addEventListener('click', () => {
            chatInput.blur();
        });
    }

    // Visual Viewport resize handler to prevent keyboard jumping
    if (window.visualViewport && appContainer) {
        window.visualViewport.addEventListener('resize', () => {
            // Force app-container to exact visual viewport height after keyboard shows
            appContainer.style.height = `${window.visualViewport.height}px`;
            
            // Instantly reset browser-level layout scroll to 0
            window.scrollTo(0, 0); 
            document.body.scrollTop = 0;
            
            // Push content to the bottom
            if (chatContent) {
                chatContent.scrollTop = chatContent.scrollHeight;
            }
        });
    }
});
