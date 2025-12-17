// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Get API key from environment variable
const API_KEY = process.env.API_KEY || "";
const PORT = 3000;

if (!API_KEY) {
  console.warn("⚠️  WARNING: API_KEY environment variable not set!");
  console.warn("Set it with: export API_KEY='your_actual_key'");
}

// ============================================================================
// PERSISTENCE (Auto-Save)
// ============================================================================

const DATA_FILE = path.join(__dirname, "gamedata.json");

function loadGameData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("❌ Error loading game data:", error);
  }
  return null;
}

function saveGameData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameState, null, 2));
    // console.log("💾 Game data saved!"); // Uncomment for debug
  } catch (error) {
    console.error("❌ Error saving game data:", error);
  }
}

// ============================================================================
// GAME STATE TRACKER (Simple RPG system)
// ============================================================================

const defaultGameState = {
  player: {
    name: "Adventurer",
    level: 1,
    xp: 0,
    totalXpEarned: 0,
    title: "Curious Beginner",
    titleLevel: 1,
    stats: {
      health: 100,
      energy: 100,
      focus: 50,
      discipline: 50,
      productivity: 50,
      consistency: 50
    },
    streak: 0,
    longestStreak: 0,
    currentDay: 1,
    lastMessageDay: new Date().toDateString(),
    lastMessageTime: Date.now(),
    badges: [],
    statistics: {
      totalMessages: 0,
      totalXpEarned: 0,
      averageXpPerMessage: 0,
      highestSingleMessageXp: 0,
      totalHighQualityMessages: 0,
      totalDaysActive: 1,
      favoriteQuestionType: "Analytical",
      questsCompleted: 0,
      dailyQuestsCompletedTotal: 0
    },
    personalityType: "Unknown"
  },
  dailyQuests: [],
  weeklyQuests: [],
  lastQuestGenerationDay: new Date().toDateString(),
  lastWeeklyQuestGenDate: new Date().toDateString(),
  messageCount: 0
};

// Load saved data or use default
let gameState = loadGameData() || defaultGameState;
console.log(loadGameData() ? "✅ Loaded saved game data" : "🆕 Started new game");

// Quest templates
const questTemplates = [
  { title: "Ask a helpful question", xp: 10, difficulty: "easy" },
  { title: "Request coding help", xp: 25, difficulty: "medium" },
  { title: "Ask for creative ideas", xp: 50, difficulty: "hard" },
  { title: "Request deep analysis", xp: 75, difficulty: "boss" }
];

// Achievement Titles with Progressive Levels
const achievementTitles = [
  {
    level: 1,
    name: "Curious Beginner",
    icon: "🌱",
    minXp: 0,
    maxXp: 99,
    description: "Your journey begins with the first question"
  },
  {
    level: 2,
    name: "Thoughtful Learner",
    icon: "📚",
    minXp: 100,
    maxXp: 499,
    description: "Every conversation deepens your understanding"
  },
  {
    level: 3,
    name: "Insightful Mind",
    icon: "💭",
    minXp: 500,
    maxXp: 1499,
    description: "Your questions reveal layers of meaning"
  },
  {
    level: 4,
    name: "Philosopher",
    icon: "🧠",
    minXp: 1500,
    maxXp: 4999,
    description: "Wisdom flows through your words"
  },
  {
    level: 5,
    name: "Master of Discourse",
    icon: "👑",
    minXp: 5000,
    maxXp: 9999,
    description: "Your insights illuminate the path for others"
  },
  {
    level: 6,
    name: "Legendary Scholar",
    icon: "⭐",
    minXp: 10000,
    maxXp: Infinity,
    description: "A seeker of infinite knowledge and understanding"
  }
];

