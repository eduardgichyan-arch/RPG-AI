
const BASE_URL = 'http://localhost:3000';

async function testChatFlow() {
    console.log("🚀 Starting Chat Flow Test...");

    // 1. Send Chat Message
    console.log("Step 1: Sending Chat Message...");
    try {
        const res = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Hello AI" })
        });

        const data = await res.json();
        console.log("Response Status:", res.status);
        if (res.status !== 200) {
            console.error("❌ Error response:", data);
            throw new Error(`Chat failed with status ${res.status}`);
        }

        console.log("✅ Chat Response:", data.response);

    } catch (e) {
        console.error("❌ Test Failed:", e.message);
    }
}

testChatFlow();
