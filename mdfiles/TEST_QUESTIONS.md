# High-Quality Test Questions for Chatbot RPG

## Maximum XP Questions (50 XP each)
These questions are **200+ characters**, detailed, multi-sentence, and show genuine curiosity. They maximize Energy, Productivity, and Focus gains.

### 1. Creative & Technical
**Question:**
"Can you explain the differences between machine learning, deep learning, and artificial intelligence? I want to understand the hierarchy and when each approach is best suited for different types of problems."

**Why it scores high:**
- 198 characters (very detailed)
- Multiple sentences
- Question mark present
- Shows genuine learning intent
- Clear multi-part inquiry

---

### 2. Problem-Solving & Strategic
**Question:**
"I'm trying to optimize my daily productivity workflow. Currently I spend about 2 hours on emails, 1 hour in meetings, and 2 hours on actual focused work. What strategies would you recommend to increase deep work time while still maintaining good communication with my team?"

**Why it scores high:**
- 238 characters (very detailed)
- Real scenario with specifics
- Question mark present
- Multiple sentences
- Seeks actionable advice

---

### 3. Philosophical & Thoughtful
**Question:**
"What do you think about the relationship between discipline and freedom? Some people say strict routines limit freedom, but others argue that discipline creates freedom by eliminating decision fatigue. How would you reconcile these two perspectives?"

**Why it scores high:**
- 214 characters (very detailed)
- Nuanced philosophical question
- Multiple sentences with context
- Question mark present
- Invites thoughtful analysis

---

### 4. Learning & Development
**Question:**
"I want to improve my public speaking skills for a presentation next month. What are the most effective techniques for managing anxiety, structuring a compelling narrative, and engaging an audience? Should I focus on memorization or understanding concepts deeply?"

**Why it scores high:**
- 232 characters (very detailed)
- Multiple related questions
- Clear goal stated
- Question marks present
- Comprehensive inquiry

---

### 5. Creative & Analytical
**Question:**
"How would you design a mobile app that helps people develop better habits? What features would be essential, how would you make it engaging, and what metrics would you track to measure user success and app effectiveness?"

**Why it scores high:**
- 208 characters (very detailed)
- Multi-part design question
- Multiple sentences
- Question marks present
- Shows creative thinking

---

### 6. Technical Deep-Dive
**Question:**
"Can you walk me through how APIs work, including the request/response cycle, authentication methods like OAuth versus JWT, and when you'd choose REST versus GraphQL for a new project? What are the trade-offs?"

**Why it scores high:**
- 217 characters (very detailed)
- Technical terminology
- Multiple components
- Question marks present
- Seeks comprehensive explanation

---

### 7. Career & Growth
**Question:**
"I'm considering a career transition from marketing to software development. What skills should I prioritize learning first? How long typically does the transition take, and what are common challenges people face? Do you recommend bootcamps or self-study?"

**Why it scores high:**
- 228 characters (very detailed)
- Multiple related questions
- Real life scenario
- Question marks present
- Shows serious intent

---

### 8. Innovation & Exploration
**Question:**
"What emerging technologies do you think will have the biggest impact on society in the next 5-10 years? How should people prepare for these changes, and what skills would be most valuable in a world transformed by AI, quantum computing, or blockchain?"

**Why it scores high:**
- 220 characters (very detailed)
- Forward-thinking questions
- Multiple sentences
- Question marks present
- Encourages deep analysis

---

## Medium XP Questions (20-35 XP)
For comparison, here are good but slightly shorter questions:

### Medium A: "How does photosynthesis work and why is it so important for Earth's ecosystem?"
- 90 characters (good)
- One question mark
- Educational inquiry
- ~20 XP

### Medium B: "What are the key differences between JavaScript and Python, and which would be better for a beginner to learn first?"
- 122 characters (detailed)
- Multiple sentences
- Two questions
- ~35 XP

---

## Low XP Questions (Spam - 0 XP)
For reference, questions that get 0 XP:

- "hi" (2 chars) = 0 XP
- "ok" (2 chars) = 0 XP
- "what?" (5 chars) = 0 XP
- "lol nice" (8 chars) = 0 XP
- "hey there" (9 chars) = 0 XP

---

## How to Test

1. **Copy one of the maximum XP questions above**
2. **Paste it into the chatbot at http://localhost:3000**
3. **Expected results:**
   - XP awarded: **50 XP**
   - Energy: **+5 → ~105 (capped at 100)**
   - Productivity: **+2 → ~52**
   - Focus: **+3 → ~53**
   - Level may increase if XP surpasses 100

4. **Try several questions** to watch stats compound
5. **Compare with spam** ("hi", "ok") which earn 0 XP and no stat gains

---

## Stat Gains Per Question Type

| Type | Length | XP | Energy | Productivity | Focus | Notes |
|------|--------|-----|--------|--------------|-------|-------|
| Spam | <10 chars | 0 | 0 | 0 | 0 | Rejected |
| Short | 10-30 chars | 5 | +5 | +2 | +3 | Basic question |
| Medium | 30-60 chars | 10 | +5 | +2 | +3 | Good question |
| Good | 60-120 chars | 20 | +5 | +2 | +3 | Detailed question |
| Detailed | 120-200 chars | 35 | +5 | +2 | +3 | Very detailed |
| Excellent | 200+ chars | 50 | +5 | +2 | +3 | Comprehensive |

**Bonus:** +5 XP if question mark present, +5 XP if multiple sentences