// Badge definitions
const badgeDefinitions = {
  "flame-on": {
    name: "🔥 Flame On",
    description: "Achieve a 7-day streak",
    condition: (player) => player.streak >= 7
  },
  "big-brain": {
    name: "🧠 Big Brain",
    description: "Earn 50+ XP in a single message",
    condition: (player) => player.statistics.highestSingleMessageXp >= 50
  },
  "health-guardian": {
    name: "💚 Health Guardian",
    description: "Maintain 80+ health for 7 days",
    condition: (player) => player.stats.health >= 80 && player.streak >= 7
  },
  "legendary": {
    name: "🌟 Legendary",
    description: "Achieve a 30-day streak",
    condition: (player) => player.streak >= 30
  },
  "bibliophile": {
    name: "📚 Bibliophile",
    description: "Earn 1,000 total XP",
    condition: (player) => player.totalXpEarned >= 1000
  },
  "tech-wizard": {
    name: "🤖 Tech Wizard",
    description: "Send 20 technical questions",
    condition: (player) => player.statistics.totalHighQualityMessages >= 20
  },
  "creative-genius": {
    name: "🎨 Creative Genius",
    description: "Send 20 creative questions",
    condition: (player) => player.statistics.totalHighQualityMessages >= 20
  },
  "consistent": {
    name: "🤝 Consistent",
    description: "Never break a streak (reach level 10)",
    condition: (player) => player.level >= 10 && player.longestStreak >= 10
  },
  "master": {
    name: "👑 Master",
    description: "Reach level 50",
    condition: (player) => player.level >= 50
  },
  "quest-master": {
    name: "🎯 Quest Master",
    description: "Complete all daily quests",
    condition: (player) => player.statistics.dailyQuestsCompletedTotal >= 5
  },
  "night-owl": {
    name: "🦉 Night Owl",
    description: "Send a message between 11PM and 4AM",
    condition: () => {
      const h = new Date().getHours();
      return h >= 23 || h <= 4;
    }
  },
  "early-bird": {
    name: "🌅 Early Bird",
    description: "Send a message between 5AM and 9AM",
    condition: () => {
      const h = new Date().getHours();
      return h >= 5 && h <= 9;
    }
  },
  "weekend-warrior": {
    name: "⚔️ Weekend Warrior",
    description: "Active on a weekend",
    condition: () => {
      const d = new Date().getDay();
      return d === 0 || d === 6;
    }
  },
  "social-butterfly": {
    name: "🦋 Social Butterfly",
    description: "Send 100 total messages",
    condition: (player) => player.statistics.totalMessages >= 100
  },
  "deep-thinker": {
    name: "🤔 Deep Thinker",
    description: "Average XP per message > 20",
    condition: (player) => player.statistics.averageXpPerMessage >= 20
  }
};

// Daily quest templates
const dailyQuestTemplates = [
  { title: "Send 3 meaningful messages", target: 3, type: "messages", xp: 50 },
  { title: "Ask a question with 10+ words", target: 1, type: "long-question", xp: 40 },
  { title: "Maintain 70+ Focus during session", target: 1, type: "focus-maintenance", xp: 45 },
  { title: "Earn 50+ XP in one message", target: 1, type: "high-xp-message", xp: 60 },
  { title: "Send 5 messages in one day", target: 5, type: "volume", xp: 75 },
  { title: "Ask a philosophical question", target: 1, type: "philosophical", xp: 35 },
  { title: "Build a 3-message conversation", target: 3, type: "streak", xp: 55 },
  { title: "Reach 500+ character question", target: 1, type: "long-message", xp: 50 }
];

// Weekly quest templates
const weeklyQuestTemplates = [
  { title: "Send 50 messages this week", target: 50, type: "volume", xp: 300 },
  { title: "Maintain 80+ Focus for 3 days", target: 3, type: "focus-week", xp: 250 },
  { title: "Earn 500 XP this week", target: 500, type: "xp-gain", xp: 400 },
  { title: "Complete 10 Daily Quests", target: 10, type: "daily-quests-week", xp: 350 },
  { title: "Ask 20 questions", target: 20, type: "questions", xp: 200 }
];

