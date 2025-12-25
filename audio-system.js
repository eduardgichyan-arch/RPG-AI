// audio-system.js
// Procedural Sci-Fi Sound Effects using Web Audio API
// No external assets required!

class SoundFX {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            console.log("🔊 Audio System Initialized");
        } catch (e) {
            console.warn("Audio Context failed:", e);
        }
    }

    // Helper: Create an oscillator
    createOsc(type, freq, startTime, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // sine, square, sawtooth, triangle
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // 1. Typing Sound (High-tech blip)
    playTyping() {
        if (!this.initialized || this.isMuted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        // Randomize pitch slightly for realism
        const freq = 600 + Math.random() * 200;
        this.createOsc('sine', freq, now, 0.05, 0.03);
    }

    // 2. Message Sent (Whoosh / Chime)
    playSend() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Rising tone
        this.createOsc('sine', 400, now, 0.2, 0.1);
        this.createOsc('triangle', 600, now + 0.05, 0.2, 0.05);
        this.createOsc('sine', 1000, now + 0.1, 0.3, 0.05);
    }

    // 3. XP Gain (Satisfying chord)
    playXpGain() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Major Triad (C E G)
        this.createOsc('sine', 523.25, now, 0.4, 0.1); // C5
        this.createOsc('sine', 659.25, now + 0.05, 0.4, 0.1); // E5
        this.createOsc('sine', 783.99, now + 0.1, 0.4, 0.1); // G5
    }

    // 4. Alert / Anomaly (Low buzz warning)
    playAlert() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Pulse
        this.createOsc('sawtooth', 150, now, 0.4, 0.05);
        this.createOsc('sawtooth', 140, now + 0.2, 0.4, 0.05);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

// Export a singleton instance
const sfx = new SoundFX();
window.sfx = sfx;
