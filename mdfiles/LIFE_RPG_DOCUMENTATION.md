# Life RPG Game Master System - Complete Documentation

## Overview

The **Life RPG Game Master** is a sophisticated system that gamifies real life by turning daily activities into role-playing game quests. It automatically manages an RPG progression system with experience points (XP), levels, stats, buffs, and debuffs based on user actions.

**Key Features:**
- 🎮 XP and Level System (Level up every 100 XP)
- 📋 Dynamic Quest Generation (Daily, Random, Weekly Boss)
- 📊 Player Stats Tracking (Health, Energy, Focus, Discipline, Productivity, Consistency)
- 🎯 Buff/Debuff System (Focus Mode, Double XP, Fatigue)
- 📈 Streak and Penalty System
- 💾 Persistent JSON State Management
- 🔧 Modular, Clean Architecture

---

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│              CLI Interface Layer                        │
│  - Command parsing (next_day, quest_complete, etc)     │
│  - JSON response formatting                             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Game Engine Layer                          │
│  ├─ Quest Manager (generation, completion)             │
│  ├─ XP & Level Manager (progression, level-ups)        │
│  ├─ Buff/Debuff Manager (application, decay)           │
│  ├─ Stats System (tracking and updates)                │
│  └─ Daily Loop Logic (next_day automation)             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Data Models Layer                          │
│  ├─ Player (name, level, XP, stats, buffs)             │
│  ├─ Quest (title, difficulty, type, completion)        │
│  ├─ Stats (6 tracked attributes)                       │
│  ├─ Buff (type, duration, XP multiplier)               │
│  └─ GameState (player + active quests)                 │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Command
    ↓
CLI Interface (parse command)
    ↓
Game Engine (execute logic)
    ↓
Update Game State (models)
    ↓
