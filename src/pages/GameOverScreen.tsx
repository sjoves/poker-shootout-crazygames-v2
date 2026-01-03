import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameState } from '@/types/game';
import { Star, Shuffle, Crown, Play, Award, Clapperboard, Home, RotateCcw, CloudUpload, CheckCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { RewardedAd, useRewardedAd } from '@/components/ads/RewardedAd';
import { supabase } from '@/integrations/supabase/client';
import { useGuestScores } from '@/hooks/useGuestScores';
import { AuthModal } from '@/components/auth/AuthModal';

export default function GameOverScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state?.gameState as GameState | undefined;
  const { user, loading: authLoading } = useAuth();
  const { isPremium, openCheckout } = useSubscription();
  const rewardedAd = useRewardedAd();
  const { saveGuestScore } = useGuestScores();
  const scoreSavedRef = useRef(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [scoreSynced, setScoreSynced] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  // Save score to leaderboard when component mounts
  useEffect(() => {
    const saveScore = async () => {
      if (!gameState || scoreSavedRef.current) return;
      
      scoreSavedRef.current = true;
      
      // If user is not logged in, save to localStorage
      if (!user) {
        saveGuestScore(gameState);
        console.log('Score saved locally (guest mode)');
        return;
      }
      
      try {
        // Get user's profile id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }
        
        if (!profile) {
          console.error('No profile found for user');
          return;
        }
        
        // Save score to leaderboard - use cumulativeScore for SSC mode
        const scoreToSave = gameState.mode === 'ssc' ? gameState.cumulativeScore : gameState.score;
        
        const { error: insertError } = await supabase
          .from('leaderboard_entries')
          .insert({
            user_id: user.id,
            profile_id: profile.id,
            game_mode: gameState.mode,
            score: scoreToSave,
            hands_played: gameState.handsPlayed,
            ssc_level: gameState.mode === 'ssc' ? gameState.sscLevel : null,
            time_seconds: gameState.timeElapsed,
            best_hand: gameState.currentHand?.hand.name || null,
          });
        
        if (insertError) {
          console.error('Error saving score:', insertError);
        } else {
          console.log('Score saved to leaderboard');
          setScoreSynced(true);
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    };
    
    saveScore();
  }, [user, gameState, saveGuestScore]);

  // Fetch personal best when user is authenticated
  useEffect(() => {
    const fetchPersonalBest = async () => {
      if (!user || !gameState) return;
      
      try {
        const { data } = await supabase
          .from('leaderboard_entries')
          .select('score')
          .eq('user_id', user.id)
          .eq('game_mode', gameState.mode)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setPersonalBest(data.score);
        }
      } catch (error) {
        console.error('Error fetching personal best:', error);
      }
    };
    
    fetchPersonalBest();
  }, [user, gameState]);

  // Handle successful auth - sync score immediately
  const handleAuthSuccess = async () => {
    if (!gameState) return;
    
    // The useAuth hook already syncs guest scores on login
    // Just mark as synced for UI
    setScoreSynced(true);
    scoreSavedRef.current = false; // Allow re-save with new user
  };

  if (!gameState) {
    navigate('/');
    return null;
  }

  const getStarRating = (score: number) => {
    if (score >= 5000) return 5;
    if (score >= 3000) return 4;
    if (score >= 1500) return 3;
    if (score >= 500) return 2;
    return 1;
  };

  const isClassicMode = gameState.mode === 'classic_fc' || gameState.mode === 'classic_cb';
  const isSSC = gameState.mode === 'ssc';
  // Use cumulative score for SSC, regular score for other modes
  const displayScore = isSSC ? gameState.cumulativeScore : gameState.score;
  const stars = getStarRating(displayScore);
  const messages = [
    "Keep practicing, partner!",
    "Not bad for a greenhorn!",
    "You're getting the hang of it!",
    "Sharp shootin' there!",
    "Legendary gunslinger!"
  ];

  const handlePlayAgain = () => {
    navigate(`/play/${gameState.mode}`);
  };

  const handleReplayLevel = () => {
    if (isPremium) {
      navigate(`/play/ssc?startLevel=${gameState.sscLevel}`);
    } else {
      rewardedAd.showAd('replay_level', () => {
        navigate(`/play/ssc?startLevel=${gameState.sscLevel}`);
      }, String(gameState.sscLevel));
    }
  };

  const isGuest = !authLoading && !user;
  const isNewPersonalBest = personalBest !== null && displayScore > personalBest;

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <Shuffle className="w-20 h-20 text-gold mx-auto mb-4" />
        <h1 className="text-4xl font-display text-primary mb-2">Game Over</h1>
        
        <div className="flex justify-center gap-1 my-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={`w-8 h-8 ${i <= stars ? 'text-gold fill-gold' : 'text-muted-foreground'}`}
            />
          ))}
        </div>
        
        <p className="text-lg text-muted-foreground mb-6">{messages[stars - 1]}</p>
        
        <div className="text-5xl font-display text-gold text-glow mb-8">
          {displayScore.toLocaleString()}
        </div>

        <div className="bg-card/80 rounded-xl p-4 mb-6 text-left space-y-1 w-full max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">Hands Played: {gameState.handsPlayed}</p>
          {isClassicMode && (
            <>
              <p className="text-sm text-muted-foreground">
                Base Score: {gameState.rawScore.toLocaleString()}
              </p>
              {gameState.timeBonus > 0 && (
                <p className="text-sm text-green-500">
                  + Time Bonus: {gameState.timeBonus.toLocaleString()}
                </p>
              )}
              {gameState.leftoverPenalty > 0 && (
                <p className="text-sm text-destructive">
                  - Leftover Cards: {gameState.leftoverPenalty.toLocaleString()}
                </p>
              )}
            </>
          )}
          {isSSC && (
            <>
              <p className="text-sm text-muted-foreground">Level Reached: {gameState.sscLevel}</p>
              <p className="text-sm text-muted-foreground">Final Level Score: {gameState.levelScore.toLocaleString()}</p>
            </>
          )}
        </div>

        {/* Guest Sign-In Module */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-gold/10 to-primary/10 border border-gold/30 rounded-xl p-4 mb-6 w-full max-w-md mx-auto"
          >
            <div className="flex items-center gap-2 mb-2">
              <CloudUpload className="w-5 h-5 text-gold" />
              <span className="font-display text-gold">Save Your Progress</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Don't lose your Legendary status! Sign in to save your scores and sync your Power-Ups to the Cloud.
            </p>
            <Button
              onClick={() => setShowAuthModal(true)}
              size="lg"
              className="w-full bg-gold hover:bg-gold/90 text-background font-display text-lg h-14 gap-2"
            >
              <CloudUpload className="w-5 h-5" />
              Sign In to Save Score
            </Button>
          </motion.div>
        )}

        {/* Authenticated User - Personal Best / Synced Status */}
        {!isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/60 border border-primary/30 rounded-xl p-4 mb-6 w-full max-w-md mx-auto"
          >
            <div className="flex items-center justify-center gap-2 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="font-display">Score Saved to Cloud</span>
            </div>
            {personalBest !== null && (
              <div className="mt-2 text-sm text-muted-foreground">
                {isNewPersonalBest ? (
                  <span className="text-gold font-medium">🎉 New Personal Best!</span>
                ) : (
                  <span>Personal Best: {personalBest.toLocaleString()}</span>
                )}
              </div>
            )}
          </motion.div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
          <Button 
            onClick={() => navigate('/leaderboard')} 
            variant="outline" 
            size="lg" 
            className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
          >
            <Award className="w-5 h-5 text-primary" />
            View Leaderboard
          </Button>
          
          {/* SSC Mode: Replay This Level option */}
          {isSSC && gameState.sscLevel > 1 && (
            <Button 
              onClick={handleReplayLevel} 
              variant="outline"
              size="lg" 
              className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
            >
              {isPremium ? (
                <>
                  <RotateCcw className="w-5 h-5 text-primary" />
                  Replay Level {gameState.sscLevel}
                </>
              ) : (
                <>
                  <Clapperboard className="w-5 h-5 text-primary" />
                  Watch Ad to Retry Level {gameState.sscLevel}
                </>
              )}
            </Button>
          )}
          
          <Button 
            onClick={handlePlayAgain} 
            variant="outline"
            size="lg" 
            className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
          >
            <Play className="w-5 h-5 text-primary" />
            {isSSC ? 'Start From Level 1' : 'Play Again'}
          </Button>
          
          {!isPremium && (
            <Button
              onClick={async () => {
                if (!user) {
                  navigate('/auth');
                } else {
                  await openCheckout();
                }
              }}
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
            >
              <Crown className="w-5 h-5 text-primary" />
              Go Premium - No Ads
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="w-full h-12 font-display gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Menu
          </Button>
        </div>
      </motion.div>

      {/* Rewarded Ad Modal */}
      <RewardedAd
        isOpen={rewardedAd.isOpen}
        onClose={rewardedAd.hideAd}
        onAdComplete={rewardedAd.onComplete}
        adType={rewardedAd.adType}
        modeName={rewardedAd.modeName}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
