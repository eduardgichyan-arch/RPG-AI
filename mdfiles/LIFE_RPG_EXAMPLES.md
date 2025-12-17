# Life RPG Game Master - Usage Examples & Scenarios

## Quick Start

### Running the Demo
```bash
python3 life_rpg_game_master.py
```

This runs a complete demo showing:
1. Initial game status
2. Quest listing
3. Quest completion (2 quests)
4. Quest miss
5. Player status check
6. Day advancement
7. New quests generation

---

## Interactive Mode Usage

### Starting Interactive Mode

Edit the last lines of `life_rpg_game_master.py`:

```python
if __name__ == "__main__":
    # Comment out demo
    # demo_game()
    
    # Uncomment interactive mode
    cli = CLIInterface("Hero")
    cli.run_interactive()
```

Then run:
```bash
python3 life_rpg_game_master.py
```

### Example Interactive Session

```
>>> help
{
  "commands": {
    "next_day": "Advance to the next day...",
    "quest_complete <quest_id>": "Complete a quest...",
    ...
  }
}

>>> status
{
  "player": { ... },
  "active_quests": [ ... ],
  "timestamp": "..."
}

>>> quests
{
  "total_quests": 5,
  "quests": [ ... ]
}

>>> quest_complete q0
{
  "success": true,
  "xp_awarded": 25,
  "player_stats": { ... }
}

>>> player
{
  "name": "Hero",
  "level": 1,
  "xp": 25,
  ...
}

>>> next_day
{
  "success": true,
  "message": "Advanced to Day 2",
  "game_state": { ... }
}

>>> exit
{ "message": "Exiting game..." }
```

---

## Scenario 1: Perfect Day (All Quests Complete)

**Goal:** Complete all quests in a day to maximize XP and stats.

```
Day 1 Start:
- 3 daily quests (easy, medium, hard) = 10 + 25 + 50 = 85 XP
- 1 random challenge = 25 XP
- 1 weekly boss = 150 XP (if available)
- Total possible: 260 XP (if boss available) or 110 XP (without boss)

Commands:
>>> quest_complete q0   # Easy: +10 XP, consistency +3
>>> quest_complete q1   # Medium: +25 XP, focus +5, productivity +8
>>> quest_complete q2   # Hard: +50 XP, discipline +10, productivity +15, focus +10
>>> quest_complete q3   # Random: +25 XP
>>> quest_complete q4   # Boss: +150 XP (if applicable)

Result:
- XP: 0 → 110+ (possible level up if boss completed)
- Stats boosted across the board
- Consistency maintained (only gains, no misses)
```

---

## Scenario 2: Struggle Day (Multiple Misses)

**Goal:** Understand fatigue debuff mechanics.

```
Day 1 Start:
- 5 quests generated

Commands:
>>> quest_miss q0        # Miss 1: -10 XP, streak = 1
>>> quest_miss q1        # Miss 2: -10 XP, streak = 2
                          # FATIGUE DEBUFF TRIGGERED! (-20% XP for 3 days)

Result after next_day:
- Fatigue applied: duration 3 days, XP multiplier 0.8x
- Future quests worth only 80% XP while active
- Stats penalized (consistency -5, energy -3, discipline -3)
- Player must recover over next 3 days
```

---

## Scenario 3: Week-Long Campaign

**Goal:** Track progression over a full week with daily advancement.

```
Day 1:
>>> quest_complete q0  # 25 XP (total: 25)
>>> quest_complete q1  # 50 XP (total: 75)
>>> next_day

Day 2:
>>> quest_complete q5  # 25 XP (total: 100) → LEVEL UP! Level 1→2, XP: 0
>>> quest_complete q6  # 25 XP (total: 25)
>>> next_day

Day 3:
>>> quest_miss q8      # Miss, streak starts
>>> quest_complete q9  # 25 XP (total: 50)
>>> next_day

Day 4:
>>> quest_miss q14     # Miss again, streak = 2
                       # FATIGUE applied!
>>> next_day

Day 5-6: (Fatigue active, 0.8x multiplier)
>>> quest_complete q17 # 25 XP * 0.8 = 20 XP
>>> quest_complete q18 # 50 XP * 0.8 = 40 XP
>>> next_day

Day 7:
>>> quest_complete q23 # 150 XP (boss quest)
>>> quest_complete q24 # 25 XP
>>> next_day

Day 8 (Week 2):
>>> status
# Check dramatic progression!
```

