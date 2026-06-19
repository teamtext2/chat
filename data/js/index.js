// Chat histories database
const chatHistories = JSON.parse(localStorage.getItem('chat-histories')) || {
    "HOA NHAT ANH": [
        { type: "incoming", text: "Hello! How are you doing today?" },
        { type: "outgoing", text: "I'm good, working on a super smooth web app." },
        { type: "incoming", text: "Oh really? Let me see!" },
        { type: "outgoing", text: "Here, check it out, it's as smooth as a native app!" }
    ],
    "facebook": [
        { type: "incoming", text: "Welcome to Facebook!" },
        { type: "outgoing", text: "Hello Facebook." },
        { type: "incoming", text: "Would you like to connect with more friends?" },
        { type: "outgoing", text: "Maybe later." }
    ],
    "Text2": [
        { type: "incoming", text: "Welcome to Text2Chat!" },
        { type: "outgoing", text: "This app is really fast." },
        { type: "incoming", text: "Thank you! We always optimize for maximum performance." },
        { type: "outgoing", text: "Awesome!" }
    ]
};

// Database of contact profiles
const contactInfo = {
    "HOA NHAT ANH": {
        phone: "+84 912 345 678",
        email: "hoanhatanh@text2.co",
        bio: "Learning every day, coding non-stop. 🚀",
        status: "online",
        avatar: "https://text2.co/post/hoanhatanh/apple-touch-icon.png",
        muted: false,
        blocked: false
    },
    "facebook": {
        phone: "Hidden",
        email: "support@facebook.com",
        bio: "Connecting people all around the world.",
        status: "away",
        avatar: "https://facebook.com/favicon.ico",
        muted: false,
        blocked: false
    },
    "Text2": {
        phone: "1800-TEXT2",
        email: "hello@text2.co",
        bio: "Official Text2 Chat account. We are here to support.",
        status: "online",
        avatar: "https://text2.co/favicon.ico",
        muted: false,
        blocked: false
    }
};

// Current User Profile State (local storage backed)
const defaultUserProfile = {
    name: "HOA NHAT ANH",
    username: "hoanhatanh",
    bio: "Designing the future of communication. 🚀",
    email: "hoanhatanh@text2.co",
    status: "online",
    avatar: "https://text2.co/post/hoanhatanh/apple-touch-icon.png"
};

let userProfile = JSON.parse(localStorage.getItem('user-profile')) || defaultUserProfile;
let activeChatUser = null;

// Initialize theme and wallpaper from local storage
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

// Open chat function
function openChat(name, avatar) {
    activeChatUser = { name, avatar };
    document.getElementById('chat-view-avatar').src = avatar;
    document.getElementById('chat-view-title').innerText = name;

    loadChatMessages(name);
    window.location.hash = '#chat';
}

// Close chat function
function closeChat() {
    activeChatUser = null;
    document.getElementById('chat-message-input').value = '';
    document.getElementById('plus-icon').style.display = 'block';
    document.getElementById('send-icon').style.display = 'none';
}

