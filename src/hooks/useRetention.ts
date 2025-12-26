import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Types
export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_play_date: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_type: string | null;
  reward_id: string | null;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

export interface DailyChallenge {
  id: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  completed: boolean;
  reward_claimed: boolean;
}

export interface UserStats {
  total_games: number;
  total_hands: number;
  total_score: number;
  flushes_made: number;
  straights_made: number;
  full_houses_made: number;
  four_of_kinds_made: number;
  straight_flushes_made: number;
  royal_flushes_made: number;
  highest_score: number;
}

export interface DailyReward {
  claim_date: string;
  reward_type: string;
  reward_value: string;
}

export interface Unlockable {
  id: string;
  name: string;
  type: string;
  unlock_method: string;
  unlock_requirement: string | null;
}

// Challenge definitions
const CHALLENGE_TEMPLATES = [
  { type: 'play_games', name: 'Play Games', target: 3, description: 'Play 3 games today' },
  { type: 'make_flush', name: 'Flush Hunter', target: 2, description: 'Make 2 flushes' },
  { type: 'make_straight', name: 'Straight Shooter', target: 2, description: 'Make 2 straights' },
  { type: 'score_target', name: 'Point Pusher', target: 3000, description: 'Score 3,000 points in one game' },
  { type: 'make_full_house', name: 'Full House Frenzy', target: 1, description: 'Make a full house' },
];

// Reward wheel options
export const REWARD_OPTIONS = [
  { type: 'bonus_points', value: '500', label: '+500 Bonus', weight: 30 },
  { type: 'bonus_points', value: '1000', label: '+1000 Bonus', weight: 20 },
  { type: 'bonus_points', value: '2500', label: '+2500 Bonus', weight: 10 },
  { type: 'streak_shield', value: '1', label: 'Streak Shield', weight: 15 },
  { type: 'double_xp', value: '1', label: '2x Points (1 game)', weight: 15 },
  { type: 'mystery', value: 'mystery', label: '??? Mystery ???', weight: 10 },
];

