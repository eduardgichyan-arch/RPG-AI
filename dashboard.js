// dashboard.js - Complete Rewrite for Robustness

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // State
    const state = {
        stats: null,
        badges: null,
        quests: null
    };

    // --- Tab Switching Logic ---
    const tabBtns = elements.tabs;
    const tabContents = elements.contents;

    // Handle tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Deactivate all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Load content if needed
            if (tabId === 'stats') fetchStats();
            if (tabId === 'badges') fetchBadges();
            if (tabId === 'quests') fetchQuests();
            if (tabId === 'weekly') loadWeeklyQuests(); // Call the new function
        });
    });

    // Initial load
    fetchStats(); // Changed from loadStats() to fetchStats() to match existing pattern

    // --- Data Loading Logic ---

    // The original loadDataForTab is now partially replaced by direct calls in the tab switching logic.
    // Keeping it for existing fetchers that might still use it or for future expansion.
    function loadDataForTab(tabId) {
        if (tabId === 'stats') fetchStats();
        if (tabId === 'badges') fetchBadges();
        if (tabId === 'quests') fetchQuests();
        // No need to add 'weekly' here as it's handled directly in the click handler
    }

    // Generic Fetcher with Error Handling
    async function fetchData(url, loadingEl, contentEl, renderFn) {
        showLoading(loadingEl, contentEl);
        try {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            console.log(`Received data from ${url}`, data);
            renderFn(data, contentEl);
            hideLoading(loadingEl, contentEl);
        } catch (err) {
            console.error(`Error fetching ${url}:`, err);
            showError(contentEl, loadingEl, err.message, () => fetchData(url, loadingEl, contentEl, renderFn));
        }
    }

    // Specific Fetchers
    function fetchStats() {
        fetchData('/stats', elements.statsLoading, elements.statsContent, renderStats);
    }

    function fetchBadges() {
        fetchData('/badges', elements.badgesLoading, elements.badgesContent, renderBadges);
    }

    function fetchQuests() {
        fetchData('/daily-quests', elements.questsLoading, elements.questsContent, renderQuests);
    }

    // --- Render Functions ---

    function renderStats(data, container) {
        // Use the "One Ring" /stats endpoint structure
        const p = data.player;
        const s = data.stats;
        const stats = data.statistics;

        container.innerHTML = `
            <div class="grid-layout">
                <!-- Level Card -->
                <div class="glass-panel stat-card">
                    <div class="stat-header">⭐ Current Level</div>
                    <div class="stat-value-lg">${p.level}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${p.xp} / 100 XP</div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${p.xp}%"></div>
                    </div>
                </div>

                <!-- Title Card -->
                <div class="glass-panel stat-card">
                    <div class="stat-header">${data.title.icon} Title</div>
                    <div class="stat-value-lg" style="font-size: 24px;">${data.title.name}</div>
                    <div style="font-size: 14px; opacity: 0.8;">Next: ${data.title.nextTitle}</div>
                </div>

                <!-- Attributes -->
                <div class="glass-panel stat-card">
                    <div class="stat-header">💪 Core Stats</div>
                    ${renderAttr('Health', s.health)}
                    ${renderAttr('Focus', s.focus)}
                    ${renderAttr('Energy', s.energy)}
                </div>

                <!-- Activity -->
                <div class="glass-panel stat-card">
                    <div class="stat-header">🔥 Activity</div>
                    <div class="stat-row"><span>Streak</span> <strong>${data.streaks.current} days</strong></div>
                    <div class="stat-row"><span>Total Messages</span> <strong>${stats.totalMessages}</strong></div>
                    <div class="stat-row"><span>Total XP</span> <strong>${stats.totalXpEarned}</strong></div>
                </div>
            </div>
        `;
    }

    function renderBadges(data, container) {
        // data = { earned: [], locked: [], ... }

        const earnedHtml = data.earned.length > 0
            ? data.earned.map(b => getBadgeHtml(b)).join('')
            : '<div style="opacity:0.6; padding:10px;">No badges yet. Keep playing!</div>';

        const lockedHtml = data.locked.map(b => getBadgeHtml(b, true)).join('');

        container.innerHTML = `
            <div class="glass-panel stat-card" style="margin-bottom: 20px;">
                <div class="stat-header">🏆 Progress: ${data.totalEarned} / ${data.totalAvailable}</div>
            </div>

            <h3 style="margin: 0 0 15px 0;">Unlocked</h3>
            <div class="badges-grid">${earnedHtml}</div>

            <h3 style="margin: 30px 0 15px 0;">Locked</h3>
            <div class="badges-grid">${lockedHtml}</div>
        `;
    }

    function renderQuests(data, container) {
        // data = { quests: [], completedCount: N, ... }

        if (!data.quests || data.quests.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; opacity: 0.7;">
                No quests active. Send a message in chat to generate new quests!
            </div>`;
            return;
        }

        const list = data.quests.map(q => `
            <div class="quest-item ${q.completed ? 'completed' : ''}">
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${q.title}</div>
                    <div style="font-size: 13px; opacity: 0.7;">
                        Progress: ${q.progress}/${q.target} • Reward: ${q.xp} XP
                    </div>
                </div>
                <div class="quest-status">${q.completed ? '✅' : '⏳'}</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="glass-panel stat-card" style="margin-bottom: 20px;">
                <div class="stat-header">📋 Daily Progress: ${data.completedCount} / ${data.totalQuests}</div>
                ${data.completionBonus > 0 ? '<div style="color:#00ff88; margin-top:5px;">🎉 +100 XP Bonus Active!</div>' : ''}
            </div>
            <div class="quests-list">${list}</div>
        `;
    }

    // --- Helpers ---

    function renderAttr(label, val) {
        let color = '#ff3366'; // Red
        if (val > 40) color = '#ffaa00'; // Orange
        if (val > 70) color = '#00ff88'; // Green

        return `
            <div class="stat-row">
                <span>${label}</span>
                <strong>${val}/100</strong>
            </div>
            <div class="progress-container" style="height: 4px; margin: 4px 0 10px 0;">
                <div class="progress-bar" style="width: ${val}%; background: ${color}"></div>
            </div>
        `;
    }

    function getBadgeHtml(badge, isLocked = false) {
        return `
            <div class="badge-item ${isLocked ? 'badge-locked' : ''}">
                <div class="badge-icon">${isLocked ? '🔒' : badge.name.split(' ')[0]}</div>
                <div class="badge-name">${badge.name}</div>
                <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;">${badge.description}</div>
            </div>
        `;
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
            contentEl.innerHTML = `
                <div style="padding: 20px; text-align: center; border: 1px solid #ff3366; border-radius: 8px; background: rgba(255, 50, 100, 0.1);">
                    <div style="color: #ff3366; font-weight: bold; margin-bottom: 10px;">⚠️ Unstable Connection</div>
                    <div style="margin-bottom: 15px; opacity: 0.8;">${msg}</div>
                    <button id="retry-btn" class="btn btn-primary" style="padding: 5px 15px; font-size: 14px;">Retry</button>
                </div>
            `;

            contentEl.querySelector('#retry-btn').onclick = retryFn;
        }
    }

    // Initialize
    loadDataForTab('stats');

    async function loadWeeklyQuests() {
        const loading = document.getElementById('weekly-loading');
        const content = document.getElementById('weekly-content');

        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';

        try {
            const res = await fetch('/weekly-quests');
            if (!res.ok) throw new Error('Failed to fetch weekly quests');

            const data = await res.json();
            const { quests, completionBonus } = data;

            if (!content) return;

            if (!quests || quests.length === 0) {
                content.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center; opacity: 0.7;">No weekly quests active. Check back next Monday!</div>';
                return;
            }

            const list = quests.map(q => {
                const percent = Math.min(100, Math.round((q.progress / q.target) * 100));
                const isDone = q.completed;

                return `
                    <div class="quest-item ${isDone ? 'completed' : ''}" style="border-left-color: #9d4edd; background: rgba(157, 78, 221, 0.1);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${q.title}</div>
                            <div style="font-size: 13px; opacity: 0.7;">
                                Progress: ${q.progress}/${q.target} • Reward: ${q.xp} XP
                            </div>
                            <div class="quest-progress-bar" style="margin-top: 8px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                <div class="quest-progress-fill" style="width: ${percent}%; background: #9d4edd; height: 100%;"></div>
                            </div>
                        </div>
                        <div class="quest-status" style="font-size: 20px; margin-left: 15px;">${isDone ? '✅' : '📅'}</div>
                    </div>
                `;
            }).join('');

            let bonusHtml = '';
            if (completionBonus > 0 && quests.every(q => q.completed)) {
                bonusHtml = `
                    <div style="margin-top: 20px; padding: 15px; background: rgba(157, 78, 221, 0.2); border: 1px solid #9d4edd; border-radius: 12px; text-align: center;">
                        <h3 style="margin: 0 0 5px 0;">🎉 Weekly Bonus Unlocked!</h3>
                        <p style="margin: 0;">You earned an extra <strong>${completionBonus} XP</strong>!</p>
                    </div>
                `;
            }

            content.innerHTML = `<div class="quests-list">${list}</div>${bonusHtml}`;

        } catch (error) {
            console.error(error);
            if (content) content.innerHTML = '<div class="error-state" style="padding: 20px; text-align: center; color: #ff3366;">Failed to load quests. Please try again.</div>';
        } finally {
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        }
    }
});
