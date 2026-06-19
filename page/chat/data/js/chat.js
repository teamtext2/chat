// JavaScript for page/chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-message-input');
    const appContainer = document.querySelector('.app-container');
    
    if (chatInput && appContainer) {
        const forceScrollTop = () => {
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
            }, 80);
        };

        chatInput.addEventListener('focus', () => {
            appContainer.classList.add('keyboard-open');
            forceScrollTop();
        });
        
        chatInput.addEventListener('blur', () => {
            appContainer.classList.remove('keyboard-open');
            forceScrollTop();
        });
    }

    if (window.visualViewport && appContainer) {
        const handleViewportResize = () => {
            const height = window.visualViewport.height;
            appContainer.style.height = `${height}px`;
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
        };
        window.visualViewport.addEventListener('resize', handleViewportResize);
        window.visualViewport.addEventListener('scroll', handleViewportResize);
    }
});
