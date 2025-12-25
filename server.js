// server.js
import express from "express";
// import fetch from "node-fetch"; // Native fetch in Node 18+
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import filter from "./filter.js"; // Import Profanity Filter

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Use process.cwd() for Vercel static file serving
app.use(express.static(process.cwd()));

// Landing page for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landing.html"));
});

const API_KEY = process.env.API_KEY || "";
const PORT = process.env.PORT || 3000;

// In-memory registry for 1v1 battle rooms (Public Lobby)
let activeBattleRooms = {};
const BATTLE_ROOM_TIMEOUT = 15000; // 15 seconds for heartbeat

if (!API_KEY) console.warn("⚠️  WARNING: API_KEY environment variable not set!");

// ============================================================================
// DATABASE (Local JSON)
// ============================================================================
const USERS_FILE = path.join(process.cwd(), "users.json");
let users = {};

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading users:", err);
    users = {};
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error saving users:", err);
  }
}

loadUsers();

function generateUniqueId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let id = "";
  for (let i = 0; i < 2; i++) id += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 6; i++) id += numbers.charAt(Math.floor(Math.random() * numbers.length));

  // Ensure uniqueness
  if (users[id]) return generateUniqueId();
  return id;
}

// ============================================================================
// GAME LOGIC & TEMPLATES
// ============================================================================

const battleRooms = {};

// --- AUTH ENDPOINTS ---
app.post("/auth/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  // Check if username exists (case insensitive check usually better but let's keep it simple)
  const existing = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) return res.status(400).json({ error: "Username already taken" });

  const playerId = generateUniqueId();
  const newUser = {
    playerId,
    username,
    password, // In a real app, use bcrypt handles hashing!
    gameState: JSON.parse(JSON.stringify(defaultGameState))
  };

  // Set Language if provided, otherwise default to 'en'
  if (req.body.language) {
    newUser.gameState.player.language = req.body.language;
  }

  newUser.gameState.player.name = username;
  newUser.gameState.player.playerId = playerId;

  users[playerId] = newUser;
  saveUsers();

  res.json({ success: true, playerId, gameState: newUser.gameState });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  res.json({ success: true, playerId: user.playerId, gameState: user.gameState });
});

// Update game state for a user
app.post("/auth/sync", (req, res) => {
  const { playerId, gameState } = req.body;
  if (!users[playerId]) return res.status(404).json({ error: "User not found" });

  users[playerId].gameState = gameState;
  saveUsers();
  res.json({ success: true });
});

const defaultGameState = {
  player: {
    name: "Adventurer",
    level: 1,
    xp: 0,
    totalXpEarned: 0,
    title: "Curious Beginner",
    titleLevel: 1,
    stats: { health: 100, energy: 100, focus: 50, discipline: 50, productivity: 50, consistency: 50, creativity: 50, kindness: 50, awareness: 50 },
    streak: 0,
    longestStreak: 0,
    currentDay: new Date().getDate(),
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
    personalityType: "Unknown",
    language: "en", // Default language
    credits: 50,    // New Currency
    skillPoints: 0, // New Currency
    credits: 50,    // New Currency
    skillPoints: 0, // New Currency
    inventory: [],  // Owned items
    equippedTheme: null, // Currently active theme
    unlockedSkills: [] // Unlocked skill IDs
  },
  dailyQuests: [],
  weeklyQuests: [],
  lastQuestGenerationDay: new Date().toDateString(),
  lastWeeklyQuestGenDate: new Date().toDateString(),
  messageCount: 0
};

const achievementTitles = [
  { level: 1, name: "Curious Beginner", icon: "🌱", minXp: 0, maxXp: 249, description: "Your journey begins with the first question" },
  { level: 2, name: "Thoughtful Learner", icon: "📚", minXp: 250, maxXp: 749, description: "Every conversation deepens your understanding" },
  { level: 3, name: "Insightful Mind", icon: "💭", minXp: 750, maxXp: 1499, description: "Your questions reveal layers of meaning" },
  { level: 4, name: "Philosopher", icon: "🧠", minXp: 1500, maxXp: 2999, description: "Wisdom flows through your words" },
  { level: 5, name: "Master of Discourse", icon: "👑", minXp: 3000, maxXp: 7499, description: "Your insights illuminate the path for others" },
  { level: 6, name: "Legendary Scholar", icon: "⭐", minXp: 7500, maxXp: Infinity, description: "A seeker of infinite knowledge and understanding" }
];

