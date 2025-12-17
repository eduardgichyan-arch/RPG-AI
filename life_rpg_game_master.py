"""
Life RPG Game Master System
Turns real life into an RPG with quests, XP, levels, and stat tracking.

Architecture:
- Data Models: Define game entities (Player, Quest, Stats, Buffs)
- Game Engine: Core logic for XP, levels, quests, and daily mechanics
- CLI Interface: Command handler and JSON output formatter
"""

import json
import random
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime, timedelta


# ============================================================================
# ENUMS AND CONSTANTS
# ============================================================================

class Difficulty(Enum):
    """Quest difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    BOSS = "boss"


class QuestType(Enum):
    """Types of quests."""
    DAILY = "daily"
    RANDOM = "random"
    WEEKLY_BOSS = "weekly_boss"


class BuffType(Enum):
    """Buff/Debuff types."""
    FOCUS_MODE = "focus_mode"
    DOUBLE_XP = "double_xp"
    FATIGUE = "fatigue"
    STREAK_BONUS = "streak_bonus"


# XP and difficulty constants
XP_REWARDS = {
    Difficulty.EASY: 10,
    Difficulty.MEDIUM: 25,
    Difficulty.HARD: 50,
    Difficulty.BOSS: 150,
}

MISSED_QUEST_PENALTY = -10
XP_PER_LEVEL = 100
STREAK_BONUS_MULTIPLIER = 1.5
FATIGUE_DEBUFF_DURATION = 3  # days
FATIGUE_XP_PENALTY = 0.8  # 20% XP reduction


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class Buff:
    """Represents a buff or debuff with duration."""
    buff_type: BuffType
    duration_days: int
    applied_date: str
    multiplier: float = 1.0  # XP multiplier for certain buffs

    def is_active(self, current_day: int) -> bool:
        """Check if buff is still active."""
        return self.duration_days > 0

    def apply_xp_modifier(self, xp: float) -> float:
        """Apply XP modifier if applicable."""
        if self.buff_type == BuffType.DOUBLE_XP:
            return xp * 2
        elif self.buff_type == BuffType.FATIGUE:
            return xp * FATIGUE_XP_PENALTY
        elif self.buff_type == BuffType.STREAK_BONUS:
            return xp * STREAK_BONUS_MULTIPLIER
        return xp

    def to_dict(self):
        """Convert to dictionary for JSON output."""
        return {
            "type": self.buff_type.value,
            "duration_days": self.duration_days,
            "applied_date": self.applied_date
        }


@dataclass
class Quest:
    """Represents a single quest."""
    quest_id: str
    title: str
    description: str
    difficulty: Difficulty
    quest_type: QuestType
    xp_reward: int
    completed: bool = False
    missed: bool = False
    created_day: int = 0

    def to_dict(self):
        """Convert to dictionary for JSON output."""
        return {
            "quest_id": self.quest_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty.value,
            "type": self.quest_type.value,
            "xp_reward": self.xp_reward,
            "completed": self.completed,
            "missed": self.missed,
            "created_day": self.created_day
        }


@dataclass
class Stats:
    """Player stats and metrics."""
    health: int = 100
    energy: int = 100
    focus: int = 50
    discipline: int = 50
    productivity: int = 50
    consistency: int = 50

    def to_dict(self):
        """Convert to dictionary for JSON output."""
        return {
            "health": self.health,
            "energy": self.energy,
            "focus": self.focus,
            "discipline": self.discipline,
            "productivity": self.productivity,
            "consistency": self.consistency
        }


@dataclass
class Player:
    """Main player entity."""
    name: str
    level: int = 1
    xp: int = 0
    total_xp_earned: int = 0
    stats: Stats = field(default_factory=Stats)
    active_buffs: List[Buff] = field(default_factory=list)
    completed_quests_count: int = 0
    missed_quests_streak: int = 0
    current_day: int = 1
    last_quest_missed: bool = False

    def to_dict(self):
        """Convert to dictionary for JSON output."""
        return {
            "name": self.name,
            "level": self.level,
            "xp": self.xp,
            "xp_to_next_level": max(0, XP_PER_LEVEL - (self.xp % XP_PER_LEVEL)),
            "total_xp_earned": self.total_xp_earned,
            "stats": self.stats.to_dict(),
            "active_buffs": [b.to_dict() for b in self.active_buffs],
            "completed_quests_count": self.completed_quests_count,
            "missed_quests_streak": self.missed_quests_streak,
            "current_day": self.current_day
        }


@dataclass
class GameState:
    """Tracks the entire game state."""
    player: Player
    active_quests: List[Quest] = field(default_factory=list)
    quest_counter: int = 0  # For generating unique quest IDs

    def to_dict(self):
        """Convert to dictionary for JSON output."""
        return {
            "player": self.player.to_dict(),
            "active_quests": [q.to_dict() for q in self.active_quests],
            "timestamp": datetime.now().isoformat()
        }


# ============================================================================
# GAME ENGINE
# ============================================================================

class GameEngine:
    """Core game logic and mechanics."""

    def __init__(self, player_name: str = "Hero"):
        """Initialize the game engine with a player."""
        self.game_state = GameState(player=Player(name=player_name))
        self._generate_initial_quests()

    # ========================================================================
    # QUEST GENERATION
    # ========================================================================

    def _generate_initial_quests(self):
        """Generate initial quests for day 1."""
        # Generate 3 daily quests
        for _ in range(3):
            self._create_daily_quest()

        # Generate 1 random challenge
        self._create_random_challenge()

        # Generate 1 weekly boss quest (day 1)
        if self.game_state.player.current_day % 7 == 1:
            self._create_weekly_boss_quest()

    def _generate_daily_quests(self):
        """Generate quests for the next day."""
        # Remove old incomplete quests (except weekly boss)
        self.game_state.active_quests = [
            q for q in self.game_state.active_quests
            if q.quest_type == QuestType.WEEKLY_BOSS or q.completed or q.missed
        ]

        # Generate 3 new daily quests
        for _ in range(3):
            self._create_daily_quest()

        # Generate 1 random challenge
        self._create_random_challenge()

        # Generate weekly boss if it's a new week
        if self.game_state.player.current_day % 7 == 1:
            self._create_weekly_boss_quest()

    def _create_daily_quest(self):
        """Create a single daily quest with random difficulty."""
        difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]
        difficulty = random.choice(difficulties)

        quest_titles = {
            Difficulty.EASY: [
                "Drink 8 glasses of water",
                "Do 10-minute meditation",
                "Take a 20-minute walk",
                "Write 3 journal entries",
                "Read 10 pages"
            ],
            Difficulty.MEDIUM: [
                "Complete 1 hour focused work",
                "Workout for 30 minutes",
                "Learn something new for 45 minutes",
                "Organize your workspace",
                "Prepare healthy meals for tomorrow"
            ],
            Difficulty.HARD: [
                "Complete a major project milestone",
                "Write 1000+ words of content",
                "Master a new skill (2+ hours)",
                "Deep clean your environment",
                "Have 3 meaningful conversations"
            ]
        }

        title = random.choice(quest_titles[difficulty])
        xp = XP_REWARDS[difficulty]

        quest = Quest(
            quest_id=f"q{self.game_state.quest_counter}",
            title=title,
            description=f"Daily {difficulty.value} quest",
            difficulty=difficulty,
            quest_type=QuestType.DAILY,
            xp_reward=xp,
            created_day=self.game_state.player.current_day
        )

        self.game_state.quest_counter += 1
        self.game_state.active_quests.append(quest)

    def _create_random_challenge(self):
        """Create a random challenge quest."""
        challenges = [
            ("Unexpected Opportunity", "Seize an unexpected opportunity"),
            ("Challenge Accepted", "Face a personal challenge head-on"),
            ("Help Someone", "Do an act of kindness"),
            ("Quick Win", "Complete something you've been procrastinating on"),
            ("Stretch Goal", "Do something outside your comfort zone"),
        ]

        title, description = random.choice(challenges)

        quest = Quest(
            quest_id=f"q{self.game_state.quest_counter}",
            title=title,
            description=description,
            difficulty=Difficulty.MEDIUM,
            quest_type=QuestType.RANDOM,
            xp_reward=XP_REWARDS[Difficulty.MEDIUM],
            created_day=self.game_state.player.current_day
        )

        self.game_state.quest_counter += 1
        self.game_state.active_quests.append(quest)

    def _create_weekly_boss_quest(self):
        """Create a weekly boss quest (high difficulty)."""
        boss_quests = [
            ("Weekly Boss: Major Goal", "Complete your main weekly objective"),
            ("Boss Challenge: Leadership", "Lead a team or group towards a goal"),
            ("Boss Challenge: Innovation", "Create something new and meaningful"),
            ("Boss Challenge: Mastery", "Achieve expertise in a skill"),
            ("Boss Challenge: Impact", "Make a significant positive impact"),
        ]

        title, description = random.choice(boss_quests)

        quest = Quest(
            quest_id=f"q{self.game_state.quest_counter}",
            title=title,
            description=description,
            difficulty=Difficulty.BOSS,
            quest_type=QuestType.WEEKLY_BOSS,
            xp_reward=XP_REWARDS[Difficulty.BOSS],
            created_day=self.game_state.player.current_day
        )

        self.game_state.quest_counter += 1
        self.game_state.active_quests.append(quest)

    # ========================================================================
    # QUEST COMPLETION LOGIC
    # ========================================================================

    def complete_quest(self, quest_id: str) -> Dict:
        """Mark a quest as completed and award XP."""
        quest = self._find_quest(quest_id)
        if not quest:
            return {
                "success": False,
                "error": f"Quest '{quest_id}' not found"
            }

        if quest.completed or quest.missed:
            return {
                "success": False,
                "error": f"Quest '{quest_id}' is already {quest.completed and 'completed' or 'missed'}"
            }

        # Mark as completed
        quest.completed = True

        # Reset missed streak on successful completion
        self.game_state.player.missed_quests_streak = 0
        self.game_state.player.last_quest_missed = False

        # Award XP
        xp_to_award = quest.xp_reward
        xp_to_award = self._apply_buffs_to_xp(xp_to_award)
        xp_to_award = int(xp_to_award)

        self.game_state.player.xp += xp_to_award
        self.game_state.player.total_xp_earned += xp_to_award
        self.game_state.player.completed_quests_count += 1

        # Check for level up
        level_ups = self.game_state.player.xp // XP_PER_LEVEL
        if level_ups > 0:
            old_level = self.game_state.player.level
            self.game_state.player.level += level_ups
            self.game_state.player.xp %= XP_PER_LEVEL

        # Update stats based on quest difficulty
        self._update_stats_on_quest_complete(quest)

        return {
            "success": True,
            "quest_completed": quest.to_dict(),
            "xp_awarded": xp_to_award,
            "player_stats": self.game_state.player.to_dict()
        }

    def miss_quest(self, quest_id: str) -> Dict:
        """Mark a quest as missed and apply penalties."""
        quest = self._find_quest(quest_id)
        if not quest:
            return {
                "success": False,
                "error": f"Quest '{quest_id}' not found"
            }

        if quest.completed or quest.missed:
            return {
                "success": False,
                "error": f"Quest '{quest_id}' is already {quest.completed and 'completed' or 'missed'}"
            }

        # Mark as missed
        quest.missed = True

        # Apply penalty
        xp_penalty = MISSED_QUEST_PENALTY
        self.game_state.player.xp = max(0, self.game_state.player.xp + xp_penalty)
        self.game_state.player.total_xp_earned += xp_penalty

        # Update streak
        self.game_state.player.missed_quests_streak += 1
        self.game_state.player.last_quest_missed = True

        # Check if fatigue debuff should be triggered
        if self.game_state.player.missed_quests_streak >= 2:
            self._apply_fatigue_debuff()

        # Update stats
        self._update_stats_on_quest_miss(quest)

        return {
            "success": True,
            "quest_missed": quest.to_dict(),
            "xp_penalty": xp_penalty,
            "missed_streak": self.game_state.player.missed_quests_streak,
            "player_stats": self.game_state.player.to_dict()
        }

    def _find_quest(self, quest_id: str) -> Optional[Quest]:
        """Find a quest by ID."""
        for quest in self.game_state.active_quests:
            if quest.quest_id == quest_id:
                return quest
        return None

    def _apply_buffs_to_xp(self, xp: float) -> float:
        """Apply active buffs' XP modifiers."""
        for buff in self.game_state.player.active_buffs:
            if buff.is_active(self.game_state.player.current_day):
                xp = buff.apply_xp_modifier(xp)
        return xp

    def _update_stats_on_quest_complete(self, quest: Quest):
        """Update player stats when quest is completed."""
        if quest.difficulty == Difficulty.EASY:
            self.game_state.player.stats.energy += 5
            self.game_state.player.stats.consistency += 3
        elif quest.difficulty == Difficulty.MEDIUM:
            self.game_state.player.stats.focus += 5
            self.game_state.player.stats.productivity += 8
            self.game_state.player.stats.energy += 3
        elif quest.difficulty == Difficulty.HARD:
            self.game_state.player.stats.discipline += 10
            self.game_state.player.stats.productivity += 15
            self.game_state.player.stats.focus += 10
        elif quest.difficulty == Difficulty.BOSS:
            self.game_state.player.stats.discipline += 20
            self.game_state.player.stats.productivity += 25
            self.game_state.player.stats.focus += 15

        # Cap stats at 100
        for attr in ['health', 'energy', 'focus', 'discipline', 'productivity', 'consistency']:
            current = getattr(self.game_state.player.stats, attr)
            setattr(self.game_state.player.stats, attr, min(100, current))

    def _update_stats_on_quest_miss(self, quest: Quest):
        """Update player stats when quest is missed."""
        self.game_state.player.stats.consistency -= 5
        self.game_state.player.stats.energy -= 3
        self.game_state.player.stats.discipline -= 3

        # Floor stats at 0
        for attr in ['health', 'energy', 'focus', 'discipline', 'productivity', 'consistency']:
            current = getattr(self.game_state.player.stats, attr)
            setattr(self.game_state.player.stats, attr, max(0, current))

    # ========================================================================
    # BUFF/DEBUFF LOGIC
    # ========================================================================

    def _apply_fatigue_debuff(self):
        """Apply fatigue debuff after 2 consecutive missed quests."""
        # Check if fatigue is already active
        for buff in self.game_state.player.active_buffs:
            if buff.buff_type == BuffType.FATIGUE:
                return  # Already have fatigue

        fatigue = Buff(
            buff_type=BuffType.FATIGUE,
            duration_days=FATIGUE_DEBUFF_DURATION,
            applied_date=str(self.game_state.player.current_day)
        )

        self.game_state.player.active_buffs.append(fatigue)

    def apply_random_powerup(self):
        """Randomly apply a power-up buff."""
        powerups = [BuffType.FOCUS_MODE, BuffType.DOUBLE_XP]
        powerup = random.choice(powerups)

        buff = Buff(
            buff_type=powerup,
            duration_days=1,
            applied_date=str(self.game_state.player.current_day)
        )

        self.game_state.player.active_buffs.append(buff)
        return buff

    def _decay_buffs(self):
        """Decrease buff durations and remove expired ones."""
        for buff in self.game_state.player.active_buffs:
            buff.duration_days -= 1

        # Remove expired buffs
        self.game_state.player.active_buffs = [
            b for b in self.game_state.player.active_buffs
            if b.duration_days > 0
        ]

    # ========================================================================
    # DAILY LOOP LOGIC
    # ========================================================================

    def next_day(self) -> Dict:
        """Advance to the next day and generate new quests."""
        # Handle incomplete quests from previous day
        incomplete_quests = [
            q for q in self.game_state.active_quests
            if not q.completed and not q.missed and q.quest_type != QuestType.WEEKLY_BOSS
        ]

        # Mark incomplete quests as missed
        for quest in incomplete_quests:
            self.miss_quest(quest.quest_id)

        # Decay buffs
        self._decay_buffs()

        # Advance day
        self.game_state.player.current_day += 1

        # Generate new quests
        self._generate_daily_quests()

        # Occasionally grant random power-up (10% chance)
        if random.random() < 0.1:
            self.apply_random_powerup()

        return {
            "success": True,
            "message": f"Advanced to Day {self.game_state.player.current_day}",
            "incomplete_quests_auto_missed": len(incomplete_quests),
            "game_state": self.game_state.to_dict()
        }

    # ========================================================================
    # QUERY METHODS
    # ========================================================================

    def get_status(self) -> Dict:
        """Get current game status."""
        return self.game_state.to_dict()

    def get_player_status(self) -> Dict:
        """Get player status only."""
        return self.game_state.player.to_dict()

    def get_active_quests(self) -> Dict:
        """Get list of active quests."""
        return {
            "total_quests": len(self.game_state.active_quests),
            "quests": [q.to_dict() for q in self.game_state.active_quests]
        }


