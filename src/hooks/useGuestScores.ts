import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, GameMode } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

interface GuestScore {
  game_mode: GameMode;
  score: number;
  hands_played: number;
  ssc_level: number | null;
  time_seconds: number;
  best_hand: string | null;
  created_at: string;
}

const GUEST_SCORES_KEY = 'poker_shootout_guest_scores';

export function useGuestScores() {
  const { toast } = useToast();
  // Save a guest score to localStorage
  const saveGuestScore = useCallback((gameState: GameState) => {
    const existingScores = getGuestScores();
    
    // Use cumulative score for SSC mode, regular score for other modes
    const scoreToSave = gameState.mode === 'ssc' ? gameState.cumulativeScore : gameState.score;
    
    const newScore: GuestScore = {
      game_mode: gameState.mode,
      score: scoreToSave,
      hands_played: gameState.handsPlayed,
      ssc_level: gameState.mode === 'ssc' ? gameState.sscLevel : null,
      time_seconds: gameState.timeElapsed,
      best_hand: gameState.currentHand?.hand.name || null,
      created_at: new Date().toISOString(),
    };
    
    existingScores.push(newScore);
    localStorage.setItem(GUEST_SCORES_KEY, JSON.stringify(existingScores));
    console.log('Guest score saved to localStorage');
  }, []);

  // Get all guest scores from localStorage
  const getGuestScores = useCallback((): GuestScore[] => {
    try {
      const stored = localStorage.getItem(GUEST_SCORES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Clear guest scores from localStorage
  const clearGuestScores = useCallback(() => {
    localStorage.removeItem(GUEST_SCORES_KEY);
  }, []);

  // Sync guest scores to the database
  const syncGuestScores = useCallback(async (userId: string) => {
    const guestScores = getGuestScores();
    
    if (guestScores.length === 0) return;
    
    try {
      // Get user's profile id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileError || !profile) {
        console.error('Error fetching profile for sync:', profileError);
        return;
      }
      
      // Insert all guest scores
      const scoresToInsert = guestScores.map(score => ({
        user_id: userId,
        profile_id: profile.id,
        game_mode: score.game_mode,
        score: score.score,
        hands_played: score.hands_played,
        ssc_level: score.ssc_level,
        time_seconds: score.time_seconds,
        best_hand: score.best_hand,
        created_at: score.created_at,
      }));
      
      const { error: insertError } = await supabase
        .from('leaderboard_entries')
        .insert(scoresToInsert);
      
      if (insertError) {
        console.error('Error syncing guest scores:', insertError);
        return;
      }
      
      // Clear local storage after successful sync
      clearGuestScores();
      toast({ title: `Synced ${guestScores.length} score${guestScores.length > 1 ? 's' : ''} to your account!` });
      console.log(`Synced ${guestScores.length} guest scores to database`);
    } catch (error) {
      console.error('Error syncing guest scores:', error);
    }
  }, [getGuestScores, clearGuestScores]);

  return {
    saveGuestScore,
    getGuestScores,
    clearGuestScores,
    syncGuestScores,
    hasGuestScores: getGuestScores().length > 0,
  };
}
