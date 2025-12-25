// battle-chat.js - SSE integration for battle chat page
let eventSource = null;
let localGameState = null;
let currentRoomCode = null;
let myRole = null;
let syncInterval = null;

const XP_LIMIT = 250;

document.addEventListener('DOMContentLoaded', () => {
    // Check for saved session
    const session = getSavedSession();
    if (!session) {
        alert('No active battle session. Redirecting to arena...');
        window.location.href = 'battle.html';
        return;
    }

    loadLocalState();
    currentRoomCode = session.code;
    myRole = session.role;

    // Connect to battle
    connectToBattle();
});

function loadLocalState() {
    try {
        const saved = localStorage.getItem('gameState');
        if (saved) localGameState = JSON.parse(saved);
    } catch (e) {
        console.error("Profile load fail:", e);
    }
}

function getSavedSession() {
    try {
        const saved = localStorage.getItem('arenaSession');
        if (!saved) return null;
        const session = JSON.parse(saved);
        if (Date.now() - session.timestamp > 3600000) return null;
        return session;
    } catch (e) {
        return null;
    }
}

async function connectToBattle() {
    // Update room code display
    document.getElementById('sidebar-room-code').textContent = currentRoomCode;

    // Fetch current state
    try {
        const response = await fetch(`/arena/state/${currentRoomCode}`);
        if (!response.ok) {
            alert('Battle room not found. Returning to arena...');
            window.location.href = 'battle.html';
            return;
        }

        const room = await response.json();

        // Determine which player we are
        const playerId = localGameState?.player?.playerId;
        const isHost = room.host && room.host.id === playerId;

        // Update UI with initial state
        if (isHost) {
            updatePlayerUI(room.host, 'you');
            if (room.guest) updatePlayerUI(room.guest, 'opponent');
        } else {
            updatePlayerUI(room.guest, 'you');
            updatePlayerUI(room.host, 'opponent');
        }

        updateStatus('BATTLE IN PROGRESS');

        // Connect SSE
        connectSSE();

        // Start XP sync
        startXPSync();

    } catch (err) {
        console.error('Failed to connect:', err);
        updateStatus('CONNECTION ERROR');
    }
}

function connectSSE() {
    if (eventSource) eventSource.close();

    eventSource = new EventSource(`/arena/stream/${currentRoomCode}`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleSSEMessage(data);
        } catch (e) {
            console.error('SSE parse error:', e);
        }
    };

    eventSource.onerror = () => {
        updateStatus('RECONNECTING...');
        setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
                connectSSE();
            }
        }, 3000);
    };
}

function handleSSEMessage(data) {
    switch (data.type) {
        case 'connected':
            console.log('SSE connected');
            break;

        case 'player_joined':
            if (myRole === 'host') {
                updatePlayerUI(data.player, 'opponent');
                updateStatus('OPPONENT JOINED!');
            }
            break;

        case 'xp_update':
            // Update opponent's XP if it's not us
            if ((myRole === 'host' && data.role === 'guest') ||
                (myRole === 'guest' && data.role === 'host')) {
                updateOpponentXP(data.xp);
            }
            break;

        case 'winner':
            showWinner(data.winner, data.role === myRole);
            break;

        case 'player_left':
            updateStatus('OPPONENT LEFT');
            break;
    }
}

function startXPSync() {
    sendXPUpdate();

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        loadLocalState();
        sendXPUpdate();
        updateSelfXP();
    }, 2000);
}

