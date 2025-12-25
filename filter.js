import fs from "fs";
import path from "path";

const BAD_WORDS_FILE = path.join(process.cwd(), "bad_words.json");
let badWords = { en: [], ru: [], am: [] };

// Sci-Fi Replacements
const REPLACEMENTS = [
    "[CORRUPTED]",
    "[REDACTED]",
    "*static*",
    "[SIGNAL_LOST]",
    "[DATA_EXPUNGED]",
    "*glitch*"
];

// Load bad words
try {
    if (fs.existsSync(BAD_WORDS_FILE)) {
        badWords = JSON.parse(fs.readFileSync(BAD_WORDS_FILE, "utf-8"));
    }
} catch (err) {
    console.error("Failed to load bad_words.json:", err);
}

// Helper: specific language check or all? 
// For safety, we check ALL languages by default since we don't always fully trust the declared language tag for profanity.
const ALL_BAD_WORDS = [...(badWords.en || []), ...(badWords.ru || []), ...(badWords.am || [])];

export default {
    /**
     * Checks if text contains profanity
     * @param {string} text 
     * @returns {boolean}
     */
    containsProfanity(text) {
        const lower = text.toLowerCase();
        return ALL_BAD_WORDS.some(word => lower.includes(word.toLowerCase()));
    },

    /**
     * Replaces profanity with Sci-Fi slang
     * @param {string} text 
     * @returns {string} cleaned text
     */
    cleanText(text) {
        let cleaned = text;

        // Improve matching to avoid partial words (e.g. "hello" contains "hell") if possible
        // But for simplicity in this MVP, we might do direct replacement or reg exp with boundaries.
        // Regex with boundaries is better for English, hard for others without proper segmentation.
        // Let's stick to simple replacement for now, or word-boundary for EN.

        ALL_BAD_WORDS.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Word boundary for latin
            if (regex.test(cleaned)) {
                const replacement = REPLACEMENTS[Math.floor(Math.random() * REPLACEMENTS.length)];
                cleaned = cleaned.replace(regex, replacement);
            } else {
                // Fallback for non-latin or no-boundary matches (less safe but catches more)
                if (cleaned.toLowerCase().includes(word.toLowerCase())) {
                    const replacement = REPLACEMENTS[Math.floor(Math.random() * REPLACEMENTS.length)];
                    // Case insensitive string replace all?
                    // Using split/join for simple complete replacement
                    const re = new RegExp(word, 'gi');
                    cleaned = cleaned.replace(re, replacement);
                }
            }
        });

        return cleaned;
    }
};
