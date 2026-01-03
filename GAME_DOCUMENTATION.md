# Poker Shootout - Complete Game Documentation

## Overview

Poker Shootout is a fast-paced card game where players select 5 cards to form poker hands and score points. The primary game mode is **SSC (Survival Score Challenge)**, a progressive level-based mode with multiple gameplay phases.

---

## Game Modes

### SSC Mode (Survival Score Challenge)
The main game mode featuring progressive levels with increasing difficulty.

- **Objective**: Meet or exceed the level goal score before time runs out
- **Progression**: Levels 1, 2, 3... with increasing goals
- **Time Limit**: 60 seconds per level
- **Bonus Rounds**: Occur after every 3 levels

### Classic Modes (Legacy)
- `classic_fc` - Classic Falling Cards
- `classic_cb` - Classic Conveyor Belt
- `blitz_fc` - Blitz Falling Cards (60 second time limit)
- `blitz_cb` - Blitz Conveyor Belt (60 second time limit)

---

## SSC Level Progression System

### Cycle 1: Levels 1-12 (No Orbit)
Uses a **9-level rotation** pattern:

| Levels | Phase |
|--------|-------|
| 1-3 | Static |
| 4-6 | Conveyor |
| 7-9 | Falling |
| 10-12 | Static (repeats) |

### Cycle 2+: Level 13 onwards (With Orbit)
Uses a **12-level rotation** pattern:

| Levels | Phase |
|--------|-------|
| 13-15, 25-27, 37-39... | Static |
| 16-18, 28-30, 40-42... | Conveyor |
| 19-21, 31-33, 43-45... | Falling |
| 22-24, 34-36, 46-48... | Orbit |

### Key Level Milestones
- **Level 7**: First Falling phase
- **Level 22**: First Orbit phase
- **Every 3 levels**: Bonus Round triggers (3, 6, 9, 12, 15, 18, 21, 24...)

---

## Gameplay Phases

### 1. Static Phase
- Cards are displayed in a fixed grid
- No movement - pure card selection
- **Reshuffle power-up available** (only works in this phase)
- Best for beginners and strategic hand building

### 2. Conveyor Phase
- Cards move horizontally across the screen in rows
- Multiple rows moving at different speeds
- Cards wrap around or respawn
- Base speed: 1.2

### 3. Falling Phase ("Sky is Falling")
- Cards fall from the top of the screen
- Each card has unique speed, rotation, and sway
- **First cycle (Levels 7-9)**: 15% slower for training
- Base speed: 1.53 (first cycle) → 1.8 (later cycles)

### 4. Orbit Phase
- Cards rotate in concentric rings around a center point
- **3 rings** with different card counts:
  - Inner ring: 8 cards
  - Middle ring: 12 cards
  - Outer ring: 16 cards
- Ring speed multipliers:
  - Inner: 1.0x (anchor speed)
  - Middle: 1.15x
  - Outer: 1.3x
- Base speed: 1.05 (30% slower than other modes for playability)

---

## Speed Scaling System

### Base Speeds by Phase
| Phase | Base Speed |
|-------|------------|
| Static | 0 (no movement) |
| Conveyor | 1.2 |
| Falling (first cycle) | 1.53 |
| Falling (later) | 1.8 |
| Orbit | 1.05 |

### Speed Progression (Level 11+)
- **Levels 1-10**: No speed increase (base speed only)
- **Level 11+**:
  - **Falling & Orbit**: 0.5% increase per level (gentle progression)
  - **Conveyor**: 2% increase per level

### Speed Formula
```
speed = baseSpeed × (1 + (level - 10) × scalingRate)
```
Where `scalingRate` = 0.005 for Falling/Orbit, 0.02 for Conveyor

---

## Scoring System

### Poker Hand Values
| Hand | Base Points | Rank |
|------|-------------|------|
| Royal Flush | 5,000 | 1 |
| Straight Flush | 2,500 | 2 |
| Four of a Kind | 1,500 | 3 |
| Full House | 1,000 | 4 |
| Flush | 750 | 5 |
| Straight | 500 | 6 |
| Three of a Kind | 300 | 7 |
| Two Pair | 150 | 8 |
| One Pair | 50 | 9 |
| High Card | 10 | 10 |

