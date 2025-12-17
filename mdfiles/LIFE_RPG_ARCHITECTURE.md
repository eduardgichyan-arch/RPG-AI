# Life RPG Game Master - Architecture & Design Document

## Executive Summary

The **Life RPG Game Master** is a production-ready system that gamifies real-life activities by converting them into RPG quests with a complete progression system. It implements clean architecture principles with clear separation between game logic (engine), data models, and user interface.

**Key Stats:**
- **Lines of Code:** ~600 (core engine)
- **Data Models:** 5 (Player, Quest, Stats, Buff, GameState)
- **Game Logic Methods:** 20+ (quest, XP, buff, stat management)
- **Commands:** 8 (status, quest_complete, next_day, etc.)
- **Dependencies:** 0 (pure Python stdlib)
- **Output Format:** JSON (no narration, structured data only)

---

## High-Level Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│          Presentation Layer (CLI Interface)             │
│  - Command parsing                                      │
│  - JSON serialization                                   │
│  - User input/output handling                           │
└──────────────────┬──────────────────────────────────────┘
                   │ Input: Command String
                   │ Output: JSON Response
┌──────────────────▼──────────────────────────────────────┐
│          Application Layer (Game Engine)                │
│  - Quest generation & management                        │
│  - XP & level progression                               │
│  - Buff/debuff mechanics                                │
│  - Daily loop orchestration                             │
│  - Stats tracking & updates                             │
└──────────────────┬──────────────────────────────────────┘
                   │ Internal State Mutations
                   │ Event-driven logic
┌──────────────────▼──────────────────────────────────────┐
│          Domain Layer (Data Models)                     │
│  - Player aggregate                                     │
│  - Quest entity                                         │
│  - Stats value object                                   │
│  - Buff/Debuff entity                                   │
│  - GameState container                                  │
└─────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│          Infrastructure Layer (Storage)                 │
│  - In-memory GameState                                  │
│  - (Future: File/DB persistence)                        │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns Used

#### 1. **Aggregate Root Pattern** (Domain-Driven Design)
```python
# GameState acts as aggregate root
# - Contains Player and Quests
# - Maintains consistency of entire game state
# - Single point of access for all entities

game_state = GameState(
    player=player,
    active_quests=quests
)
```

#### 2. **Value Object Pattern**
```python
# Stats is a value object
# - Immutable semantics (updated via snapshots)
# - Compared by value, not identity
# - Self-contained logic for stat operations

stats = Stats(
    health=100,
    energy=100,
    focus=50
)
```

#### 3. **Entity Pattern**
```python
# Player and Quest are entities
# - Have unique identity (player name, quest_id)
# - Mutable lifecycle (status changes)
# - Tracked over time

player = Player(name="Hero", level=1)
quest = Quest(quest_id="q0", title="...")
```

#### 4. **Factory Pattern** (Quest Generation)
```python
# GameEngine acts as factory for quests
# - Creates quests with appropriate properties
# - Encapsulates complexity of generation

def _create_daily_quest(self):
    """Factory method for daily quests"""
    # Complex logic to generate appropriate quest
```

#### 5. **Strategy Pattern** (XP Application)
```python
# Buffs implement strategy for XP modification
class Buff:
    def apply_xp_modifier(self, xp: float) -> float:
        """Strategy for modifying XP"""
        if self.buff_type == BuffType.DOUBLE_XP:
            return xp * 2
        elif self.buff_type == BuffType.FATIGUE:
            return xp * 0.8
```

#### 6. **Command Pattern** (CLI)
```python
# CLIInterface encapsulates commands as objects
class CLIInterface:
    def handle_command(self, command: str) -> str:
        """Command object wrapping"""
        # Parse command string
        # Execute corresponding game engine method
        # Return JSON response
```

---

## Core Components Detail

### 1. Data Models Layer