// Load chat messages dynamically
function loadChatMessages(name) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = ''; // Clear

    const messages = chatHistories[name] || [
        { type: "incoming", text: "Hello!" },
        { type: "outgoing", text: "Hey there." }
    ];

    messages.forEach((msg, index) => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble-placeholder bubble-${msg.type === 'incoming' ? 'left' : 'right'}`;
        bubble.innerText = msg.text;
        bubble.style.animationDelay = `${index * 0.05}s`;
        container.appendChild(bubble);
    });

    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

// Send message function
function sendUserMessage() {
    const messageInput = document.getElementById('chat-message-input');
    const text = messageInput.value.trim();
    if (!text || !activeChatUser) return;

    const activeChatName = activeChatUser.name;
    if (!chatHistories[activeChatName]) {
        chatHistories[activeChatName] = [];
    }
    chatHistories[activeChatName].push({ type: "outgoing", text: text });
    localStorage.setItem('chat-histories', JSON.stringify(chatHistories));

    const container = document.getElementById('chat-messages-container');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-placeholder bubble-right';
    bubble.innerText = text;
    container.appendChild(bubble);

    messageInput.value = '';
    document.getElementById('plus-icon').style.display = 'block';
    document.getElementById('send-icon').style.display = 'none';

    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });

    // Mock incoming message sound
    if (localStorage.getItem('setting-notif-sound') !== 'false') {
        playTickSound();
    }

    // Simulate response
    setTimeout(() => {
        if (activeChatUser && activeChatUser.name === activeChatName) {
            const replies = [
                "A bit busy, will reply you later! 🚀",
                "Alright 👍",
                "Message received! 💬",
                "Truly smooth, right? 😂",
                "The new Settings and Profile options work so well!",
                "Wow, this SPA is amazing, no page reload at all."
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];

            chatHistories[activeChatName].push({ type: "incoming", text: randomReply });
            localStorage.setItem('chat-histories', JSON.stringify(chatHistories));

            const replyBubble = document.createElement('div');
            replyBubble.className = 'chat-bubble-placeholder bubble-left';
            replyBubble.innerText = randomReply;
            container.appendChild(replyBubble);

            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });

            if (localStorage.getItem('setting-notif-sound') !== 'false') {
                playPopSound();
            }
        }
    }, 1000 + Math.random() * 800);
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

// Sound effects
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

// Sync user profile changes globally across all UI components
function updateProfileUI() {
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

// Show Personal Profile Form
function showPersonalProfileView() {
    document.getElementById('profile-view-title').innerText = "Profile";
    document.getElementById('avatar-edit-badge-label').style.display = 'flex';
    document.getElementById('profile-form').style.display = 'flex';
    document.getElementById('contact-details-actions').style.display = 'none';

    // Ensure values are up to date
    updateProfileUI();
}

// Show View-only Contact Profile Card
function showContactProfileView(contactName) {
    const contact = contactInfo[contactName];
    if (!contact) return false;

    document.getElementById('profile-view-title').innerText = contactName;
    document.getElementById('avatar-edit-badge-label').style.display = 'none';
    document.getElementById('profile-form').style.display = 'none';

    const detailsActions = document.getElementById('contact-details-actions');
    detailsActions.style.display = 'flex';

    // Set contact profile values
    document.getElementById('profile-edit-avatar').src = contact.avatar;

    const statusColors = {
        online: '#10b981',
        away: '#f59e0b',
        dnd: '#ef4444',
        offline: '#6b7280'
    };
    document.getElementById('profile-status-indicator').style.backgroundColor = statusColors[contact.status] || '#10b981';

    // Show details
    document.getElementById('contact-phone-val').innerText = contact.phone || "Unknown";
    document.getElementById('contact-email-val').innerText = contact.email || "Unknown";

    // Set Mute details
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

    // Set Block details
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

// SPA Routing Controller
function handleRouting() {
    const hash = window.location.hash;
    const container = document.querySelector('.app-container');

    // Remove active view classes
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
        const contactName = decodeURIComponent(hash.substring(9));
        const loaded = showContactProfileView(contactName);
        if (loaded) {
            container.classList.add('profile-active');
            document.getElementById('profile-view').classList.add('active');
        } else {
            window.location.hash = '';
        }
    } else {
        // Main list view
        closeChat();
    }
}

// Event Listeners setup
document.addEventListener('DOMContentLoaded', () => {
    // Initialize user settings & UI
    initSettings();
    updateProfileUI();

    // Run router on load
    handleRouting();
    window.addEventListener('hashchange', handleRouting);

    // Click handlers on main chat list items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.querySelector('.chat-name').innerText;
            const avatar = item.querySelector('.chat-avatar').src;
            openChat(name, avatar);
        });
    });

    // Back buttons click handlers
    document.getElementById('btn-chat-back').addEventListener('click', () => {
        window.history.back();
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => {
        window.history.back();
    });
    document.getElementById('btn-profile-back').addEventListener('click', () => {
        window.history.back();
    });

    // Chat Header Profile button opens the contact's detail view
    document.getElementById('btn-chat-profile').addEventListener('click', () => {
        if (activeChatUser) {
            window.location.hash = '#contact-' + encodeURIComponent(activeChatUser.name);
        }
    });

    // Main header button clicks
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
    const headerTitle = document.getElementById('header-logo-text');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const btnMainSettings = document.getElementById('btn-main-settings');
    const btnMainProfile = document.getElementById('btn-main-profile');

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
        header.classList.remove('searching');
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
        if (e.key === 'Escape' && header.classList.contains('searching')) {
            closeSearchInput();
        }
    });

    // Close search when clicking outside the search container and search button
    document.addEventListener('click', (e) => {
        const header = document.getElementById('main-header');
        if (header && header.classList.contains('searching')) {
            if (!searchContainer.contains(e.target) && !btnMainSearch.contains(e.target)) {
                closeSearchInput();
            }
        }
    });

    function filterChatList(query) {
        const normalized = query.toLowerCase();
        document.querySelectorAll('.chat-list .chat-item').forEach(item => {
            const name = item.querySelector('.chat-name').innerText.toLowerCase();
            const lastMsg = item.querySelector('.chat-last-msg').innerText.toLowerCase();
            if (name.includes(normalized) || lastMsg.includes(normalized)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Chat Message sending listener
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
        if (e.key === 'Enter') {
            sendUserMessage();
        }
    });

    btnChatSend.addEventListener('click', () => {
        if (messageInput.value.trim() !== '') {
            sendUserMessage();
        }
    });

    // Theme Selector events
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
        
        showToast(`Wallpaper changed to: ${wallpaperLabels[nextWallpaper]}`);
    });

    // Switch toggles listener
    document.getElementById('setting-notif-sound').addEventListener('change', (e) => {
        localStorage.setItem('setting-notif-sound', e.target.checked);
        showToast(e.target.checked ? "Sound notifications enabled" : "Sound notifications disabled");
    });

    document.getElementById('setting-read-receipts').addEventListener('change', (e) => {
        localStorage.setItem('setting-read-receipts', e.target.checked);
        showToast(e.target.checked ? "Read receipts enabled" : "Read receipts disabled");
    });

    // Clear history handler
    document.getElementById('setting-clear-chats').addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all chat histories? This action cannot be undone.")) {
            localStorage.removeItem('chat-histories');
            for (let name in chatHistories) {
                chatHistories[name] = [
                    { type: "incoming", text: "Chat history cleared." }
                ];
            }
            localStorage.setItem('chat-histories', JSON.stringify(chatHistories));
            
            if (activeChatUser) {
                loadChatMessages(activeChatUser.name);
            }
            
            document.querySelectorAll('.chat-list .chat-item').forEach(item => {
                item.querySelector('.chat-last-msg').innerText = "Chat history cleared.";
            });

            showToast("Chat history cleared successfully");
        }
    });

    // Logout Handler
    document.getElementById('setting-logout').addEventListener('click', () => {
        if (confirm("Log out of this device?")) {
            showToast("Logging out...");
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
                showToast("Avatar updated successfully");
            };
            reader.readAsDataURL(file);
        }
    });

    // User Profile Save button
    document.getElementById('btn-profile-save').addEventListener('click', () => {
        const nameInput = document.getElementById('profile-name-input').value.trim();
        const usernameInput = document.getElementById('profile-username-input').value.trim();
        const bioInput = document.getElementById('profile-bio-input').value.trim();
        const statusVal = document.getElementById('profile-status-select').value;

        if (!nameInput || !usernameInput) {
            showToast("Please fill in both Name and Username");
            return;
        }

        const saveBtn = document.getElementById('btn-profile-save');
        saveBtn.classList.add('loading');
        saveBtn.innerText = "Saving...";

        setTimeout(() => {
            userProfile.name = nameInput;
            userProfile.username = usernameInput;
            userProfile.bio = bioInput;
            userProfile.status = statusVal;

            localStorage.setItem('user-profile', JSON.stringify(userProfile));
            updateProfileUI();

            saveBtn.classList.remove('loading');
            saveBtn.innerText = "Save Changes";
            showToast("Profile saved successfully!");

            setTimeout(() => {
                window.history.back();
            }, 500);
        }, 1000);
    });

    // Contact Action triggers
    document.getElementById('contact-btn-message').addEventListener('click', () => {
        const hashName = decodeURIComponent(window.location.hash.substring(9));
        const contact = contactInfo[hashName];
        if (contact) {
            activeChatUser = { name: hashName, avatar: contact.avatar };
            document.getElementById('chat-view-avatar').src = contact.avatar;
            document.getElementById('chat-view-title').innerText = hashName;
            loadChatMessages(hashName);
            window.location.hash = '#chat';
        }
    });

    const callMock = (type) => {
        const hashName = decodeURIComponent(window.location.hash.substring(9));
        showToast(`Connecting ${type} call with ${hashName}... (Simulation)`);
    };
    document.getElementById('contact-btn-call').addEventListener('click', () => callMock('voice'));
    document.getElementById('contact-btn-video').addEventListener('click', () => callMock('video'));

    document.getElementById('contact-btn-mute').addEventListener('click', () => {
        const hashName = decodeURIComponent(window.location.hash.substring(9));
        const contact = contactInfo[hashName];
        if (contact) {
            contact.muted = !contact.muted;
            showContactProfileView(hashName);
            showToast(contact.muted ? `Muted notifications from ${hashName}` : `Unmuted notifications from ${hashName}`);
        }
    });

    document.getElementById('contact-btn-block').addEventListener('click', () => {
        const hashName = decodeURIComponent(window.location.hash.substring(9));
        const contact = contactInfo[hashName];
        if (contact) {
            contact.blocked = !contact.blocked;
            showContactProfileView(hashName);
            showToast(contact.blocked ? `Blocked ${hashName}` : `Unblocked ${hashName}`);
        }
    });

    // Keyboard and Visual Viewport Auto-resizing for mobile devices
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

// Toast notification helper
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
