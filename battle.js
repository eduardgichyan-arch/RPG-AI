// battle.js - SSE Edition (Simple & Reliable)
let currentRoomCode = null;
let eventSource = null;
let localGameState = null;
let myRole = null; // 'host' or 'guest'
let lobbyInterval = null;
let syncInterval = null;

const XP_LIMIT = 250;

document.addEventListener('DOMContentLoaded', () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) { window.location.href = 'signup.html'; return; }

    loadLocalState();
    setupEventListeners();

    // Check for active session (page was reloaded)
    const savedSession = getSavedSession();
    if (savedSession) {
        console.log("Restoring session:", savedSession);
        reconnectToRoom(savedSession.code, savedSession.role);
    } else {
        startLobbyPolling();
    }
});

function loadLocalState() {
    try {
        const saved = localStorage.getItem('gameState');
        if (saved) localGameState = JSON.parse(saved);
        console.log("Profile loaded:", localGameState?.player?.name);
    } catch (e) {
        console.error("Profile load fail:", e);
    }
}

function setupEventListeners() {
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinBtn').addEventListener('click', () => joinRoom());
    document.getElementById('quitBattleBtn').addEventListener('click', leaveRoom);
    document.getElementById('copyInviteBtn').addEventListener('click', copyInviteLink);
    document.getElementById('resetAppBtn').addEventListener('click', () => {
        if (confirm("Clear cache and start over?")) {
            localStorage.clear();
            window.location.href = 'signup.html';
        }
    });
}

function showStatus(msg, color = "white") {
    const el = document.getElementById('lobbyStatus');
    if (el) {
        el.textContent = msg;
        el.style.color = color;
    }
}

// ============================================================================
// LOBBY
// ============================================================================

function startLobbyPolling() {
    refreshLobby();
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = setInterval(refreshLobby, 5000);
}

async function refreshLobby() {
    if (currentRoomCode) return; // Don't poll if in a room

    try {
        const response = await fetch('/arena/lobby');
        if (!response.ok) return;
        const rooms = await response.json();

        const listEl = document.getElementById('lobbyList');
        const noRoomsMsg = document.getElementById('noRoomsMsg');
        if (!listEl) return;

        listEl.innerHTML = '';

        if (rooms.length === 0) {
            if (noRoomsMsg) {
                noRoomsMsg.style.display = 'block';
                listEl.appendChild(noRoomsMsg);
            }
            return;
        }

        rooms.forEach(room => {
            // Don't show my own room
            if (room.code === currentRoomCode) return;

            const div = document.createElement('div');
            div.className = 'glass-panel';
            div.style = 'margin-bottom: 12px; padding: 18px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);';
            div.innerHTML = `
                <div style="text-align: left;">
                    <div style="font-weight: bold; font-size: 16px; color: var(--primary-color);">${room.hostName}'s Arena</div>
                    <div style="font-size: 11px; opacity: 0.5;">Level ${room.hostLevel} • Code: ${room.code}</div>
                </div>
                <button class="btn btn-primary" onclick="joinRoom('${room.code}')">JOIN</button>
            `;
            listEl.appendChild(div);
        });
    } catch (err) {
        console.log("Lobby poll failed:", err.message);
    }
}

// ============================================================================
// CREATE ROOM
// ============================================================================