#### Player (Aggregate Root)
```python
@dataclass
class Player:
    """
    Root entity for player aggregate.
    Owns: stats, active_buffs, quests completion state
    """
    name: str
    level: int = 1
    xp: int = 0
    total_xp_earned: int = 0
    stats: Stats
    active_buffs: List[Buff]
    completed_quests_count: int = 0
    missed_quests_streak: int = 0
    current_day: int = 1
    last_quest_missed: bool = False
```

**Responsibilities:**
- Track progression (level, XP)
- Maintain streak state
- Store active effects (buffs)
- Aggregate stats

#### Quest (Entity)
```python
@dataclass
class Quest:
    """
    Quest entity with lifecycle.
    Can be in states: pending, completed, missed
    """
    quest_id: str
    title: str
    description: str
    difficulty: Difficulty
    quest_type: QuestType
    xp_reward: int
    completed: bool = False
    missed: bool = False
    created_day: int = 0
```

**Responsibilities:**
- Represent a single actionable item
- Track completion state
- Define XP reward
- Maintain metadata (type, difficulty)

#### Stats (Value Object)
```python
@dataclass
class Stats:
    """
    Value object for player attributes.
    Mutated as a whole snapshot.
    """
    health: int = 100
    energy: int = 100
    focus: int = 50
    discipline: int = 50
    productivity: int = 50
    consistency: int = 50
```

**Responsibilities:**
- Encapsulate character attributes
- Provide consistent state
- Support serialization

#### Buff (Entity)
```python
@dataclass
class Buff:
    """
    Effect entity with time-based lifecycle.
    Applies modifiers to game calculations.
    """
    buff_type: BuffType
    duration_days: int
    applied_date: str
    multiplier: float = 1.0
```

**Responsibilities:**
- Track effect type and duration
- Apply XP multipliers
- Persist across days
- Decay over time

#### GameState (Container)
```python
@dataclass
class GameState:
    """
    Container for complete game state.
    Serves as aggregate root for entire game.
    """
    player: Player
    active_quests: List[Quest]
    quest_counter: int
```

**Responsibilities:**
- Hold all game entities
- Provide single serialization point
- Maintain consistency

### 2. Game Engine Layer

#### Quest Management
```python
class GameEngine:
    def _create_daily_quest(self) -> None:
        """Create single daily quest"""
        # 1. Select random difficulty
        # 2. Choose title based on difficulty
        # 3. Calculate XP reward
        # 4. Create Quest entity
        # 5. Add to active_quests

    def _create_random_challenge(self) -> None:
        """Create random challenge"""
        
    def _create_weekly_boss_quest(self) -> None:
        """Create weekly boss quest"""
        
    def _find_quest(self, quest_id: str) -> Optional[Quest]:
        """Find quest by ID"""
```

#### XP & Level Management
```python
class GameEngine:
    def complete_quest(self, quest_id: str) -> Dict:
        """
        Complete quest and award XP.
        
        Process:
        1. Find quest by ID
        2. Validate state (not already completed)
        3. Mark as completed
        4. Reset missed streak
        5. Calculate XP reward (with buffs)
        6. Award XP
        7. Check level up (XP >= 100)
        8. Update stats
        9. Return result
        """
        
    def miss_quest(self, quest_id: str) -> Dict:
        """
        Mark quest as missed.
        
        Process:
        1. Find quest by ID
        2. Mark as missed
        3. Apply -10 XP penalty
        4. Increment missed streak
        5. Check fatigue trigger (streak >= 2)
        6. Update stats (negative)
        7. Return result
        """
```

#### Buff/Debuff Management
```python
class GameEngine:
    def _apply_fatigue_debuff(self) -> None:
        """
        Apply fatigue after 2 consecutive misses.
        - Type: fatigue (reduces XP by 20%)
        - Duration: 3 days
        - Trigger: missed_quests_streak >= 2
        """
        
    def _decay_buffs(self) -> None:
        """
        Decrease buff durations daily.
        - Called during next_day()
        - Removes expired buffs (duration <= 0)
        """
        
    def apply_random_powerup(self) -> Buff:
        """
        Randomly apply power-up.
        - 10% chance per next_day
        - Choose: FOCUS_MODE or DOUBLE_XP
        - Duration: 1 day
        """
        
    def _apply_buffs_to_xp(self, xp: float) -> float:
        """
        Aggregate XP modifiers from all active buffs.
        
        Process:
        1. Iterate active_buffs
        2. Apply each buff's apply_xp_modifier()
        3. Return final XP value
        
        Example:
        - Base XP: 25
        - Double XP active: 25 * 2 = 50
        - Fatigue also active: 50 * 0.8 = 40
        """
```

