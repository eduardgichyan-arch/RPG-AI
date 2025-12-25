// dashboard.js - Stable Version (Reverted Oracle/Complex Hints)

const SHOP_DATA = [
    { id: "neon_green_bubble", name: "Neon Green Bubble", cost: 500, type: "cosmetic", icon: "🟢", desc: "Unlock a vibrant neon green chat bubble style." },
    { id: "cyber_blue_bubble", name: "Cyber Blue Bubble", cost: 500, type: "cosmetic", icon: "🔵", desc: "Cool cybernetic blue bubble style." },
    { id: "plasma_pink_bubble", name: "Plasma Pink Bubble", cost: 500, type: "cosmetic", icon: "🟣", desc: "Hot plasma pink chat bubble style." },
    { id: "void_purple_bubble", name: "Void Purple Bubble", cost: 500, type: "cosmetic", icon: "🔮", desc: "Deep void purple chat bubble style." },
    { id: "solar_orange_bubble", name: "Solar Orange Bubble", cost: 500, type: "cosmetic", icon: "🟠", desc: "Blazing solar orange chat bubble style." },
    { id: "streak_freeze", name: "Streak Freeze", cost: 200, type: "consumable", icon: "🧊", desc: "Protect your streak for one day if you miss it." },
    { id: "matrix_theme", name: "Matrix Theme", cost: 1000, type: "cosmetic", icon: "🕶️", desc: "Unlock the legendary Matrix coding rain theme." }
];

const SKILLS_DATA = [
    { id: "neural_efficiency_1", name: "Neural Efficiency", cost: 1, reqLevel: 3, icon: "🧠", desc: "Gain +10% XP from all messages." },
    { id: "focus_master", name: "Focus Master", cost: 1, reqLevel: 5, icon: "🧘", desc: "Daily Focus quests require 20% less focus." },
    { id: "hacker_instinct", name: "Hacker's Instinct", cost: 2, reqLevel: 10, icon: "💻", desc: "Oracle hints cost 50% less XP." }
];

