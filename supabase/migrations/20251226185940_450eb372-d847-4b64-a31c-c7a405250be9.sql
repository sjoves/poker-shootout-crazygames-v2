-- ============================================
-- RETENTION SYSTEM TABLES
-- ============================================

-- Daily Streaks Table
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_play_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ACHIEVEMENTS TABLE (definitions)
-- ============================================
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'hands', 'games', 'streaks', 'special'
  requirement_type TEXT NOT NULL, -- 'count', 'single'
  requirement_value INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT, -- 'card_back', 'theme', 'badge'
  reward_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- User Achievements (unlocked)
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DAILY CHALLENGES TABLE
-- ============================================
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL, -- 'make_flush', 'score_target', 'play_games', 'make_straight'
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date, challenge_type)
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON public.daily_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.daily_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- USER STATS TABLE (for tracking totals)
-- ============================================
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_hands INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  flushes_made INTEGER NOT NULL DEFAULT 0,
  straights_made INTEGER NOT NULL DEFAULT 0,
  full_houses_made INTEGER NOT NULL DEFAULT 0,
  four_of_kinds_made INTEGER NOT NULL DEFAULT 0,
  straight_flushes_made INTEGER NOT NULL DEFAULT 0,
  royal_flushes_made INTEGER NOT NULL DEFAULT 0,
  highest_score INTEGER NOT NULL DEFAULT 0,
  fastest_hand_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- UNLOCKABLES TABLE (card backs, themes)
-- ============================================
CREATE TABLE public.unlockables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'card_back', 'theme'
  unlock_method TEXT NOT NULL, -- 'achievement', 'purchase', 'default'
  unlock_requirement TEXT, -- achievement_id or null
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.unlockables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unlockables" ON public.unlockables
  FOR SELECT USING (true);

-- User Unlocks
CREATE TABLE public.user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlockable_id TEXT NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, unlockable_id)
);

ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks" ON public.user_unlocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocks" ON public.user_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User selected card back and theme
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS selected_card_back TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS selected_theme TEXT DEFAULT 'emerald';

-- ============================================
-- DAILY REWARDS TABLE
-- ============================================
CREATE TABLE public.daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_type TEXT NOT NULL, -- 'coins', 'power_up', 'card_back'
  reward_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON public.daily_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" ON public.daily_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED ACHIEVEMENTS DATA
-- ============================================
INSERT INTO public.achievements (id, name, description, icon, category, requirement_type, requirement_value, reward_type, reward_id) VALUES
-- Games played achievements
('first_game', 'First Steps', 'Play your first game', '🎮', 'games', 'count', 1, NULL, NULL),
('games_10', 'Getting Started', 'Play 10 games', '🎯', 'games', 'count', 10, NULL, NULL),
('games_50', 'Regular Player', 'Play 50 games', '⭐', 'games', 'count', 50, 'card_back', 'gold'),
('games_100', 'Dedicated', 'Play 100 games', '🏆', 'games', 'count', 100, 'card_back', 'diamond'),

-- Streak achievements
('streak_3', 'On Fire', '3 day streak', '🔥', 'streaks', 'count', 3, NULL, NULL),
('streak_7', 'Week Warrior', '7 day streak', '💪', 'streaks', 'count', 7, 'card_back', 'flame'),
('streak_30', 'Monthly Master', '30 day streak', '👑', 'streaks', 'count', 30, 'card_back', 'crown'),

-- Hand achievements
('first_flush', 'Flush!', 'Make your first flush', '♠️', 'hands', 'count', 1, NULL, NULL),
('first_straight', 'In Order', 'Make your first straight', '📊', 'hands', 'count', 1, NULL, NULL),
('first_full_house', 'Full House!', 'Make your first full house', '🏠', 'hands', 'count', 1, NULL, NULL),
('first_four_kind', 'Four of a Kind!', 'Make your first four of a kind', '4️⃣', 'hands', 'single', 1, 'card_back', 'quad'),
('first_straight_flush', 'Straight Flush!', 'Make your first straight flush', '💫', 'hands', 'single', 1, 'card_back', 'lightning'),
('royal_flush', 'Royal Flush!', 'Make a royal flush', '👑', 'hands', 'single', 1, 'card_back', 'royal'),

-- Score achievements
('score_5000', 'High Scorer', 'Score 5,000 in one game', '📈', 'special', 'single', 5000, NULL, NULL),
('score_10000', 'Point Master', 'Score 10,000 in one game', '🎖️', 'special', 'single', 10000, 'card_back', 'silver'),
('score_25000', 'Legend', 'Score 25,000 in one game', '🌟', 'special', 'single', 25000, 'card_back', 'platinum');

-- ============================================
-- SEED UNLOCKABLES DATA
-- ============================================
INSERT INTO public.unlockables (id, name, type, unlock_method, unlock_requirement) VALUES
('default', 'Classic', 'card_back', 'default', NULL),
('gold', 'Gold', 'card_back', 'achievement', 'games_50'),
('diamond', 'Diamond', 'card_back', 'achievement', 'games_100'),
('flame', 'Flame', 'card_back', 'achievement', 'streak_7'),
('crown', 'Crown', 'card_back', 'achievement', 'streak_30'),
('quad', 'Quad', 'card_back', 'achievement', 'first_four_kind'),
('lightning', 'Lightning', 'card_back', 'achievement', 'first_straight_flush'),
('royal', 'Royal', 'card_back', 'achievement', 'royal_flush'),
('silver', 'Silver', 'card_back', 'achievement', 'score_10000'),
('platinum', 'Platinum', 'card_back', 'achievement', 'score_25000');