const badgeDefinitions = {
  "flame-on": { name: "🔥 Flame On", description: "Achieve a 7-day streak", condition: (p) => p.streak >= 7 },
  "big-brain": { name: "🧠 Big Brain", description: "Earn 50+ XP in a single message", condition: (p) => p.statistics.highestSingleMessageXp >= 50 },
  "health-guardian": { name: "💚 Health Guardian", description: "Maintain 80+ health for 7 days", condition: (p) => p.stats.health >= 80 && p.streak >= 7 },
  "legendary": { name: "🌟 Legendary", description: "Achieve a 30-day streak", condition: (p) => p.streak >= 30 },
  "bibliophile": { name: "📚 Bibliophile", description: "Earn 1,000 total XP", condition: (p) => p.totalXpEarned >= 1000 },
  "tech-wizard": { name: "🤖 Tech Wizard", description: "Send 20 technical questions", condition: (p) => p.statistics.totalHighQualityMessages >= 20 },
  "creative-genius": { name: "🎨 Creative Genius", description: "Send 20 creative questions", condition: (p) => p.statistics.totalHighQualityMessages >= 20 },
  "consistent": { name: "🤝 Consistent", description: "Never break a streak (reach level 10)", condition: (p) => p.level >= 10 && p.longestStreak >= 10 },
  "master": { name: "👑 Master", description: "Reach level 50", condition: (p) => p.level >= 50 },
  "quest-master": { name: "🎯 Quest Master", description: "Complete all daily quests", condition: (p) => p.statistics.dailyQuestsCompletedTotal >= 5 },
  "night-owl": { name: "🦉 Night Owl", description: "Send a message between 11PM and 4AM", condition: () => { const h = new Date().getHours(); return h >= 23 || h <= 4; } },
  "early-bird": { name: "🌅 Early Bird", description: "Send a message between 5AM and 9AM", condition: () => { const h = new Date().getHours(); return h >= 5 && h <= 9; } },
  "weekend-warrior": { name: "⚔️ Weekend Warrior", description: "Active on a weekend", condition: () => { const d = new Date().getDay(); return d === 0 || d === 6; } },
  "social-butterfly": { name: "🦋 Social Butterfly", description: "Send 100 total messages", condition: (p) => p.statistics.totalMessages >= 100 },
  "deep-thinker": { name: "🤔 Deep Thinker", description: "Average XP per message > 20", condition: (p) => p.statistics.averageXpPerMessage >= 20 },
  // NEW BADGES
  "curiosity": { name: "🔍 Curiosity", description: "Ask 10 questions", condition: (p) => p.statistics.totalMessages >= 10 },
  "anomaly-initiate": { name: "🛰️ Anomaly Initiate", description: "Clear your first anomaly", condition: (p) => p.statistics.questsCompleted >= 1 },
  "anomaly-expert": { name: "🛸 Anomaly Expert", description: "Clear 10 anomalies", condition: (p) => p.statistics.questsCompleted >= 10 },
  "xp-titan": { name: "💎 XP Titan", description: "Earn 5,000 total XP", condition: (p) => p.totalXpEarned >= 5000 },
  "focus-master": { name: "🧘 Focus Master", description: "Reach 100% Focus", condition: (p) => p.stats.focus >= 100 },
  "energy-surge": { name: "⚡ Energy Surge", description: "Reach 100% Energy", condition: (p) => p.stats.energy >= 100 },
  "dedicated": { name: "📅 Dedicated", description: "Maintain a 3-day streak", condition: (p) => p.streak >= 3 },
  "level-ten": { name: "🎖️ Decurion", description: "Reach Level 10", condition: (p) => p.level >= 10 }
};

const dailyQuestTemplates = [
  { title: "Send 3 meaningful messages", target: 3, type: "messages", xp: 50 },
  { title: "Ask a question with 10+ words", target: 1, type: "long-question", xp: 40 },
  { title: "Maintain 70+ Focus during session", target: 1, type: "focus-maintenance", xp: 45 },
  { title: "Earn 50+ XP in one message", target: 1, type: "high-xp-message", xp: 60 },
  { title: "Send 5 messages in one day", target: 5, type: "volume", xp: 75 },
  { title: "Ask a philosophical question", target: 1, type: "philosophical", xp: 35 },
  { title: "Build a 3-message conversation", target: 3, type: "streak", xp: 55 },
  { title: "Reach 500+ character question", target: 1, type: "long-message", xp: 50 },
  { title: "Ask 3 questions", target: 3, type: "questions", xp: 40 },
  { title: "Earn 250 XP today", target: 250, type: "xp-gain", xp: 75 },
  { title: "Short & Sweet (< 20 chars)", target: 1, type: "short-message", xp: 30 }
];

const weeklyQuestTemplates = [
  { title: "Send 50 messages this week", target: 50, type: "volume", xp: 300 },
  { title: "Maintain 80+ Focus for 3 days", target: 3, type: "focus-week", xp: 250 },
  { title: "Earn 500 XP this week", target: 500, type: "xp-gain", xp: 400 },
  { title: "Complete 10 Daily Quests", target: 10, type: "daily-quests-week", xp: 350 },
  { title: "Ask 20 questions", target: 20, type: "questions", xp: 200 }
];

// --- HELPER FUNCTIONS (Pure Logic) ---

function getStreakMultiplier(gameState) {
  const now = new Date();
  const today = now.toDateString();
  const lastDay = gameState.player.lastMessageDay;

  if (today !== lastDay) {
    const lastMessageDate = new Date(lastDay);
    const timeDiff = now - lastMessageDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) gameState.player.streak += 1;
    else gameState.player.streak = 1;
    gameState.player.currentDay = now.getDate();
    gameState.player.lastMessageDay = today;
  }

  let multiplier = 1.0;
  if (gameState.player.streak >= 30) multiplier = 5.0;
  else if (gameState.player.streak >= 14) multiplier = 3.0;
  else if (gameState.player.streak >= 7) multiplier = 2.0;
  else if (gameState.player.streak >= 3) multiplier = 1.5;
  return multiplier;
}