// Check streak multiplier based on consecutive days of activity
function getStreakMultiplier() {
  const now = new Date();
  const today = now.toDateString();
  const lastDay = gameState.player.lastMessageDay;

  // Check if this is a new day
  if (today !== lastDay) {
    const lastMessageDate = new Date(lastDay);
    const timeDiff = now - lastMessageDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // If message was yesterday, extend streak. Otherwise, reset it.
    if (daysDiff === 1) {
      gameState.player.streak += 1;
    } else {
      gameState.player.streak = 1; // Reset to 1 for today
    }

    gameState.player.currentDay = now.getDate();
    gameState.player.lastMessageDay = today;
  }

  // Calculate multiplier based on streak
  let multiplier = 1.0;
  if (gameState.player.streak >= 30) multiplier = 5.0;    // 30-day streak: 5x
  else if (gameState.player.streak >= 14) multiplier = 3.0; // 14-day streak: 3x
  else if (gameState.player.streak >= 7) multiplier = 2.0;  // 7-day streak: 2x
  else if (gameState.player.streak >= 3) multiplier = 1.5;  // 3-day streak: 1.5x

  return multiplier;
}

// Apply health degradation (loses health if inactive, gains health from activity)
function updateHealth() {
  const now = Date.now();
  const timeSinceLastMessage = now - gameState.player.lastMessageTime;
  const daysSinceMessage = timeSinceLastMessage / (1000 * 60 * 60 * 24);

  if (!gameState.player.stats) {
    gameState.player.stats = {
      health: 100,
      energy: 100,
      focus: 50,
      discipline: 50,
      productivity: 50,
      consistency: 50
    };
  }

  // Degrade health if missed days (10 HP per day)
  if (daysSinceMessage > 1) {
    const healthLoss = Math.floor(daysSinceMessage * 10);
    gameState.player.stats.health = Math.max(0, gameState.player.stats.health - healthLoss);
  }

  // Update last message time for next check
  gameState.player.lastMessageTime = now;
}

// Check and unlock badges
function checkBadges() {
  const newBadges = [];

  for (const [key, badge] of Object.entries(badgeDefinitions)) {
    // Check if badge already earned
    if (!gameState.player.badges.includes(key)) {
      // Check if condition is met
      if (badge.condition(gameState.player)) {
        gameState.player.badges.push(key);
        newBadges.push(badge);
      }
    }
  }

  return newBadges;
}

// Generate daily quests if day changed
function generateDailyQuests() {
  const today = new Date().toDateString();

  if (today !== gameState.lastQuestGenerationDay) {
    // New day - generate fresh quests
    gameState.dailyQuests = [];
    gameState.lastQuestGenerationDay = today;

    // Pick 3 random quests from templates
    const shuffled = dailyQuestTemplates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      gameState.dailyQuests.push({
        ...shuffled[i],
        id: i,
        progress: 0,
        completed: false
      });
    }
  }

  return gameState.dailyQuests;
}

