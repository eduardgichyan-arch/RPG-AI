// Node 18+ has native fetch
const BASE_URL = 'http://localhost:3000';

async function testQuizFlow() {
    console.log("🚀 Starting Quiz Flow Test...");

    // 1. Reset Game
    console.log("Step 1: Resetting Game...");
    const resetRes = await fetch(`${BASE_URL}/game-reset`, { method: 'POST' });
    if (!resetRes.ok) throw new Error("Reset failed");
    console.log("✅ Game Reset.");

    // 2. Check Status (Should be Unknown)
    console.log("Step 2: Checking Initial Status...");
    const statusRes = await fetch(`${BASE_URL}/game-status`);
    const statusData = await statusRes.json();
    console.log("Status:", statusData.player.personalityType);
    if (statusData.player.personalityType !== 'Unknown') throw new Error("Status verified incorrect");
    console.log("✅ Status Verified (Unknown).");

    // 3. Simulate Quiz Submission
    console.log("Step 3: Submitting Quiz Result...");
    const payload = {
        stats: {
            creativity: 80,
            productivity: 20,
            energy: 60,
            kindness: 40,
            awareness: 90
        },
        personalityType: "TEST"
    };

    const initRes = await fetch(`${BASE_URL}/init-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!initRes.ok) throw new Error(`Init Profile failed: ${initRes.status}`);
    const initData = await initRes.json();
    console.log("Init Response:", initData);

    // 4. Verify Persistence
    console.log("Step 4: Verifying Persistence...");
    const finalRes = await fetch(`${BASE_URL}/game-status`);
    const finalData = await finalRes.json();
    console.log("Final Type:", finalData.player.personalityType);

    if (finalData.player.personalityType !== 'TEST') throw new Error("Persistence failed");

    console.log("🎉 SUCCESS: Quiz Flow Logic is valid.");
}

testQuizFlow().catch(console.error);