function updateHealth(gameState) {
  const now = Date.now();
  const timeSinceLastMessage = now - gameState.player.lastMessageTime;
  const daysSinceMessage = timeSinceLastMessage / (1000 * 60 * 60 * 24);

  if (!gameState.player.stats) gameState.player.stats = { ...defaultGameState.player.stats };

  if (daysSinceMessage > 1) {
    const healthLoss = Math.floor(daysSinceMessage * 10);
    gameState.player.stats.health = Math.max(0, gameState.player.stats.health - healthLoss);
  }
  gameState.player.lastMessageTime = now;
}

function checkBadges(gameState) {
  const newBadges = [];
  for (const [key, badge] of Object.entries(badgeDefinitions)) {
    if (!gameState.player.badges.includes(key)) {
      if (badge.condition(gameState.player)) {
        gameState.player.badges.push(key);
        newBadges.push(badge);
      }
    }
  }
  return newBadges;
}

function generateDailyQuests(gameState) {
  const today = new Date().toDateString();
  if (today !== gameState.lastQuestGenerationDay || gameState.dailyQuests.length === 0) {
    gameState.dailyQuests = [];
    gameState.lastQuestGenerationDay = today;
    const shuffled = dailyQuestTemplates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 7; i++) {
      if (shuffled[i]) {
        gameState.dailyQuests.push({ ...shuffled[i], id: i, progress: 0, completed: false });
      }
    }
  }
  return gameState.dailyQuests;
}

function generateWeeklyQuests(gameState) {
  const now = new Date();
  const lastGen = new Date(gameState.lastWeeklyQuestGenDate || 0);
  const diffTime = Math.abs(now - lastGen);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (!gameState.weeklyQuests || gameState.weeklyQuests.length === 0 || diffDays >= 7) {
    gameState.weeklyQuests = [];
    gameState.lastWeeklyQuestGenDate = now.toDateString();
    const shuffled = weeklyQuestTemplates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      gameState.weeklyQuests.push({ ...shuffled[i], id: i, progress: 0, completed: false });
    }
  }
  return gameState.weeklyQuests;
}

function updateQuestProgress(gameState, message, xp) {
  generateDailyQuests(gameState);
  generateWeeklyQuests(gameState); // Ensure weekly exist

  const messageLength = message.length;
  const hasQuestion = message.includes('?');
  const wordCount = message.split(/\s+/).length;

  // Daily
  gameState.dailyQuests.forEach(quest => {
    if (!quest.completed) {
      if (quest.type === "messages" && xp > 0) quest.progress += 1;
      else if (quest.type === "long-question" && hasQuestion && wordCount >= 10) quest.progress += 1;
      else if (quest.type === "focus-maintenance" && gameState.player.stats.focus >= 70) quest.progress += 1;
      else if (quest.type === "high-xp-message" && xp >= 50) quest.progress += 1;
      else if (quest.type === "volume") quest.progress += 1;
      else if (quest.type === "philosophical" && hasQuestion && messageLength > 100) quest.progress += 1;
      else if (quest.type === "streak") quest.progress += 1;
      else if (quest.type === "long-message" && messageLength >= 500) quest.progress += 1;
      else if (quest.type === "questions" && hasQuestion) quest.progress += 1;
      else if (quest.type === "xp-gain") quest.progress += xp;
      else if (quest.type === "short-message" && messageLength < 20 && messageLength > 0) quest.progress += 1;

      if (quest.progress >= quest.target) {
        quest.completed = true;
        gameState.player.statistics.questsCompleted += 1;
        gameState.player.credits = (gameState.player.credits || 0) + 25; // Reward: 25 Credits per quest
        if (gameState.dailyQuests.every(q => q.completed)) gameState.player.statistics.dailyQuestsCompletedTotal += 1;
      }
    }
  });

  // Weekly
  gameState.weeklyQuests.forEach(quest => {
    if (!quest.completed) {
      if (quest.type === 'volume' && xp > 0) quest.progress += 1;
      else if (quest.type === 'questions' && hasQuestion) quest.progress += 1;
      else if (quest.type === 'xp-gain') quest.progress += xp;
      // Simply increment others if needed or add logic
      if (quest.progress >= quest.target) quest.completed = true;
    }
  });
}

function updateAchievementTitle(gameState) {
  const totalXp = gameState.player.totalXpEarned;
  let newTitle = achievementTitles[0];
  for (const title of achievementTitles) {
    if (totalXp >= title.minXp && totalXp <= title.maxXp) {
      newTitle = title;
      break;
    }
  }
  const titleChanged = gameState.player.title !== newTitle.name;
  gameState.player.title = newTitle.name;
  gameState.player.titleLevel = newTitle.level;
  return { titleChanged, newTitle };
}

function updateStatistics(gameState, message, xp) {
  if (!gameState.player.statistics) gameState.player.statistics = { ...defaultGameState.player.statistics };
  const stats = gameState.player.statistics;
  stats.totalMessages = (stats.totalMessages || 0) + 1;
  stats.totalXpEarned = (stats.totalXpEarned || 0) + xp;
  stats.averageXpPerMessage = Math.round(stats.totalXpEarned / stats.totalMessages);
  if (xp > (stats.highestSingleMessageXp || 0)) stats.highestSingleMessageXp = xp;
  if (xp >= 20) stats.totalHighQualityMessages = (stats.totalHighQualityMessages || 0) + 1;
  if (gameState.player.streak > (stats.totalDaysActive || 0)) stats.totalDaysActive = gameState.player.streak;
  if (gameState.player.streak > (gameState.player.longestStreak || 0)) gameState.player.longestStreak = gameState.player.streak;
  updateAchievementTitle(gameState);
}

