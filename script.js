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

    const elLevel = document.getElementById('level');
    const elXp = document.getElementById('xp');
    const elFocus = document.getElementById('focus');

    if (input) input.focus();

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

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
        } catch (e) {
            console.error("Error init:", e);
        }
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
                }
            }

        } catch (e) {
            removeLoading();
            addMessage(`❌ Connection Error: ${e.message}`, false);
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
        if (elXp) elXp.textContent = `${player.xp}/250`;
        if (elFocus) elFocus.textContent = player.stats.focus;
        updateSidebar(player);
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
            if (firstBubble.textContent.includes("Greetings, Traveler")) {
                firstBubble.innerHTML = `${greeting}! I am your AI Guide. Speak with me to earn XP, level up, and unlock your true potential. 🌌`;
            }
        }
    }
    updateGreeting();

    const canvas = document.getElementById('particles-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

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
            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });
    }

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
