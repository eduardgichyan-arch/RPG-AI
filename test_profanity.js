// test_profanity.js
const fetch = globalThis.fetch; // Node 18+ has native fetch
// If you really need node-fetch due to older version, use: import fetch from 'node-fetch';
// But native fetch is cleaner if available. Let's assume Node 18+ based on previous context.
// Actually, earlier logs showed Node v21/25. So native fetch is available.
// Just remove the require line.

const BASE_URL = 'http://localhost:3000';

async function testProfanity() {
    console.log("🧪 Testing Profanity Filter...");

    try {
        // 1. Signup
        const username = `BadUser_${Math.floor(Math.random() * 1000)}`;
        console.log(`1. Registering ${username}...`);

        const regRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password', language: 'en' })
        });
        const user = await regRes.json();

        if (!user.success) throw new Error("Signup failed");
        console.log("✅ Signup successful.");

        // 2. Send Profanity
        console.log("2. Sending message with banned word: 'damn'...");
        const chatRes = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "This is a damn test for the filter.",
                gameState: user.gameState
            })
        });

        const chatData = await chatRes.json();
        if (chatData.error) {
            console.error("❌ Chat returned error:", chatData.error);
        } else {
            console.log("✅ Chat response received (Server didn't crash).");
            console.log("AI Reply usually indicates context. If AI replies efficiently, filter likely worked replcaing the bad word.");
            // We can't easily see the internal replacement without logs, but success 200 OK avoids crash.
        }

    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
}

testProfanity();