function awardXP(gameState, message) {
  // Logic from original
  const trimmed = message.trim().toLowerCase();
  const valid = trimmed.length >= 10 && !['hi', 'hello', 'ok'].includes(trimmed); // Simplified check

  if (!valid) return { xp: 0, multiplier: 1, baseXp: 0, streak: gameState.player.streak, newBadges: [], titleInfo: null };

  // Spam Check
  if (gameState.player.lastMessageContent === trimmed) {
    return { xp: 0, multiplier: 1, baseXp: 0, streak: gameState.player.streak, newBadges: [], titleInfo: null, message: "Repeated Message" };
  }

  updateHealth(gameState);
  const multiplier = getStreakMultiplier(gameState);

  let baseXp = message.length > 50 ? 20 : 10;
  if (message.length > 150) baseXp = 50;
  if (message.includes('?')) baseXp += 5;

  // Smart Keyword Bonus
  const smartKeywords = ["analyze", "theory", "concept", "explain", "difference", "impact", "relationship", "cause", "prove", "perspective", "why", "how"];
  if (smartKeywords.some(keyword => trimmed.includes(keyword))) {
    baseXp += 20;
  }

  // Stat Updates
  if (!gameState.player.stats.creativity) gameState.player.stats.creativity = 50;
  if (!gameState.player.stats.kindness) gameState.player.stats.kindness = 50;
  if (!gameState.player.stats.awareness) gameState.player.stats.awareness = 50;

  // Energy Cost
  gameState.player.stats.energy = Math.max(0, gameState.player.stats.energy - 2);

  // Focus Gain
  gameState.player.stats.focus = Math.min(100, gameState.player.stats.focus + (message.length > 50 ? 5 : 2));

  // Health Regen (small)
  gameState.player.stats.health = Math.min(100, gameState.player.stats.health + 1);

  // Creativity & Intelligence (Awareness)
  if (smartKeywords.some(keyword => trimmed.includes(keyword))) {
    gameState.player.stats.creativity = Math.min(100, gameState.player.stats.creativity + 2);
    gameState.player.stats.awareness = Math.min(100, gameState.player.stats.awareness + 2);
  }

  // Kindness
  const kindnessKeywords = ["please", "thank", "thanks", "appreciate", "helpful", "good", "love", "great", "kind", "sorry"];
  if (kindnessKeywords.some(keyword => trimmed.includes(keyword))) {
    gameState.player.stats.kindness = Math.min(100, gameState.player.stats.kindness + 2);
  }

  // Calculate XP
  let xp = Math.floor(baseXp * multiplier);

  // Skill: Neural Efficiency (+10% XP)
  if (gameState.player.unlockedSkills && gameState.player.unlockedSkills.includes('neural_efficiency_1')) {
    xp = Math.floor(xp * 1.1);
  }

  // Level Cap Logic (Prevent XP gain if maxed)
  if (gameState.player.level >= 100) {
    xp = 0;
  }

  gameState.player.xp += xp;
  gameState.player.totalXpEarned += xp;

  // Check for Level Up (Threshold: 100 XP)
  if (gameState.player.xp >= 100) {
    const levelsGained = Math.floor(gameState.player.xp / 100);
    if (levelsGained > 0) {
      gameState.player.level += levelsGained;
      gameState.player.xp %= 100;

      // Grant Skill Points & Credits
      if (!gameState.player.skillPoints) gameState.player.skillPoints = 0;
      gameState.player.skillPoints += levelsGained;

      // Grant Credits (50 per level)
      gameState.player.credits = (gameState.player.credits || 0) + (levelsGained * 50);
    }
    // Simple fix: finding how many levels gained
    // Actually, line 445: gameState.player.level += ... 
    // We should capture that amount.
  }

  // Cap at 100
  if (gameState.player.level >= 100) {
    gameState.player.level = 100;
    if (gameState.player.xp > 0) gameState.player.xp = 0;
  }

  // Update last message content for spam check
  gameState.player.lastMessageContent = trimmed;

  updateStatistics(gameState, message, xp);
  updateQuestProgress(gameState, message, xp);
  const newBadges = checkBadges(gameState);
  const titleInfo = updateAchievementTitle(gameState);

  return { xp, multiplier, baseXp, streak: gameState.player.streak, newBadges, titleInfo };
}

function resolveGameState(req) {
  let state = req.body.gameState || req.body; // Accept from body
  // If invalid, use default
  if (!state || !state.player) {
    state = JSON.parse(JSON.stringify(defaultGameState));
  }

  // Retroactive Fix: Clamp Level
  if (state.player && state.player.level > 100) {
    state.player.level = 100;
  }

  return state;
}

// ============================================================================
// ENDPOINTS
// ============================================================================

// Oracle Endpoint (Interactive Hints)
app.get("/oracle-test", (req, res) => res.json({ status: "ok", message: "Route works" }));

