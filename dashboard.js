// dashboard.js - Complete Rewrite for Robustness (Client-Side Persistence)

document.addEventListener('DOMContentLoaded', () => {
    // 🛡️ AUTH CHECK
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
        window.location.href = 'signup.html';
        return;
    }

    const elements = {
        tabs: document.querySelectorAll('.tab-btn'),
        contents: document.querySelectorAll('.tab-content'),
        statsContent: document.getElementById('stats-content'),
        statsLoading: document.getElementById('stats-loading'),
        badgesContent: document.getElementById('badges-content'),
        badgesLoading: document.getElementById('badges-loading'),
        questsContent: document.getElementById('quests-content'),
        questsLoading: document.getElementById('quests-loading')
    };

    const tabBtns = elements.tabs;
    const tabContents = elements.contents;

    // Handle tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'stats') fetchStats();
            if (tabId === 'badges') fetchBadges();
            if (tabId === 'quests') fetchQuests();
            if (tabId === 'weekly') loadWeeklyQuests();
            if (tabId === 'events') loadEvents();
        });
    });

    fetchStats();

    // Helper: Get State
    function getGameState() {
        const s = localStorage.getItem('gameState');
        return s ? JSON.parse(s) : {};
    }

    // ... (existing fetchData code) ...

    // --- Events System: Multiple Riddles & Randomization ---
    const EVENT_POOL = [
        {
            id: 1,
            title: "The Cosmic Oracle",
            description: "A mysterious entity offering ancient wisdom.",
            npcName: "Oracle X-7",
            rarity: "Legendary",
            color: "#ff00ff",
            dialogue: "Greetings, seeker. The stars align for those who seek knowledge. Are you ready for a riddle?",
            question: "What has keys but can't open locks?",
            answers: ['piano', 'keyboard'],
            reward: 500,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Oracle"
        },
        {
            id: 2,
            title: "The Cryptic Merchant",
            description: "A digital scavenger with a puzzle for you.",
            npcName: "Nexus Trader",
            rarity: "Epic",
            color: "#bc13fe",
            dialogue: "I found this encrypted file in the nebula. If you can decode it, the XP is yours.",
            question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
            answers: ['echo'],
            reward: 600,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Merchant"
        },
        {
            id: 3,
            title: "The Binary Ghost",
            description: "A residual haunting in the statistics grid.",
            npcName: "Ghost.exe",
            rarity: "Rare",
            color: "#00d2ff",
            dialogue: "I was once a master coder... answer me this, and I shall fade.",
            question: "The more of this there is, the less you see. What is it?",
            answers: ['darkness', 'dark'],
            reward: 450,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Ghost"
        },
        {
            id: 4,
            title: "Data Sentry",
            description: "A security bot blocking your progress.",
            npcName: "Sentry-9",
            rarity: "Common",
            color: "#00ff88",
            dialogue: "Input the pass-phrase to bypass this sector.",
            question: "What has to be broken before you can use it?",
            answers: ['egg'],
            reward: 400,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Sentry"
        },
        {
            id: 5,
            title: "Void Weaver",
            description: "A weaver of forgotten timelines.",
            npcName: "V-Weaver",
            rarity: "Rare",
            color: "#6a0dad",
            dialogue: "Patterns everywhere... can you see this one?",
            question: "What gets wetter as it dries?",
            answers: ['towel'],
            reward: 450,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Weaver"
        },
        {
            id: 6,
            title: "Solar Sage",
            description: "An ancient light-dweller.",
            npcName: "Solara",
            rarity: "Epic",
            color: "#ffd700",
            dialogue: "Light reveals, but it also creates...",
            question: "I follow you all day long, but when the sun goes down, I'm gone. What am I?",
            answers: ['shadow'],
            reward: 550,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Solara"
        },
        {
            id: 7,
            title: "Gravity Guardian",
            description: "The protector of the celestial weights.",
            npcName: "Grav-G",
            rarity: "Rare",
            color: "#ff4500",
            dialogue: "Movement leaves a trace in the fabric of space.",
            question: "The more you take, the more you leave behind. What am I?",
            answers: ['footsteps', 'footstep'],
            reward: 450,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=GravG"
        },
        {
            id: 8,
            title: "Time Warden",
            description: "Overseer of the temporal streams.",
            npcName: "Chronos-0",
            rarity: "Legendary",
            color: "#00ffea",
            dialogue: "Tick tock... I have no heart, yet I measure yours.",
            question: "What has a face and two hands but no arms or legs?",
            answers: ['clock'],
            reward: 700,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Chronos"
        },
        {
            id: 9,
            title: "Nebula Nomad",
            description: "A wanderer between the gaseous clouds.",
            npcName: "Stardust",
            rarity: "Common",
            color: "#ff69b4",
            dialogue: "I drift where the wind blows, though I have no sail.",
            question: "I have no wings, but I can fly. I have no eyes, but I can cry. What am I?",
            answers: ['cloud'],
            reward: 350,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Stardust"
        },
        {
            id: 10,
            title: "Cyber Chemist",
            description: "Mixing the base elements of the universe.",
            npcName: "Alchemist.js",
            rarity: "Rare",
            color: "#32cd32",
            dialogue: "Everything flows, everything changes colors.",
            question: "What can run but never walks, has a mouth but never talks?",
            answers: ['river'],
            reward: 500,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Alchemist"
        },
        {
            id: 11,
            title: "Quantum Queen",
            description: "Ruler of the sub-atomic realm.",
            npcName: "Quanta",
            rarity: "Epic",
            color: "#9400d3",
            dialogue: "In my world, up is down and time is just a number.",
            question: "What goes up but never comes down?",
            answers: ['age'],
            reward: 600,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Quanta"
        },
        {
            id: 12,
            title: "Pixel Paladin",
            description: "A guardian of the resolution.",
            npcName: "Paladin-8bit",
            rarity: "Common",
            color: "#ffffff",
            dialogue: "I am light, yet I can be a burden to the weak.",
            question: "I am light as a feather, yet even the strongest man cannot hold me for long. What am I?",
            answers: ['breath'],
            reward: 400,
            image: "https://api.dicebear.com/7.x/bottts/svg?seed=Paladin"
        }
    ];

    let displayedEvents = [];
    let activeChallengeId = null;

    function loadEvents() {
        const container = document.getElementById('events-content');
        const loading = document.getElementById('events-loading');
        showLoading(loading, container);

        setTimeout(() => {
            const completedIds = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
            const availableEvents = EVENT_POOL.filter(e => !completedIds.includes(e.id));

            if (availableEvents.length === 0) {
                container.innerHTML = `
                    <div class="glass-panel" style="text-align: center; padding: 60px;">
                        <div style="font-size: 60px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">🌠</div>
                        <h2 style="color: var(--primary-color);">All Challenges Conquered!</h2>
                        <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 400px; margin: 0 auto;">
                            You have solved every mystery the cosmos has currently offered. Return soon for new anomalies!
                        </p>
                    </div>
                `;
            } else {
                // Pick 3 random available events
                const shuffled = [...availableEvents].sort(() => 0.5 - Math.random());
                displayedEvents = shuffled.slice(0, 3);
                renderEventsGrid(displayedEvents, container);
            }
            hideLoading(loading, container);
        }, 500);
    }

    function renderEventsGrid(events, container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="font-size: 1.5rem; color: #fff;">Active Anomalies</h2>
                <button class="btn btn-sm" onclick="loadEvents()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                    🔄 Rescan Nebula
                </button>
            </div>
            <div class="events-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                ${events.map(event => `
                    <div class="glass-panel event-card" style="padding: 25px; border-top: 4px solid ${event.color}; position: relative; display: flex; flex-direction: column; transition: transform 0.3s ease;">
                        <div class="rarity-badge" style="position: absolute; top: 15px; right: 15px; font-size: 10px; font-weight: bold; padding: 2px 10px; border-radius: 20px; background: ${event.color}33; color: ${event.color}; border: 1px solid ${event.color}55;">
                            ${event.rarity.toUpperCase()}
                        </div>
                        
                        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
                            <img src="${event.image}" alt="${event.npcName}" style="width: 60px; height: 60px; border-radius: 12px; border: 2px solid ${event.color}; background: rgba(0,0,0,0.5);">
                            <div>
                                <h4 style="color: #fff; margin: 0; font-size: 18px;">${event.title}</h4>
                                <div style="font-size: 12px; color: ${event.color}; font-weight: 600;">${event.npcName}</div>
                            </div>
                        </div>

                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px; flex: 1;">${event.description}</p>
                        
                        <div class="conversation-box" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 3px solid ${event.color}; margin-bottom: 20px;">
                            <em style="color: #eee; font-size: 13px; font-style: normal; line-height: 1.4;">"${event.dialogue}"</em>
                        </div>

                        <div id="action-area-${event.id}">
                            <button class="btn btn-primary" style="width: 100%; background: ${event.color}; border-color: ${event.color}; font-size: 14px;" onclick="acceptEventChallenge(${event.id})">
                                Accept Challenge (+${event.reward} XP)
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.acceptEventChallenge = function (eventId) {
        const event = displayedEvents.find(e => e.id === eventId);
        if (!event) return;

        activeChallengeId = eventId;
        const actionArea = document.getElementById(`action-area-${eventId}`);
        if (!actionArea) return;

        // Hide other action areas or just this one? Let's just do this one for now.
        actionArea.innerHTML = `
            <div class="riddle-box" style="animation: fadeIn 0.4s ease;">
                <p style="color: #fff; font-size: 13px; margin-bottom: 10px;"><strong>Challenge:</strong> "${event.question}"</p>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="riddle-input-${eventId}" placeholder="Answer..." style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-size: 13px;">
                    <button class="btn btn-primary btn-sm" style="background: ${event.color}; border-color: ${event.color};" onclick="submitEventAnswer(${eventId})">Solve</button>
                </div>
                <p id="feedback-${eventId}" style="margin-top: 8px; font-size: 12px; display: none;"></p>
            </div>
        `;
        document.getElementById(`riddle-input-${eventId}`).focus();
    };

    window.submitEventAnswer = function (eventId) {
        const event = displayedEvents.find(e => e.id === eventId);
        if (!event) return;

        const input = document.getElementById(`riddle-input-${eventId}`);
        const feedback = document.getElementById(`feedback-${eventId}`);
        const answer = input.value.trim().toLowerCase();

        feedback.style.display = 'block';
        if (event.answers.includes(answer)) {
            feedback.style.color = '#00ff88';
            feedback.innerHTML = `✨ Correct! +${event.reward} XP granted!`;

            // Mark as completed
            const completedIds = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
            completedIds.push(eventId);
            localStorage.setItem('completedEventIds', JSON.stringify(completedIds));

            // Award XP
            const state = getGameState();
            if (state.player) {
                state.player.totalXpEarned = (state.player.totalXpEarned || 0) + event.reward;
                state.player.xp += event.reward;

                while (state.player.xp >= 100 && state.player.level < 100) {
                    state.player.xp -= 100;
                    state.player.level++;
                }

                localStorage.setItem('gameState', JSON.stringify(state));

                setTimeout(() => {
                    alert(`Anomality Resolved! You gained ${event.reward} XP!`);
                    loadEvents(); // Refresh grid to remove completed and show new if available
                }, 1000);
            }
        } else {
            feedback.style.color = '#ff4444';
            feedback.innerHTML = '❌ Incorrect. Data loop failed.';
            input.value = '';
            input.focus();
        }
    };


    async function fetchData(url, loadingEl, contentEl, renderFn) {
        showLoading(loadingEl, contentEl);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameState: getGameState() })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            renderFn(data, contentEl);
            hideLoading(loadingEl, contentEl);
        } catch (err) {
            console.error(`Error fetching ${url}:`, err);
            showError(contentEl, loadingEl, err.message, () => fetchData(url, loadingEl, contentEl, renderFn));
        }
    }

    function fetchStats() {
        // Use POST to send local state
        fetchData('/stats', elements.statsLoading, elements.statsContent, renderStats);
    }
    function fetchBadges() {
        fetchData('/badges', elements.badgesLoading, elements.badgesContent, renderBadges);
    }
    function fetchQuests() {
        fetchData('/daily-quests', elements.questsLoading, elements.questsContent, renderQuests);
    }

    // Render functions (Logic unchanged but context aware)
    function renderStats(data, container) {
        const p = data.player;
        const s = data.stats;
        const stats = data.statistics;

        container.innerHTML = `
            <div class="grid-layout">
                <div class="glass-panel stat-card">
                    <div class="stat-header">⭐ Current Level</div>
                    <div class="stat-value-lg">${p.level}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${p.xp} / 100 XP</div>
                    <div class="progress-container"><div class="progress-bar" style="width: ${p.xp}%"></div></div>
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header">${data.title.icon} Title</div>
                    <div class="stat-value-lg" style="font-size: 24px;">${data.title.name}</div>
                    <div style="font-size: 14px; opacity: 0.8;">Next: ${data.title.nextTitle}</div>
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header">💪 Core Stats</div>
                    ${renderAttr('Health', s.health)}
                    ${renderAttr('Focus', s.focus)}
                    ${renderAttr('Energy', s.energy)}
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header">🔥 Activity</div>
                    <div class="stat-row"><span>Streak</span> <strong>${data.streaks.current} days</strong></div>
                    <div class="stat-row"><span>Total Messages</span> <strong>${stats.totalMessages}</strong></div>
                    <div class="stat-row"><span>Total XP</span> <strong>${stats.totalXpEarned}</strong></div>
                </div>
            </div>`;

        // Render Chart
        setTimeout(() => renderXPChart(p), 100);
    }

    function renderBadges(data, container) {
        const earnedHtml = data.earned.length > 0
            ? data.earned.map(b => getBadgeHtml(b)).join('')
            : '<div style="opacity:0.6; padding:10px;">No badges yet. Keep playing!</div>';
        const lockedHtml = data.locked.map(b => getBadgeHtml(b, true)).join('');
        container.innerHTML = `
            <div class="glass-panel stat-card" style="margin-bottom: 20px;">
                <div class="stat-header">🏆 Progress: ${data.totalEarned} / ${data.totalAvailable}</div>
            </div>
            <h3 style="margin: 0 0 15px 0;">Unlocked</h3><div class="badges-grid">${earnedHtml}</div>
            <h3 style="margin: 30px 0 15px 0;">Locked</h3><div class="badges-grid">${lockedHtml}</div>`;
    }

    function renderQuests(data, container) {
        if (!data.quests || data.quests.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; opacity: 0.7;">No quests active.</div>`;
            return;
        }
        const list = data.quests.map(q => `
            <div class="quest-item ${q.completed ? 'completed' : ''}">
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${q.title}</div>
                    <div style="font-size: 13px; opacity: 0.7;">Progress: ${q.progress}/${q.target} • Reward: ${q.xp} XP</div>
                </div>
                <div class="quest-status">${q.completed ? '✅' : '⏳'}</div>
            </div>
        `).join('');
        container.innerHTML = `
            <div class="glass-panel stat-card" style="margin-bottom: 20px;">
                <div class="stat-header">📋 Daily Progress: ${data.completedCount} / ${data.totalQuests}</div>
                ${data.completionBonus > 0 ? '<div style="color:#00ff88; margin-top:5px;">🎉 +100 XP Bonus Active!</div>' : ''}
            </div>
            <div class="quests-list">${list}</div>`;
    }

    function renderAttr(label, val) {
        let color = val > 70 ? '#00ff88' : (val > 40 ? '#ffaa00' : '#ff3366');
        return `
            <div class="stat-row"><span>${label}</span><strong>${val}/100</strong></div>
            <div class="progress-container" style="height: 4px; margin: 4px 0 10px 0;">
                <div class="progress-bar" style="width: ${val}%; background: ${color}"></div>
            </div>`;
    }

    function getBadgeHtml(badge, isLocked = false) {
        return `
            <div class="badge-item ${isLocked ? 'badge-locked' : ''}">
                <div class="badge-icon">${isLocked ? '🔒' : badge.name.split(' ')[0]}</div>
                <div class="badge-name">${badge.name}</div>
                <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;">${badge.description}</div>
            </div>`;
    }

    function showLoading(loadingEl, contentEl) {
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
    }
    function hideLoading(loadingEl, contentEl) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
    }
    function showError(contentEl, loadingEl, msg, retryFn) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) {
            contentEl.style.display = 'block';
            contentEl.innerHTML = `<div style="padding: 20px; text-align: center; border: 1px solid #ff3366; background: rgba(255, 50, 100, 0.1);">
                <div style="color: #ff3366; font-weight: bold; margin-bottom: 10px;">⚠️ Connection Error</div>
                <button id="retry-btn" class="btn btn-primary">Retry</button>
            </div>`;
            contentEl.querySelector('#retry-btn').onclick = retryFn;
        }
    }

    async function loadWeeklyQuests() {
        const loading = document.getElementById('weekly-loading');
        const content = document.getElementById('weekly-content');
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';

        try {
            const res = await fetch('/weekly-quests', {
                method: 'POST', // Changed from GET
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameState: getGameState() })
            });
            if (!res.ok) throw new Error('Failed to fetch weekly quests');
            const data = await res.json();
            const { quests, completionBonus } = data;

            if (!content) return;
            if (!quests || quests.length === 0) {
                content.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center;">No weekly quests.</div>';
                return;
            }

            const list = quests.map(q => {
                const percent = Math.min(100, Math.round((q.progress / q.target) * 100));
                const isDone = q.completed;
                return `<div class="quest-item ${isDone ? 'completed' : ''}" style="border-left-color: #9d4edd; background: rgba(157, 78, 221, 0.1);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${q.title}</div>
                            <div style="font-size: 13px; opacity: 0.7;">Progress: ${q.progress}/${q.target} • Reward: ${q.xp} XP</div>
                            <div class="quest-progress-bar" style="margin-top: 8px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                <div class="quest-progress-fill" style="width: ${percent}%; background: #9d4edd; height: 100%;"></div>
                            </div>
                        </div>
                        <div class="quest-status" style="font-size: 20px; margin-left: 15px;">${isDone ? '✅' : '📅'}</div>
                    </div>`;
            }).join('');

            let bonusHtml = '';
            if (completionBonus > 0 && quests.every(q => q.completed)) {
                bonusHtml = `<div style="margin-top: 20px; padding: 15px; border: 1px solid #9d4edd; border-radius: 12px; text-align: center;">🎉 Weekly Bonus! +${completionBonus} XP</div>`;
            }
            content.innerHTML = `<div class="quests-list">${list}</div>${bonusHtml}`;

        } catch (error) {
            console.error(error);
            if (content) content.innerHTML = '<div class="error-state">Failed to load quests.</div>';
        } finally {
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        }
    }
});