async function sendXPUpdate() {
    if (!currentRoomCode || !localGameState?.player) return;

    try {
        // Calculate Match XP
        const session = getSavedSession();
        const startXp = session ? session.startTotalXp : 0;
        const currentTotal = localGameState.player.totalXpEarned || 0;
        const matchXp = Math.max(0, currentTotal - startXp);

        await fetch(`/arena/update/${currentRoomCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: localGameState.player.playerId,
                xp: matchXp,
                totalXp: currentTotal
            })
        });
    } catch (err) {
        console.log('XP sync failed:', err.message);
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updatePlayerUI(player, role) {
    if (!player) return;

    const prefix = role === 'you' ? 'p1' : 'p2';
    const xp = player.xp || 0;
    const percent = Math.min(100, (xp / XP_LIMIT) * 100);

    // Sidebar (Desktop)
    const sAvatar = document.getElementById(`s-${prefix}-avatar`);
    const sName = document.getElementById(`s-${prefix}-name`);
    const sLevel = document.getElementById(`s-${prefix}-level`);
    const sXp = document.getElementById(`s-${prefix}-xp`);
    const sBar = document.getElementById(`s-${prefix}-bar`);

    if (sAvatar) sAvatar.textContent = player.name?.charAt(0) || '?';
    if (sName) sName.textContent = player.name || 'Unknown';
    if (sLevel) sLevel.textContent = `Level ${player.level || 1}`;
    if (sXp) sXp.textContent = `${xp}/${XP_LIMIT}`;
    if (sBar) sBar.style.width = percent + '%';

    // Mobile bar
    const mAvatar = document.getElementById(`m-${prefix}-avatar`);
    const mName = document.getElementById(`m-${prefix}-name`);
    const mXp = document.getElementById(`m-${prefix}-xp`);
    const mBar = document.getElementById(`m-${prefix}-bar`);

    if (mAvatar) mAvatar.textContent = player.name?.charAt(0) || '?';
    if (mName) mName.textContent = player.name || 'Unknown';
    if (mXp) mXp.textContent = `${xp}/${XP_LIMIT}`;
    if (mBar) mBar.style.width = percent + '%';
}

function updateSelfXP() {
    if (!localGameState?.player) return;

    if (!localGameState?.player) return;

    // Calculate Match XP
    const session = getSavedSession();
    const startXp = session ? session.startTotalXp : 0;
    const currentTotal = localGameState.player.totalXpEarned || 0;
    const xp = Math.max(0, currentTotal - startXp);

    const percent = Math.min(100, (xp / XP_LIMIT) * 100);

    // Sidebar
    const sXp = document.getElementById('s-p1-xp');
    const sBar = document.getElementById('s-p1-bar');
    if (sXp) sXp.textContent = `${xp}/${XP_LIMIT}`;
    if (sBar) sBar.style.width = percent + '%';

    // Mobile
    const mXp = document.getElementById('m-p1-xp');
    const mBar = document.getElementById('m-p1-bar');
    if (mXp) mXp.textContent = `${xp}/${XP_LIMIT}`;
    if (mBar) mBar.style.width = percent + '%';

    // Header
    const headerXp = document.getElementById('xp');
    if (headerXp) headerXp.textContent = `${xp}/${XP_LIMIT}`;

    const headerLevel = document.getElementById('level');
    if (headerLevel) headerLevel.textContent = localGameState.player.level || 1;
}

function updateOpponentXP(xp) {
    const percent = Math.min(100, (xp / XP_LIMIT) * 100);

    // Sidebar
    const sXp = document.getElementById('s-p2-xp');
    const sBar = document.getElementById('s-p2-bar');
    if (sXp) sXp.textContent = `${xp}/${XP_LIMIT}`;
    if (sBar) sBar.style.width = percent + '%';

    // Mobile
    const mXp = document.getElementById('m-p2-xp');
    const mBar = document.getElementById('m-p2-bar');
    if (mXp) mXp.textContent = `${xp}/${XP_LIMIT}`;
    if (mBar) mBar.style.width = percent + '%';
}

function updateStatus(text) {
    const el = document.getElementById('sidebar-status');
    if (el) {
        el.textContent = text;
        if (text.includes('ERROR') || text.includes('LEFT')) {
            el.style.background = 'rgba(255, 50, 100, 0.1)';
            el.style.color = '#ff3366';
        } else if (text.includes('PROGRESS') || text.includes('JOINED')) {
            el.style.background = 'rgba(0, 255, 0, 0.1)';
            el.style.color = '#00ff00';
        }
    }
}

function showWinner(winnerName, isMe) {
    const overlay = document.getElementById('winner-overlay');
    const emoji = document.getElementById('winner-emoji');
    const title = document.getElementById('winner-title');
    const text = document.getElementById('winner-text');

    if (isMe) {
        emoji.textContent = '🏆';
        title.textContent = 'VICTORY!';
        title.style.color = '#00ff00';
        text.textContent = 'You reached 250 XP first!';
    } else {
        emoji.textContent = '😢';
        title.textContent = 'DEFEAT';
        title.style.color = '#ff3366';
        text.textContent = `${winnerName} reached 250 XP first.`;
    }

    overlay.classList.add('show');

    // Stop syncing
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (eventSource) eventSource.close();
    if (syncInterval) clearInterval(syncInterval);
});