app.post("/oracle", async (req, res) => {
  const { question, riddle, gameState } = req.body;
  if (!gameState || !gameState.player) return res.status(400).json({ error: "No game state" });
  if (gameState.player.xp < 75) return res.status(400).json({ error: "Not enough XP" });

  const url = `https://api.groq.com/openai/v1/chat/completions`;
  const payload = {
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are the Oracle of a Sci-Fi RPG. The user is trying to solve this riddle: "${riddle}". 
        The user asks you: "${question}".
        
        Task: Give a helpful, cryptic hint based on their question. 
        
        Language: ${gameState.player.language === 'ru' ? 'Russian' : gameState.player.language === 'am' ? 'Armenian' : 'English'}.
        
        Rules:
        1. DO NOT give the direct answer.
        2. If they ask "Is it X?" and X is correct, say something like "The stars align with your thought..." or "You are very close." but don't just say "Yes".
        3. Keep it under 20 words.
        4. Be mystical.`
      },
      { role: "user", content: "Oracle, guide me." }
    ],
    max_tokens: 100
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    const hint = d.choices?.[0]?.message?.content || "The Oracle is silent.";

    // Deduct XP on success
    // Note: In a real app we'd save this state here. 
    // For this architecture, we return the hint and let the client handle the state deduction sync, 
    // or arguably better, we update state here and return it. Let's return the hint and let client deduct to match existing pattern, 
    // OR return updated state. The patterns in this app rely on client sending state.
    // Let's rely on dashboard.js to deduct locally and sync, or we can deduct here if we trust the input state.
    // Safe Update:
    gameState.player.xp -= 75;

    res.json({ hint, gameState });

  } catch (e) {
    res.status(500).json({ error: "Oracle connection failed" });
  }
});

// AI Riddle Generation Endpoint
app.post("/generate-riddles", async (req, res) => {
  const { language } = req.body; // Client can pass language
  const lang = language || 'en';

  const langInstruction = {
    'en': "Generate riddles in English.",
    'ru': "Generate riddles in Russian (using Cyrillic). Answers must be single Russian words.",
    'am': "Generate riddles in Armenian (using Armenian script). Answers must be single Armenian words."
  }[lang];

  const url = `https://api.groq.com/openai/v1/chat/completions`;
  const payload = {
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a riddle generator for a sci-fi RPG. Generate 3 UNIQUE riddles in strict JSON format.
        
        LANGUAGE: ${langInstruction}

CRITICAL RULES:
1. Return ONLY valid JSON array. No markdown, no code blocks, no extra text.
2. Each riddle must have ONE CLEAR, UNAMBIGUOUS answer
3. AVOID riddles with multiple possible answers
4. The answer must be a common word in the target language

Format:
[
  {
    "title": "Cosmic challenge name (in target language)",
    "npcName": "NPC name (keep English/Sci-Fi names)",
    "question": "The riddle question (in target language)",
    "answer": "single word answer (lowercase, in target language)",
    "hint1": "Vague hint (in target language)",
    "hint2": "Obvious hint (in target language)",
    "reward": 150-500,
    "color": "#hexcolor"
  }
]

Requirements:
- Variety: logic puzzles, wordplay, tech riddles
- Answers: SINGLE WORD only
- NPC names: futuristic
- Colors: vibrant hex codes
- Focus on classic riddles with universally accepted answers

Generate 3 completely different riddles now.`
      },
      { role: "user", content: "Generate riddles" }
    ],
    max_tokens: 1200, // Increased for non-Latin scripts
    temperature: 1.2
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    let content = d.choices?.[0]?.message?.content || "[]";

    // Clean up markdown if AI adds it
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const riddles = JSON.parse(content);

    // Add IDs and format for client
    const formatted = riddles.map((r, i) => ({
      id: Date.now() + i,
      title: r.title || "Mystery Challenge",
      npcName: r.npcName || "Unknown",
      question: r.question,
      answers: [r.answer.toLowerCase()],
      hint: r.hint1 || "Think carefully...",
      hint2: r.hint2 || "The answer is obvious.",
      reward: Math.min(500, Math.max(150, r.reward || 300)),
      color: r.color || "#00d2ff",
      image: `https://api.dicebear.com/7.x/bottts/svg?seed=${r.npcName || Math.random()}`
    }));

    res.json({ riddles: formatted });
  } catch (e) {
    console.error("Riddle generation failed:", e.message);

    // Fallback to static riddles
    const fallback = [
      {
        id: Date.now(),
        title: "The Data Stream",
        npcName: "Cache-7",
        question: "What has keys but can't open locks?",
        answers: ["keyboard", "piano"],
        hint: "You use it to communicate.",
        hint2: "It's on your device.",
        reward: 250,
        color: "#00d2ff",
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=Cache"
      },
      {
        id: Date.now() + 1,
        title: "The Echo Chamber",
        npcName: "Signal-3",
        question: "I speak without a mouth. What am I?",
        answers: ["echo"],
        hint: "You hear me in canyons.",
        hint2: "I repeat what you say.",
        reward: 300,
        color: "#bc13fe",
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=Signal"
      },
      {
        id: Date.now() + 2,
        title: "The Void",
        npcName: "Shadow-X",
        question: "The more there is, the less you see. What is it?",
        answers: ["darkness", "dark"],
        hint: "It comes at night.",
        hint2: "Turn on lights to remove it.",
        reward: 200,
        color: "#9b59b6",
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=Shadow"
      }
    ];

    res.json({ riddles: fallback });
  }
});

