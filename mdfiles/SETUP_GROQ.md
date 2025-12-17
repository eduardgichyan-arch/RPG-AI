# 🚀 Groq API Setup (FREE & Unlimited)

## Quick Start (2 minutes)

### Step 1: Create Groq Account & API Key
1. Go to: **https://console.groq.com/keys**
2. Click "Sign Up" (use your email)
3. Verify email (instant)
4. Click "Create API Key"
5. Copy the key (starts with `gsk_`)

### Step 2: Start the Server
Open Terminal and run:
```bash
cd "/Users/user/Desktop/das 1"
export API_KEY="YOUR_GROQ_API_KEY_HERE"
npm start
```

Example:
```bash
export API_KEY="gsk_xxxxxxxxxxxxxxxxxx"
npm start
```

### Step 3: Test in Browser
1. Open browser: **http://localhost:8000/index.html**
2. Type any message
3. Click "Send"
4. Get instant responses!

---

## Why Groq?
✅ Completely FREE
✅ No quota limits
✅ Super fast (200 tokens/second)
✅ Unlimited messages
✅ Works with Mixtral 8x7B model

---

## Troubleshooting

**If you see "API_KEY not set":**
```bash
export API_KEY="your_key_here"
npm start
```

**If you see "401 Unauthorized":**
- Check your API key is correct
- Make sure key starts with `gsk_`

**If server won't start:**
```bash
pkill -f "node server.js"
sleep 2
npm start
```

---

## Terminal Commands

**Start Node Server (port 3000):**
```bash
cd "/Users/user/Desktop/das 1"
export API_KEY="YOUR_KEY"
npm start
```

**Start HTTP Server (port 8000):**
```bash
cd "/Users/user/Desktop/das 1"
python3 -m http.server 8000
```

Then open: http://localhost:8000/index.html