---

## Scenario 4: Using Buffs Strategically

**Goal:** Leverage power-ups to maximize progress during peak productivity.

```
Random situation:
- Random power-up triggered during next_day (10% chance)
- Receives either FOCUS_MODE or DOUBLE_XP

With DOUBLE_XP active:
>>> quest_complete q0  # 10 XP × 2 = 20 XP
>>> quest_complete q1  # 25 XP × 2 = 50 XP
>>> quest_complete q2  # 50 XP × 2 = 100 XP
# Total day: normally 85 XP, with DOUBLE_XP: 170 XP!

Result:
- Potential level up from single day
- Major stat boosts
- Momentum for next day
```

---

## Scenario 5: Recovery from Fatigue

**Goal:** Understand how to break out of the fatigue spiral.

```
Day 1-2: Multiple misses
>>> quest_miss q0
>>> quest_miss q1
# Fatigue applied (3 days, 0.8x XP)

Day 3-5: Under fatigue
- All quest rewards reduced 20%
- Stats gradually decline if continuing to miss
- Focus on completing easy quests for wins

Day 3:
>>> quest_complete q10  # 10 XP * 0.8 = 8 XP (easy, boosted morale)
>>> quest_complete q11  # 10 XP * 0.8 = 8 XP (easy, boosted morale)

Day 4:
>>> quest_complete q15  # 25 XP * 0.8 = 20 XP (medium, building confidence)

Day 5:
>>> quest_complete q20  # 25 XP * 0.8 = 20 XP (medium)
>>> next_day
# Fatigue expired! Back to normal XP rates

Day 6: Recovery complete
>>> quest_complete q25  # 50 XP (hard, full XP)
```

---

## Scenario 6: Stat-Focused Play

**Goal:** Track which quest types build which stats.

```
Focus: Build Productivity and Discipline

Strategy:
- Complete all HARD quests (discipline +10, productivity +15)
- Complete all BOSS quests (discipline +20, productivity +25)
- Avoid easy quests (minimal stat gains)

Day 1:
>>> quest_complete q0  # Hard: discipline 50→60, productivity 50→65
>>> quest_complete q1  # Hard: discipline 60→70, productivity 65→80
>>> next_day

Day 2:
>>> quest_complete q5  # Hard: discipline 70→80, productivity 80→95
>>> quest_complete q4  # Boss: discipline 80→100, productivity 95→100

Result: Stats maxed out
- Discipline: 100/100 ✓
- Productivity: 100/100 ✓
```

---

## Scenario 7: Analysis Mode

**Goal:** Use CLI to extract and analyze game state.

```
>>> player
# Get player JSON data

>>> quests
# Get all active quests with details

>>> status
# Get complete game state snapshot

# Can pipe to files for analysis:
# python3 -c "
#   from life_rpg_game_master import GameEngine
#   engine = GameEngine('Hero')
#   import json
#   with open('game_state.json', 'w') as f:
#       json.dump(engine.get_status(), f, indent=2)
# "
```

---

## Scenario 8: Extended Play (30-Day Challenge)

**Goal:** Run game for extended period to see long-term progression.

```
Pseudocode for automated play:

from life_rpg_game_master import GameEngine

engine = GameEngine("Marathoner")

# Simulate 30 days
for day in range(30):
    # Simulate different completion rates:
    # Days 1-10: 80% completion (4 out of 5 quests)
    # Days 11-20: 90% completion (aggressive)
    # Days 21-30: 70% completion (fatigue/burnout)
    
    if day < 10:
        completion_rate = 0.8
    elif day < 20:
        completion_rate = 0.9
    else:
        completion_rate = 0.7
    
    for quest in engine.game_state.active_quests:
        if random.random() < completion_rate:
            engine.complete_quest(quest.quest_id)
    
    engine.next_day()

# Check final state
print(engine.get_player_status())
```