// Update daily quest progress
function updateQuestProgress(message, xp) {
  generateDailyQuests();

  const messageLength = message.length;
  const hasQuestion = message.includes('?');
  const wordCount = message.split(/\s+/).length;

  gameState.dailyQuests.forEach(quest => {
    if (!quest.completed) {
      if (quest.type === "messages" && xp > 0) {
        quest.progress += 1;
      } else if (quest.type === "long-question" && hasQuestion && wordCount >= 10) {
        quest.progress += 1;
      } else if (quest.type === "focus-maintenance" && gameState.player.stats.focus >= 70) {
        quest.progress += 1;
      } else if (quest.type === "high-xp-message" && xp >= 50) {
        quest.progress += 1;
      } else if (quest.type === "volume") {
        quest.progress += 1;
      } else if (quest.type === "philosophical" && hasQuestion && messageLength > 100) {
        quest.progress += 1;
      } else if (quest.type === "streak") {
        quest.progress += 1;
      } else if (quest.type === "long-message" && messageLength >= 500) {
        quest.progress += 1;
      }

      // Mark quest as completed
      if (quest.progress >= quest.target) {
        quest.completed = true;
        gameState.player.statistics.questsCompleted += 1;

        // Check if all quests completed today
        const allCompleted = gameState.dailyQuests.every(q => q.completed);
        if (allCompleted) {
          gameState.player.statistics.dailyQuestsCompletedTotal += 1;
        }
      }
    }
  });

  // Update Weekly Quests w/ robust Init
  if (!gameState.weeklyQuests) gameState.weeklyQuests = [];

  gameState.weeklyQuests.forEach(quest => {
    if (!quest.completed) {
      if (quest.type === "volume" && xp > 0) quest.progress += 1;
      else if (quest.type === "questions" && hasQuestion) quest.progress += 1;
      else if (quest.type === "xp-gain") quest.progress += xp;
      // Note: "daily-quests-week" and "focus-week" require more complex event hooks, skipping for simplicity or handling in specific triggers
      // For now, let's just track simple counters

      if (quest.progress >= quest.target) {
        quest.completed = true;
        // Bonus XP for weekly completion?
      }
    }
  });
}

// Update achievement title based on XP
function updateAchievementTitle() {
  const totalXp = gameState.player.totalXpEarned;
  let newTitle = achievementTitles[0]; // Default to first title

  for (const title of achievementTitles) {
    if (totalXp >= title.minXp && totalXp <= title.maxXp) {
      newTitle = title;
      break;
    }
  }

  // Check if title changed
  const titleChanged = gameState.player.title !== newTitle.name;
  gameState.player.title = newTitle.name;
  gameState.player.titleLevel = newTitle.level;

  return { titleChanged, newTitle };
}

// Update statistics
function updateStatistics(message, xp) {
  // Guard against missing statistics object
  if (!gameState.player.statistics) {
    console.warn("⚠️ Statistics object missing, initializing defaults...");
    gameState.player.statistics = {
      totalMessages: 0,
      totalXpEarned: 0,
      averageXpPerMessage: 0,
      highestSingleMessageXp: 0,
      totalHighQualityMessages: 0,
      totalDaysActive: 1,
      favoriteQuestionType: "Analytical",
      questsCompleted: 0,
      dailyQuestsCompletedTotal: 0
    };
  }

  const stats = gameState.player.statistics;

  stats.totalMessages = (stats.totalMessages || 0) + 1;
  stats.totalXpEarned = (stats.totalXpEarned || 0) + xp;
  stats.averageXpPerMessage = Math.round(stats.totalXpEarned / stats.totalMessages);

  if (xp > (stats.highestSingleMessageXp || 0)) {
    stats.highestSingleMessageXp = xp;
  }

  if (xp >= 20) {
    stats.totalHighQualityMessages = (stats.totalHighQualityMessages || 0) + 1;
  }

  // Update longest streak
  if (gameState.player.streak > (stats.totalDaysActive || 0)) {
    stats.totalDaysActive = gameState.player.streak;
  }

  if (gameState.player.streak > (gameState.player.longestStreak || 0)) {
    gameState.player.longestStreak = gameState.player.streak;
  }

  // Update achievement title
  updateAchievementTitle();
}

// Check if message is meaningful (not just spam/single words)
function isMessageMeaningful(message) {
  const trimmed = message.trim().toLowerCase();

  // Reject very short messages (hi, hey, ok, etc)
  if (trimmed.length < 10) return false;

  // Reject common spam words
  const spamWords = ['hi', 'hello', 'hey', 'ok', 'lol', 'ha', 'yes', 'no', 'what', 'huh', 'test', 'blah', 'hmm'];
  if (spamWords.includes(trimmed)) return false;

  // Reject messages with mostly repeated characters (aaaaaa, zzzzz, etc)
  const repeatedChars = /(.)\1{3,}/g;
  if (repeatedChars.test(trimmed)) return false;

  // Reject messages with mostly numbers/symbols
  const meaningfulChars = trimmed.match(/[a-z0-9]/g) || [];
  if (meaningfulChars.length < 5) return false;

  // Check if it has question mark or enough words (shows thought)
  const wordCount = trimmed.split(/\s+/).length;
  const hasQuestion = trimmed.includes('?');

  // Require either a question OR at least 4 words
  if (!hasQuestion && wordCount < 4) return false;

  return true;
}

