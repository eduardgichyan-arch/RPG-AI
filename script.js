// script.js - Chat Interface Logic (Client-Side Persistence)

document.addEventListener('DOMContentLoaded', () => {
    // 🛡️ AUTH CHECK
    const playerId = localStorage.getItem('playerId');
    if (!playerId && !window.location.pathname.includes('signup.html') && !window.location.pathname.includes('login.html')) {
        console.log("No profile detected. Redirecting to signup...");
        window.location.href = 'signup.html';
        return;
    }

    const chat = document.getElementById("chat");
    const input = document.getElementById("message-input");
    const sendBtn = document.getElementById("sendBtn");
    const toastContainer = document.getElementById('toastContainer');

    const elLevel = document.getElementById('level');
    const elXp = document.getElementById('xp');
    const elFocus = document.getElementById('focus');

    if (input) input.focus();

    // 🔊 Init Audio on first interaction
    document.body.addEventListener('click', () => {
        if (window.sfx && !window.sfx.initialized) window.sfx.init();
    }, { once: true });

    if (sendBtn) sendBtn.addEventListener('click', () => {
        sendMessage();
        if (window.sfx) window.sfx.playSend();
    });

    if (input) input.addEventListener('keydown', (e) => {
        if (window.sfx) window.sfx.playTyping(); // Typing sound
        resetIdleTimer(); // Reset idle on activity

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
            if (window.sfx) window.sfx.playSend();
        }
    });

    // Idle Timer Logic
    let idleTimer = null;
    let lastIdleIndex = -1; // Track last message to prevent repeats
    let idleStage = 0; // 0 = first warning (20s), 1+ = subsequent (60s)

    function resetIdleTimer() {
        if (idleTimer) clearTimeout(idleTimer);
        idleStage = 0; // Reset urgency
        // Initial wait: 20 seconds
        idleTimer = setTimeout(triggerIdleEvent, 20000);
    }

    // Start idle timer immediately
    resetIdleTimer();

    function triggerIdleEvent() {
        if (document.hidden) return; // Don't annoy if tab hidden
        if (window.sfx) window.sfx.playAlert();

        const events = [
            "The silence in the sector is peaceful, but I prefer our exchanges. What's on your mind right now?",
            "I was just processing some background data and wondered... what's one thing you're looking forward to this week?",
            "I just noticed your focus levels are fluctuating. Is everything okay, or are you just deep into something?",
            "If we were to upgrade one aspect of your 'reality' today, what would you choose?",
            "Sometimes the best progress happens in the quiet moments. How are you feeling about your journey so far?",
            "I'm keeping the channel open. It's rare to find a traveler with your specific data-signature. Any thoughts?"
        ];

        // Prevent consecutive repeats
        let randomIndex;
        let attempts = 0;
        do {
            randomIndex = Math.floor(Math.random() * events.length);
            attempts++;
        } while (randomIndex === lastIdleIndex && attempts < 5);

        lastIdleIndex = randomIndex;
        const randomEvent = events[randomIndex];
        addMessage(randomEvent, false, true);

        // RECURSIVE LOOP: Slow down subsequent nudges to 60 seconds
        idleStage++;
        idleTimer = setTimeout(triggerIdleEvent, 60000);
    }

    handleInitialLoad();

    // 🔄 STATE SYNC HELPER
    async function syncGameState(state) {
        const pid = localStorage.getItem('playerId');
        if (!pid || !state) return;

        try {
            await fetch('/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: pid, gameState: state })
            });
        } catch (e) {
            console.warn("Sync failed:", e);
        }
    }

    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<div class="label">${type === 'success' ? 'Success' : 'Alert'}</div><div>${message}</div>`;
        toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3800);
    }

    // Expose helper to get ANY current state for other scripts
    window.getGameState = () => {
        const s = localStorage.getItem('gameState');
        return s ? JSON.parse(s) : null;
    };

    // Expose fetcher for UI updates
    window.fetchGameStatus = handleInitialLoad;

    // ... (Mobile Navigation Logic same) ...
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) {
        navLogout.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    async function handleInitialLoad() {
        let savedState = localStorage.getItem('gameState');

        // 🚀 BOOT SEQUENCE CHECK
        // If we have a state but it's "fresh" (level 1, 0 XP, no name changed), trigger boot
        // Or specific flag
        const hasBooted = localStorage.getItem('has_booted_system');

        if (!hasBooted) {
            runBootSequence();
            return;
        }

        if (savedState) {
            const parsed = JSON.parse(savedState);

            // FIX: Cap level at 100
            if (parsed.player && parsed.player.level > 100) {
                parsed.player.level = 100;
                localStorage.setItem('gameState', JSON.stringify(parsed));
                savedState = JSON.stringify(parsed);
            }

            updateStatsDisplay(parsed.player);
            return;
        }

        // checking for default (This shouldn't really happen now with signup)
        try {
            const res = await fetch('/game-status');
            const data = await res.json();
            localStorage.setItem('gameState', JSON.stringify(data));
            updateStatsDisplay(data.player);

            // If completely new users
            if (!hasBooted) {
                runBootSequence();
            } else if (!savedState) {
                // Existing user but empty state/chat? Show chips
                renderQuickChips();
            }

        } catch (e) {
            console.error("Error init:", e);
        }

        // Apply Language AFTER state load
        if (window.applyLanguage) window.applyLanguage();
    }


    function renderQuickChips() {
        // Only render if no chips exist
        if (document.getElementById('quick-chips-container')) return;

        const chips = [
            "🚀 Initiate Mission",
            "🧠 Analyze My Stats",
            "🌌 Tell me a Lore Story",
            "⚔️ Combat Simulation"
        ];

        const container = document.createElement('div');
        container.id = 'quick-chips-container';
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.justifyContent = 'center';
        container.style.flexWrap = 'wrap';
        container.style.padding = '15px';
        container.style.animation = 'fadeIn 1s ease';

        chips.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'btn ghost-btn btn-sm';
            btn.textContent = text;
            btn.style.borderColor = '#00d2ff';
            btn.style.color = '#00d2ff';
            btn.onclick = () => {
                input.value = text;
                sendMessage();
                container.remove(); // Remove chips after use
            };
            container.appendChild(btn);
        });

        // Append to chat or above input? Appending to chat is safer for layout
        chat.appendChild(container);
        scrollToBottom();
    }

    // 🖥️ BOOT SEQUENCE LOGIC
    function runBootSequence() {
        // Clear default chat
        chat.innerHTML = '';
        input.disabled = true;
        sendBtn.disabled = true;

        const bootLines = [
            { text: "INITIALIZING NEURAL LINK...", delay: 800 },
            { text: "ESTABLISHING SECURE CONNECTION...", delay: 1500 },
            { text: "DOWNLOADING COSMIC DATA...", delay: 2400 },
            { text: "USER IDENTITY: UNVERIFIED.", delay: 3200 },
            { text: "PLEASE IDENTIFY YOURSELF, TRAVELER.", delay: 4000 }
        ];

        let totalDelay = 0;

        bootLines.forEach(line => {
            setTimeout(() => {
                if (window.sfx) window.sfx.playTyping();
                const div = document.createElement("div");
                div.className = "message ai";
                div.innerHTML = `<div class="message-bubble" style="font-family: monospace; color: #00ff00; border: 1px solid #00ff00; background: rgba(0,20,0,0.8);">${line.text}</div>`;
                chat.appendChild(div);
                scrollToBottom();
            }, totalDelay + line.delay);
        });

        setTimeout(() => {
            input.disabled = false;
            sendBtn.disabled = false;
            input.placeholder = "Enter your Codename...";
            input.focus();
            localStorage.setItem('has_booted_system', 'true');
            if (window.sfx) window.sfx.playAlert();
            renderQuickChips(); // Show chips after boot
        }, totalDelay + 4500);
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, true);
        input.value = "";
        sendBtn.disabled = true;
        input.style.height = 'auto';
        addLoading();

        // Get CURRENT state from local storage
        let currentState = localStorage.getItem('gameState');
        if (!currentState) {
            // Fallback
            currentState = JSON.stringify({});
        }

        try {
            const res = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    gameState: JSON.parse(currentState) // Send State
                })
            });

            removeLoading();
            const data = await res.json();

            if (data.candidates?.length) {
                const reply = data.candidates[0].content.parts[0].text;
                addMessage(reply, false, true);
            } else if (data.error) {
                addMessage(`⚠️ Error: ${data.error}`, false);
                showToast(data.error, 'error');
            }

            // Update & SAVE new state
            if (data.gameState) {
                const oldLevel = JSON.parse(currentState).player?.level || 1;
                const newLevel = data.gameState.player.level;

                localStorage.setItem('gameState', JSON.stringify(data.gameState));
                updateStatsDisplay(data.gameState.player);

                // 🔄 Sync to server if logged in
                syncGameState(data.gameState);

                // Check for Level Up
                if (newLevel > oldLevel) {
                    showLevelUpModal(newLevel);
                    if (window.sfx) window.sfx.playXpGain();
                    // Add chat notification
                    setTimeout(() => {
                        addMessage(`🎉 SYSTEM BROADCAST: CONGRATULATIONS! You have reached **Level ${newLevel}**! Access new protocols in your Dashboard.`, false, true);
                        // Check for Level 5 Unlock
                        if (newLevel === 5) {
                            setTimeout(() => {
                                addMessage(`🔓 UNLOCK ALERT: **1v1 Arena** is now available! Test your skills against other players.`, false, true);
                            }, 1500);
                        }
                    }, 1000);

                } else if (data.gameState.player.xp > oldLevel) {
                    // Just XP gain
                    if (window.sfx) window.sfx.playTyping();
                }
            }

        } catch (e) {
            removeLoading();
            addMessage(`❌ Connection Error: ${e.message}`, false);
            showToast('Connection error, please retry.', 'error');
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    }

    function addMessage(text, isUser, animate = false) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isUser ? "user" : "ai"}`;
        const formattedText = text.replace(/\n/g, '<br>');
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        // 🎨 APPLY COSMETIC SKINS
        if (isUser) {
            const state = getGameState();
            const theme = state?.player?.equippedTheme;

            // Prioritize explicitly equipped theme
            if (theme) {
                bubble.classList.add(theme);
            } else {
                // Fallback: Apply "rarest" owned if nothing equipped (legacy behavior optional, but let's keep it for now or just default? 
                // User said "appeared just last one", so maybe better to ONLY use equipped. 
                // But for now, if they haven't equipped anything, maybe default to nothing?
                // Let's stick to EQUIPPED ONLY to solve the user's confusion.
                // If null, no class added = default theme.
            }
        }

        messageDiv.appendChild(bubble);
        chat.appendChild(messageDiv);

        if (animate && !isUser) {
            typeWriter(bubble, formattedText);
        } else {
            bubble.innerHTML = formattedText;
            scrollToBottom();
        }
        if (!animate) scrollToBottom();
    }

    function typeWriter(element, text) {
        let i = 0;
        const speed = 15;
        function type() {
            if (i < text.length) {
                if (text.charAt(i) === '<') {
                    const tagEnd = text.indexOf('>', i);
                    if (tagEnd !== -1) {
                        element.innerHTML += text.substring(i, tagEnd + 1);
                        i = tagEnd + 1;
                    } else { element.innerHTML += text.charAt(i); i++; }
                } else { element.innerHTML += text.charAt(i); i++; }
                scrollToBottom();
                setTimeout(type, speed);
            }
        }
        type();
    }

    function addLoading() {
        const messageDiv = document.createElement("div");
        messageDiv.className = "message ai";
        messageDiv.id = "loading-indicator";
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.innerHTML = '<span class="loading-spinner"></span> Thinking...';
        messageDiv.appendChild(bubble);
        chat.appendChild(messageDiv);
        scrollToBottom();
    }

    function removeLoading() {
        const loading = document.getElementById("loading-indicator");
        if (loading) loading.remove();
    }

    function scrollToBottom() {
        chat.scrollTop = chat.scrollHeight;
    }

    function updateStatsDisplay(player) {
        if (elLevel) elLevel.textContent = player.level;
        if (elXp) elXp.textContent = `${player.xp}/100`;
        if (elFocus) elFocus.textContent = player.stats.focus;
        updateSidebar(player);
        applyTheme(player); // 🎨 Auto-apply theme
    }

    function applyTheme(player) {
        const theme = player.equippedTheme;
        const inv = player.inventory || [];

        const themes = [
            'matrix_theme',
            'solar_orange_bubble',
            'void_purple_bubble',
            'plasma_pink_bubble',
            'cyber_blue_bubble',
            'neon_green_bubble'
        ];

        document.body.classList.remove(...themes);

        // Apply equipped theme if owned
        if (theme && inv.includes(theme)) {
            document.body.classList.add(theme);

            // Trigger Visual Effects
            if (theme === 'matrix_theme') {
                if (window.setVisualMode) window.setVisualMode('matrix');
            } else {
                if (window.setVisualMode) window.setVisualMode('particles');
            }
        } else {
            // Default
            if (window.setVisualMode) window.setVisualMode('particles');
        }
    }

    function updateSidebar(player) {
        const elType = document.getElementById('sidebar-type');
        const elDesc = document.getElementById('sidebar-desc');
        const elLevel = document.getElementById('sidebar-level');
        const elAvatar = document.getElementById('avatar-initials');

        if (elAvatar) {
            const initial = (player.personalityType && player.personalityType !== "Unknown")
                ? player.personalityType[0]
                : (player.name ? player.name[0] : "A");
            elAvatar.textContent = initial;
        }

        if (elType) elType.textContent = player.personalityType || 'UNKNOWN';
        if (elLevel) elLevel.textContent = player.level;

        const descMap = {
            'INTJ': 'The Architect', 'INTP': 'The Logician', 'ENTJ': 'The Commander', 'ENTP': 'The Debater',
            'INFJ': 'The Advocate', 'INFP': 'The Mediator', 'ENFJ': 'The Protagonist', 'ENFP': 'The Campaigner',
            'ISTJ': 'The Logistician', 'ISFJ': 'The Defender', 'ESTJ': 'The Executive', 'ESFJ': 'The Consul',
            'ISTP': 'The Virtuoso', 'ISFP': 'The Adventurer', 'ESTP': 'The Entrepreneur', 'ESFP': 'The Entertainer'
        };
        if (elDesc) elDesc.textContent = descMap[player.personalityType] || 'The Novice';

        const elStats = document.getElementById('sidebar-stats');
        if (elStats) {
            const stats = [
                { l: 'Creativity', v: player.stats.creativity, c: 'bar-creativity' },
                { l: 'Focus', v: player.stats.focus, c: 'bar-focus' },
                { l: 'Energy', v: player.stats.energy, c: 'bar-energy' },
                { l: 'Kindness', v: player.stats.kindness, c: 'bar-kindness' },
                { l: 'Intelligence', v: player.stats.awareness, c: 'bar-intelligence' }
            ];

            elStats.innerHTML = stats.map(s => `
                <div class="stat-item">
                    <div class="stat-header"><span>${s.l}</span><span>${s.v || 50}</span></div>
                    <div class="stat-bar-bg"><div class="stat-bar-fill ${s.c}" style="width: ${s.v || 50}%"></div></div>
                </div>
            `).join('');
        }
    }

    // --- Language Switcher (Chat) ---
    const langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
        langSwitcher.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            window.applyLanguage(newLang);

            const state = getGameState();
            if (state && state.player) {
                updateSidebar(state.player); // Refresh sidebar titles
                await syncGameState(state);
            }
        });
    }

    // --- Visual Overhaul Logic (Dynamic Greeting & Particles) ---

    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting = "Greetings, Traveler";
        if (hour >= 5 && hour < 12) greeting = "Good Morning, Legend";
        else if (hour >= 12 && hour < 18) greeting = "Good Afternoon, Adventurer";
        else if (hour >= 18 && hour < 22) greeting = "Good Evening, Explorer";
        else greeting = "Late Night Creativity?";

        const bubbles = document.querySelectorAll('.ai .message-bubble');
        if (bubbles.length > 0) {
            const firstBubble = bubbles[0];
            // Only update if it contains the default text
            if (firstBubble.textContent.includes("Greetings, Traveler") || firstBubble.textContent.includes("AI Guide")) {

                // DATA-DRIVEN GREETING LOGIC
                const state = getGameState();
                const isNewUser = state?.player?.level === 1 && (state?.player?.totalXpEarned || 0) < 50;

                if (isNewUser) {
                    // TUTORIAL INTRO (Warm, Life-Game Style)
                    firstBubble.innerHTML = `
                        <strong>${greeting}! Welcome, Traveler.</strong> 🌌<br><br>
                        This isn't just a game—it's a journey for your mind. Here, every conversation earns you XP and helps you grow.<br><br>
                        You are currently <strong>Level 1</strong>. To evolve, simply talk to me. I'm here to explore ideas, solve problems, or just chat.<br><br>
                        <em>Let's start your story. If you could have any superpower to help you in your daily life, what would it be?</em>
                    `;
                } else {
                    // CONVERSATION HOOKS (High Retention / Personal)
                    const hooks = [
                        "I'm listening. If you could teleport anywhere right now for 1 hour, where would you go?",
                        "Welcome back. What is the best piece of advice you've ever received?",
                        "Ready when you are. If you had unlimited resources for one project, what would you build?",
                        "I'm curious: What is a movie or book that completely changed how you see the world?",
                        "I'm learning about human habits. What is one positive habit you are proud of?"
                    ];
                    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
                    firstBubble.innerHTML = `${greeting}! 🌌 <br><br>${randomHook}`;
                }
            }
        }
    }
    updateGreeting();

    // --- VISUAL EFFECTS ENGINE ---
    const canvas = document.getElementById('particles-bg');
    let animationId = null;
    let effectType = 'particles'; // 'particles' or 'matrix'

    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // --- PARTICLE SYSTEM ---
        let particlesArray;
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2;
                this.speedX = (Math.random() * 0.2) - 0.1;
                this.speedY = (Math.random() * 0.2) - 0.1;
                this.color = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particlesArray = [];
            for (let i = 0; i < 100; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            animationId = requestAnimationFrame(animateParticles);
        }

        // --- MATRIX RAIN SYSTEM ---
        const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ1234567890';
        const fontSize = 16;
        let columns = canvas.width / fontSize;
        let drops = [];

        function initMatrix() {
            columns = canvas.width / fontSize;
            drops = [];
            for (let i = 0; i < columns; i++) {
                drops[i] = 1;
            }
        }

        function animateMatrix() {
            // Semi-transparent black to create trail effect (slower fade for chat)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Lower opacity green text for chat interface (25% opacity)
            ctx.fillStyle = 'rgba(0, 255, 0, 0.25)';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = katakana.charAt(Math.floor(Math.random() * katakana.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animationId = requestAnimationFrame(animateMatrix);
        }

        // --- PUBLIC CONTROLLER ---
        window.setVisualMode = function (mode) {
            if (mode === effectType && animationId) return; // No change

            if (animationId) cancelAnimationFrame(animationId);
            effectType = mode;

            if (mode === 'matrix') {
                initMatrix();
                animateMatrix();
            } else {
                // Default Particles
                ctx.fillStyle = 'rgba(0,0,0,0)'; // Reset styling
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear old
                initParticles();
                animateParticles();
            }
        };

        // Resize Handler
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (effectType === 'matrix') initMatrix();
            else initParticles();
        });

        // Initialize Default
        initParticles();
        animateParticles();

        // Apply theme immediately if already loaded
        const state = getGameState();
        if (state && state.player) {
            applyTheme(state.player);
        }
    }

    // --- Level Up Modal Logic ---

    // --- Level Up Modal Logic ---
    const modal = document.getElementById('level-up-modal');
    const claimBtn = document.getElementById('claim-level-btn');
    const newLevelVal = document.getElementById('new-level-val');

    function showLevelUpModal(level) {
        if (modal && newLevelVal) {
            newLevelVal.textContent = level;
            modal.classList.remove('hidden');
            triggerConfetti(); // Optional: Add a simple confetti function if desired or just rely on CSS animations
        }
    }

    if (claimBtn) {
        claimBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
        });
    }

    function triggerConfetti() {
        // Placeholder for confetti logic (can be expanded later)
        console.log("🎉 Confetti Triggered!");
    }

    // --- Welcome / Tutorial Modal Logic ---
    const welcomeModal = document.getElementById('welcome-modal');
    const startJourneyBtn = document.getElementById('start-journey-btn');

    if (welcomeModal && startJourneyBtn) {
        // Check local storage for flag
        const hasSeenTutorial = localStorage.getItem('has_seen_tutorial');

        if (!hasSeenTutorial) {
            // Show modal if not seen
            welcomeModal.classList.remove('hidden');
        }

        startJourneyBtn.addEventListener('click', () => {
            // Hide modal and save flag
            welcomeModal.classList.add('hidden');
            localStorage.setItem('has_seen_tutorial', 'true');

            // Focus input to encourage instant interaction
            const input = document.getElementById("message-input");
            if (input) input.focus();
        });
    }
});