Expected progression:
- Day 10: ~Level 2-3
- Day 20: ~Level 4-5
- Day 30: ~Level 5-7 (depending on misses and buffs)

---

## Scenario 9: Testing Fatigue Mechanics

**Goal:** Deliberately trigger and observe fatigue debuff.

```
Initial state: clean slate

>>> quest_miss q0
{ "missed_streak": 1, "active_buffs": [] }

>>> quest_miss q1
{ "missed_streak": 2, "active_buffs": [{"type": "fatigue", "duration_days": 3}] }

>>> player
# Shows fatigue in active_buffs

>>> quest_complete q2
# Normal XP reward: 10
# Actual XP awarded: 10 * 0.8 = 8 XP
# Notice the difference!

>>> next_day
>>> next_day
>>> next_day
>>> player
# After 3 days, fatigue is gone
# active_buffs: [] (empty)

>>> quest_complete q3
# Back to normal XP: 10 XP (not 8)
```

---

## Scenario 10: Customization Example

**Goal:** Modify the system for personal use case.

```python
# Example: Add "Fitness" quest type

from life_rpg_game_master import GameEngine, Quest, Difficulty, QuestType

class CustomGameEngine(GameEngine):
    def create_fitness_quest(self):
        """Custom quest type for fitness tracking."""
        quest = Quest(
            quest_id=f"q{self.game_state.quest_counter}",
            title="Workout Session",
            description="Complete a full body workout",
            difficulty=Difficulty.MEDIUM,
            quest_type=QuestType.DAILY,
            xp_reward=30,  # Custom higher reward
            created_day=self.game_state.player.current_day
        )
        self.game_state.quest_counter += 1
        self.game_state.active_quests.append(quest)

# Usage
engine = CustomGameEngine("FitnessGamer")
engine.create_fitness_quest()
engine.complete_quest("q0")
```

---

## Command Reference with Examples

### next_day
```bash
>>> next_day
# Output: Day advanced from 1 to 2
#         4 incomplete quests auto-missed
#         Fatigue debuff applied (if 2+ consecutive misses)
#         3 new daily quests generated
#         1 new random challenge generated
#         Possibly weekly boss (if day % 7 == 1)
#         Random power-up applied (10% chance)
```

### quest_complete
```bash
>>> quest_complete q0
# Output: Quest marked complete
#         XP awarded (with buff multipliers applied)
#         Stats updated based on difficulty
#         Missed streak reset to 0
#         Player level-up if threshold crossed
```

### quest_miss
```bash
>>> quest_miss q2
# Output: Quest marked missed
#         -10 XP penalty applied
#         Stats penalized (consistency, energy, discipline)
#         Missed streak incremented
#         Fatigue debuff applied if streak == 2
```

### status
```bash
>>> status
# Output: Full JSON with:
#         - Player (level, XP, stats, buffs, streaks)
#         - All active quests (completed, missed, pending)
#         - Timestamp
```

### quests
```bash
>>> quests
# Output: Array of all active quest objects with:
#         - Quest ID, title, description
#         - Difficulty and type
#         - XP reward
#         - Completion status
```

### player
```bash
>>> player
# Output: Player object only (no quests)
```

### help
```bash
>>> help
# Output: Available commands with descriptions
#         Example quest IDs for reference
```

---

## Performance Notes

- **Typical game state size:** ~50KB JSON (100 quests, 10 buffs)
- **Command response time:** <1ms (pure Python)
- **Suitable for:** Personal use, single player
- **Scalability:** Can handle months of gameplay without slowdown

---

## Tips & Tricks

1. **Streak Recovery:** Focus on easy quests after fatigue to build confidence
2. **XP Optimization:** Complete hard quests on days with buffs
3. **Stat Balancing:** Rotate quest difficulties to balance all stats
4. **Weekly Planning:** Plan boss quest for highest-energy day
5. **Data Export:** Pipe JSON output to file for analytics

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Quest not found | Check quest_id with `quests` command |
| XP not awarded | Check for active fatigue debuff with `player` |
| Level didn't increase | XP thresholds require 100 XP per level |
| Can't mark quest complete twice | Quest already completed or missed |
| Command not recognized | Type `help` to see available commands |