// Award XP based on message quality/length
function awardXP(message) {
  // Check if message is meaningful
  if (!isMessageMeaningful(message)) {
    return { xp: 0, multiplier: 1.0, baseXp: 0, streak: gameState.player.streak };
  }

  // Update health first (check for inactive days)
  updateHealth();

  // Get current streak and multiplier
  const multiplier = getStreakMultiplier();

  const length = message.length;
  let baseXp = 0;

  // Award XP based on message quality/length
  if (length < 30) baseXp = 5;        // Short but meaningful
  else if (length < 60) baseXp = 10;  // Medium
  else if (length < 120) baseXp = 20; // Good effort
  else if (length < 200) baseXp = 35; // Detailed question
  else baseXp = 50;                   // Very detailed/creative

  // Add bonus for questions (shows curiosity)
  if (message.includes('?')) baseXp += 5;

  // Add bonus for complex questions (multiple sentences)
  const sentences = message.split(/[.!?]+/).length;
  if (sentences > 2) baseXp += 5;

  // Apply streak multiplier
  let xp = Math.floor(baseXp * multiplier);

  gameState.player.xp += xp;
  gameState.player.totalXpEarned += xp;
  gameState.messageCount++;

  // Level up every 100 XP
  if (gameState.player.xp >= 100) {
    gameState.player.level += Math.floor(gameState.player.xp / 100);
    gameState.player.xp = gameState.player.xp % 100;
  }

  // Update stats (but only for meaningful messages)
  if (!gameState.player.stats) {
    gameState.player.stats = {
      health: 100,
      energy: 100,
      focus: 50,
      discipline: 50,
      productivity: 50,
      consistency: 50
    };
  }

  // Apply stat increases
  gameState.player.stats.energy = Math.min(100, gameState.player.stats.energy + 5);
  gameState.player.stats.focus = Math.min(100, gameState.player.stats.focus + 3);
  gameState.player.stats.productivity = Math.min(100, gameState.player.stats.productivity + 2);
  gameState.player.stats.consistency = Math.min(100, gameState.player.stats.consistency + 1); // Small consistency boost

  // Restore health from activity
  gameState.player.stats.health = Math.min(100, gameState.player.stats.health + 5);

  // Update statistics, quests, and check badges
  updateStatistics(message, xp);
  updateQuestProgress(message, xp);
  const newBadges = checkBadges();
  const titleInfo = updateAchievementTitle();

  saveGameData(); // Auto-save after every interaction

  return { xp, multiplier, baseXp, streak: gameState.player.streak, newBadges, titleInfo };
}

