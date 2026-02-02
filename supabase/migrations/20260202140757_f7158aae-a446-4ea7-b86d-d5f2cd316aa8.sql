-- Add DELETE policies for GDPR compliance on all user-owned tables

-- Users can delete own stats
CREATE POLICY "Users can delete own stats" 
ON user_stats 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can delete own streaks
CREATE POLICY "Users can delete own streaks" 
ON user_streaks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can delete own achievements
CREATE POLICY "Users can delete own achievements" 
ON user_achievements 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can delete own unlocks
CREATE POLICY "Users can delete own unlocks" 
ON user_unlocks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can delete own challenges
CREATE POLICY "Users can delete own challenges" 
ON daily_challenges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can delete own rewards
CREATE POLICY "Users can delete own rewards" 
ON daily_rewards 
FOR DELETE 
USING (auth.uid() = user_id);