### Score Calculation
```
Total Points = Base Points + Value Bonus
```
Where `Value Bonus` = sum of all card face values in the hand

### Level Goal Progression
```
Goal = 500 × 1.05^(level - 1)
```
- Level 1: 500 points
- Level 10: ~776 points
- Level 20: ~1,265 points
- Level 30: ~2,061 points

### Star Rating System
| Performance | Stars |
|-------------|-------|
| Score ≥ Goal × 1.5 | ⭐⭐⭐ (3 stars) |
| Score ≥ Goal × 1.25 | ⭐⭐ (2 stars) |
| Score ≥ Goal | ⭐ (1 star) |
| Score < Goal | Game Over |

### Better-Hand Multiplier
Consecutive hands that beat the previous hand's rank earn multipliers:

| Streak | Multiplier |
|--------|------------|
| 1 better hand | 1.2x |
| 2 consecutive | 1.5x |
| 3+ consecutive | 2.0x |

---

## Bonus Rounds

### Trigger Condition
Bonus rounds occur **after completing levels 3, 6, 9, 12, 15, 18, 21, 24...** (every 3rd level)

### Bonus Round Flow
1. Complete level (e.g., Level 24)
2. Level Complete modal appears
3. Bonus Round starts
4. Form the best hand possible within time limit
5. Earn power-up based on score
6. Next level begins (Level 25)

### Bonus-Friendly Decks
Early bonus rounds use specially constructed decks with higher chances of good hands.

---

## Power-Up System

### Power-Up Tiers

#### Tier 1: Common (Bronze rewards, score < 500)
| ID | Name | Emoji | Effect |
|----|------|-------|--------|
| reshuffle | Reshuffle | 🔀 | Shuffle and re-deal all cards (Static mode only, reusable) |
| two_pair | Two Pair | 2️⃣ | Instantly form a Two Pair hand |
| three_kind | Three of a Kind | 3️⃣ | Instantly form Three of a Kind |
| add_time | Add Time | ⏰ | Add 15 seconds to the clock (reusable) |

#### Tier 2: Uncommon (Silver rewards, score 500-1,200)
| ID | Name | Emoji | Effect |
|----|------|-------|--------|
| straight | Straight | ➡️ | Instantly form a Straight |
| flush | Flush | ♦️ | Instantly form a Flush |
| full_house | Full House | 🏠 | Instantly form a Full House |

#### Tier 3: Rare (Gold rewards, score > 1,200)
| ID | Name | Emoji | Effect |
|----|------|-------|--------|
| four_kind | Four of a Kind | 4️⃣ | Instantly form Four of a Kind |
| straight_flush | Straight Flush | 🔥 | Instantly form a Straight Flush |
| royal_flush | Royal Flush | 👑 | Instantly form a Royal Flush |

### Power-Up Inventory
- **Maximum capacity**: 3 power-ups
- **When full**: Player must choose to swap an existing power-up or discard the new one
- **Reusable power-ups**: Reshuffle and Add Time can be used multiple times

### Power-Up Restrictions
- **Reshuffle**: Only visible and usable during Static phase levels

---

## Reward Tier System

### Bonus Round Score Thresholds
| Tier | Score Range | Power-Up Tier |
|------|-------------|---------------|
| Bronze 🥉 | < 500 points | Tier 1 (Common) |
| Silver 🥈 | 500-1,200 points | Tier 2 (Uncommon) |
| Gold 🥇 | > 1,200 points | Tier 3 (Rare) |

---

## Game State Properties

### Core State
```typescript
interface GameState {
  mode: GameMode;           // Current game mode
  score: number;            // Current score (alias for levelScore in SSC)
  handsPlayed: number;      // Number of hands submitted
  timeRemaining: number;    // Seconds left in level
  isPlaying: boolean;       // Game is active
  isPaused: boolean;        // Game is paused
  isGameOver: boolean;      // Game has ended
  isLevelComplete: boolean; // Current level beaten
  isBonusLevel: boolean;    // In bonus round
}
```