# ============================================================================
# CLI INTERFACE
# ============================================================================

class CLIInterface:
    """Command-line interface for the game."""

    def __init__(self, player_name: str = "Hero"):
        """Initialize CLI with a game engine."""
        self.engine = GameEngine(player_name)
        self.running = True

    def handle_command(self, command: str) -> str:
        """Parse and execute a command, return JSON response."""
        parts = command.strip().split()

        if not parts:
            return self._json_response({"error": "No command provided"})

        cmd = parts[0].lower()

        if cmd == "next_day":
            result = self.engine.next_day()
        elif cmd == "quest_complete" and len(parts) > 1:
            quest_id = parts[1]
            result = self.engine.complete_quest(quest_id)
        elif cmd == "quest_miss" and len(parts) > 1:
            quest_id = parts[1]
            result = self.engine.miss_quest(quest_id)
        elif cmd == "status":
            result = self.engine.get_status()
        elif cmd == "quests":
            result = self.engine.get_active_quests()
        elif cmd == "player":
            result = self.engine.get_player_status()
        elif cmd == "help":
            result = self._get_help()
        elif cmd == "exit":
            self.running = False
            result = {"message": "Exiting game..."}
        else:
            result = {"error": f"Unknown command: {cmd}. Type 'help' for available commands."}

        return self._json_response(result)

    def _json_response(self, data: Dict) -> str:
        """Format data as pretty JSON."""
        return json.dumps(data, indent=2)

    def _get_help(self) -> Dict:
        """Return help information."""
        return {
            "commands": {
                "next_day": "Advance to the next day, auto-miss incomplete quests, generate new quests",
                "quest_complete <quest_id>": "Complete a quest and gain XP",
                "quest_miss <quest_id>": "Mark a quest as missed (apply penalties)",
                "status": "Get full game status (player, quests, buffs)",
                "quests": "List all active quests",
                "player": "Get player status only",
                "help": "Show this help message",
                "exit": "Exit the game"
            },
            "example_quest_ids": [q.quest_id for q in self.engine.game_state.active_quests[:3]]
        }

    def run_interactive(self):
        """Run interactive CLI loop."""
        print("\n" + "="*70)
        print("🎮 LIFE RPG GAME MASTER - Interactive Mode")
        print("="*70)
        print(f"Welcome, {self.engine.game_state.player.name}!")
        print("Type 'help' for available commands.\n")

        while self.running:
            try:
                user_input = input(">>> ").strip()
                if user_input:
                    response = self.handle_command(user_input)
                    print(response)
            except KeyboardInterrupt:
                print("\n\nGame interrupted. Goodbye!")
                break
            except Exception as e:
                print(json.dumps({"error": str(e)}, indent=2))


# ============================================================================
# MAIN / TESTING
# ============================================================================

def demo_game():
    """Run a demo game session."""
    print("\n" + "="*70)
    print("🎮 LIFE RPG GAME MASTER - Demo Session")
    print("="*70 + "\n")

    engine = GameEngine("Adventurer")
    cli = CLIInterface("Adventurer")

    # Demo commands
    demo_commands = [
        ("status", "Check initial status"),
        ("quests", "List active quests"),
        ("quest_complete q0", "Complete first quest"),
        ("quest_complete q1", "Complete second quest"),
        ("quest_miss q2", "Miss a quest"),
        ("player", "Check player status"),
        ("next_day", "Advance to next day"),
        ("quests", "List new quests"),
    ]

    for cmd, description in demo_commands:
        print(f"\n📍 Command: {cmd}")
        print(f"📝 {description}")
        print("-" * 70)
        response = cli.handle_command(cmd)
        print(response)
        print()


if __name__ == "__main__":
    # Run demo
    demo_game()

    # Uncomment below to run interactive mode
    # cli = CLIInterface("Hero")
    # cli.run_interactive()