app.post("/chat", async (req, res) => {
  const { message, type, question, riddle } = req.body;
  const gameState = resolveGameState(req);

  // === ORACLE MODE ===
  if (type === 'oracle') {
    const { hintLevel } = req.body;
    const level = hintLevel || 1;

    let promptInstruction = "";
    if (level === 1) {
      promptInstruction = "Give a VAGUE, MYSTICAL hint. Do not reveal keywords. Be cryptic.";
    } else if (level === 2) {
      promptInstruction = "Give a HELPFUL hint. Point them towards the key concepts. Be less cryptic.";
    } else {
      promptInstruction = "Give a VERY OBVIOUS hint. You can almost give it away, but don't say the exact answer word-for-word.";
    }

    const url = `https://api.groq.com/openai/v1/chat/completions`;
    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are the Oracle of a Sci-Fi RPG. The user is trying to solve this riddle: "${riddle}". 
            
            Current Hint Level: ${level} (1=Hard, 2=Medium, 3=Easy).
            Task: ${promptInstruction}
            
            Rules:
            1. Keep it under 20 words.
            2. Be mystical but adhere to the difficulty level.`
        },
        { role: "user", content: "Oracle, reveal the truth." }
      ],
      max_tokens: 150
    };

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      const hint = d.choices?.[0]?.message?.content || "The Oracle is silent.";

      return res.json({ hint, gameState });
    } catch (e) {
      return res.status(500).json({ error: "Oracle Connection Failed" });
    }
  }

  // === NORMAL CHAT MODE ===
  try {
    // --- CHEAT CODE: /lvlup444 ---
    if (message.trim() === '/lvlup444') {
      gameState.player.level += 10;
      gameState.player.skillPoints = (gameState.player.skillPoints || 0) + 10;
      gameState.player.credits = (gameState.player.credits || 0) + 500;

      return res.json({
        candidates: [{ content: { parts: [{ text: "SYSTEM OVERRIDE: Cheat Code Accepted. +10 Levels Granted. Enjoy the power." }] } }],
        gameState: gameState
      });
    }

    // 🛡️ PROFANITY FILTER
    let finalMessage = message || "";
    if (filter.containsProfanity(finalMessage)) {
      finalMessage = filter.cleanText(finalMessage);
      // Optional: Could penalize HP or just warn
    }

    const xpAwarded = awardXP(gameState, finalMessage); // Award based on CLEANED valid text

    const playerLang = gameState.player.language || 'en';
    const langInstruction = {
      'en': "Response MUST be in English.",
      'ru': "Answer strictly in Russian (Русский).",
      'am': "Answer strictly in Armenian (Հայերեն)."
    }[playerLang] || "Response MUST be in English.";

    const url = `https://api.groq.com/openai/v1/chat/completions`;
    const payload = {
      model: "llama-3.1-8b-instant", // Using faster model here too
      messages: [
        {
          role: "system",
          content: `You are an active RPG Game Master in a sci-fi universe. Your goal is to engage the user in an ongoing cosmic narrative. 
          
          CRITICAL RULES:
          1. ${langInstruction}
          2. YOU MUST end every single response with a direct question to the user. 
          3. Never end on a statement. 
          4. Keep the dialogue moving. 
          5. Be concise but immersive.`
        },
        { role: "user", content: finalMessage }
      ],
      max_tokens: 1000
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || "AI Error";

    res.json({
      candidates: [{ content: { parts: [{ text: text }] } }],
      gameState: gameState
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/stats", (req, res) => {
  const gameState = resolveGameState(req);
  const p = gameState.player;
  // Calculate next title info
  const currentTitle = achievementTitles.find(t => t.name === p.title) || achievementTitles[0];
  const nextTitle = achievementTitles.find(t => t.minXp > p.totalXpEarned) || null;

  // Logic from original /stats
  res.json({
    player: p,
    stats: p.stats,
    title: {
      name: p.title,
      icon: currentTitle.icon,
      nextTitle: nextTitle ? nextTitle.name : "Max",
      xpToNextTitle: nextTitle ? (nextTitle.minXp - p.totalXpEarned) : 0,
      minXpForCurrent: currentTitle.minXp,
      maxXpForCurrent: currentTitle.maxXp
    },
    streaks: { current: p.streak, longest: p.longestStreak },
    statistics: p.statistics,
    badges: {
      earned: p.badges.map(b => badgeDefinitions[b]).filter(Boolean),
      locked: Object.values(badgeDefinitions).filter(b => !p.badges.includes(Object.keys(badgeDefinitions).find(k => badgeDefinitions[k] === b))),
      totalEarned: p.badges.length,
      totalAvailable: Object.keys(badgeDefinitions).length
    }
  });
});


// --- SHOP & SKILLS ENDPOINTS ---


const SHOP_ITEMS = {
  "neon_green_bubble": { name: "Neon Green Bubble", cost: 500, type: "cosmetic" },
  "cyber_blue_bubble": { name: "Cyber Blue Bubble", cost: 500, type: "cosmetic" },
  "plasma_pink_bubble": { name: "Plasma Pink Bubble", cost: 500, type: "cosmetic" },
  "void_purple_bubble": { name: "Void Purple Bubble", cost: 500, type: "cosmetic" },
  "solar_orange_bubble": { name: "Solar Orange Bubble", cost: 500, type: "cosmetic" },
  "streak_freeze": { name: "Streak Freeze", cost: 200, type: "consumable" },
  "matrix_theme": { name: "Matrix Theme", cost: 1000, type: "cosmetic" }
};

const SKILL_TREE = {
  "neural_efficiency_1": { name: "Neural Efficiency", cost: 1, reqLevel: 3, description: "+10% XP Gain" },
  "focus_master": { name: "Focus Master", cost: 1, reqLevel: 5, description: "-20% Focus Diff" },
  "hacker_instinct": { name: "Hacker's Instinct", cost: 2, reqLevel: 10, description: "Cheaper Hints" }
};

app.post("/shop/buy", (req, res) => {
  const { playerId, itemId } = req.body;
  if (!users[playerId]) return res.status(404).json({ error: "User not found" });

  const user = users[playerId];
  const item = SHOP_ITEMS[itemId];

  if (!item) return res.status(400).json({ error: "Invalid item" });
  if ((user.gameState.player.credits || 0) < item.cost) return res.status(400).json({ error: "Insufficient credits" });

  // Deduct & Add
  user.gameState.player.credits -= item.cost;
  if (!user.gameState.player.inventory) user.gameState.player.inventory = [];
  user.gameState.player.inventory.push(itemId);

  saveUsers();
  res.json({ success: true, gameState: user.gameState, message: `Purchased ${item.name}!` });
});

app.post("/shop/equip", (req, res) => {
  const { playerId, itemId } = req.body;
  if (!users[playerId]) return res.status(404).json({ error: "User not found" });

  const user = users[playerId];
  const inv = user.gameState.player.inventory || [];

  if (!inv.includes(itemId)) return res.status(400).json({ error: "Item not owned" });

  // Set as equipped theme
  user.gameState.player.equippedTheme = itemId;

  saveUsers();
  res.json({ success: true, gameState: user.gameState, message: `Equipped ${itemId}!` });
});

app.post("/skills/unlock", (req, res) => {
  const { playerId, skillId } = req.body;
  if (!users[playerId]) return res.status(404).json({ error: "User not found" });

  const user = users[playerId];
  const skill = SKILL_TREE[skillId];

  if (!skill) return res.status(400).json({ error: "Invalid skill" });
  if ((user.gameState.player.skillPoints || 0) < skill.cost) return res.status(400).json({ error: "Not enough SP" });
  if (user.gameState.player.level < skill.reqLevel) return res.status(400).json({ error: "Level too low" });

  if (!user.gameState.player.unlockedSkills) user.gameState.player.unlockedSkills = [];
  if (user.gameState.player.unlockedSkills.includes(skillId)) return res.status(400).json({ error: "Already unlocked" });

  // Deduct & Unlock
  user.gameState.player.skillPoints -= skill.cost;
  user.gameState.player.unlockedSkills.push(skillId);

  saveUsers();
  res.json({ success: true, gameState: user.gameState, message: `Unlocked ${skill.name}!` });
});

app.post("/badges", (req, res) => {
  const gameState = resolveGameState(req);
  const earned = gameState.player.badges.map(b => badgeDefinitions[b]).filter(Boolean);
  const all = Object.values(badgeDefinitions);
  const locked = all.filter(b => !earned.some(e => e.name === b.name));
  res.json({ earned, locked, totalEarned: earned.length, totalAvailable: all.length });
});

app.post("/daily-quests", (req, res) => {
  const gameState = resolveGameState(req);
  generateDailyQuests(gameState);
  res.json({
    quests: gameState.dailyQuests,
    completedCount: gameState.dailyQuests.filter(q => q.completed).length,
    totalQuests: gameState.dailyQuests.length,
    completionBonus: 0
  });
});

app.post("/weekly-quests", (req, res) => {
  const gameState = resolveGameState(req);
  generateWeeklyQuests(gameState);
  res.json({
    quests: gameState.weeklyQuests,
    completedCount: gameState.weeklyQuests.filter(q => q.completed).length,
    completionBonus: 0
  });
});

app.post("/init-profile", (req, res) => {
  const gameState = resolveGameState(req);
  const { stats, personalityType } = req.body;

  if (stats) {
    gameState.player.stats.creativity = stats.creativity;
    gameState.player.stats.productivity = stats.productivity;
    gameState.player.stats.energy = stats.energy;
    gameState.player.stats.kindness = stats.kindness;
    gameState.player.stats.awareness = stats.awareness;
  }
  if (personalityType) gameState.player.personalityType = personalityType;

  res.json({ success: true, player: gameState.player, gameState: gameState }); // Return new state
});

app.get("/game-status", (req, res) => res.json(defaultGameState));
app.post("/game-reset", (req, res) => res.json(defaultGameState));

// ============================================================================
// SSE-BASED ARENA SYSTEM (Simple & Reliable)
// ============================================================================

// In-memory arena rooms
const arenaRooms = {};

// Generate a simple room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new arena room
app.post("/arena/create", (req, res) => {
  const { playerId, playerName, playerLevel } = req.body;
  if (!playerId) return res.status(400).json({ error: "Missing playerId" });

  // Remove any existing room by this player
  Object.keys(arenaRooms).forEach(code => {
    if (arenaRooms[code].host.id === playerId) {
      delete arenaRooms[code];
    }
  });

  const code = generateRoomCode();
  arenaRooms[code] = {
    code,
    host: { id: playerId, name: playerName || "Host", level: playerLevel || 1, xp: 0, totalXp: 0 },
    guest: null,
    connections: [],  // SSE connections
    winner: null,
    createdAt: Date.now()
  };

  console.log(`[ARENA] Room ${code} created by ${playerName}`);
  res.json({ success: true, code });
});

// Join an existing room
app.post("/arena/join/:code", (req, res) => {
  const { code } = req.params;
  const { playerId, playerName, playerLevel } = req.body;

  const room = arenaRooms[code.toUpperCase()];
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.guest) return res.status(400).json({ error: "Room is full" });
  if (room.host.id === playerId) return res.status(400).json({ error: "Cannot join your own room" });

  room.guest = { id: playerId, name: playerName || "Guest", level: playerLevel || 1, xp: 0, totalXp: 0 };

  // Notify host that someone joined
  broadcastToRoom(code, { type: 'player_joined', player: room.guest });

  console.log(`[ARENA] ${playerName} joined room ${code}`);
  res.json({ success: true, host: room.host });
});

// SSE stream endpoint - clients listen here for updates
app.get("/arena/stream/:code", (req, res) => {
  const { code } = req.params;
  const room = arenaRooms[code.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'connected', room: { host: room.host, guest: room.guest } })}\n\n`);

  // Add this connection to the room
  room.connections.push(res);
  console.log(`[ARENA] SSE connection opened for room ${code}. Total: ${room.connections.length}`);

  // Handle client disconnect
  req.on('close', () => {
    room.connections = room.connections.filter(c => c !== res);
    console.log(`[ARENA] SSE connection closed for room ${code}. Remaining: ${room.connections.length}`);
  });
});

// Update XP for a player
app.post("/arena/update/:code", (req, res) => {
  const { code } = req.params;
  const { playerId, xp, totalXp } = req.body;

  const room = arenaRooms[code.toUpperCase()];
  if (!room) return res.status(404).json({ error: "Room not found" });

  // Determine which player this is
  let player = null;
  let role = null;
  if (room.host.id === playerId) {
    player = room.host;
    role = 'host';
  } else if (room.guest && room.guest.id === playerId) {
    player = room.guest;
    role = 'guest';
  }

  if (!player) return res.status(400).json({ error: "Player not in this room" });

  // Update XP
  player.xp = xp;
  player.totalXp = totalXp;

  // Check for winner (first to 250 XP in this session)
  if (player.xp >= 250 && !room.winner) {
    room.winner = player.name;
    broadcastToRoom(code.toUpperCase(), { type: 'winner', winner: player.name, role });
  }

  // Broadcast update to all connections
  broadcastToRoom(code.toUpperCase(), {
    type: 'xp_update',
    role,
    xp: player.xp,
    totalXp: player.totalXp,
    name: player.name
  });

  res.json({ success: true });
});

// Get room state
app.get("/arena/state/:code", (req, res) => {
  const { code } = req.params;
  const room = arenaRooms[code.toUpperCase()];

  if (!room) return res.status(404).json({ error: "Room not found" });

  res.json({
    code: room.code,
    host: room.host,
    guest: room.guest,
    winner: room.winner
  });
});

// Leave/close room
app.post("/arena/leave/:code", (req, res) => {
  const { code } = req.params;
  const { playerId } = req.body;

  const room = arenaRooms[code.toUpperCase()];
  if (!room) return res.json({ success: true });

  // Notify others this player left
  broadcastToRoom(code.toUpperCase(), { type: 'player_left', playerId });

  // If host leaves, close the room
  if (room.host.id === playerId) {
    delete arenaRooms[code.toUpperCase()];
    console.log(`[ARENA] Room ${code} closed (host left)`);
  } else if (room.guest && room.guest.id === playerId) {
    room.guest = null;
    console.log(`[ARENA] Guest left room ${code}`);
  }

  res.json({ success: true });
});

// Get list of public rooms (for lobby display)
app.get("/arena/lobby", (req, res) => {
  const now = Date.now();
  const publicRooms = Object.values(arenaRooms)
    .filter(room => !room.guest && (now - room.createdAt) < 300000) // Only show rooms without guest, created within 5 minutes
    .map(room => ({
      code: room.code,
      hostName: room.host.name,
      hostLevel: room.host.level
    }));

  res.json(publicRooms);
});

// Helper: Broadcast message to all SSE connections in a room
function broadcastToRoom(code, data) {
  const room = arenaRooms[code];
  if (!room) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  room.connections.forEach(connection => {
    try {
      connection.write(message);
    } catch (e) {
      console.error('[ARENA] Failed to write to connection:', e.message);
    }
  });
}

// Cleanup old rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(arenaRooms).forEach(code => {
    if (now - arenaRooms[code].createdAt > 3600000) { // 1 hour
      delete arenaRooms[code];
      console.log(`[ARENA] Cleaned up stale room ${code}`);
    }
  });
}, 300000);

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