JSON Response (output)
```

---

## Data Models

### Player
```json
{
  "name": "Adventurer",
  "level": 1,
  "xp": 65,
  "xp_to_next_level": 35,
  "total_xp_earned": 65,
  "stats": {...},
  "active_buffs": [...],
  "completed_quests_count": 2,
  "missed_quests_streak": 1,
  "current_day": 1
}
```

### Quest
```json
{
  "quest_id": "q0",
  "title": "Learn something new for 45 minutes",
  "description": "Daily medium quest",
  "difficulty": "medium",  // easy, medium, hard, boss
  "type": "daily",         // daily, random, weekly_boss
  "xp_reward": 25,
  "completed": false,
  "missed": false,
  "created_day": 1
}
```

### Stats
```json
{
  "health": 100,
  "energy": 100,
  "focus": 50,
  "discipline": 50,
  "productivity": 50,
  "consistency": 50
}
```

### Buff/Debuff
```json
{
  "type": "fatigue",           // focus_mode, double_xp, fatigue, streak_bonus
  "duration_days": 2,
  "applied_date": "1"
}
```

---

## Game Logic Details

### XP and Level System

| Difficulty | XP Reward |
|-----------|----------|
| Easy | +10 XP |
| Medium | +25 XP |
| Hard | +50 XP |
| Boss | +150 XP |
| Missed Quest | -10 XP |

**Level Progression:**
- 100 XP = 1 Level Up
- Level resets XP counter (XP % 100)
- Player starts at Level 1 with 0 XP

### Quest System

**Daily Quests (3 per day):**
- Auto-generated with random difficulties (Easy, Medium, Hard)
- Examples: "Drink 8 glasses of water", "Complete 1 hour focused work"
- Auto-marked as missed if not completed when advancing to next day
- Penalty: -10 XP per missed quest

**Random Challenges (1 per day):**
- Dynamic random challenges
- Always Medium difficulty (+25 XP)
- Examples: "Seize an unexpected opportunity", "Help someone"

**Weekly Boss Quest (1 per week):**
- Appears on Day 1, 8, 15, 22, 29, etc.
- High difficulty boss (+150 XP)
- Persists until completion or end of week
- Major stat boosts on completion

### Buff/Debuff Mechanics

**Focus Mode (Buff):**
- Doesn't modify XP
- Indicates high concentration
- Duration: Typically 1 day

**Double XP Day (Buff):**
- Multiplies all quest XP rewards by 2x
- Duration: 1 day
- Random chance (10%) of triggering at next_day

**Fatigue Debuff:**
- Applied after 2 consecutive missed quests
- Reduces all XP rewards by 20% (×0.8 multiplier)
- Duration: 3 days
- Continues until duration expires

**Streak Bonus (Buff):**
- Not auto-applied, available for future expansion
- Multiplies XP by 1.5x when active

### Stat System

**Stats Update on Quest Completion:**

| Quest Type | Health | Energy | Focus | Discipline | Productivity | Consistency |
|-----------|--------|--------|-------|-----------|--------------|------------|
| Easy | - | +5 | - | - | - | +3 |
| Medium | - | +3 | +5 | - | +8 | - |
| Hard | - | - | +10 | +10 | +15 | - |
| Boss | - | - | +15 | +20 | +25 | - |

**Stats Update on Quest Miss:**
- Consistency: -5
- Energy: -3
- Discipline: -3

**Stat Bounds:** 0-100 (capped and floored)

### Daily Loop Logic

When `next_day` command is executed:

1. **Mark Incomplete Quests as Missed**
   - Find all daily/random quests not completed
   - Auto-miss them
   - Apply -10 XP penalty per missed quest
   - Update streak counter

2. **Check Fatigue Trigger**
   - If 2+ consecutive misses, apply Fatigue Debuff (3 days, 0.8x XP)

3. **Decay Buffs**
   - Decrease duration_days for all active buffs
   - Remove buffs with duration ≤ 0

4. **Advance Day Counter**
   - Increment current_day by 1

5. **Generate New Quests**
   - 3 new daily quests
   - 1 new random challenge
   - 1 weekly boss (if day % 7 == 1)

6. **Random Power-Up (10% chance)**
   - Focus Mode or Double XP (randomly selected)
   - Duration: 1 day

---

## Game Engine Implementation

### Core Classes

#### GameEngine
Main game logic manager with methods:

**Quest Management:**
- `_create_daily_quest()` - Generate daily quest
- `_create_random_challenge()` - Generate random challenge
- `_create_weekly_boss_quest()` - Generate boss quest
- `complete_quest(quest_id)` - Mark quest complete, award XP
- `miss_quest(quest_id)` - Mark quest missed, apply penalty

**Buff/Debuff Management:**
- `apply_random_powerup()` - Randomly apply buff
- `_apply_fatigue_debuff()` - Apply fatigue on 2 misses
- `_decay_buffs()` - Decrease buff durations

**State Management:**
- `next_day()` - Advance day and generate new quests
- `_apply_buffs_to_xp()` - Apply XP multipliers
- `_update_stats_on_quest_complete()` - Update stats
- `_update_stats_on_quest_miss()` - Penalize stats

**Query Methods:**
- `get_status()` - Full game state
- `get_player_status()` - Player only
- `get_active_quests()` - Quests only

---

## CLI Interface

### Supported Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `next_day` | None | Advance to next day, auto-miss incomplete quests, generate new quests |
| `quest_complete` | `<quest_id>` | Complete a quest and gain XP |
| `quest_miss` | `<quest_id>` | Mark a quest as missed (penalties applied) |
| `status` | None | Get full game state (player, quests, buffs) |
| `quests` | None | List all active quests |
| `player` | None | Get player status only |
| `help` | None | Show available commands and examples |
| `exit` | None | Exit the game |

### Example Usage

```bash
# Start interactive mode
python3 life_rpg_game_master.py