function renderXPChart(player) {
    const canvas = document.getElementById('xp-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Simple responsive width
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = 200;

    // Mock data logic 
    const currentXP = player.totalXpEarned || 0;
    const dataPoints = [
        Math.max(0, currentXP - 500),
        Math.max(0, currentXP - 350),
        Math.max(0, currentXP - 200),
        Math.max(0, currentXP - 120),
        Math.max(0, currentXP - 60),
        Math.max(0, currentXP - 20),
        currentXP
    ];

    const maxVal = Math.max(...dataPoints, 100);
    const padding = 30;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;

    ctx.clearRect(0, 0, w, h);

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(0, 210, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 210, 255, 0)');

    // Draw Line
    ctx.beginPath();
    const step = chartW / (dataPoints.length - 1);
    dataPoints.forEach((val, i) => {
        const x = padding + (i * step);
        const y = h - padding - ((val / maxVal) * chartH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fill
    ctx.lineTo(padding + (dataPoints.length - 1) * step, h - padding);
    ctx.lineTo(padding, h - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Points
    dataPoints.forEach((val, i) => {
        const x = padding + (i * step);
        const y = h - padding - ((val / maxVal) * chartH);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// --- Particle System for Dashboard ---
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
            const colors = ['rgba(255, 255, 255, 0.4)', 'rgba(100, 200, 255, 0.5)', 'rgba(200, 100, 255, 0.5)'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
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
        for (let i = 0; i < 160; i++) {
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