// Get game status as text
function getGameStatusText(xpData) {
  const p = gameState.player;
  const stats = p.stats || {
    health: 100,
    energy: 100,
    focus: 50,
    discipline: 50,
    productivity: 50,
    consistency: 50
  };

  let xpText = "";
  let badgeText = "";
  let titleText = "";
  let questText = "";

  if (typeof xpData === 'object') {
    const { xp, multiplier, baseXp, streak, newBadges, titleInfo } = xpData;
    if (xp > 0) {
      xpText = `+${xp} XP (${baseXp}✕${multiplier.toFixed(1)}x 🔥${streak}d)`;
    } else {
      xpText = "No XP (message too short/spam)";
    }

    // Show new badges
    if (newBadges && newBadges.length > 0) {
      badgeText = `\n🏆 NEW BADGE: ${newBadges.map(b => b.name).join(", ")}`;
    }

    // Show new title
    if (titleInfo && titleInfo.titleChanged) {
      titleText = `\n🎖️ PROMOTION: ${titleInfo.newTitle.icon} ${titleInfo.newTitle.name}`;
    }
  } else {
    xpText = `+${xpData} XP`;
  }

  const healthStatus = stats.health > 70 ? "💚" : stats.health > 40 ? "💛" : "❤️";

  // Show daily quest progress
  if (gameState.dailyQuests.length > 0) {
    const questProgress = gameState.dailyQuests.map(q =>
      `${q.completed ? '✅' : '⏳'} ${q.title} (${q.progress}/${q.target})`
    ).join(" | ");
    questText = `\n📋 Daily Quests: ${questProgress}`;
  }

  // Show current badges
  const currentBadges = p.badges.length > 0 ? p.badges.map(b => badgeDefinitions[b]?.name).join(" ") : "";
  const badgeDisplay = currentBadges ? `\n🏅 Badges: ${currentBadges}` : "";

  return `\n\n[${p.title} | ⭐ Level ${p.level} | XP: ${p.xp}/100 | ${xpText}]\n[${healthStatus} Health: ${stats.health} | 📊 Energy: ${stats.energy} | 🎯 Focus: ${stats.focus}]${titleText}${badgeText}${questText}${badgeDisplay}`;
}

app.post("/chat", async (req, res) => {
  const message = req.body?.message;

  if (!message || message.trim() === "") {
    console.log("❌ Error: Empty message received");
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  console.log("📨 Received message:", message);

  try {
    // Using Groq API (completely free, no quota limits, extremely fast)
    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI RPG guide. Keep your responses concise, clear, and easy to read. Avoid large walls of text. Use short paragraphs."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1024,
      temperature: 0.7
    };

    console.log("🚀 Sending request to Groq API...");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log("📡 Response status:", response.status);

    const data = await response.json();
    console.log("📦 Raw Groq response:", JSON.stringify(data, null, 2));

    // Check if request was successful
    if (!response.ok) {
      console.error("❌ Groq API error:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Groq API error"
      });
    }

    // Extract text from Groq's response
    let responseText = "";
    if (data.choices && data.choices[0]?.message?.content) {
      responseText = data.choices[0].message.content;
      console.log("✅ Successfully extracted response text");
    } else {
      console.error("❌ Unexpected response format from Groq:", data);
      return res.status(500).json({
        error: "Unexpected response format from Groq API"
      });
    }

    // Award XP for the message (based on quality/length)
    const xpAwarded = awardXP(message);

    // Return in format client expects WITH GAME DATA
    const finalResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: responseText + getGameStatusText(xpAwarded)
              }
            ]
          }
        }
      ],
      gameState: gameState
    };

    console.log("✅ Sending response to client");
    return res.json(finalResponse);

  } catch (error) {
    console.error("❌ Server error:", error.message);
    return res.status(500).json({
      error: `Server error: ${error.message}`
    });
  }
});

// Get game status endpoint
app.get("/game-status", (req, res) => {
  res.json(gameState);
});

// Reset game endpoint
// Game Reset Endpoint
app.post("/game-reset", (req, res) => {
  console.log("📥 POST /game-reset received");
  gameState = {
    player: {
      name: "Adventurer",
      level: 1,
      xp: 0,
      totalXpEarned: 0,
      title: "Novice Explorer",
      stats: {
        health: 100,
        energy: 100,
        focus: 50,
        creativity: 50,
        productivity: 50,
        kindness: 50,
        awareness: 50
      },
      streak: 0,
      longestStreak: 0,
      currentDay: 1,
      lastMessageDay: null,
      lastMessageTime: 0,
      badges: [],
      inventory: [],
      personalityType: "Unknown"
    },
    dailyQuests: [],
    lastQuestGenerationDay: null,
    messageCount: 0
  };
  saveGameData();
  console.log("🔄 Game state reset to defaults");
  res.json({ success: true, message: "Game reset" });
});

// Statistics endpoint
// ============================================================================
// API ENDPOINTS
// ============================================================================