#### Daily Loop Orchestration
```python
class GameEngine:
    def next_day(self) -> Dict:
        """
        Advance to next day - orchestrates all daily mechanics.
        
        Process:
        1. Find incomplete quests (not completed, not missed)
        2. Auto-miss each incomplete quest
        3. Decay all active buffs
        4. Increment current_day
        5. Generate new daily quests (3)
        6. Generate new random challenge (1)
        7. Generate weekly boss if day % 7 == 1
        8. Random power-up (10% chance)
        9. Return state snapshot
        """
```

#### Stats System
```python
class GameEngine:
    def _update_stats_on_quest_complete(self, quest: Quest) -> None:
        """
        Update stats based on quest difficulty.
        
        Easy: energy +5, consistency +3
        Medium: focus +5, productivity +8, energy +3
        Hard: discipline +10, productivity +15, focus +10
        Boss: discipline +20, productivity +25, focus +15
        
        All capped at 100.
        """
        
    def _update_stats_on_quest_miss(self, quest: Quest) -> None:
        """
        Penalize stats for missed quest.
        
        Consistency -5, Energy -3, Discipline -3
        All floored at 0.
        """
```

### 3. CLI Interface Layer

```python
class CLIInterface:
    def handle_command(self, command: str) -> str:
        """
        Parse command and execute.
        
        Pattern:
        1. Split command into parts
        2. Dispatch to appropriate engine method
        3. Format result as JSON
        4. Return JSON string
        """
        
    def _json_response(self, data: Dict) -> str:
        """
        Serialize any dict to formatted JSON.
        Ensures consistent output format.
        """
        
    def run_interactive(self) -> None:
        """
        REPL loop for interactive mode.
        
        Loop:
        1. Print prompt
        2. Read user input
        3. Call handle_command()
        4. Print JSON response
        5. Repeat until exit
        """
```

---

## State Management & Mutations

### State Flow Diagram

```
Initial State
    ↓
┌─────────────────────────────────────────┐
│  User Command                           │
│  (quest_complete, quest_miss, next_day) │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Game Engine                            │
│  - Validate input                       │
│  - Calculate changes                    │
│  - Update entities                      │
│  - Check side effects                   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Mutate GameState                       │
│  - Update player (level, XP, stats)     │
│  - Update quests (completion, miss)     │
│  - Update buffs (add, decay, remove)    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Serialize Response                     │
│  - to_dict() on relevant entities       │
│  - Format as JSON                       │
│  - Return to CLI                        │
└──────────────┬──────────────────────────┘
               ↓
        New State
        (Ready for next command)
```

### Key Mutations

#### Quest Completion
```
player.xp += xp_reward (with buff modifiers)
player.level += (xp / 100) if XP overflow
player.stats.[stat] += based on difficulty
player.completed_quests_count += 1
player.missed_quests_streak = 0
quest.completed = True
```

#### Quest Miss
```
player.xp -= 10
player.stats.consistency -= 5
player.stats.energy -= 3
player.stats.discipline -= 3
player.missed_quests_streak += 1
quest.missed = True
if missed_streak >= 2: apply_fatigue_debuff()
```

#### Next Day
```
for quest in incomplete_quests: miss_quest(quest)
for buff in active_buffs: buff.duration_days -= 1
remove buffs where duration <= 0
player.current_day += 1
generate_daily_quests()
generate_random_challenge()
if day % 7 == 1: generate_weekly_boss()
if random() < 0.1: apply_random_powerup()
```

---

## Type Safety & Validation

