import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Guest scores sync function (inline to avoid circular deps)
const syncGuestScoresOnLogin = async (userId: string) => {
  const GUEST_SCORES_KEY = 'poker_shootout_guest_scores';
  
  try {
    const stored = localStorage.getItem(GUEST_SCORES_KEY);
    if (!stored) return;
    
    const guestScores = JSON.parse(stored);
    if (!guestScores || guestScores.length === 0) return;
    
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
    const scoresToInsert = guestScores.map((score: any) => ({
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
    
    if (!insertError) {
      localStorage.removeItem(GUEST_SCORES_KEY);
      console.log(`Synced ${guestScores.length} guest scores to database`);
    }
  } catch (error) {
    console.error('Error syncing guest scores:', error);
  }
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile and sync guest scores after auth state change
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            // Sync guest scores on login (only once per session)
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !syncedRef.current) {
              syncedRef.current = true;
              syncGuestScoresOnLogin(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          syncedRef.current = false;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { username }
      }
    });
    
    return { error, data };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error, data };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('user_id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, username } : { username, avatar_url: null });
    }
    
    return { error };
  }, [user]);

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateUsername,
  };
}