// Helper to safely get stats
function getSafePlayerStats() {
  const p = gameState.player;

  // Ensure stats object exists
  if (!p.stats) {
    p.stats = { ...defaultGameState.player.stats };
  }

  // Ensure statistics object exists
  if (!p.statistics) {
    p.statistics = { ...defaultGameState.player.statistics };
  }

  return p;
}

// Statistics endpoint (Simplified for dashboard)
app.get("/statistics", (req, res) => {
  console.log("📥 GET /statistics request received");
  try {
    const p = getSafePlayerStats();

    // Construct safe response
    const responseData = {
      level: p.level || 1,
      totalXpEarned: p.totalXpEarned || 0,
      totalMessages: p.statistics.totalMessages || 0,
      averageXpPerMessage: p.statistics.averageXpPerMessage || 0,
      highestSingleMessageXp: p.statistics.highestSingleMessageXp || 0,
      totalHighQualityMessages: p.statistics.totalHighQualityMessages || 0,
      currentStreak: p.streak || 0,
      longestStreak: p.longestStreak || 0,
      totalDaysActive: p.statistics.totalDaysActive || 1,
      badges: p.badges.map(b => badgeDefinitions[b]).filter(Boolean), // Only return valid badge objects
      questsCompleted: p.statistics.questsCompleted || 0,
      dailyQuestsCompletedTotal: p.statistics.dailyQuestsCompletedTotal || 0,

      // Add raw stats for gauges
      health: p.stats.health,
      energy: p.stats.energy,
      focus: p.stats.focus
    };

    console.log(`✅ Sending statistics logic`);
    res.json(responseData);
  } catch (error) {
    console.error("❌ Error in /statistics:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Badges endpoint
app.get("/badges", (req, res) => {
  console.log("📥 GET /badges request received");
  try {
    const p = getSafePlayerStats();
    const earnedKeys = p.badges || [];

    const earnedBadges = earnedKeys.map(key => badgeDefinitions[key]).filter(Boolean);
    const allBadges = Object.values(badgeDefinitions);
    const lockedBadges = allBadges.filter(b => !earnedBadges.some(eb => eb.name === b.name));

    console.log(`✅ Sending badges: ${earnedBadges.length} earned, ${lockedBadges.length} locked`);
    res.json({
      earned: earnedBadges,
      locked: lockedBadges,
      totalEarned: earnedBadges.length,
      totalAvailable: allBadges.length
    });
  } catch (error) {
    console.error("❌ Error in /badges:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Initialize Profile Endpoint
app.post("/init-profile", (req, res) => {
  console.log("📥 POST /init-profile received");
  try {
    const { stats, personalityType } = req.body;

    if (!stats || !personalityType) {
      return res.status(400).json({ error: "Missing stats or personality type" });
    }

    // specific stats from quiz
    gameState.player.stats.creativity = stats.creativity || 50;
    gameState.player.stats.productivity = stats.productivity || 50;
    gameState.player.stats.energy = stats.energy || 50;
    gameState.player.stats.kindness = stats.kindness || 50;
    gameState.player.stats.awareness = stats.awareness || 50;

    // Set personality type
    gameState.player.personalityType = personalityType;

    // Mark as initialized (we can use a flag or just check type != Unknown)

    saveGameData();

    console.log(`✅ Profile initialized: ${personalityType}`);
    res.json({ success: true, player: gameState.player });
  } catch (error) {
    console.error("❌ Error in /init-profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Daily quests endpoint
app.get("/daily-quests", (req, res) => {
  console.log("📥 GET /daily-quests request received");
  try {
    // Regenerate if needed
    generateDailyQuests();

    const quests = gameState.dailyQuests || [];
    const completedCount = quests.filter(q => q.completed).length;
    const bonusXp = (quests.length > 0 && completedCount === quests.length) ? 100 : 0;

    console.log(`✅ Sending daily quests: ${quests.length} quests`);
    res.json({
      quests: quests,
      completedCount: completedCount,
      totalQuests: quests.length,
      completionBonus: bonusXp
    });
  } catch (error) {
    console.error("❌ Error in /daily-quests:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Weekly quests endpoint
app.get("/weekly-quests", (req, res) => {
  console.log("📥 GET /weekly-quests request received");
  try {
    generateWeeklyQuests();

    const quests = gameState.weeklyQuests || [];
    const completedCount = quests.filter(q => q.completed).length;
    const bonusXp = (quests.length > 0 && completedCount === quests.length) ? 500 : 0;

    res.json({
      quests: quests,
      completedCount: completedCount,
      totalQuests: quests.length,
      completionBonus: bonusXp
    });
  } catch (error) {
    console.error("❌ Error in /weekly-quests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate weekly quests
function generateWeeklyQuests() {
  const now = new Date();
  const lastGen = new Date(gameState.lastWeeklyQuestGenDate || 0);
  const diffTime = Math.abs(now - lastGen);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (!gameState.weeklyQuests || gameState.weeklyQuests.length === 0 || diffDays >= 7) {
    console.log("🔄 Generating new WEEKLY quests...");
    gameState.weeklyQuests = [];
    gameState.lastWeeklyQuestGenDate = now.toDateString();

    const shuffled = weeklyQuestTemplates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      gameState.weeklyQuests.push({
        ...shuffled[i],
        id: i,
        progress: 0,
        completed: false
      });
    }
    saveGameData();
  }
  return gameState.weeklyQuests;
}

// Comprehensive stats page endpoint (The "One Ring" endpoint)
app.get("/stats", (req, res) => {
  console.log("📥 GET /stats request received");
  try {
    const p = getSafePlayerStats();
    const currentTitleDef = achievementTitles.find(t => t.name === p.title) || achievementTitles[0];

    // Calculate progress to next title
    let nextTitle = null;
    let xpToNextTitle = 0;

    // Find next title
    for (const title of achievementTitles) {
      if (title.minXp > p.totalXpEarned) {
        nextTitle = title;
        xpToNextTitle = title.minXp - p.totalXpEarned;
        break;
      }
    }

    const earnedBadges = (p.badges || []).map(b => badgeDefinitions[b]).filter(Boolean);

    const response = {
      // Player info
      player: {
        name: p.name,
        level: p.level,
        xp: p.xp,
        xpForNextLevel: 100 - p.xp,
        totalXpEarned: p.totalXpEarned
      },
      // Title info
      title: {
        name: p.title,
        level: p.titleLevel,
        icon: currentTitleDef.icon,
        description: currentTitleDef.description,
        nextTitle: nextTitle ? nextTitle.name : "Maxed Out!",
        xpToNextTitle: xpToNextTitle,
        minXpForCurrent: currentTitleDef.minXp,
        maxXpForCurrent: currentTitleDef.maxXp
      },
      // Core stats
      stats: p.stats,
      // Streaks
      streaks: {
        current: p.streak,
        longest: p.longestStreak,
        currentDay: p.currentDay,
        lastMessageDay: p.lastMessageDay
      },
      // Statistics
      statistics: p.statistics,
      // Badges
      badges: {
        earned: earnedBadges,
        totalEarned: earnedBadges.length,
        totalAvailable: Object.keys(badgeDefinitions).length
      },
      // Daily quests
      dailyQuests: {
        quests: gameState.dailyQuests || [],
        completedCount: (gameState.dailyQuests || []).filter(q => q.completed).length,
        totalQuests: (gameState.dailyQuests || []).length
      }
    };

    console.log(`✅ Sending full stats object`);
    res.json(response);
  } catch (error) {
    console.error("❌ Error in /stats:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log("🔑 API_KEY status:", API_KEY ? "SET ✅" : "NOT SET ❌");
  console.log("🤖 Using: Groq API (Mixtral 8x7B - Completely FREE!)");
  console.log("Ready to receive messages...\n");
});