async function createRoom() {
    if (!localGameState?.player) {
        showStatus("Error: No player data", "red");
        return;
    }

    showStatus("Creating arena...", "var(--primary-color)");

    try {
        const response = await fetch('/arena/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: localGameState.player.playerId,
                playerName: localGameState.player.name,
                playerLevel: localGameState.player.level
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        currentRoomCode = data.code;
        myRole = 'host';
        // Start XP from now
        const startTotalXp = localGameState.player.totalXpEarned || 0;
        saveSession(currentRoomCode, myRole, startTotalXp);  // Persist session

        console.log("Room created:", currentRoomCode);
        showBattleArena();
        updateGoEarnXpBtn(); // Check button state
        connectSSE();
        startXPSync();

        document.getElementById('battleStatus').textContent = "WAITING FOR OPPONENT...";
        document.getElementById('battleStatus').style.color = "var(--primary-color)";

    } catch (err) {
        console.error("Create room failed:", err);
        showStatus("Failed to create room: " + err.message, "red");
    }
}

// ============================================================================
// JOIN ROOM
// ============================================================================

async function joinRoom(code = null) {
    if (!localGameState?.player) {
        showStatus("Error: No player data", "red");
        return;
    }

    const roomCode = (code || document.getElementById('roomIdInput').value).trim().toUpperCase();
    if (!roomCode) {
        showStatus("Please enter a room code", "red");
        return;
    }

    showStatus("Joining arena...", "var(--primary-color)");

    try {
        const response = await fetch(`/arena/join/${roomCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: localGameState.player.playerId,
                playerName: localGameState.player.name,
                playerLevel: localGameState.player.level
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        currentRoomCode = roomCode;
        myRole = 'guest';
        // Start XP from now
        const startTotalXp = localGameState.player.totalXpEarned || 0;
        saveSession(currentRoomCode, myRole, startTotalXp);  // Persist session

        console.log("Joined room:", currentRoomCode);

        // Show opponent (host) info
        updateOpponentUI(data.host);

        showBattleArena();
        updateGoEarnXpBtn(); // Check button state
        connectSSE();
        startXPSync();

        document.getElementById('battleStatus').textContent = "CONNECTED!";
        document.getElementById('battleStatus').style.color = "#00ff00";

    } catch (err) {
        console.error("Join room failed:", err);
        showStatus("Failed to join: " + err.message, "red");
    }
}

// ============================================================================
// SSE CONNECTION
// ============================================================================

function connectSSE() {
    if (eventSource) {
        eventSource.close();
    }

    console.log("Opening SSE stream for room:", currentRoomCode);
    eventSource = new EventSource(`/arena/stream/${currentRoomCode}`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("SSE received:", data);
            handleSSEMessage(data);
        } catch (e) {
            console.error("SSE parse error:", e);
        }
    };

    eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        document.getElementById('battleStatus').textContent = "CONNECTION ISSUE";
        document.getElementById('battleStatus').style.color = "orange";
    };
}

function handleSSEMessage(data) {
    switch (data.type) {
        case 'connected':
            console.log("SSE connected, room state:", data.room);
            // Update UI with current state
            if (myRole === 'host' && data.room.guest) {
                updateOpponentUI(data.room.guest);
            } else if (myRole === 'guest' && data.room.host) {
                updateOpponentUI(data.room.host);
            }
            break;

        case 'player_joined':
            console.log("Player joined:", data.player);
            if (myRole === 'host') {
                updateOpponentUI(data.player);
                document.getElementById('battleStatus').textContent = "OPPONENT JOINED!";
                document.getElementById('battleStatus').style.color = "#00ff00";

                // Show button!
                updateGoEarnXpBtn(true);
            }
            break;

        case 'xp_update':
            // Only update opponent if it's not me
            if ((myRole === 'host' && data.role === 'guest') ||
                (myRole === 'guest' && data.role === 'host')) {
                updateOpponentXP(data.xp, data.totalXp);
            }
            break;

        case 'winner':
            showWinner(data.winner, data.role === myRole);
            break;

        case 'player_left':
            document.getElementById('battleStatus').textContent = "OPPONENT LEFT";
            document.getElementById('battleStatus').style.color = "orange";
            updateGoEarnXpBtn(false); // Hide button
            break;
    }
}

// ============================================================================
// XP SYNC
// ============================================================================

function startXPSync() {
    // Send initial state
    sendXPUpdate();

    // Sync every 2 seconds
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        // Reload game state in case it changed (user chatting in another tab)
        loadLocalState();
        sendXPUpdate();
        updateSelfUI();
    }, 2000);
}

async function sendXPUpdate() {
    if (!currentRoomCode || !localGameState?.player) return;

    try {
        // Calculate Match XP (Current Total - Start Total)
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
        console.log("XP sync failed:", err.message);
    }
}

// ============================================================================
// LEAVE ROOM
// ============================================================================

async function leaveRoom() {
    // Clear session first
    clearSession();

    if (currentRoomCode && localGameState?.player) {
        try {
            await fetch(`/arena/leave/${currentRoomCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: localGameState.player.playerId
                })
            });
        } catch (err) {
            console.log("Leave failed:", err.message);
        }
    }

    // Cleanup
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }

    currentRoomCode = null;
    myRole = null;

    // Show lobby
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('battleArena').style.display = 'none';

    // Restart lobby polling
    startLobbyPolling();
}