export function useRetention() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [unlockables, setUnlockables] = useState<Unlockable[]>([]);
  const [userUnlocks, setUserUnlocks] = useState<string[]>([]);
  const [todayReward, setTodayReward] = useState<DailyReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Load all retention data
  const loadRetentionData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load achievements definitions
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*');
      setAchievements(achievementsData || []);

      // Load unlockables
      const { data: unlockablesData } = await supabase
        .from('unlockables')
        .select('*');
      setUnlockables(unlockablesData || []);

      // Load user-specific data in parallel
      const [streakRes, userAchRes, challengesRes, statsRes, unlocksRes, rewardRes] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_achievements').select('*').eq('user_id', user.id),
        supabase.from('daily_challenges').select('*').eq('user_id', user.id).eq('challenge_date', new Date().toISOString().split('T')[0]),
        supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_unlocks').select('unlockable_id').eq('user_id', user.id),
        supabase.from('daily_rewards').select('*').eq('user_id', user.id).eq('claim_date', new Date().toISOString().split('T')[0]).maybeSingle(),
      ]);

      if (streakRes.data) {
        setStreak(streakRes.data);
      }
      setUserAchievements(userAchRes.data || []);
      setChallenges(challengesRes.data || []);
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      setUserUnlocks((unlocksRes.data || []).map(u => u.unlockable_id));
      setTodayReward(rewardRes.data);

      // Generate daily challenges if none exist
      if (!challengesRes.data || challengesRes.data.length === 0) {
        await generateDailyChallenges();
      }

    } catch (error) {
      console.error('Error loading retention data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRetentionData();
  }, [loadRetentionData]);

  // Generate daily challenges
  const generateDailyChallenges = async () => {
    if (!user) return;

    // Pick 3 random challenges
    const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
    const todayChallenges = shuffled.slice(0, 3);

    const challengeInserts = todayChallenges.map(c => ({
      user_id: user.id,
      challenge_date: new Date().toISOString().split('T')[0],
      challenge_type: c.type,
      target_value: c.target,
      current_value: 0,
      completed: false,
      reward_claimed: false,
    }));

    const { data } = await supabase.from('daily_challenges').insert(challengeInserts).select();
    if (data) {
      setChallenges(data);
    }
  };

  // Update streak when playing
  const updateStreak = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak) {
      // Check if already played today
      if (streak.last_play_date === today) return streak;

      // Check if streak continues or resets
      const newStreak = streak.last_play_date === yesterday 
        ? streak.current_streak + 1 
        : 1;
      
      const longestStreak = Math.max(newStreak, streak.longest_streak);

      const { data } = await supabase
        .from('user_streaks')
        .update({ 
          current_streak: newStreak, 
          longest_streak: longestStreak,
          last_play_date: today 
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (data) {
        setStreak(data);
        // Check streak achievements
        await checkStreakAchievements(newStreak);
      }
      return data;
    } else {
      // First time playing
      const { data } = await supabase
        .from('user_streaks')
        .insert({ 
          user_id: user.id, 
          current_streak: 1, 
          longest_streak: 1,
          last_play_date: today 
        })
        .select()
        .single();

      if (data) {
        setStreak(data);
      }
      return data;
    }
  };

  // Check and unlock streak achievements
  const checkStreakAchievements = async (currentStreak: number) => {
    const streakAchievements = achievements.filter(a => a.category === 'streaks');
    for (const achievement of streakAchievements) {
      if (currentStreak >= achievement.requirement_value) {
        await unlockAchievement(achievement.id);
      }
    }
  };

  // Unlock achievement
  const unlockAchievement = async (achievementId: string) => {
    if (!user) return;
    
    // Check if already unlocked
    if (userAchievements.some(ua => ua.achievement_id === achievementId)) return;

    const { data, error } = await supabase
      .from('user_achievements')
      .insert({ user_id: user.id, achievement_id: achievementId })
      .select()
      .single();

    if (data && !error) {
      setUserAchievements(prev => [...prev, data]);
      
      // Find the achievement for notification
      const achievement = achievements.find(a => a.id === achievementId);
      if (achievement) {
        setNewAchievements(prev => [...prev, achievement]);
        
        // Unlock associated reward if any
        if (achievement.reward_type === 'card_back' && achievement.reward_id) {
          await unlockCardBack(achievement.reward_id);
        }
      }
    }
  };

  // Unlock card back
  const unlockCardBack = async (cardBackId: string) => {
    if (!user) return;
    if (userUnlocks.includes(cardBackId)) return;

    await supabase
      .from('user_unlocks')
      .insert({ user_id: user.id, unlockable_id: cardBackId });

    setUserUnlocks(prev => [...prev, cardBackId]);
  };

  // Update stats after a game
  const updateStats = async (gameStats: {
    score: number;
    handsPlayed: number;
    handTypes: Record<string, number>;
  }) => {
    if (!user) return;

    const currentStats = stats || {
      total_games: 0,
      total_hands: 0,
      total_score: 0,
      flushes_made: 0,
      straights_made: 0,
      full_houses_made: 0,
      four_of_kinds_made: 0,
      straight_flushes_made: 0,
      royal_flushes_made: 0,
      highest_score: 0,
    };

    const newStats = {
      user_id: user.id,
      total_games: currentStats.total_games + 1,
      total_hands: currentStats.total_hands + gameStats.handsPlayed,
      total_score: currentStats.total_score + gameStats.score,
      flushes_made: currentStats.flushes_made + (gameStats.handTypes.flush || 0),
      straights_made: currentStats.straights_made + (gameStats.handTypes.straight || 0),
      full_houses_made: currentStats.full_houses_made + (gameStats.handTypes.fullHouse || 0),
      four_of_kinds_made: currentStats.four_of_kinds_made + (gameStats.handTypes.fourOfAKind || 0),
      straight_flushes_made: currentStats.straight_flushes_made + (gameStats.handTypes.straightFlush || 0),
      royal_flushes_made: currentStats.royal_flushes_made + (gameStats.handTypes.royalFlush || 0),
      highest_score: Math.max(currentStats.highest_score, gameStats.score),
    };

    const { data } = await supabase
      .from('user_stats')
      .upsert(newStats, { onConflict: 'user_id' })
      .select()
      .single();

    if (data) {
      setStats(data);
      await checkGameAchievements(newStats, gameStats);
      await updateChallengeProgress(gameStats);
    }
  };

  // Check achievements after game
  const checkGameAchievements = async (
    newStats: UserStats, 
    gameStats: { score: number; handTypes: Record<string, number> }
  ) => {
    // Games played achievements
    if (newStats.total_games >= 1) await unlockAchievement('first_game');
    if (newStats.total_games >= 10) await unlockAchievement('games_10');
    if (newStats.total_games >= 50) await unlockAchievement('games_50');
    if (newStats.total_games >= 100) await unlockAchievement('games_100');

    // Hand type achievements
    if (newStats.flushes_made >= 1) await unlockAchievement('first_flush');
    if (newStats.straights_made >= 1) await unlockAchievement('first_straight');
    if (newStats.full_houses_made >= 1) await unlockAchievement('first_full_house');
    if (gameStats.handTypes.fourOfAKind) await unlockAchievement('first_four_kind');
    if (gameStats.handTypes.straightFlush) await unlockAchievement('first_straight_flush');
    if (gameStats.handTypes.royalFlush) await unlockAchievement('royal_flush');

    // Score achievements
    if (gameStats.score >= 5000) await unlockAchievement('score_5000');
    if (gameStats.score >= 10000) await unlockAchievement('score_10000');
    if (gameStats.score >= 25000) await unlockAchievement('score_25000');
  };

  // Update challenge progress
  const updateChallengeProgress = async (gameStats: { 
    score: number; 
    handTypes: Record<string, number> 
  }) => {
    if (!user || challenges.length === 0) return;

    const updates: DailyChallenge[] = [];

    for (const challenge of challenges) {
      if (challenge.completed) continue;

      let increment = 0;
      switch (challenge.challenge_type) {
        case 'play_games':
          increment = 1;
          break;
        case 'make_flush':
          increment = gameStats.handTypes.flush || 0;
          break;
        case 'make_straight':
          increment = gameStats.handTypes.straight || 0;
          break;
        case 'make_full_house':
          increment = gameStats.handTypes.fullHouse || 0;
          break;
        case 'score_target':
          if (gameStats.score >= challenge.target_value) increment = challenge.target_value;
          break;
      }

      if (increment > 0) {
        const newValue = Math.min(challenge.current_value + increment, challenge.target_value);
        const completed = newValue >= challenge.target_value;

        const { data } = await supabase
          .from('daily_challenges')
          .update({ current_value: newValue, completed })
          .eq('id', challenge.id)
          .select()
          .single();

        if (data) updates.push(data);
      }
    }

    if (updates.length > 0) {
      setChallenges(prev => prev.map(c => {
        const updated = updates.find(u => u.id === c.id);
        return updated || c;
      }));
    }
  };

  // Claim daily reward
  const claimDailyReward = async (): Promise<DailyReward | null> => {
    if (!user || todayReward) return null;

    // Weighted random selection
    const totalWeight = REWARD_OPTIONS.reduce((sum, opt) => sum + opt.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward = REWARD_OPTIONS[0];

    for (const option of REWARD_OPTIONS) {
      random -= option.weight;
      if (random <= 0) {
        selectedReward = option;
        break;
      }
    }

    const reward: Omit<DailyReward, 'claim_date'> & { user_id: string; claim_date: string } = {
      user_id: user.id,
      claim_date: new Date().toISOString().split('T')[0],
      reward_type: selectedReward.type,
      reward_value: selectedReward.value,
    };

    const { data, error } = await supabase
      .from('daily_rewards')
      .insert(reward)
      .select()
      .single();

    if (data && !error) {
      setTodayReward(data);
      return data;
    }
    return null;
  };

  // Clear new achievements notification
  const clearNewAchievements = () => {
    setNewAchievements([]);
  };

  // Get challenge display info
  const getChallengeInfo = (type: string) => {
    return CHALLENGE_TEMPLATES.find(t => t.type === type) || { name: type, description: type };
  };

  return {
    // Data
    streak,
    achievements,
    userAchievements,
    challenges,
    stats,
    unlockables,
    userUnlocks,
    todayReward,
    newAchievements,
    loading,

    // Actions
    updateStreak,
    updateStats,
    unlockAchievement,
    claimDailyReward,
    clearNewAchievements,
    getChallengeInfo,
    loadRetentionData,
    
    // Helpers
    isAchievementUnlocked: (id: string) => userAchievements.some(ua => ua.achievement_id === id),
    isUnlocked: (id: string) => userUnlocks.includes(id),
    canClaimReward: !todayReward,
    allChallengesCompleted: challenges.length > 0 && challenges.every(c => c.completed),
  };
}
