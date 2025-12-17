#!/usr/bin/env python3
"""
Life RPG Game Master - Quick Reference & Testing Script

This file demonstrates how to use the system programmatically
and can be used for quick testing of individual features.
"""

from life_rpg_game_master import GameEngine, CLIInterface, Difficulty, QuestType
import json


def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def test_xp_system():
    """Test XP and level progression."""
    print_section("TEST 1: XP & Level System")
    
    engine = GameEngine("LevelChaser")
    player = engine.game_state.player
    
    print(f"Initial: Level {player.level}, XP {player.xp}/100")
    
    # Complete quests to gain 100 XP (level up threshold)
    for i in range(4):
        engine.complete_quest(f"q{i}")
    
    player = engine.game_state.player
    print(f"After 4 quests: Level {player.level}, XP {player.xp % 100}/100")
    print(f"Total XP Earned: {player.total_xp_earned}")
    print(f"Expected: Level 2 (after 100 XP)")


def test_quest_system():
    """Test quest generation and types."""
    print_section("TEST 2: Quest Generation System")
    
    engine = GameEngine("QuestMaster")
    
    daily_count = sum(1 for q in engine.game_state.active_quests 
                      if q.quest_type == QuestType.DAILY)
    random_count = sum(1 for q in engine.game_state.active_quests 
                       if q.quest_type == QuestType.RANDOM)
    boss_count = sum(1 for q in engine.game_state.active_quests 
                     if q.quest_type == QuestType.WEEKLY_BOSS)
    
    print(f"Day 1 Quests Generated:")
    print(f"  Daily Quests: {daily_count} (expected: 3)")
    print(f"  Random Challenges: {random_count} (expected: 1)")
    print(f"  Weekly Boss: {boss_count} (expected: 1)")
    print(f"  Total: {len(engine.game_state.active_quests)} (expected: 5)")
    
    # Advance and check new generation
    engine.next_day()
    
    print(f"\nDay 2 Quests After next_day:")
    print(f"  Total Quests: {len(engine.game_state.active_quests)}")
    print(f"  (Includes Day 1 completed/missed + Day 2 new quests)")


def test_buff_debuff_system():
    """Test buffs and debuffs."""
    print_section("TEST 3: Buff/Debuff System")
    
    engine = GameEngine("BuffTester")
    
    print("Scenario: Two consecutive quest misses")
    print("-" * 70)
    
    # Force miss two quests
    engine.miss_quest("q0")
    print(f"After 1st miss - Streak: {engine.game_state.player.missed_quests_streak}")
    print(f"Buffs: {[b.buff_type.value for b in engine.game_state.player.active_buffs]}")
    
    engine.miss_quest("q1")
    print(f"After 2nd miss - Streak: {engine.game_state.player.missed_quests_streak}")
    print(f"Buffs: {[b.buff_type.value for b in engine.game_state.player.active_buffs]}")
    
    # Try to complete a quest with fatigue active
    print("\nFatigue Impact on XP:")
    normal_reward = 25  # Medium quest
    fatigue_buff = [b for b in engine.game_state.player.active_buffs 
                    if b.buff_type.value == 'fatigue']
    if fatigue_buff:
        reduced_reward = int(normal_reward * fatigue_buff[0].apply_xp_modifier(1.0))
        print(f"  Normal Medium Quest: +{normal_reward} XP")
        print(f"  With Fatigue: +{reduced_reward} XP ({int(reduced_reward/normal_reward * 100)}% of normal)")


def test_stat_system():
    """Test stat updates."""
    print_section("TEST 4: Stat Tracking System")
    
    engine = GameEngine("StatTracker")
    initial_stats = dict(engine.game_state.player.stats.to_dict())
    
    print("Initial Stats:")
    for stat, value in initial_stats.items():
        print(f"  {stat.capitalize()}: {value}")
    
    # Complete different difficulty quests
    print("\nCompleting Medium Quest...")
    engine.complete_quest("q0")  # Medium quest
    
    print("\nStats After Medium Quest:")
    new_stats = dict(engine.game_state.player.stats.to_dict())
    for stat, value in new_stats.items():
        diff = value - initial_stats[stat]
        prefix = "+" if diff > 0 else ""
        print(f"  {stat.capitalize()}: {value} ({prefix}{diff})")


