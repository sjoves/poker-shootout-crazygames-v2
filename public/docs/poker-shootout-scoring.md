# Poker Shootout — Complete Scoring Reference

## Hand Values

Every hand scores: **Base Points + Value Bonus**

**Value Bonus** = sum of all 5 card face values (2=2, 3=3, ... 10=10, J=11, Q=12, K=13, A=14)

| Hand | Base Points | Rank |
|------|-------------|------|
| Royal Flush | 5,000 | 1 (best) |
| Straight Flush | 2,500 | 2 |
| Four of a Kind | 1,500 | 3 |
| Full House | 1,000 | 4 |
| Flush | 750 | 5 |
| Straight | 500 | 6 |
| Three of a Kind | 300 | 7 |
| Two Pair | 150 | 8 |
| One Pair | 50 | 9 |
| High Card | 10 | 10 (worst) |

### Example
A Flush with cards 3♠ 7♠ 9♠ J♠ A♠:
- Base Points: 750
- Value Bonus: 3 + 7 + 9 + 11 + 14 = 44
- **Total: 794 points**

---

## Game Modes & Final Score Formulas

### SSC Mode (Survival Score Challenge) — Main Mode

**Per-hand scoring:**
```
Hand Points = (Base Points + Value Bonus) × Better-Hand Multiplier × Final Stretch Multiplier
```

**Level completion:** Score must reach or exceed the Level Goal within 60 seconds.

**Level Goal Progression:**
```
Goal = 500 × 1.05^(level − 1)
```

| Level | Goal |
|-------|------|
| 1 | 500 |
| 5 | 608 |
| 10 | 776 |
| 20 | 1,265 |
| 30 | 2,061 |
| 50 | 5,469 |

**Cumulative Score:** Across all levels, the cumulative score is used for leaderboard ranking. Each level's score adds to the running total.

**Game Over:** Timer runs out before reaching the level goal.

---

### Better-Hand Streak Multiplier (SSC only)

If each successive hand has a **better rank** (lower rank number) than the previous hand, a streak multiplier applies:

| Consecutive Better Hands | Multiplier |
|--------------------------|------------|
| 0 (same or worse) | 1.0× (streak resets) |
| 1 | 1.2× |
| 2 | 1.5× |
| 3+ | 2.0× |

**Example streak:**
1. High Card (rank 10) → 1.0×
2. One Pair (rank 9, better) → 1.2×
3. Three of a Kind (rank 7, better) → 1.5×
4. Flush (rank 5, better) → 2.0×
5. Two Pair (rank 8, worse) → 1.0× (streak resets)

---

### Final Stretch Bonus (SSC & Blitz)

During the **last 10 seconds** of any timed level, all hand points are doubled (**2× multiplier**). This stacks with the Better-Hand multiplier.

```
Final Points = Hand Points × Better-Hand Multiplier × Final Stretch Multiplier (2× if ≤10s left)
```

---

### Star Rating (SSC Levels)

| Score vs Goal | Stars |
|---------------|-------|
| ≥ Goal × 1.5 | ⭐⭐⭐ |
| ≥ Goal × 1.25 | ⭐⭐ |
| ≥ Goal | ⭐ |
| < Goal | Game Over |

---

### Classic Mode (classic_fc, classic_cb)

Play exactly **10 hands**, no time pressure (but time is tracked).

```
Final Score = Base Score − Time Penalty + Leftover Card Bonus
```

| Component | Formula |
|-----------|---------|
| Base Score | Sum of all 10 hand point totals |
| Time Penalty | Total seconds taken × 100 |
| Leftover Card Bonus | Sum of remaining deck card face values × 10,000 |

**Example:**
- Base Score: 7,500 (from 10 hands)
- Time: 85 seconds → Penalty: 85 × 100 = 8,500
- Leftover cards: K(13) + 7(7) = 20 → Bonus: 20 × 10,000 = 200,000
- **Final Score: 7,500 − 8,500 + 200,000 = 199,000**

---

### Blitz Mode (blitz_fc, blitz_cb)

60-second time limit, play as many hands as possible.

```
Final Score = Base Score × Hands Played
```

**Example:**
- Base Score (sum of all hands): 3,200
- Hands Played: 8
- **Final Score: 3,200 × 8 = 25,600**

---

## Bonus Rounds (SSC only)

Bonus rounds trigger after completing every 3rd level (levels 3, 6, 9, 12, 15, ...).

**Bonus Round Scoring:**
```
Bonus Points = Hand Points + (Time Remaining × 10)
```

**Reward Tiers** (based on bonus points earned):

| Tier | Bonus Points | Power-Up Quality |
|------|-------------|------------------|
| Bronze | < 500 | Tier 1 (Common) |
| Silver | 500–1,200 | Tier 2 (Uncommon) |
| Gold | > 1,200 | Tier 3 (Rare) |

---

## Power-Ups

Earned from bonus rounds. Persist across levels until used.

### Tier 1 — Common
| Power-Up | Effect | Reusable? |
|----------|--------|-----------|
| 🔀 Reshuffle | Re-deal all cards (Sitting Duck phase only) | ✅ |
| 2️⃣ Two Pair | Instantly form Two Pair | ❌ |
| 3️⃣ Three of a Kind | Instantly form Three of a Kind | ❌ |
| ⏰ Add Time | Add 15 seconds to clock | ✅ |

### Tier 2 — Uncommon
| Power-Up | Effect |
|----------|--------|
| ➡️ Straight | Instantly form a Straight |
| ♦️ Flush | Instantly form a Flush |
| 🏠 Full House | Instantly form a Full House |

### Tier 3 — Rare
| Power-Up | Effect |
|----------|--------|
| 4️⃣ Four of a Kind | Instantly form Four of a Kind |
| 🔥 Straight Flush | Instantly form a Straight Flush |
| 👑 Royal Flush | Instantly form a Royal Flush |

---

## SSC Phase Rotation

### Cycle 1 (Levels 1–12): No Orbit
| Levels | Phase |
|--------|-------|
| 1–3 | Sitting Duck (static grid) |
| 4–6 | Conveyor (horizontal scrolling) |
| 7–9 | Falling (cards drop from top) |
| 10–12 | Sitting Duck (repeats) |

### Cycle 2+ (Level 13+): With Orbit
| Levels | Phase |
|--------|-------|
| 13–15, 25–27... | Sitting Duck |
| 16–18, 28–30... | Conveyor |
| 19–21, 31–33... | Falling |
| 22–24, 34–36... | Orbit (3 rotating rings) |

---

## Speed Scaling (Level 11+)

Levels 1–10 use base speed only. From level 11 onward:

```
Speed = Base Speed × (1 + (level − 10) × Scaling Rate)
```

| Phase | Base Speed | Scaling Rate |
|-------|-----------|-------------|
| Sitting Duck | 0 (static) | N/A |
| Conveyor | 1.2 | 2% per level |
| Falling | 1.2 | 0.5% per level |
| Orbit | 1.05 | 0.5% per level |

### Orbit Ring Speeds
| Ring | Cards | Speed Multiplier |
|------|-------|-----------------|
| Inner | 8 | 1.0× |
| Middle | 12 | 1.15× |
| Outer | 16 | 1.3× |
