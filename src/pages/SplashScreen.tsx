import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameMode } from '@/types/game';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { RewardedAd, useRewardedAd } from '@/components/ads/RewardedAd';
import { Crown, Play, Lock } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, requiresAdForMode, markAdWatchedForMode, openCheckout, loading } = useSubscription();
  const [selectedMode, setSelectedMode] = useState<'classic' | 'blitz' | 'ssc' | null>(null);
  const rewardedAd = useRewardedAd();

  const handleModeSelect = (mode: GameMode) => {
    // Check if this mode requires an ad
    if (requiresAdForMode(mode)) {
      const modeName = mode.startsWith('blitz') ? 'Blitz Mode' : 'SSC Mode';
      rewardedAd.showAd('mode_unlock', () => {
        markAdWatchedForMode(mode);
        navigate(`/play/${mode}`);
      }, modeName);
    } else {
      navigate(`/play/${mode}`);
    }
  };

  const getModeIcon = (mode: string) => {
    if (isPremium || mode.startsWith('classic')) {
      return <Play className="w-5 h-5" />;
    }
    return <Lock className="w-5 h-5" />;
  };

  const getModeLabel = (mode: string) => {
    if (isPremium) return null;
    if (mode.startsWith('classic')) return null;
    return (
      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
        Watch Ad
      </span>
    );
  };

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-display text-primary text-glow mb-4">
          POKER RUSH
        </h1>
        <p className="text-lg text-muted-foreground">
          Collect cards. Build hands. Beat the clock.
        </p>
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium"
          >
            <Crown className="w-4 h-4" />
            Premium Member
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        {/* Classic Mode - Always Free */}
        <div className="space-y-2">
          <Button
            variant={selectedMode === 'classic' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-16 text-lg font-display"
            onClick={() => setSelectedMode(selectedMode === 'classic' ? null : 'classic')}
          >
            🎯 Classic Mode
            <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              Free
            </span>
          </Button>
          {selectedMode === 'classic' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_fc')}>
                Falling Cards
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_cb')}>
                Conveyor Belt
              </Button>
            </motion.div>
          )}
        </div>

        {/* Blitz Mode - Premium or Ad */}
        <div className="space-y-2">
          <Button
            variant={selectedMode === 'blitz' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-16 text-lg font-display"
            onClick={() => setSelectedMode(selectedMode === 'blitz' ? null : 'blitz')}
          >
            ⚡ 52-Card Blitz
            {getModeLabel('blitz')}
          </Button>
          {selectedMode === 'blitz' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1 gap-1" onClick={() => handleModeSelect('blitz_fc')}>
                {getModeIcon('blitz_fc')}
                Falling Cards
              </Button>
              <Button variant="secondary" className="flex-1 gap-1" onClick={() => handleModeSelect('blitz_cb')}>
                {getModeIcon('blitz_cb')}
                Conveyor Belt
              </Button>
            </motion.div>
          )}
        </div>

        {/* SSC Mode - Premium or Ad */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-16 text-lg font-display gap-2"
          onClick={() => handleModeSelect('ssc')}
        >
          {getModeIcon('ssc')}
          🏆 Sharp Shooter Challenge
          {getModeLabel('ssc')}
        </Button>

        {/* Premium Upsell */}
        {!isPremium && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Go Premium</h3>
                <p className="text-sm text-muted-foreground">Unlock all modes, ad-free forever</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                if (!user) {
                  navigate('/auth');
                } else {
                  await openCheckout();
                }
              }}
              className="w-full"
              size="lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              {user ? 'Subscribe for $4.99/month' : 'Sign in to Subscribe'}
            </Button>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex gap-4"
      >
        <Button variant="ghost" onClick={() => navigate('/leaderboard')}>
          🏅 Leaderboard
        </Button>
        <Button variant="ghost" onClick={() => navigate('/auth')}>
          {user ? '👤 Account' : '👤 Sign In'}
        </Button>
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