def test_daily_loop():
    """Test next_day logic."""
    print_section("TEST 5: Daily Loop Logic")
    
    engine = GameEngine("DailyLooper")
    
    print("Day 1 - Incomplete quests:")
    incomplete_before = [q for q in engine.game_state.active_quests 
                         if not q.completed and not q.missed]
    print(f"  Incomplete: {len(incomplete_before)}")
    
    # Don't complete all quests, then advance day
    engine.complete_quest("q0")  # Complete 1 out of 5
    
    print("\nExecuting: next_day")
    result = engine.next_day()
    
    print(f"\nDay 2 - Results:")
    print(f"  Auto-missed: {result['incomplete_quests_auto_missed']} quests")
    print(f"  Current Day: {engine.game_state.player.current_day}")
    print(f"  Total Active Quests: {len(engine.game_state.active_quests)}")
    print(f"  Missed Streak: {engine.game_state.player.missed_quests_streak}")


def test_cli_commands():
    """Test CLI interface."""
    print_section("TEST 6: CLI Interface")
    
    cli = CLIInterface("CLITester")
    
    commands_to_test = [
        ("help", "Show available commands"),
        ("status", "Get full game status"),
        ("quests", "List active quests"),
        ("player", "Get player status"),
        ("quest_complete q0", "Complete a quest"),
        ("quest_miss q1", "Miss a quest"),
    ]
    
    for cmd, description in commands_to_test:
        print(f"\nCommand: {cmd}")
        print(f"Description: {description}")
        result = cli.handle_command(cmd)
        # Parse JSON and show key info
        data = json.loads(result)
        if "success" in data:
            print(f"Result: {'✓ Success' if data['success'] else '✗ Failed'}")
        elif "error" in data:
            print(f"Error: {data['error']}")
        elif "quests" in data or "total_quests" in data or "commands" in data:
            print(f"Result: Data returned ({len(result)} bytes)")


def test_complex_scenario():
    """Test a complex multi-day scenario."""
    print_section("TEST 7: Complex Multi-Day Scenario")
    
    engine = GameEngine("Adventurer")
    
    print("Simulating 5-day gameplay...")
    print("-" * 70)
    
    for day in range(1, 6):
        player = engine.game_state.player
        
        # Simulate varying completion rates
        if day == 1:
            # Day 1: Perfect execution
            for q in engine.game_state.active_quests:
                if not q.completed and not q.missed:
                    engine.complete_quest(q.quest_id)
                    break
            completion_rate = "Perfect (1/5)"
        elif day == 2:
            # Day 2: Good execution
            for i, q in enumerate(engine.game_state.active_quests):
                if i < 3 and not q.completed and not q.missed:
                    engine.complete_quest(q.quest_id)
            completion_rate = "Good (3/5)"
        else:
            # Day 3+: Struggling
            completion_rate = "Poor (0/5)"
        
        print(f"\nDay {day}:")
        print(f"  Level: {player.level}, XP: {player.xp}/100")
        print(f"  Completion: {completion_rate}")
        print(f"  Active Buffs: {[b.buff_type.value for b in player.active_buffs]}")
        print(f"  Stats: P={player.stats.productivity} D={player.stats.discipline} E={player.stats.energy}")
        
        if day < 5:
            engine.next_day()
    
    print(f"\n{'='*70}")
    print(f"Final Status:")
    final_player = engine.game_state.player
    print(f"  Level: {final_player.level}")
    print(f"  Total XP Earned: {final_player.total_xp_earned}")
    print(f"  Quests Completed: {final_player.completed_quests_count}")
    print(f"  Current Streak: {final_player.missed_quests_streak}")


def run_all_tests():
    """Run all tests."""
    print("\n" + "="*70)
    print("  LIFE RPG GAME MASTER - COMPREHENSIVE TEST SUITE")
    print("="*70)
    
    tests = [
        ("XP & Level System", test_xp_system),
        ("Quest Generation", test_quest_system),
        ("Buff/Debuff System", test_buff_debuff_system),
        ("Stat Tracking", test_stat_system),
        ("Daily Loop Logic", test_daily_loop),
        ("CLI Interface", test_cli_commands),
        ("Complex Scenario", test_complex_scenario),
    ]
    
    for name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"\n❌ ERROR in {name}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*70)
    print("  ALL TESTS COMPLETED")
    print("="*70 + "\n")


if __name__ == "__main__":
    run_all_tests()