// ============================================================================
// UI UPDATES
// ============================================================================

function showBattleArena() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('battleArena').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomCode;
    updateSelfUI();

    // Stop lobby polling while in battle
    if (lobbyInterval) {
        clearInterval(lobbyInterval);
        lobbyInterval = null;
    }
}

function updateSelfUI() {
    if (!localGameState?.player) return;
    const p = localGameState.player;
    document.getElementById('p1Name').textContent = p.name;
    document.getElementById('p1Avatar').textContent = p.name.charAt(0);
    document.getElementById('p1Level').textContent = `LEVEL ${p.level}`;
    // Display Match XP for self
    const session = getSavedSession();
    const startXp = session ? session.startTotalXp : 0;
    const currentTotal = p.totalXpEarned || 0;
    const matchXp = Math.max(0, currentTotal - startXp);

    document.getElementById('p1Xp').textContent = `${matchXp}/${XP_LIMIT}`;
    document.getElementById('p1Bar').style.width = Math.min(100, (matchXp / XP_LIMIT) * 100) + "%";
    document.getElementById('p1TotalXp').textContent = (p.totalXpEarned || 0).toLocaleString();
}

function updateOpponentUI(player) {
    if (!player) return;
    document.getElementById('p2Name').textContent = player.name;
    document.getElementById('p2Avatar').textContent = player.name.charAt(0);
    document.getElementById('p2Level').textContent = `LEVEL ${player.level}`;
    document.getElementById('p2Xp').textContent = `${player.xp || 0}/${XP_LIMIT}`;
    document.getElementById('p2Bar').style.width = Math.min(100, ((player.xp || 0) / XP_LIMIT) * 100) + "%";
    document.getElementById('p2TotalXp').textContent = (player.totalXp || 0).toLocaleString();
}

function updateOpponentXP(xp, totalXp) {
    document.getElementById('p2Xp').textContent = `${xp}/${XP_LIMIT}`;
    document.getElementById('p2Bar').style.width = Math.min(100, (xp / XP_LIMIT) * 100) + "%";
    document.getElementById('p2TotalXp').textContent = (totalXp || 0).toLocaleString();

    document.getElementById('battleStatus').textContent = "BATTLE IN PROGRESS";
    document.getElementById('battleStatus').style.color = "#00ff00";
}

