import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameState } from '@/types/game';
import { Star, Trophy, Crown, Play } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { RewardedAd, useRewardedAd } from '@/components/ads/RewardedAd';

export default function GameOverScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state?.gameState as GameState | undefined;
  const { user } = useAuth();
  const { isPremium, openCheckout } = useSubscription();
  const rewardedAd = useRewardedAd();

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
  const stars = getStarRating(gameState.score);
  const messages = [
    "Keep practicing, partner!",
    "Not bad for a greenhorn!",
    "You're getting the hang of it!",
    "Sharp shootin' there!",
    "Legendary gunslinger!"
  ];

  const handlePlayAgain = () => {
    if (isPremium) {
      navigate(`/play/${gameState.mode}`);
    } else {
      rewardedAd.showAd('play_again', () => {
        navigate(`/play/${gameState.mode}`);
      });
    }
  };

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <Trophy className="w-20 h-20 text-gold mx-auto mb-4" />
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
          {gameState.score.toLocaleString()}
        </div>

        <div className="bg-card/80 rounded-xl p-4 mb-6 text-left space-y-1">
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
          {gameState.mode === 'ssc' && (
            <p className="text-sm text-muted-foreground">Level Reached: {gameState.sscLevel}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <Button onClick={() => navigate('/leaderboard')} variant="outline" size="lg">
            🏅 View Leaderboard
          </Button>
          
          <Button onClick={handlePlayAgain} size="lg" className="gap-2">
            {isPremium ? (
              <>
                <Play className="w-4 h-4" />
                Play Again
              </>
            ) : (
              <>
                🎬 Watch Ad to Play Again
              </>
            )}
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
              variant="secondary"
              size="lg"
              className="gap-2"
            >
              <Crown className="w-4 h-4" />
              Go Premium - No Ads
            </Button>
          )}
          
          <Button onClick={() => navigate('/')} variant="ghost">
            🏠 Back to Menu
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
    </div>
  );
}