### SSC-Specific State
```typescript
{
  sscLevel: number;         // Current level (1, 2, 3...)
  sscPhase: SSCPhase;       // 'static' | 'conveyor' | 'falling' | 'orbit'
  sscRound: number;         // Which cycle (1, 2, 3...)
  levelGoal: number;        // Points needed to pass level
  levelScore: number;       // Points earned this level
  cumulativeScore: number;  // Total points across all levels
}
```

### Card State
```typescript
{
  selectedCards: Card[];    // Currently selected cards (max 5)
  deck: Card[];             // Available cards on screen
  usedCards: Card[];        // Cards already used in hands
  currentHand: HandResult;  // Last evaluated hand
}
```

### Power-Up State
```typescript
{
  earnedPowerUps: string[];      // Power-ups in inventory
  activePowerUps: string[];      // Power-ups currently in use
  pendingReward: string | null;  // Power-up earned from bonus round
  rewardTier: RewardTier | null; // Tier of pending reward
  showLootBox: boolean;          // Show loot box animation
  inventoryFull: boolean;        // Need to swap/discard
}
```

---

## Key Files & Architecture

### Core Game Logic
- `src/hooks/useGameState.ts` - Main game state management hook
- `src/lib/pokerEngine.ts` - Hand evaluation, level progression, speed calculations

### Game Components
- `src/pages/GameScreen.tsx` - Main game screen container
- `src/components/game/StaticGrid.tsx` - Static phase card grid
- `src/components/game/ConveyorBelt.tsx` - Conveyor phase animation
- `src/components/game/FallingCards.tsx` - Falling cards animation
- `src/components/game/OrbitCards.tsx` - Orbit phase with rotating rings
- `src/components/game/BonusRound.tsx` - Bonus round gameplay
- `src/components/game/PlayingCard.tsx` - Individual card component

### UI Components
- `src/components/game/HandDisplay.tsx` - Shows current hand
- `src/components/game/ScoreDisplay.tsx` - Score and progress
- `src/components/game/PowerUpBar.tsx` - Power-up inventory
- `src/components/game/LevelCompleteModal.tsx` - Level completion overlay
- `src/components/game/LootBoxReveal.tsx` - Power-up reward animation

### Types
- `src/types/game.ts` - All TypeScript interfaces and constants

---

## Card Data Structure

### Card Interface
```typescript
interface Card {
  id: string;      // Format: "{rank}-{suit}" e.g., "A-hearts"
  suit: Suit;      // 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: Rank;      // 'A' | '2' ... 'K'
  value: number;   // 2-14 (Ace = 14)
}
```

### Rank Values
| Rank | Value |
|------|-------|
| 2-10 | 2-10 |
| J | 11 |
| Q | 12 |
| K | 13 |
| A | 14 |

---

## Technical Notes

### Animation
- Uses `requestAnimationFrame` for smooth rotation (Orbit) and movement (Falling/Conveyor)
- Framer Motion for card transitions and UI animations

### Mobile Optimization
- Orbit rings are centered within a square container (`max-w-[100vmin]`)
- Touch-friendly card selection
- Safe zone padding for edge cards

### Audio
- Background music during gameplay
- Card hit sound on selection
- Countdown ticks
- Game over sound

---

## Testing URLs

- `/` - Home page with test buttons
- `/game?testBonus=true` - Jump directly to bonus round
- `/game?startLevel=22` - Start at Level 22 (first Orbit phase)
- `/game-over` - Game over screen

---

## Database Schema (Supabase)

### Key Tables
- `profiles` - User profiles with username, avatar, highest SSC level
- `leaderboard_entries` - Game scores with mode, level, best hand
- `user_stats` - Aggregated statistics (total hands, flushes made, etc.)
- `user_achievements` - Unlocked achievements
- `daily_challenges` - Daily challenge progress

### Game Modes Enum
```sql
game_mode: "classic_fc" | "classic_cb" | "blitz_fc" | "blitz_cb" | "ssc"
```