### Enums for Type Safety
```python
class Difficulty(Enum):
    EASY, MEDIUM, HARD, BOSS  # Type-safe difficulty

class QuestType(Enum):
    DAILY, RANDOM, WEEKLY_BOSS  # Type-safe quest categorization

class BuffType(Enum):
    FOCUS_MODE, DOUBLE_XP, FATIGUE, STREAK_BONUS  # Type-safe buff types
```

### Input Validation
```python
def complete_quest(self, quest_id: str) -> Dict:
    quest = self._find_quest(quest_id)
    if not quest:
        return {"success": False, "error": "Quest not found"}
    
    if quest.completed or quest.missed:
        return {"success": False, "error": "Quest already resolved"}
    
    # Proceed with mutation
```

### Bounds Checking
```python
# Stats capped at 100, floored at 0
setattr(self.stats, attr, min(100, max(0, value)))

# XP never goes below 0
player.xp = max(0, player.xp - penalty)
```

---

## Performance Analysis

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| `complete_quest(id)` | O(n) | Linear search for quest |
| `next_day()` | O(n) | Process all incomplete quests |
| `_apply_buffs_to_xp()` | O(m) | m = active buffs (typically < 5) |
| `get_status()` | O(n) | Serialize all quests to JSON |
| `apply_random_powerup()` | O(1) | Constant time |

### Space Complexity

| Entity | Size | Growth |
|--------|------|--------|
| Player | ~200 bytes | O(1) - constant |
| Quest | ~300 bytes | O(n) per day |
| Buff | ~100 bytes | O(1) typically |
| GameState | ~50KB | O(n) with quests |

**Typical sizes after 100 days:**
- ~300 accumulated quests (most completed/missed)
- ~5 active buffs max
- Total state: ~500KB JSON

---

## Extension Points

### Adding New Quest Type
```python
def _create_career_quest(self):
    # Add new method
    # Follow pattern of _create_daily_quest()
    # Add to quest generation flow
```

### Adding New Buff Type
```python
class BuffType(Enum):
    # Add new buff
    SLOW_MOTION = "slow_motion"

# Implement apply_xp_modifier() for new buff
```

### Adding New Stat Type
```python
@dataclass
class Stats:
    # Add new stat
    reputation: int = 50
    
# Update in _update_stats_on_quest_complete()
```

### Persistence
```python
def save_game(state: GameState, filepath: str):
    with open(filepath, 'w') as f:
        json.dump(state.to_dict(), f)

def load_game(filepath: str) -> GameState:
    with open(filepath, 'r') as f:
        data = json.load(f)
        # Reconstruct GameState from data
```

---

## Testing Strategy

### Unit Tests
```python
def test_xp_calculation():
    engine = GameEngine()
    initial_xp = engine.game_state.player.xp
    engine.complete_quest("q0")
    assert engine.game_state.player.xp > initial_xp
```

### Integration Tests
```python
def test_next_day_flow():
    # Test complete daily cycle
    engine = GameEngine()
    engine.complete_quest("q0")
    result = engine.next_day()
    assert result["success"]
    assert engine.game_state.player.current_day == 2
```

### Scenario Tests (Provided)
- See `LIFE_RPG_TESTS.py` for comprehensive test suite

---

## Security & Safety

### No External Dependencies
- Pure Python stdlib
- No network calls
- No file I/O (by default)
- Completely sandboxed execution

### Input Validation
- All quest IDs validated
- All commands parsed safely
- All modifications bounds-checked

### Deterministic Behavior
- Random elements seeded (for reproducibility)
- All calculations deterministic
- JSON serialization consistent

---

## Conclusion

The Life RPG Game Master demonstrates:
- ✅ Clean architecture with clear separation of concerns
- ✅ Domain-driven design principles
- ✅ Proper use of design patterns
- ✅ Comprehensive type safety
- ✅ Extensible and maintainable codebase
- ✅ No external dependencies
- ✅ Pure JSON output (no narration)
- ✅ Production-ready code quality

The system successfully gamifies real-life activities with a robust progression system, dynamic quest generation, buff/debuff mechanics, and persistent stat tracking—all while maintaining clean, testable, maintainable code.