function showWinner(winnerName, isMe) {
    const statusEl = document.getElementById('battleStatus');
    if (isMe) {
        statusEl.textContent = "🎉 YOU WIN! 🎉";
        statusEl.style.color = "#00ff00";
    } else {
        statusEl.textContent = `${winnerName} WINS!`;
        statusEl.style.color = "orange";
    }

    // Stop syncing
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

function copyInviteLink() {
    const url = window.location.origin + window.location.pathname + "?room=" + currentRoomCode;
    navigator.clipboard.writeText(url).then(() => {
        const span = document.getElementById('copyInviteBtn').querySelector('span');
        span.textContent = "✅ COPIED!";
        setTimeout(() => span.textContent = "🔗 COPY INVITE LINK", 2000);
    });
}

// Handle room code from URL
const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');
if (roomFromUrl) {
    document.addEventListener('DOMContentLoaded', () => {
        // Only join from URL if we don't have a saved session
        if (!getSavedSession()) {
            document.getElementById('roomIdInput').value = roomFromUrl;
            setTimeout(() => joinRoom(roomFromUrl), 500);
        }
    });
}

// ============================================================================
// SESSION PERSISTENCE
// ============================================================================

function saveSession(code, role, startTotalXp) {
    if (startTotalXp === undefined) startTotalXp = 0;
    localStorage.setItem('arenaSession', JSON.stringify({ code, role, startTotalXp, timestamp: Date.now() }));
}

function getSavedSession() {
    try {
        const saved = localStorage.getItem('arenaSession');
        if (!saved) return null;

        const session = JSON.parse(saved);

        // Expire sessions older than 1 hour
        if (Date.now() - session.timestamp > 3600000) {
            clearSession();
            return null;
        }

        return session;
    } catch (e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('arenaSession');
}

async function reconnectToRoom(code, role) {
    if (!localGameState?.player) {
        console.error("Cannot reconnect: no player data");
        clearSession();
        startLobbyPolling();
        return;
    }

    showStatus("Reconnecting to arena...", "var(--primary-color)");

    try {
        // Check if room still exists
        const response = await fetch(`/arena/state/${code}`);

        if (!response.ok) {
            console.log("Room no longer exists, clearing session");
            clearSession();
            startLobbyPolling();
            showStatus("Previous room ended", "orange");
            return;
        }

        const room = await response.json();

        // Verify we're still in the room
        const playerId = localGameState.player.playerId;
        const isHost = room.host && room.host.id === playerId;
        const isGuest = room.guest && room.guest.id === playerId;

        if (!isHost && !isGuest) {
            console.log("We're no longer in this room");
            clearSession();
            startLobbyPolling();
            showStatus("You were removed from the room", "orange");
            return;
        }

        // Reconnect!
        currentRoomCode = code;
        myRole = isHost ? 'host' : 'guest';

        showBattleArena();
        connectSSE();
        startXPSync();

        // Update opponent UI
        if (isHost && room.guest) {
            updateOpponentUI(room.guest);
            document.getElementById('battleStatus').textContent = "RECONNECTED!";
        } else if (isGuest && room.host) {
            updateOpponentUI(room.host);
            document.getElementById('battleStatus').textContent = "RECONNECTED!";
        } else {
            document.getElementById('battleStatus').textContent = "WAITING FOR OPPONENT...";
        }
        document.getElementById('battleStatus').style.color = "#00ff00";

        console.log("Successfully reconnected to room:", code);

    } catch (err) {
        console.error("Reconnect failed:", err);
        clearSession();
        startLobbyPolling();
        showStatus("Reconnect failed: " + err.message, "red");
    }
}

// Expose for onclick handlers
window.joinRoom = joinRoom;


function updateGoEarnXpBtn(forceState = null) {
    const btn = document.getElementById('goEarnXpBtn');
    if (!btn) return;

    if (forceState !== null) {
        btn.style.display = forceState ? 'inline-block' : 'none';
        return;
    }

    // Auto-detect
    // Check if we have an opponent in the UI (quick check)
    // Or check room state if available.
    // simpler: If I am host, do I have a guest? If I am guest, I always have a host (conceptually)
    // but guests join *into* a host.

    // Actually, joinRoom updates opponent UI immediately.
    // createRoom does NOT have an opponent yet.

    // We can check if the opponent card has a name other than "Waiting..."
    const p2Name = document.getElementById('p2Name').textContent;
    const hasOpponent = p2Name !== "Waiting..." && p2Name !== "Opponent";

    btn.style.display = hasOpponent ? 'inline-block' : 'none';
}

// Ensure button state on load/reconnect
const originalShowBattleArena = showBattleArena;
window.showBattleArena = function () {
    originalShowBattleArena();
    updateGoEarnXpBtn();
};
