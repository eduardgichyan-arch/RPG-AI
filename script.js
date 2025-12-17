// script.js - Chat Interface Logic

document.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById("chat");
    const input = document.getElementById("message-input");
    const sendBtn = document.getElementById("sendBtn");

    // Stats elements
    const elLevel = document.getElementById('level');
    const elXp = document.getElementById('xp');
    const elFocus = document.getElementById('focus');

    // Auto-focus input
    input.focus();

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Initial Load - Check for Refresh
    handleInitialLoad();

    // Expose for quiz.js
    window.fetchGameStatus = fetchGameStatus;

    async function handleInitialLoad() {
        const navEntry = performance.getEntriesByType("navigation")[0];

        // User requested: Reset ONLY on manual reload
        if (navEntry && navEntry.type === 'reload') {
            console.log("🔄 Detected page reload: Resetting game.");
            await resetAndLoad();
        } else {
            console.log("➡️ Detected navigation/entry: Loading saved state.");
            fetchGameStatus();
        }
    }

    async function resetAndLoad() {
        try {
            await fetch('/game-reset', { method: 'POST' });
            fetchGameStatus();
        } catch (e) {
            console.error("Failed to reset:", e);
            fetchGameStatus();
        }
    }

    async function fetchGameStatus() {
        try {
            const res = await fetch('/game-status');
            if (!res.ok) throw new Error("Failed to fetch status");
            const data = await res.json();
            if (data.player) {
                updateStatsDisplay(data.player);
            }
        } catch (e) {
            console.error("Error fetching initial state:", e);
        }
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // UI Updates
        addMessage(text, true);
        input.value = "";
        sendBtn.disabled = true;

        // Resize textarea if needed (reset height)
        input.style.height = 'auto';

        addLoading();

        try {
            const res = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            removeLoading();

            const data = await res.json();

            if (data.candidates?.length) {
                const reply = data.candidates[0].content.parts[0].text;
                addMessage(reply, false, true); // Animate AI response
            } else if (data.error) {
                addMessage(`⚠️ Error: ${data.error}`, false);
            } else {
                addMessage("⚠️ Sorry, I couldn't understand that. Try again!", false);
            }

            // Update Game Stats Live
            if (data.gameState) {
                updateStatsDisplay(data.gameState.player);
            }

        } catch (e) {
            removeLoading();
            addMessage(`❌ Connection Error: ${e.message}`, false);
            console.error(e);
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    }

    function addMessage(text, isUser, animate = false) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isUser ? "user" : "ai"}`;

        // Simple Markdown parsing for AI messages would go here (omitted for brevity, can add later)
        // For now, just preserving newlines
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
        const speed = 15; // ms per char (faster is better for UX)

        // Handle HTML tags correctly (don't break them)
        // Simple approach: if char is <, find > and print whole tag

        function type() {
            if (i < text.length) {
                if (text.charAt(i) === '<') {
                    const tagEnd = text.indexOf('>', i);
                    if (tagEnd !== -1) {
                        element.innerHTML += text.substring(i, tagEnd + 1);
                        i = tagEnd + 1;
                    } else {
                        element.innerHTML += text.charAt(i);
                        i++;
                    }
                } else {
                    element.innerHTML += text.charAt(i);
                    i++;
                }
                scrollToBottom(); // Keep scrolling as we type
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

        // Sidebar Updates
        updateSidebar(player);
    }

    function updateSidebar(player) {
        // Name & Type
        const elType = document.getElementById('sidebar-type');
        const elDesc = document.getElementById('sidebar-desc');
        const elLevel = document.getElementById('sidebar-level');
        const elAvatar = document.getElementById('avatar-initials');

        // Initial from Type (e.g. I for ISTP) or Name
        if (elAvatar) {
            const initial = (player.personalityType && player.personalityType !== "Unknown")
                ? player.personalityType[0]
                : (player.name ? player.name[0] : "A");
            elAvatar.textContent = initial;
        }

        if (elType) elType.textContent = player.personalityType || 'UNKNOWN';
        if (elLevel) elLevel.textContent = player.level;

        // Description logic
        const descMap = {
            'INTJ': 'The Architect', 'INTP': 'The Logician', 'ENTJ': 'The Commander', 'ENTP': 'The Debater',
            'INFJ': 'The Advocate', 'INFP': 'The Mediator', 'ENFJ': 'The Protagonist', 'ENFP': 'The Campaigner',
            'ISTJ': 'The Logistician', 'ISFJ': 'The Defender', 'ESTJ': 'The Executive', 'ESFJ': 'The Consul',
            'ISTP': 'The Virtuoso', 'ISFP': 'The Adventurer', 'ESTP': 'The Entrepreneur', 'ESFP': 'The Entertainer'
        };
        if (elDesc) elDesc.textContent = descMap[player.personalityType] || 'The Novice';

        // Stats
        const elStats = document.getElementById('sidebar-stats');
        if (elStats) {
            const stats = [
                { l: 'Creativity', v: player.stats.creativity, c: 'bar-creativity' },
                { l: 'Focus', v: player.stats.focus, c: 'bar-focus' },
                { l: 'Energy', v: player.stats.energy, c: 'bar-energy' },
                { l: 'Kindness', v: player.stats.kindness, c: 'bar-kindness' },
                { l: 'Intelligence', v: player.stats.awareness, c: 'bar-intelligence' } // Mapped from Awareness/Fear
            ];

            elStats.innerHTML = stats.map(s => `
                <div class="stat-item">
                    <div class="stat-header">
                        <span>${s.l}</span>
                        <span>${s.v || 50}</span>
                    </div>
                    <div class="stat-bar-bg">
                         <div class="stat-bar-fill ${s.c}" style="width: ${s.v || 50}%"></div>
                    </div>
                </div>
            `).join('');
        }
    }
});