# Then in interactive mode:
>>> status
>>> quests
>>> quest_complete q0
>>> quest_complete q1
>>> quest_miss q2
>>> player
>>> next_day
>>> quests
>>> exit
```

---

## Example Walkthrough

### Initial State (Day 1)

```json
{
  "player": {
    "name": "Adventurer",
    "level": 1,
    "xp": 0,
    "xp_to_next_level": 100,
    "completed_quests_count": 0,
    "missed_quests_streak": 0,
    "current_day": 1
  },
  "active_quests": 5  // 3 daily + 1 random + 1 weekly boss
}
```

### After Completing 2 Quests

**Command:** `quest_complete q0` (Medium quest, +25 XP)

```json
{
  "success": true,
  "xp_awarded": 25,
  "player_stats": {
    "xp": 25,
    "xp_to_next_level": 75,
    "focus": 55,
    "productivity": 58
  }
}
```

**Command:** `quest_complete q1` (Hard quest, +50 XP)

```json
{
  "success": true,
  "xp_awarded": 50,
  "player_stats": {
    "xp": 75,
    "xp_to_next_level": 25,
    "discipline": 60,
    "productivity": 73,
    "focus": 65
  }
}
```

### After Missing a Quest

**Command:** `quest_miss q2`

```json
{
  "success": true,
  "xp_penalty": -10,
  "missed_streak": 1,
  "player_stats": {
    "xp": 65,
    "consistency": 45,
    "energy": 97
  }
}
```

### Advancing to Day 2 (with auto-miss and fatigue trigger)

**Command:** `next_day`

- Incomplete quest auto-missed → streak = 2 → **FATIGUE DEBUFF APPLIED** (3 days, 0.8x XP)
- New quests generated (3 daily + 1 random)
- Buffs decayed
- Day advanced to 2

```json
{
  "success": true,
  "message": "Advanced to Day 2",
  "incomplete_quests_auto_missed": 1,
  "game_state": {
    "player": {
      "current_day": 2,
      "xp": 55,
      "missed_quests_streak": 2,
      "active_buffs": [
        {
          "type": "fatigue",
          "duration_days": 2,
          "applied_date": "1"
        }
      ]
    },
    "active_quests": 8  // 4 from day 1 (completed/missed) + 4 new for day 2
  }
}
```

---

## Architecture Benefits

### Separation of Concerns
- **CLI Interface:** Handles user input and output formatting
- **Game Engine:** Contains all game logic and state management
- **Data Models:** Pure data structures with utility methods

### Extensibility
Easy to add:
- New quest types (career, fitness, relationships, etc.)
- New stat types (reputation, karma, etc.)
- New buff types (rage mode, slow-mo, etc.)
- Achievement system
- Seasonal events
- PvP or multiplayer mechanics

### Testability
- Pure functions for logic
- Immutable data patterns where applicable
- Clear input/output contracts for all methods
- JSON serialization for state persistence

### Performance
- O(n) quest lookup via linear search (fine for small game states)
- O(n) buff decay (linear with active buffs)
- Memory efficient (all data in memory, no DB calls)

---

## Running the System

### Demo Mode
```bash
python3 life_rpg_game_master.py
```
Runs a predefined sequence of commands and outputs results.

### Interactive Mode
```bash
python3 life_rpg_game_master.py
# Then uncomment the last lines in main section
```

### Programmatic Usage
```python
from life_rpg_game_master import GameEngine

engine = GameEngine("Hero")
result = engine.complete_quest("q0")
print(result)
```

---

## Constants Reference

| Constant | Value | Description |
|----------|-------|-------------|
| `XP_PER_LEVEL` | 100 | XP needed to level up |
| `MISSED_QUEST_PENALTY` | -10 | XP penalty per missed quest |
| `STREAK_BONUS_MULTIPLIER` | 1.5 | XP multiplier for streak bonus |
| `FATIGUE_DEBUFF_DURATION` | 3 | Days fatigue lasts |
| `FATIGUE_XP_PENALTY` | 0.8 | XP multiplier during fatigue (20% reduction) |

---

## Future Enhancement Ideas

1. **Achievement System** - Unlock badges for milestones
2. **Customizable Stats** - Different stat sets per player
3. **Seasonal Events** - Special quests during holidays
4. **Social Features** - Leaderboards, shared challenges
5. **Persistent Storage** - Save/load game to JSON file
6. **Mobile App** - React Native version
7. **AI Difficulty Scaling** - Adjust quests based on performance
8. **Multi-player** - Cooperative quests with friends
9. **Quest Ratings** - User feedback to tune difficulty
10. **Habit Integration** - Sync with habit tracking apps

---

## Technical Stack

- **Language:** Python 3.7+
- **Paradigm:** Object-Oriented Programming with Dataclasses
- **Dependencies:** None (uses only Python stdlib)
- **Output Format:** JSON
- **State Management:** In-memory (GameState object)

---

## Files

- `life_rpg_game_master.py` - Complete implementation

---

## License & Usage

Free to use and modify. Designed as a learning project and self-improvement tool.
