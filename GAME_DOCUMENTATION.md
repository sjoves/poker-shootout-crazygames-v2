# Poker Shootout - Complete Game Documentation

## Overview

Poker Shootout is a fast-paced card game where players select 5 cards to form poker hands and score points. The primary game mode is **SSC (Survival Score Challenge)**, a progressive level-based mode with multiple gameplay phases.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Supabase (backend)

---

## Table of Contents

1. [Game Modes](#game-modes)
2. [SSC Level Progression](#ssc-level-progression-system)
3. [Gameplay Phases](#gameplay-phases)
4. [Speed Scaling](#speed-scaling-system)
5. [Scoring System](#scoring-system)
6. [Bonus Rounds](#bonus-rounds)
7. [Power-Up System](#power-up-system)
8. [Game State](#game-state-properties)
9. [Architecture & File Structure](#architecture--file-structure)
10. [Component Reference](#component-reference)
11. [Audio System](#audio-system)
12. [Database Schema](#database-schema-supabase)
13. [Testing & Debug URLs](#testing-urls)

---

## Game Modes

### SSC Mode (Survival Score Challenge)
The main game mode featuring progressive levels with increasing difficulty.

- **Objective**: Meet or exceed the level goal score before time runs out
- **Progression**: Levels 1, 2, 3... with increasing goals
- **Time Limit**: 60 seconds per level
- **Bonus Rounds**: Occur after every 3 levels

### Classic Modes (Legacy)
| Mode | Description |
|------|-------------|
| `classic_fc` | Classic Falling Cards - 10 hands, no time limit |
| `classic_cb` | Classic Conveyor Belt - 10 hands, no time limit |
| `blitz_fc` | Blitz Falling Cards - 60 second time limit |
| `blitz_cb` | Blitz Conveyor Belt - 60 second time limit |

---

## SSC Level Progression System

### Cycle 1: Levels 1-12 (No Orbit)
Uses a **9-level rotation** pattern:

| Levels | Phase |
|--------|-------|
| 1-3 | Sitting Duck (SD) |
| 4-6 | Conveyor |
| 7-9 | Falling |
| 10-12 | Sitting Duck (repeats) |

### Cycle 2+: Level 13 onwards (With Orbit)
Uses a **12-level rotation** pattern:

| Levels | Phase |
|--------|-------|
| 13-15, 25-27, 37-39... | Sitting Duck (SD) |
| 16-18, 28-30, 40-42... | Conveyor |
| 19-21, 31-33, 43-45... | Falling |
| 22-24, 34-36, 46-48... | Orbit |

### Key Level Milestones
- **Level 7**: First Falling phase
- **Level 22**: First Orbit phase
- **Every 3 levels**: Bonus Round triggers (3, 6, 9, 12, 15, 18, 21, 24...)

---

## Gameplay Phases

### 1. Sitting Duck (SD) Phase
- Cards displayed in a **5x5 fixed grid** (25 cards max)
- No movement - pure strategic card selection
- **Reshuffle power-up available** (only works in this phase)
- Card sizes: `sdm` (mobile), `sd` (desktop) - 25% larger than base

### 2. Conveyor Phase
- Cards move horizontally across screen in multiple rows
- Different rows move at varying speeds
- Cards wrap around or respawn at edges
- Base speed: **1.2**

### 3. Falling Phase ("Sky is Falling")
- Cards fall from top of screen with physics-like behavior
- Each card has unique: speed, rotation, rotationSpeed, sway, swaySpeed
- **First cycle (Levels 7-9)**: 15% slower for training
- Base speed: **1.53** (first cycle) → **1.8** (later cycles)

### 4. Orbit Phase
- Cards rotate in **3 concentric rings** around center
- Ring configuration:
  - **Inner ring**: 8 cards, speed multiplier 1.0x
  - **Middle ring**: 12 cards, speed multiplier 1.15x  
  - **Outer ring**: 16 cards, speed multiplier 1.3x
- Base speed: **1.05** (30% slower than other modes)
- Rings centered in square container (`max-w-[100vmin]`)

---

## Speed Scaling System

### Base Speeds by Phase
| Phase | Base Speed |
|-------|------------|
| Sitting Duck (SD) | 0 (static) |
| Conveyor | 1.2 |
| Falling (first cycle) | 1.53 |
| Falling (later) | 1.8 |
| Orbit | 1.05 |

### Speed Progression (Level 11+)
- **Levels 1-10**: No speed increase (base speed only)
- **Level 11+**:
  - **Falling & Orbit**: 0.5% increase per level
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
Where `Value Bonus` = sum of all card face values (2-14)

### Level Goal Progression
```javascript
Goal = 500 × 1.05^(level - 1)
```
| Level | Goal |
|-------|------|
| 1 | 500 |
| 10 | ~776 |
| 20 | ~1,265 |
| 30 | ~2,061 |

### Star Rating System
| Performance | Stars |
|-------------|-------|
| Score ≥ Goal × 1.5 | ⭐⭐⭐ (3 stars) |
| Score ≥ Goal × 1.25 | ⭐⭐ (2 stars) |
| Score ≥ Goal | ⭐ (1 star) |
| Score < Goal | Game Over |

### Better-Hand Multiplier (SSC only)
Consecutive hands that beat the previous hand's rank:

| Streak | Multiplier |
|--------|------------|
| 1 better hand | 1.2x |
| 2 consecutive | 1.5x |
| 3+ consecutive | 2.0x |

### Final Stretch Bonus
- Last 10 seconds of Blitz/SSC levels
- All hands earn **2x points**

### Classic Mode Scoring
```
Final Score = Raw Score + Time Bonus - Leftover Penalty
```
- **Time Bonus**: Points for finishing quickly (can be negative for slow play)
- **Leftover Penalty**: Deduction for remaining cards in deck

---

## Bonus Rounds

### Trigger Condition
Bonus rounds occur after completing levels **3, 6, 9, 12, 15, 18, 21, 24...** (every 3rd level)

### Bonus Round Flow
1. Complete level (e.g., Level 24)
2. Level Complete modal appears with stars
3. "Bonus Round" button triggers bonus gameplay
4. Form the best hand possible within 60 seconds
5. Score determines reward tier → earn power-up
6. Loot box animation reveals reward
7. Next level begins (Level 25)

### Bonus-Friendly Decks
Early bonus rounds use specially constructed decks guaranteeing at least Two Pair possibility.

### Bonus Time Points
```
Bonus Points = Hand Points + (Time Remaining × 10)
```

---

## Power-Up System

### Power-Up Tiers

#### Tier 1: Common (Bronze rewards, score < 500)
| ID | Name | Emoji | Effect | Reusable |
|----|------|-------|--------|----------|
| `reshuffle` | Reshuffle | 🔀 | Shuffle and re-deal all cards (SD only) | ✅ |
| `two_pair` | Two Pair | 2️⃣ | Instantly form a Two Pair hand | ❌ |
| `three_kind` | Three of a Kind | 3️⃣ | Instantly form Three of a Kind | ❌ |
| `add_time` | Add Time | ⏰ | Add 15 seconds to clock | ✅ |

#### Tier 2: Uncommon (Silver rewards, score 500-1,200)
| ID | Name | Emoji | Effect |
|----|------|-------|--------|
| `straight` | Straight | ➡️ | Instantly form a Straight |
| `flush` | Flush | ♦️ | Instantly form a Flush |
| `full_house` | Full House | 🏠 | Instantly form a Full House |

#### Tier 3: Rare (Gold rewards, score > 1,200)
| ID | Name | Emoji | Effect |
|----|------|-------|--------|
| `four_kind` | Four of a Kind | 4️⃣ | Instantly form Four of a Kind |
| `straight_flush` | Straight Flush | 🔥 | Instantly form a Straight Flush |
| `royal_flush` | Royal Flush | 👑 | Instantly form a Royal Flush |

### Inventory System
- **Unlimited capacity** - no maximum power-ups
- Power-ups persist across levels until used
- Hand-generating power-ups consumed on use
- Reshuffle/Add Time can be used multiple times

### Power-Up Restrictions
- **Reshuffle**: Only visible/usable in Sitting Duck (SD) phase

---

## Game State Properties

### TypeScript Interfaces

```typescript
// Core Types
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type GameMode = 'classic_fc' | 'classic_cb' | 'blitz_fc' | 'blitz_cb' | 'ssc';
type SSCPhase = 'sitting_duck' | 'conveyor' | 'falling' | 'orbit';
type RewardTier = 'bronze' | 'silver' | 'gold';

interface Card {
  id: string;      // Format: "{rank}-{suit}" e.g., "A-hearts"
  suit: Suit;
  rank: Rank;
  value: number;   // 2-14 (Ace = 14)
}

interface FallingCard extends Card {
  x: number;           // X position (0-100%)
  y: number;           // Y position (pixels from top)
  speed: number;       // Fall speed
  rotation: number;    // Current rotation degrees
  rotationSpeed: number;
  sway: number;        // Horizontal oscillation
  swaySpeed: number;
}

interface ConveyorCard extends Card {
  x: number;
  y: number;
  row: number;
  speed: number;
}

interface PokerHand {
  name: string;
  basePoints: number;
  rank: number;        // 1 = Royal Flush, 10 = High Card
}

interface HandResult {
  hand: PokerHand;
  cards: Card[];
  valueBonus: number;
  totalPoints: number;
}

interface PowerUp {
  id: string;
  name: string;
  emoji: string;
  description: string;
  handType: string;    // Which poker hand it generates
  tier: number;        // 1 = common, 2 = uncommon, 3 = rare
  isReusable?: boolean;
}
```

### Complete GameState Interface

```typescript
interface GameState {
  // Core game state
  mode: GameMode;
  score: number;
  handsPlayed: number;
  cardsSelected: number;
  timeElapsed: number;
  timeRemaining: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  isBonusLevel: boolean;
  isBonusFailed: boolean;
  
  // Card state
  selectedCards: Card[];      // Currently selected (max 5)
  deck: Card[];               // Available cards
  usedCards: Card[];          // Already used cards
  currentHand: HandResult | null;
  
  // SSC-specific
  sscLevel: number;           // Current level (1, 2, 3...)
  sscPhase: SSCPhase;
  sscRound: number;           // Which cycle
  levelGoal: number;
  levelScore: number;
  cumulativeScore: number;
  
  // Scoring breakdown (Classic)
  rawScore: number;
  timeBonus: number;
  leftoverPenalty: number;
  
  // Bonus rounds
  bonusRoundCount: number;
  pendingBonusRound: boolean;
  bonusTimePoints?: number;
  
  // Power-ups
  earnedPowerUps: string[];
  activePowerUps: string[];
  powerUpChoices: string[];
  showPowerUpSelection: boolean;
  
  // Reward system
  pendingReward: string | null;
  rewardTier: RewardTier | null;
  showLootBox: boolean;
  inventoryFull: boolean;
  
  // Multiplier system
  previousHandRank: number | null;
  betterHandStreak: number;
  currentMultiplier: number;
  starRating: number;
  
  // UI state
  hasSeenSSCExplainer: boolean;
  reshuffleTrigger: number;
  phaseOverride?: string;
}
```

---

## Architecture & File Structure

### Directory Structure
```
src/
├── assets/              # Images, logos
├── components/
│   ├── game/            # Game-specific components
│   │   ├── BonusRound.tsx
│   │   ├── ConveyorBelt.tsx
│   │   ├── FallingCards.tsx
│   │   ├── FlippableCard.tsx
│   │   ├── GameControls.tsx
│   │   ├── GameHeader.tsx
│   │   ├── HandDisplay.tsx
│   │   ├── LevelCompleteModal.tsx
│   │   ├── LootBoxReveal.tsx
│   │   ├── OrbitCards.tsx
│   │   ├── PlayingCard.tsx
│   │   ├── PowerUpBar.tsx
│   │   ├── PowerUpSelection.tsx
│   │   ├── ScoreDisplay.tsx
│   │   ├── SSCExplainer.tsx
│   │   └── StaticGrid.tsx
│   ├── retention/       # Engagement features
│   │   ├── AchievementsPanel.tsx
│   │   ├── DailyChallenges.tsx
│   │   ├── DailyRewardWheel.tsx
│   │   └── StreakDisplay.tsx
│   ├── settings/
│   │   └── SettingsModal.tsx
│   ├── tutorial/
│   │   └── TutorialModal.tsx
│   ├── ads/
│   │   └── RewardedAd.tsx
│   └── ui/              # Shadcn UI components
├── contexts/
│   ├── AudioContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── game/            # Modular game state hooks
│   │   ├── gameConstants.ts
│   │   ├── index.ts
│   │   ├── useCardSelection.ts
│   │   ├── useGameControls.ts
│   │   ├── useGameTimer.ts
│   │   ├── useHandSubmission.ts
│   │   ├── useLevelProgression.ts
│   │   └── usePowerUps.ts
│   ├── useGameState.ts  # Main composed hook
│   ├── useAuth.ts
│   ├── useGuestScores.ts
│   ├── useRetention.ts
│   └── useSubscription.ts
├── lib/
│   ├── pokerEngine.ts   # Hand evaluation, scoring, levels
│   └── utils.ts
├── pages/
│   ├── Index.tsx        # Home/splash
│   ├── GameScreen.tsx   # Main game
│   ├── GameOverScreen.tsx
│   ├── LeaderboardScreen.tsx
│   ├── AccountScreen.tsx
│   └── SplashScreen.tsx
├── types/
│   └── game.ts          # All TypeScript types
└── integrations/
    └── supabase/
        ├── client.ts
        └── types.ts
```

### Hook Architecture (Modular Design)

The main `useGameState` hook composes smaller focused hooks:

```typescript
// src/hooks/useGameState.ts
export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);

  // Compose smaller hooks
  const timerRef = useGameTimer(state, setState);
  const { selectCard } = useCardSelection(setState);
  const { usePowerUp, claimReward, swapPowerUp, discardReward } = usePowerUps(setState);
  const { submitHand, submitBonusHand, getHandResults, resetHandResults } = useHandSubmission(setState);
  const { startGame, pauseGame, endGame, resetGame } = useGameControls(setState, timerRef, resetHandResults);
  const { startBonusRound, nextLevel, skipBonusRound } = useLevelProgression(setState, resetHandResults);

  // Auto-submit when 5 cards selected
  useEffect(() => {
    if (state.selectedCards.length === 5 && state.isPlaying && !state.isGameOver) {
      setTimeout(() => submitHand(), 300);
    }
  }, [state.selectedCards.length]);

  return { state, startGame, selectCard, submitHand, /* ... */ };
}
```

### Individual Hook Responsibilities

| Hook | Purpose |
|------|---------|
| `useGameTimer` | Timer countdown logic, game over on timeout |
| `useCardSelection` | Card selection, deck management |
| `useHandSubmission` | Hand evaluation, score calculation, multipliers |
| `usePowerUps` | Power-up usage, rewards, inventory |
| `useGameControls` | Start/pause/end game, reshuffle |
| `useLevelProgression` | Level advancement, bonus rounds |

---

## Component Reference

### Phase Components

| Component | Phase | Description |
|-----------|-------|-------------|
| `StaticGrid` | Sitting Duck | 5x5 card grid, no animation |
| `ConveyorBelt` | Conveyor | Horizontal scrolling rows |
| `FallingCards` | Falling | Physics-based falling animation |
| `OrbitCards` | Orbit | 3 rotating rings |

### PlayingCard Sizes

```typescript
const SIZE_CONFIG = {
  xs:   { card: 'w-12 h-[67px]' },     // Extra small
  sm:   { card: 'w-14 h-[79px]' },     // Small
  ssc:  { card: 'w-[68px] h-[95px]' }, // SSC default
  sdm:  { card: 'w-[70px] h-[99px]' }, // Sitting Duck mobile (+25%)
  sd:   { card: 'w-[85px] h-[119px]' },// Sitting Duck desktop (+25%)
  md:   { card: 'w-[76px] h-[106px]' },// Medium
  hand: { card: 'w-[80px] h-[110px]' },// Hand display
  lg:   { card: 'w-[115px] h-[158px]' }// Large
};
```

### UI Flow Components

| Component | Trigger | Purpose |
|-----------|---------|---------|
| `LevelCompleteModal` | `isLevelComplete=true` | Shows stars, score, next level button |
| `BonusRound` | `isBonusLevel=true` | Special bonus gameplay |
| `LootBoxReveal` | `showLootBox=true` | Animated reward reveal |
| `PowerUpSelection` | `showPowerUpSelection=true` | Choose power-up (legacy) |
| `PowerUpBar` | Always visible | Shows inventory, use buttons |

---

## Audio System

### Sound Types
```typescript
type SoundType = 
  | 'cardSelect'       // Card tap
  | 'cardFlip'         // Card flip animation
  | 'handSubmit'       // Hand completed
  | 'handWin'          // Good hand
  | 'levelComplete'    // Level passed
  | 'gameOver'         // Game ended
  | 'buttonClick'      // UI button
  | 'timer'            // Timer tick
  | 'countdownTick'    // Final countdown
  | 'countdownUrgent'  // Very low time
  | 'bonusCountdown';  // Bonus intro
```

### Audio Settings
```typescript
interface AudioSettings {
  masterVolume: number;   // 0-1, default 0.7
  sfxEnabled: boolean;    // default true
  sfxVolume: number;      // 0-1, default 0.8
  musicEnabled: boolean;  // default true
  musicVolume: number;    // 0-1, default 0.5
}
```

### Audio Files
- `/sounds/background-music.wav` - Main game music
- `/sounds/card-hit.wav` - Card selection sound
- `/sounds/countdown-tick.wav` - Timer tick
- `/sounds/game-over.wav` - Game over jingle

### Implementation
- Uses Web Audio API with synthesized sounds as fallback
- Audio buffers cached for performance
- Settings persisted to localStorage

---

## Database Schema (Supabase)

### Tables

#### `profiles`
```sql
id: uuid (PK)
user_id: uuid (references auth.users)
username: text
avatar_url: text
highest_ssc_level: int (default 0)
selected_card_back: text
selected_theme: text
created_at: timestamp
updated_at: timestamp
```

#### `leaderboard_entries`
```sql
id: uuid (PK)
user_id: uuid
profile_id: uuid (FK → profiles)
game_mode: game_mode enum
score: int
ssc_level: int (nullable)
hands_played: int
best_hand: text (nullable)
time_seconds: int (nullable)
created_at: timestamp
```

#### `user_stats`
```sql
id: uuid (PK)
user_id: uuid
total_games: int
total_hands: int
total_score: int
highest_score: int
flushes_made: int
straights_made: int
full_houses_made: int
four_of_kinds_made: int
straight_flushes_made: int
royal_flushes_made: int
fastest_hand_seconds: float
```

#### `user_achievements`
```sql
id: uuid (PK)
user_id: uuid
achievement_id: text (FK → achievements)
unlocked_at: timestamp
```

#### `daily_challenges`
```sql
id: uuid (PK)
user_id: uuid
challenge_date: date
challenge_type: text
target_value: int
current_value: int
completed: boolean
reward_claimed: boolean
```

### Enums
```sql
game_mode: 'classic_fc' | 'classic_cb' | 'blitz_fc' | 'blitz_cb' | 'ssc'
```

---

## Testing URLs

| URL | Purpose |
|-----|---------|
| `/` | Home page with mode selection |
| `/game/ssc` | Start SSC mode at level 1 |
| `/game/ssc?testBonus=true` | Jump to bonus round |
| `/game/ssc?startLevel=22` | Start at Level 22 (Orbit) |
| `/game/ssc?startLevel=7` | Start at Level 7 (First Falling) |
| `/game/classic_fc` | Classic Falling Cards |
| `/game/blitz_cb` | Blitz Conveyor Belt |
| `/game-over` | Game over screen |
| `/leaderboard` | Leaderboard |
| `/dev-sandbox` | Developer testing page |

---

## Key Algorithms

### Hand Evaluation (pokerEngine.ts)
```typescript
function evaluateHand(cards: Card[]): HandResult {
  // Sort by value descending
  // Check in order: Royal Flush → High Card
  // Return first match with points calculation
}
```

### Level Info Calculation
```typescript
function getSSCLevelInfo(level: number): SSCLevelInfo {
  // Cycle 1 (1-12): SD → Conveyor → Falling → SD
  // Cycle 2+ (13+): SD → Conveyor → Falling → Orbit (12-level rotation)
}
```

### Bonus Round Trigger
```typescript
function shouldTriggerBonusRound(level: number): boolean {
  return level % 3 === 0; // Every 3rd level
}
```

---

## Animation Details

### Framer Motion Usage
- Card entrance/exit animations
- Modal transitions
- Score/level change effects
- Loot box reveal sequence

### requestAnimationFrame Usage
- Orbit ring rotation (continuous)
- Falling card physics (gravity + sway)
- Conveyor belt movement

### Performance Optimizations
- Cards use `will-change: transform`
- Audio buffers cached
- Deck operations avoid unnecessary re-renders
- `useCallback` / `useMemo` for expensive operations

---

## Mobile Considerations

- Touch-friendly card hit areas (44px minimum)
- Responsive card sizing per phase
- Safe zone padding for edge cards
- Viewport-based container sizing (`vmin`, `vmax`)
- Settings modal with touch sliders

---

## Recent Refactoring (Jan 2026)

1. **useGameState split**: 753-line monolith → 6 focused hooks
2. **forwardRef fixes**: DailyRewardWheel, RewardedAd now properly forward refs
3. **Card size optimization**: SD phase cards 25% larger
4. **Settings consolidation**: Audio controls moved to gear icon modal

---

## Future Enhancement Ideas

1. Haptic feedback on mobile
2. Timer warning visual effects (<5 seconds)
3. Undo last card selection
4. Live hand rank preview during selection
5. Audio preloading on game start
6. Swipe gestures for faster gameplay