document.addEventListener('DOMContentLoaded', async () => {
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
        questsLoading: document.getElementById('quests-loading'),
        weeklyContent: document.getElementById('weekly-content'),
        weeklyLoading: document.getElementById('weekly-loading'),
        eventsContent: document.getElementById('events-content'),
        eventsLoading: document.getElementById('events-loading'),
        shopContent: document.getElementById('market'), // Added for shop tab
        skillsContent: document.getElementById('skills'), // Added for skills tab
        hero: {
            name: document.getElementById('heroName'),
            title: document.getElementById('heroTitle'),
            level: document.getElementById('heroLevel'),
            streak: document.getElementById('heroStreak'),
            energy: document.getElementById('heroEnergy'),
            focus: document.getElementById('heroFocus')
        },
        toast: document.getElementById('toastContainer')
    };

    // Tab Logic
    let previousTab = 'stats'; // Track the previously active tab
    elements.tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            // Clear event cache when navigating away from events tab
            if (previousTab === 'events' && btn.getAttribute('data-tab') !== 'events') {
                // Clear all riddlesSession keys from sessionStorage
                const sessionKey = `riddlesSession_${new Date().toDateString()} `;
                sessionStorage.removeItem(sessionKey);
                console.log('Events cache cleared - fresh questions will load on next visit');
            }

            elements.tabs.forEach(b => b.classList.remove('active'));
            elements.contents.forEach(c => c.classList.remove('active'));
            // Hide all contents explicitly first to be safe
            elements.contents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('hidden'); // Remove 'hidden' class if used for initial state
            });

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.style.display = 'block';
                targetContent.classList.add('active');
            }

            // Update previous tab tracker
            previousTab = tabId;

            const state = getGameState(); // Get current game state for rendering
            if (tabId === 'stats') window.fetchStats();
            if (tabId === 'badges') window.fetchBadges();
            if (tabId === 'quests') window.fetchQuests();
            if (tabId === 'weekly') window.fetchWeeklyQuests();
            if (tabId === 'events') window.fetchEvents();
            if (tabId === 'market') renderShop(state); // Render shop when tab is active
            if (tabId === 'skills') renderSkills(state); // Render skills when tab is active
        });
    });

    // Initial Load
    setTimeout(() => {
        const state = getGameState();
        if (state && state.player && state.player.language) {
            window.applyLanguage(state.player.language);
        }

        if (window.fetchStats) window.fetchStats();
    }, 100);

    // Language Switcher Logic
    const langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
        langSwitcher.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            window.applyLanguage(newLang);

            // Re-render dynamic content
            if (elements.hero.name) elements.hero.name.textContent = getGameState().player?.name || 'Traveler';
            window.fetchStats(); // This refreshes most dynamic content

            // Sync with backend
            const state = JSON.parse(localStorage.getItem('gameState'));
            if (state && state.player) {
                try {
                    await fetch('/auth/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            playerId: state.player.playerId,
                            gameState: state
                        })
                    });
                    console.log("Language verified synced to server");
                } catch (err) {
                    console.error("Sync failed:", err);
                }
            }
        });
    }

    document.getElementById('refreshDash')?.addEventListener('click', () => {
        window.showToast?.('Scanning frequencies...', 'success');
        window.fetchStats?.();
        window.fetchBadges?.();
        window.fetchQuests?.();
        window.fetchWeeklyQuests?.();
        window.fetchEvents?.();
        const state = getGameState();
        renderShop(state);
        renderSkills(state);
    });

    // Anti-Cheat: Reshuffle events when window regains focus (prevents chat-and-back cheating)
    window.addEventListener('focus', () => {
        const currentTab = document.querySelector('.tab-content.active')?.id;
        if (currentTab === 'events' && window.fetchEvents) {
            window.fetchEvents();
        }
    });

    // Clear event cache when navigating away from dashboard page entirely
    window.addEventListener('beforeunload', () => {
        const sessionKey = `riddlesSession_${new Date().toDateString()} `;
        sessionStorage.removeItem(sessionKey);
    });

    // --- CORE FETCHERS ---

    // --- LANGUAGE SYSTEM ---
    async function applyLanguage(lang) {
        window.applyLanguage(lang);
    }

    function getTrans(key) {
        return window.getTrans(key);
    }

    async function fetchData(url, loading, content, renderFn) {
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';

        try {
            const gameState = getGameState();
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameState })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            renderFn(data, content);

            // Re-apply language after render if needed (mostly for static parts indide standard frames)
            if (gameState && gameState.player && gameState.player.language) {
                applyLanguage(gameState.player.language);
            }
            // 🎨 Apply Theme Globally
            if (gameState && gameState.player) {
                applyTheme(gameState.player);
            }

            if (loading) loading.style.display = 'none';

            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        } catch (err) {
            console.error(err);
            if (content) content.innerHTML = `<div class="error-msg">Signal Lost: ${err.message}</div>`;
        } finally {
            // Ensure loading indicator is hidden and content is shown even on error
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        }
    }

    const fetchStats = () => { fetchData('/stats', elements.statsLoading, elements.statsContent, renderStats); };
    const fetchBadges = () => { fetchData('/badges', elements.badgesLoading, elements.badgesContent, renderBadges); };
    const fetchQuests = () => { fetchData('/daily-quests', elements.questsLoading, elements.questsContent, renderQuests); };
    const fetchWeeklyQuests = () => { fetchData('/weekly-quests', elements.weeklyLoading, elements.weeklyContent, renderWeekly); };

    window.fetchStats = fetchStats;
    window.fetchBadges = fetchBadges;
    window.fetchQuests = fetchQuests;
    window.fetchWeeklyQuests = fetchWeeklyQuests;
    window.fetchEvents = fetchEvents;

    // --- RENDERERS ---

    function renderStats(data, container) {
        const p = data.player;
        const s = data.stats;
        const stats = data.statistics;

        if (elements.hero.name) elements.hero.name.textContent = p.name;
        if (elements.hero.title) elements.hero.title.textContent = data.title.name;
        if (elements.hero.level) elements.hero.level.textContent = p.level;
        if (elements.hero.streak) elements.hero.streak.textContent = `${stats.totalDaysActive || p.streak || 0} d`;
        if (elements.hero.energy) elements.hero.energy.textContent = `${s.energy}% `;
        if (elements.hero.focus) elements.hero.focus.textContent = `${s.focus}% `;

        container.innerHTML = `
            <div class="grid-layout">
                <div class="glass-panel stat-card">
                    <div class="stat-header" data-i18n="current_level_header">Current Level</div>
                    <div class="stat-value-lg">${p.level}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${p.xp} / 100 XP</div>
                    <div class="progress-container"><div class="progress-bar" style="width: ${p.xp}%"></div></div>
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header"><span class="badge-icon">${data.title.icon}</span> <span data-i18n="hero_title_label">Title</span></div>
                    <div class="stat-value-lg" style="font-size: 24px;">${data.title.name}</div>
                    <div style="font-size: 14px; opacity: 0.8;"><span data-i18n="next_title">Next</span>: ${data.title.nextTitle}</div>
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header" data-i18n="core_stats_section">Core Stats</div>
                    <div class="stat-row"><span data-i18n="energy">Energy</span> <strong>${s.energy}%</strong></div>
                    <div class="stat-row"><span data-i18n="focus">Focus</span> <strong>${s.focus}%</strong></div>
                    <div class="stat-row"><span data-i18n="health">Health</span> <strong>${s.health}%</strong></div>
                </div>
                <div class="glass-panel stat-card">
                    <div class="stat-header" data-i18n="activity_section">Activity</div>
                    <div class="stat-row"><span data-i18n="streak">Streak</span> <strong>${p.streak} days</strong></div>
                    <div class="stat-row"><span data-i18n="total_msgs">Total Msgs</span> <strong>${stats.totalMessages}</strong></div>
                    <div class="stat-row"><span data-i18n="total_xp">Total XP</span> <strong>${stats.totalXpEarned}</strong></div>
                </div>
            </div>
    `;

        // 1v1 Arena Lock
        const arenaBtn = document.getElementById('arena-btn');
        if (arenaBtn) {
            if (p.level < 5) {
                arenaBtn.style.opacity = '0.5';
                arenaBtn.style.cursor = 'not-allowed';
                arenaBtn.innerHTML = '🔒 1v1 Arena (Lvl 5)';
                arenaBtn.onclick = (e) => { e.preventDefault(); alert("Reach Level 5 to unlock the Arena!"); };
            } else {
                arenaBtn.style.opacity = '1';
                arenaBtn.style.cursor = 'pointer';
                arenaBtn.setAttribute('data-i18n', 'arena_btn'); // Ensure it gets translated
                arenaBtn.innerHTML = '⚔️ 1v1 Arena';
                arenaBtn.onclick = null;
            }
        }
    }

    function renderBadges(data, container) {
        const earnedBadges = data.earned.map(b => `
            <div class="badge-card" style="position: relative; overflow: hidden; border: 2px solid rgba(0,210,255,0.3); background: linear-gradient(135deg, rgba(0,210,255,0.1), rgba(255,0,153,0.05)); padding: 20px; border-radius: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 0 20px rgba(0,210,255,0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;">
                <span style="font-size: 80px; filter: drop-shadow(0 0 20px rgba(0,210,255,0.6)); transition: all 0.3s ease;" class="badge-icon">${b.icon || '🏆'}</span>
                <div style="font-size: 15px; font-weight: 700; color: #00d2ff;">${b.name}</div>
                <div style="font-size: 11px; opacity: 0.7; line-height: 1.4;">${b.description || ''}</div>
            </div>
    `).join('');
        const lockedBadges = data.locked.map(b => `
            <div class="badge-card" style="position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.3); padding: 20px; border-radius: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; opacity: 0.4; transition: all 0.3s ease;">
                <span style="font-size: 80px; filter: grayscale(100%) brightness(0.5);">${b.icon || '🔒'}</span>
                <div style="font-size: 15px; font-weight: 600; opacity: 0.6;">${b.name}</div>
                <div style="font-size: 11px; opacity: 0.5; line-height: 1.4;">${b.description || ''}</div>
            </div>
    `).join('');
        const allBadges = earnedBadges + lockedBadges;
        container.innerHTML = `
            <style>
                .badge-card:hover { transform: scale(1.15) rotate(2deg); box-shadow: 0 0 40px rgba(0, 210, 255, 0.5); }
                .badge-card:hover .badge-icon { transform: scale(1.1); filter: drop-shadow(0 0 30px rgba(0, 210, 255, 0.9)); }
            </style>
            <div class="badges-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 15px;">${allBadges || '<div style="grid-column: 1/-1; text-align:center; padding: 40px; opacity: 0.5;">No badges defined.</div>'}</div>
`;
    }

    function renderQuests(data, container) {
        const list = data.quests.map(q => `
            <div class="quest-item ${q.completed ? 'completed' : ''}">
                <div>
                    <div style="font-weight: 600;">${q.title}</div>
                    <div style="font-size: 11px; opacity: 0.7;"><span data-i18n="reward">Reward</span>: ${q.xp} XP</div>
                </div>
                <div>${q.progress}/${q.target}</div>
            </div>
    `).join('');
        container.innerHTML = `<div class="quests-list">${list || 'No daily quests.'}</div>`;
    }

    function renderWeekly(data, container) {
        const list = data.quests.map(q => `<div class="quest-item">${q.title} (${q.progress}/${q.target})</div>`).join('');
        container.innerHTML = `<div class="quests-list">${list || 'No weekly quests.'}</div>`;
    }

    async function renderShop(state) {
        const container = document.getElementById('shop-container');
        const creditEl = document.getElementById('market-credits');

        if (!container) return;

        const credits = state.player.credits || 0;
        const inventory = state.player.inventory || [];
        const equippedTheme = state.player.equippedTheme || null;

        if (creditEl) creditEl.textContent = credits;

        container.innerHTML = SHOP_DATA.map(item => {
            const owned = inventory.includes(item.id);
            const canAfford = credits >= item.cost;
            const isEquipped = equippedTheme === item.id;

            let btnText = "Purchase";
            let btnAction = `buyItem('${item.id}')`;
            let btnClass = canAfford ? "btn-primary" : "ghost-btn";
            let btnDisabled = !canAfford;

            if (owned) {
                if (isEquipped) {
                    btnText = "Equipped";
                    btnAction = "";
                    btnClass = "ghost-btn";
                    btnDisabled = true;
                } else {
                    btnText = "Equip";
                    btnAction = `equipItem('${item.id}')`;
                    btnClass = "btn-primary"; // Accented for action
                    btnDisabled = false;
                }
            }

            return `
            <div class="glass-panel" style="padding: 20px; border: 1px solid ${isEquipped ? 'var(--primary-color)' : (owned ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')}; display: flex; flex-direction: column; justify-content: space-between; box-shadow: ${isEquipped ? '0 0 15px rgba(0, 210, 255, 0.2)' : 'none'}">
                <div>
                    <div style="font-size: 32px; margin-bottom: 10px;">${item.icon}</div>
                    <h4 style="margin-bottom: 5px;">${item.name}</h4>
                    <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 15px;">${item.desc}</p>
                </div>
                <div>
                     <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: ${canAfford || owned ? '#fff' : '#ff4444'};">
                        ${owned ? (isEquipped ? 'ACTIVE' : 'OWNED') : `${item.cost} Credits`}
                     </div>
                     <button class="btn btn-sm ${btnClass}" 
                        style="width: 100%;"
                        onclick="${btnDisabled ? '' : btnAction}"
                        ${btnDisabled ? 'disabled' : ''}>
                        ${btnText}
                     </button>
                </div>
            </div>
            `;
        }).join('');
    }

    window.equipItem = async function (itemId) {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        try {
            const res = await fetch('/shop/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, itemId })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('gameState', JSON.stringify(data.gameState));
                renderShop(data.gameState);

                // Update Theme & Sidebar immediately
                if (window.applyTheme) window.applyTheme(data.gameState.player);
                // Also update stats if needed (usually handled by renderShop refreshing state usage elsewhere)

                // Optional: Show success toast
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("Equip failed");
        }
    };

    window.buyItem = async function (itemId) {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        if (!confirm("Purchase this item?")) return;

        try {
            const res = await fetch('/shop/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, itemId })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('gameState', JSON.stringify(data.gameState));
                renderShop(data.gameState);
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("Purchase failed");
        }
    };

    async function renderSkills(state) {
        const container = document.getElementById('skills-container');
        const spEl = document.getElementById('skill-points');

        if (!container) return;

        const sp = state.player.skillPoints || 0;
        const unlocked = state.player.unlockedSkills || [];
        const level = state.player.level || 1;

        if (spEl) spEl.textContent = sp;

        container.innerHTML = SKILLS_DATA.map((skill, index) => {
            const isUnlocked = unlocked.includes(skill.id);
            const canUnlock = !isUnlocked && sp >= skill.cost && level >= skill.reqLevel;
            const requirementsMet = level >= skill.reqLevel;

            // Visual Connector Line (except for last one)
            const line = index < SKILLS_DATA.length - 1 ?
                `<div style="width: 2px; height: 30px; background: rgba(255,255,255,0.1); margin: 0 auto;"></div>` : '';

            return `
            <div class="glass-panel skill-node" style="width: 100%; padding: 20px; border: 1px solid ${isUnlocked ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; opacity: ${requirementsMet ? 1 : 0.5}; box-shadow: ${isUnlocked ? '0 0 15px rgba(255,0,153,0.3)' : 'none'};">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div style="font-size: 32px; width: 50px; text-align: center;">${skill.icon}</div>
                    <div style="flex: 1;">
                        <h4 style="color: ${isUnlocked ? 'var(--accent-color)' : '#fff'}">${skill.name}</h4>
                        <p style="font-size: 13px; color: var(--text-muted); margin: 5px 0;">${skill.desc}</p>
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 5px;">
                            ${isUnlocked ? '<span style="color:var(--accent-color)">ACTIVE</span>' :
                    `Req: Lvl ${skill.reqLevel} • Cost: ${skill.cost} SP`}
                        </div>
                    </div>
                    <div>
                         <button class="btn btn-sm ${isUnlocked ? 'ghost-btn' : (canUnlock ? 'btn-primary' : 'ghost-btn')}"
                            style="min-width: 80px; ${isUnlocked ? 'border-color:var(--accent-color); color:var(--accent-color);' : ''}"
                            onclick="${canUnlock ? `unlockSkill('${skill.id}')` : ''}"
                            ${!canUnlock ? 'disabled' : ''}>
                            ${isUnlocked ? 'Active' : (canUnlock ? 'Unlock' : 'Locked')}
                         </button>
                    </div>
                </div>
            </div>
            ${line}
            `;
        }).join('');
    }

    window.unlockSkill = async function (skillId) {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        if (!confirm("Unlock this neural upgrade?")) return;

        try {
            const res = await fetch('/skills/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, skillId })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('gameState', JSON.stringify(data.gameState));
                renderSkills(data.gameState);
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("Unlock failed");
        }
    };

    // --- EVENTS SYSTEM (Stable) ---

    // Note: Assuming EVENT_POOL is defined above or global. If it was inside prev block, my replacement might cut it.
    // Wait, the previous block I'm replacing ENDS at line 486 which is basically the end of file (except helpers).
    // The previous text had EVENT_POOL inside it. I MUST include it if I'm replacing the whole block.
    // Since I'm replacing lines 99-486, I am replacing a huge chunk.
    // I should probably refrain from replacing EVENT_POOL if I can, but the prompt says 512 lines total.
    // Line 99 is `async function applyLanguage(lang) {
    // `.
    // Line 257 is `const EVENT_POOL = [`
    // I will include EVENT_POOL to be safe.

    const EVENT_POOL = [
        { id: 1, title: "The Cosmic Oracle", npcName: "Oracle X-7", question: "What has keys but can't open locks?", answers: ['piano', 'keyboard'], hint: "It's a musical instrument.", hint2: "It has white and black keys.", reward: 500, color: "#ff00ff", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Oracle" },
        { id: 2, title: "The Cryptic Merchant", npcName: "Nexus Trader", question: "I speak without a mouth and hear without ears. What am I?", answers: ['echo'], hint: "You hear this in a canyon.", hint2: "It repeats what you say.", reward: 600, color: "#bc13fe", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Merchant" },
        { id: 3, title: "The Binary Ghost", npcName: "Ghost.exe", question: "The more of this there is, the less you see. What is it?", answers: ['darkness', 'dark'], hint: "It comes at night.", hint2: "Turn on the lights to make it go away.", reward: 450, color: "#00d2ff", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Ghost" },
        { id: 4, title: "Data Sentry", npcName: "Sentry-9", question: "What has to be broken before you can use it?", answers: ['egg'], hint: "You eat this for breakfast.", hint2: "A chicken comes from it.", reward: 400, color: "#00ff88", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Sentry" },
        { id: 5, title: "Void Weaver", npcName: "V-Weaver", question: "What gets wetter as it dries?", answers: ['towel'], hint: "Used after a shower.", hint2: "It's thick, soft, and absorbs water.", reward: 450, color: "#6a0dad", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Weaver" },
        { id: 6, title: "The Chrono-Guard", npcName: "T-8000", question: "What travels around the world but stays in a corner?", answers: ["stamp"], hint: "You put it on mail.", hint2: "It's small and adhesive.", reward: 500, color: "#f1c40f", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Chrono" },
        { id: 7, title: "Lumina Siphon", npcName: "Photon", question: "The more of me you take, the more you leave behind. What am I?", answers: ["footsteps", "footstep"], hint: "You do this while walking.", hint2: "Look back as you walk on sand.", reward: 550, color: "#e67e22", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Photon" },
        { id: 8, title: "The Silent Sentinel", npcName: "Void-1", question: "What is so fragile that saying its name breaks it?", answers: ["silence"], hint: "The absence of sound.", hint2: "Shhh...", reward: 600, color: "#95a5a6", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Void" },
        { id: 10, title: "The Echo Weaver", npcName: "Aura", question: "What can you catch but not throw?", answers: ["cold"], hint: "You might sneeze.", hint2: "It's an illness.", reward: 450, color: "#1abc9c", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Aura" },
        { id: 11, title: "Gravity Nullifier", npcName: "Zero-G", question: "What has many teeth but never bites?", answers: ["comb"], hint: "Used for hair.", hint2: "It's a grooming tool.", reward: 400, color: "#9b59b6", image: "https://api.dicebear.com/7.x/bottts/svg?seed=ZeroG" },
        { id: 12, title: "The Memory Core", npcName: "RAM-bot", question: "What has hands but cannot clap?", answers: ["clock"], hint: "Tells the time.", hint2: "It has a face and numbers.", reward: 500, color: "#34495e", image: "https://api.dicebear.com/7.x/bottts/svg?seed=RAM" },
        { id: 13, title: "Glitch Hunter", npcName: "Patches", question: "What has a thumb and four fingers but is not alive?", answers: ["glove"], hint: "Worn on hands.", hint2: "It keeps your hand warm or protected.", reward: 450, color: "#e74c3c", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Patches" },
        { id: 14, title: "The Neural Link", npcName: "Synapse", question: "What belongs to you but others use it more than you do?", answers: ["name"], hint: "People call you by this.", hint2: "It was given to you at birth.", reward: 500, color: "#2ecc71", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Synapse" },
        { id: 15, title: "Phase Shifter", npcName: "Blink", question: "If you drop me, I'm sure to crack, but give me a smile and I'll always smile back. What am I?", answers: ["mirror"], hint: "Shows your reflection.", hint2: "It's made of glass.", reward: 550, color: "#4B0082", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Blink" },
        { id: 16, title: "The Data Kraken", npcName: "Tentacle-9", question: "What has a head and a tail but no body?", answers: ["coin"], hint: "Used for money.", hint2: "You flip it.", reward: 400, color: "#d35400", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Kraken" },
        { id: 17, title: "Cipher Specter", npcName: "Ghost-64", question: "I'm tall when I'm young, and I'm short when I'm old. What am I?", answers: ["candle"], hint: "Used for light.", hint2: "Made of wax.", reward: 450, color: "#f39c12", image: "https://api.dicebear.com/7.x/bottts/svg?seed=Specter" }
    ];

    let activeEvents = [];
    let eventStates = {}; // Track { reward, hintsTaken } per event ID

    async function fetchEvents() {
        const container = elements.eventsContent;
        const loading = elements.eventsLoading;
        showLoading(loading, container);

        try {
            // Check if we have cached riddles for this session
            const sessionKey = `riddlesSession_${new Date().toDateString()}`;
            let cachedRiddles = sessionStorage.getItem(sessionKey);

            if (cachedRiddles) {
                // Use cached riddles with validation
                try {
                    activeEvents = JSON.parse(cachedRiddles);
                } catch (parseError) {
                    console.warn('Bad cache, clearing');
                    sessionStorage.removeItem(sessionKey);
                    cachedRiddles = null;
                }
            }

            if (!cachedRiddles) {
                // Try to generate new riddles via AI
                try {
                    const res = await fetch('/generate-riddles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!res.ok) throw new Error(`API ${res.status}`);
                    const data = await res.json();
                    activeEvents = data.riddles || [];

                    // Cache for session
                    sessionStorage.setItem(sessionKey, JSON.stringify(activeEvents));
                } catch (apiError) {
                    console.warn('AI failed, using static pool:', apiError.message);
                    const completed = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
                    const available = EVENT_POOL.filter(e => !completed.includes(e.id));
                    const shuffled = available.sort(() => 0.5 - Math.random());
                    activeEvents = shuffled.slice(0, 3);
                }
            }

            // Filter out completed ones
            const completed = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
            activeEvents = activeEvents.filter(e => !completed.includes(e.id));

            // Initialize states
            activeEvents.forEach(e => {
                if (!eventStates[e.id]) {
                    eventStates[e.id] = { reward: e.reward, hintsTaken: 0 };
                }
            });

            renderEvents(activeEvents, container);
            hideLoading(loading, container);
        } catch (error) {
            console.error('Critical error in fetchEvents:', error);
            // Last resort: use static pool
            try {
                const completed = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
                const available = EVENT_POOL.filter(e => !completed.includes(e.id));
                const shuffled = available.sort(() => 0.5 - Math.random());
                activeEvents = shuffled.slice(0, 3);

                if (activeEvents.length > 0) {
                    activeEvents.forEach(e => {
                        if (!eventStates[e.id]) {
                            eventStates[e.id] = { reward: e.reward, hintsTaken: 0 };
                        }
                    });
                    renderEvents(activeEvents, container);
                } else {
                    container.innerHTML = '<div style="text-align:center; padding:40px; color:#ffaa00;">All anomalies cleared! Check back later.</div>';
                }
            } catch (fallbackError) {
                container.innerHTML = '<div style="text-align:center; padding:40px; color:#ff4444;">System error. Please refresh the page.</div>';
            }
            hideLoading(loading, container);
        }
    }

    function renderEvents(events, container) {
        if (events.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px;">No available anomalies.</div>';
            return;
        }

        const potentialLabel = getTrans('current_potential') || 'Current Potential';
        const acceptLabel = getTrans('accept_challenge') || 'Accept Challenge';

        container.innerHTML = `
        <div class="events-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        ${events.map(e => {
            const currentReward = eventStates[e.id].reward;
            return `
                    <div class="glass-panel event-card" style="border-top: 4px solid ${e.color}; padding: 25px; display: flex; flex-direction: column; min-height: 200px; animation: fadeIn 0.5s ease-out;">
                        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
                            <img src="${e.image}" style="width: 55px; height: 55px; border-radius: 10px; border: 2px solid ${e.color}55;">
                            <div>
                                <h4 style="margin:0; font-size: 1rem;">${e.title}</h4>
                                <div style="font-size: 12px; color: ${e.color}; font-weight: 600;">${e.npcName}</div>
                            </div>
                        </div>
                        <p style="font-size: 14px; margin-bottom: 20px; color: #ccc;"><span data-i18n="current_potential">Current Potential</span>: <strong id="reward-val-${e.id}" style="color: #fff; font-size: 1.05rem;">+${currentReward} XP</strong></p>
                        <div id="action-${e.id}">
                            <button class="btn btn-primary" style="width:100%; font-weight: 600; padding: 10px;" onclick="startChallenge(${idCheck(e.id)})" data-i18n="accept_challenge">Accept Challenge</button>
                        </div>
                    </div>
                `;
        }).join('')
            }
            </div>
        `;
    }

    // Helper to ensure ID is passed correctly
    function idCheck(id) { return id; }

    window.startChallenge = function (id) {
        const e = activeEvents.find(ev => ev.id === id);
        const area = document.getElementById(`action-${id}`);
        const ph = getTrans('answer_placeholder') || 'Enter answer...';
        const solve = getTrans('solve') || 'Solve';
        const hint = getTrans('hint_deduct') || 'Hint (-50 XP)';

        area.innerHTML = `
            <p style="font-size:14px; margin-bottom:12px; line-height: 1.4; color: #eee;">"${e.question}"</p>
            <input type="text" id="input-${id}" placeholder="${ph}" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:white; padding:12px; border-radius:8px; margin-bottom:12px; font-size: 14px;">
            <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="solveChallenge(${id})" style="flex:2; font-weight: 600;">${solve}</button>
                <button class="btn" id="hint-btn-${id}" onclick="getHint(${id})" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); font-size: 13px;">${hint}</button>
            </div>
            <div id="hint-area-${id}" style="margin-top:15px; animation: slideDown 0.3s ease;"></div>
        `;
    };

    window.getHint = function (id) {
        const e = activeEvents.find(ev => ev.id === id);
        const state = eventStates[id];
        const area = document.getElementById(`hint-area-${id}`);
        const btn = document.getElementById(`hint-btn-${id}`);
        const rewardEl = document.getElementById(`reward-val-${id}`);

        if (state.hintsTaken === 0) {
            state.hintsTaken = 1;
            state.reward -= 50;
            area.innerHTML += `<p style="font-size:11px; color:#aaa; margin:2px 0;">Min Hint: ${e.hint}</p>`;
            btn.innerHTML = getTrans('hint_deduct_more') || 'Bit more? (-75 XP)';
            if (rewardEl) rewardEl.textContent = `+${state.reward} XP`;
        } else if (state.hintsTaken === 1) {
            state.hintsTaken = 2;
            state.reward -= 75;
            area.innerHTML += `<p style="font-size:11px; color:#aaa; margin:2px 0;">Max Hint: ${e.hint2}</p>`;
            btn.style.display = 'none';
            if (rewardEl) rewardEl.textContent = `+${state.reward} XP`;
        }
    };

    window.solveChallenge = function (id) {
        const e = activeEvents.find(ev => ev.id === id);
        const state = eventStates[id];
        const ans = document.getElementById(`input-${id}`).value.trim().toLowerCase();

        if (e.answers.includes(ans)) {
            const finalReward = state.reward;
            let gameState = getGameState();
            gameState.player.xp += finalReward;
            gameState.player.totalXpEarned += finalReward;
            gameState.player.credits = (gameState.player.credits || 0) + 100; // Reward: 100 Credits per Anomaly

            // Level up
            while (gameState.player.xp >= 100) {
                gameState.player.xp -= 100;
                gameState.player.level++;
            }

            const completed = JSON.parse(localStorage.getItem('completedEventIds') || '[]');
            completed.push(id);
            localStorage.setItem('completedEventIds', JSON.stringify(completed));
            localStorage.setItem('gameState', JSON.stringify(gameState));

            window.showToast(`${getTrans('anomaly_cleared') || 'Anomaly Cleared!'} +${finalReward} XP`, 'success');
            triggerFlash('success');
            fetchEvents();
            fetchStats();
        } else {
            window.showToast(getTrans('incorrect_coordinate') || 'Incorrect coordinate.', "error");
            triggerFlash('error');
        }
    };

    // --- HELPERS ---

    function getGameState() {
        return JSON.parse(localStorage.getItem('gameState') || '{}');
    }

    function showLoading(l, c) { if (l) l.style.display = 'block'; if (c) c.style.display = 'none'; }
    function hideLoading(l, c) { if (l) l.style.display = 'none'; if (c) c.style.display = 'block'; }

    window.showToast = function (message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.style.cssText = "background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); padding: 12px 20px; border-radius: 8px; margin-bottom: 10px; animation: slideIn 0.3s ease-out; color: white; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);";
        el.innerHTML = `<span style="color: ${type === 'success' ? '#10b981' : '#ef4444'}; font-size: 20px;">${type === 'success' ? '✓' : '⚠'}</span> <div>${message}</div>`;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-20px)';
            el.style.transition = 'all 0.4s ease';
            setTimeout(() => el.remove(), 400);
        }, 3200);
    };

    window.triggerFlash = triggerFlash;

    // --- ANIMATIONS ---
    const style = document.createElement('style');
    style.textContent = `
    @keyframes flash-green { 0% { opacity: 0; } 50% { opacity: 0.3; } 100% { opacity: 0; } }
    @keyframes flash-red { 0% { opacity: 0; } 50% { opacity: 0.4; } 100% { opacity: 0; } }
    .flash-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none; z-index: 9999; opacity: 0;
    }
    .flash-success { background: #10b981; animation: flash-green 0.8s ease-out; }
    .flash-error { background: #ef4444; animation: flash-red 0.8s ease-out; }
    `;
    document.head.appendChild(style);

    function triggerFlash(type) {
        const flash = document.createElement('div');
        flash.className = `flash-overlay flash-${type}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 850);
    }

    // --- VISUAL EFFECTS ENGINE ---
    const canvas = document.getElementById('particles-bg');
    let animationId = null;
    let effectType = 'particles';

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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0F0';
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

        window.setVisualMode = function (mode) {
            if (mode === effectType && animationId) return;
            if (animationId) cancelAnimationFrame(animationId);
            effectType = mode;
            if (mode === 'matrix') {
                initMatrix();
                animateMatrix();
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0)';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                initParticles();
                animateParticles();
            }
        };

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (effectType === 'matrix') initMatrix();
            else initParticles();
        });

        initParticles();
        animateParticles();
    }

    // --- THEME ENGINE ---
    window.applyTheme = function (player) {
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

        if (theme && inv.includes(theme)) {
            document.body.classList.add(theme);

            if (theme === 'matrix_theme') {
                if (window.setVisualMode) window.setVisualMode('matrix');
            } else {
                if (window.setVisualMode) window.setVisualMode('particles');
            }
        } else {
            if (window.setVisualMode) window.setVisualMode('particles');
        }
    }

}); // END
