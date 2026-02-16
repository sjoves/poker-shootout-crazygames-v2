# Poker Shootout — Post-Remix Setup Checklist

Use this checklist every time you remix (duplicate) this project to ensure nothing breaks.

---

## 1. Lovable Cloud (Backend) — Automatic

When you remix in Lovable, a **new Cloud instance** is provisioned automatically. However, database **migrations** should re-run on the new instance. Verify the following tables exist:

### Required Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles (username, avatar, theme, card back, highest SSC level) |
| `user_stats` | Per-user gameplay statistics (games, hands, scores, hand types made) |
| `user_streaks` | Daily play streaks (current & longest) |
| `leaderboard_entries` | High scores per game mode |
| `achievements` | Achievement definitions (read-only, seeded data) |
| `user_achievements` | Which achievements each user has unlocked |
| `unlockables` | Cosmetic unlockable definitions (read-only, seeded data) |
| `user_unlocks` | Which unlockables each user has earned |
| `daily_challenges` | Per-user daily challenge progress |
| `daily_rewards` | Daily reward claim records |

### Database Functions & Triggers

| Function | Purpose |
|---|---|
| `handle_new_user()` | Auto-creates a `profiles` row when a new auth user signs up (trigger on `auth.users`) |
| `update_updated_at_column()` | Auto-updates `updated_at` timestamps on row changes |

> **Action**: After remix, check Cloud → Database to confirm all 10 tables exist. If any are missing, the migrations in `supabase/migrations/` need to be re-applied.

---

## 2. Seed Data

The `achievements` and `unlockables` tables contain **definition data** that must be populated for the game to function. If these tables are empty after remix, re-insert the seed data.

> **Action**: Query `SELECT count(*) FROM achievements;` and `SELECT count(*) FROM unlockables;` — if either returns 0, you need to re-seed.

---

## 3. Edge Functions

The following edge functions must be **deployed** on the new Cloud instance:

| Function | Purpose | Required Secrets |
|---|---|---|
| `check-subscription` | Verifies Stripe subscription status | `STRIPE_SECRET_KEY` (if using Stripe) |
| `create-checkout` | Creates Stripe checkout sessions | `STRIPE_SECRET_KEY` |
| `customer-portal` | Opens Stripe customer portal | `STRIPE_SECRET_KEY` |
| `username-lookup` | Looks up usernames for leaderboard display | None (uses service role) |

> **Action**: Edge function code copies over automatically, but they need to be redeployed. Lovable handles this on first build, but verify by testing the leaderboard or username lookup.

---

## 4. Secrets

These secrets are **NOT transferred** during remix and must be re-added manually:

| Secret | Where to Add | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Cloud → Secrets | Only needed if Stripe payments are enabled |

The following secrets are **auto-provisioned** by Cloud and do NOT need manual setup:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

> **Action**: If using Stripe, add `STRIPE_SECRET_KEY` via the Lovable secrets manager before testing payments.

---

## 5. Auth Configuration

| Setting | Expected Value |
|---|---|
| Auto-confirm email | Check current setting (typically disabled) |
| Anonymous sign-ups | Disabled |
| External providers | None (CrazyGames handles auth) |

> **Action**: Verify auth settings in Cloud after remix. The game primarily uses CrazyGames SDK auth, not Lovable Cloud auth.

---

## 6. CrazyGames SDK — No Action Needed

The CrazyGames integration is **entirely code-based** (loaded via `<script>` in `index.html` and managed in `src/contexts/CrazyGamesContext.tsx`). It requires:
- No secrets
- No backend config
- No API keys

Sitelocking, ad integration, user auth, and data persistence all transfer with the code.

---

## 7. Frontend Code — No Action Needed

All code, assets, styles, and configurations are copied exactly as-is during remix. This includes:
- All React components and hooks
- Game engine (`src/lib/pokerEngine.ts`)
- Zustand store (`src/stores/gameStore.ts`)
- Sound files (`public/sounds/`)
- Images and SVGs (`src/assets/`)
- CSS and Tailwind config

---

## 8. Post-Remix Smoke Test

After completing the above steps, test these flows:

1. **Splash screen loads** — Game shows main menu without errors
2. **Start a game** — Pick any mode, verify cards deal and gameplay works
3. **Game over** — Complete a game, verify score displays
4. **Leaderboard** — Check that the leaderboard page loads (will be empty on fresh DB)
5. **CrazyGames SDK** — If testing on CrazyGames domain, verify `gameplayStart` fires in console

---

## Quick Reference: What Transfers vs. What Doesn't

| Component | Transfers? | Action Needed? |
|---|---|---|
| Frontend code | ✅ Yes | None |
| Database schema (migrations) | ✅ Yes | Verify tables created |
| Seed data (achievements, unlockables) | ❌ No | Re-insert if empty |
| Edge function code | ✅ Yes | Verify deployed |
| Secrets (Stripe keys) | ❌ No | Re-add manually |
| CrazyGames SDK | ✅ Yes | None |
| Auth config | ⚠️ Partial | Verify settings |
