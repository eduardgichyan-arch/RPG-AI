// quiz.js - Personality Quiz Logic

document.addEventListener('DOMContentLoaded', () => {
    checkQuizStatus();
});

async function checkQuizStatus() {
    try {
        const res = await fetch('/game-status');
        const data = await res.json();

        // If personality is unknown or missing, show quiz
        if (!data.player.personalityType || data.player.personalityType === "Unknown") {
            startQuiz();
        }
    } catch (e) {
        console.error("Could not check quiz status", e);
    }
}

const questions = [
    {
        id: 1,
        text: "I make friends easily.",
        stat: "energy",
        weight: 10
    },
    {
        id: 2,
        text: "I have a vivid imagination.",
        stat: "creativity",
        weight: 10
    },
    {
        id: 3,
        text: "I worry about things.",
        stat: "awareness",
        weight: 10
    },
    {
        id: 4,
        text: "I trust others.",
        stat: "kindness",
        weight: 10
    },
    {
        id: 5,
        text: "I complete tasks successfully.",
        stat: "productivity",
        weight: 10
    },
    {
        id: 6,
        text: "I get angry easily.",
        stat: "awareness", // High reactivity/awareness
        weight: 10
    },
    {
        id: 7,
        text: "I love large parties.",
        stat: "energy",
        weight: 10
    },
    {
        id: 8,
        text: "I believe that art is important.",
        stat: "creativity",
        weight: 10
    },
    {
        id: 9,
        text: "I use my time wisely.",
        stat: "productivity",
        weight: 10
    },
    {
        id: 10,
        text: "I like to make people feel welcome.",
        stat: "kindness",
        weight: 10
    }
];

let currentQuestion = 0;
let userScores = {
    creativity: 50,
    productivity: 50,
    energy: 50,
    kindness: 50,
    awareness: 50
};

function startQuiz() {
    // Reset State
    currentQuestion = 0;
    userScores = {
        creativity: 50,
        productivity: 50,
        energy: 50,
        kindness: 50,
        awareness: 50
    };

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.id = 'quiz-overlay';
    overlay.className = 'quiz-overlay';
    overlay.innerHTML = `
        <div class="glass-panel quiz-container">
            <div class="quiz-header">
                <h2>✨ Setup Your Profile</h2>
                <div class="progress-bar-bg">
                    <div id="quiz-progress" class="progress-bar-fill" style="width: 0%"></div>
                </div>
            </div>
            
            <div id="quiz-content">
                <!-- Question injected here -->
            </div>

            <div class="quiz-footer">
                <span id="q-counter">Question 1 of ${questions.length}</span>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    showQuestion(0);
}

function showQuestion(index) {
    const q = questions[index];
    const content = document.getElementById('quiz-content');
    const progress = document.getElementById('quiz-progress');
    const counter = document.getElementById('q-counter');

    progress.style.width = `${((index) / questions.length) * 100}%`;
    counter.textContent = `Question ${index + 1} of ${questions.length}`;

    // Fade out
    content.style.opacity = 0;

    setTimeout(() => {
        content.innerHTML = `
            <div class="question-text">${q.text}</div>
            <div class="likert-label">How accurate is this for you?</div>
            <div class="options-grid">
                <button class="quiz-btn" onclick="answerQuestion(1)">Very Inaccurate</button>
                <button class="quiz-btn" onclick="answerQuestion(2)">Inaccurate</button>
                <button class="quiz-btn" onclick="answerQuestion(3)">Neutral</button>
                <button class="quiz-btn" onclick="answerQuestion(4)">Accurate</button>
                <button class="quiz-btn" onclick="answerQuestion(5)">Very Accurate</button>
            </div>
        `;
        content.style.opacity = 1;
    }, 200);
}

window.answerQuestion = function (value) {
    try {
        if (currentQuestion >= questions.length) return; // Prevention

        const q = questions[currentQuestion];
        if (!q) {
            console.error("Invalid question index:", currentQuestion);
            finishQuiz();
            return;
        }

        // Calculate score change (1-5 scale)
        const impact = (value - 3) * 10;

        if (userScores[q.stat] !== undefined) {
            userScores[q.stat] += impact;
            userScores[q.stat] = Math.max(0, Math.min(100, userScores[q.stat]));
        }

        currentQuestion++;

        if (currentQuestion < questions.length) {
            showQuestion(currentQuestion);
        } else {
            finishQuiz();
        }
    } catch (e) {
        console.error("Quiz Error:", e);
        alert("Something went wrong with the quiz. Please refresh.");
    }
};

async function finishQuiz() {
    const type = calculatePersonalityType();

    // Show loading
    const content = document.getElementById('quiz-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px;"><span class="loading-spinner"></span> Analyzing Personality...</div>`;

    try {
        // Save to server
        const res = await fetch('/init-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stats: userScores,
                personalityType: type
            })
        });

        if (res.ok) {
            showResult(type);
        } else {
            console.error("Failed to save profile");
            alert("Error saving profile. Please refresh.");
        }
    } catch (e) {
        console.error(e);
    }
}

function calculatePersonalityType() {
    // Simple logic to generate a 4-letter code like "ISIP"
    // Just an example mapping based on highest stats
    const letters = [];

    letters.push(userScores.energy > 50 ? 'E' : 'I'); // Extraverted / Introverted
    letters.push(userScores.awareness > 50 ? 'S' : 'N'); // Sensing / Intuitive
    letters.push(userScores.kindness > 50 ? 'F' : 'T'); // Feeling / Thinking
    letters.push(userScores.productivity > 50 ? 'J' : 'P'); // Judging / Perceiving

    return letters.join('');
}

function showResult(type) {
    const content = document.getElementById('quiz-content');
    const overlay = document.getElementById('quiz-overlay');

    content.innerHTML = `
        <div style="text-align: center; animation: fadeIn 0.5s;">
            <div style="font-size: 60px; margin-bottom: 20px;">✨</div>
            <h2>Profile Established</h2>
            <div style="font-size: 40px; font-weight: 800; color: #00ff88; margin: 10px 0;">${type}</div>
            <p>Your stats have been initialized.</p>
            <button class="btn btn-primary" onclick="closeQuiz()">Enter RPG</button>
        </div>
    `;
}

window.closeQuiz = function () {
    const overlay = document.getElementById('quiz-overlay');
    overlay.style.opacity = 0;
    setTimeout(() => {
        overlay.remove();
        // Update stats without reloading (prevents reset loop)
        if (window.fetchGameStatus) {
            window.fetchGameStatus();
        }
    }, 500);
};
