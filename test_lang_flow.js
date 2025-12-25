import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testLanguageFlow() {
    console.log("🧪 Testing Language Support Flow...");

    // 1. Signup with Russian
    const username = `TestUser_${Math.floor(Math.random() * 10000)}`;
    console.log(`\n1. Registering user: ${username} with language: 'ru'`);

    try {
        const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: "password123",
                language: "ru"
            })
        });

        const signupData = await signupRes.json();

        if (!signupData.success) {
            console.error("❌ Signup failed:", signupData);
            return;
        }

        console.log("✅ Signup successful!");
        console.log("   Player ID:", signupData.playerId);
        console.log("   Language in GameState:", signupData.gameState.player.language);

        if (signupData.gameState.player.language !== 'ru') {
            console.error("❌ ERROR: Language was not saved correctly! Expected 'ru', got:", signupData.gameState.player.language);
        } else {
            console.log("✅ Language 'ru' verified in profile.");
        }

        // 2. Test Chat Response (Mocking the AI call since we don't want to waste tokens or wait too long, but let's try the real endpoint if it's fast enough or check logic)
        // Actually, we'll hit the real endpoint.
        console.log("\n2. Sending chat message to check AI system prompt...");

        const chatRes = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Hello", // Sending in English, expecting Russian response due to system prompt
                gameState: signupData.gameState
            })
        });

        const chatData = await chatRes.json();
        const reply = chatData.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log("   AI Reply:", reply);

        // Simple heuristic check for Cyrillic
        const hasCyrillic = /[а-яА-Я]/.test(reply);
        if (hasCyrillic) {
            console.log("✅ AI replied with Cyrillic characters.");
        } else {
            console.warn("⚠️ AI did not reply in Cyrillic. Validating if this is an issue or just a short English 'Hello' response.");
        }

    } catch (e) {
        console.error("❌ Test failed execution:", e);
    }
}

testLanguageFlow();
