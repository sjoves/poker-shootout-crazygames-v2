import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// AdMob configuration - replace with your actual ad unit IDs
const ADMOB_CONFIG = {
  // Test ad unit IDs - replace with production IDs
  rewardedVideoAdUnitId: 'ca-app-pub-3940256099942544/5224354917', // Test ID
  publisherId: 'ca-app-pub-XXXXXXXXXXXXXXXX', // Replace with your publisher ID
};

interface RewardedAdProps {
  isOpen: boolean;
  onClose: () => void;
  onAdComplete: () => void;
  adType: 'mode_unlock' | 'revive' | 'play_again' | 'replay_level';
  modeName?: string;
}

export function RewardedAd({ isOpen, onClose, onAdComplete, adType, modeName }: RewardedAdProps) {
  const [adState, setAdState] = useState<'loading' | 'ready' | 'playing' | 'complete' | 'error'>('loading');
  const [countdown, setCountdown] = useState(5);

  const getAdTitle = () => {
    switch (adType) {
      case 'mode_unlock':
        return `Unlock ${modeName || 'Mode'}`;
      case 'revive':
        return 'Continue Playing';
      case 'play_again':
        return 'Play Again';
      case 'replay_level':
        return `Retry Level ${modeName || ''}`;
      default:
        return 'Watch Ad';
    }
  };

  const getAdDescription = () => {
    switch (adType) {
      case 'mode_unlock':
        return `Watch a short video to unlock ${modeName || 'this mode'} for this session`;
      case 'revive':
        return 'Watch a short video to get more time and continue your game';
      case 'play_again':
        return 'Watch a short video to start a new game';
      case 'replay_level':
        return `Watch a short video to retry level ${modeName || 'this level'}`;
      default:
        return 'Watch a short video to continue';
    }
  };

  // Simulate ad loading - in production, this would integrate with AdMob SDK
  useEffect(() => {
    if (isOpen && adState === 'loading') {
      const timer = setTimeout(() => {
        setAdState('ready');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, adState]);

  // Handle countdown when ad is playing
  useEffect(() => {
    if (adState === 'playing' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (adState === 'playing' && countdown === 0) {
      setAdState('complete');
    }
  }, [adState, countdown]);

  const startAd = useCallback(() => {
    setAdState('playing');
    setCountdown(5); // 5 second simulated ad
  }, []);

  const handleComplete = useCallback(() => {
    onAdComplete();
    onClose();
    setAdState('loading');
    setCountdown(5);
  }, [onAdComplete, onClose]);

  const handleClose = useCallback(() => {
    if (adState !== 'playing') {
      onClose();
      setAdState('loading');
      setCountdown(5);
    }
  }, [adState, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md mx-4 bg-background border border-primary/40 rounded-xl p-6 shadow-2xl"
        >
          {adState !== 'playing' && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {getAdTitle()}
            </h2>
            <p className="text-muted-foreground mb-6">
              {getAdDescription()}
            </p>

            {adState === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading ad...</p>
              </div>
            )}

            {adState === 'ready' && (
              <Button
                onClick={startAd}
                size="lg"
                className="w-full gap-2"
              >
                <Play size={20} />
                Watch Ad
              </Button>
            )}

            {adState === 'playing' && (
              <div className="flex flex-col items-center gap-4">
                {/* Simulated ad placeholder - replace with actual AdMob component */}
                <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center border border-border">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">Ad Playing</p>
                    <p className="text-4xl font-bold text-primary mt-2">{countdown}</p>
                    <p className="text-sm text-muted-foreground mt-1">seconds remaining</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please wait for the ad to complete
                </p>
              </div>
            )}

            {adState === 'complete' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🎉</span>
                </div>
                <p className="text-lg font-semibold text-foreground">Ad Complete!</p>
                <Button onClick={handleComplete} size="lg" className="w-full">
                  Continue
                </Button>
              </div>
            )}

            {adState === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-destructive">Failed to load ad. Please try again.</p>
                <Button onClick={() => setAdState('loading')} variant="outline">
                  Retry
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Go Premium for an ad-free experience • $4.99/month
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage ad state
export function useRewardedAd() {
  const [isOpen, setIsOpen] = useState(false);
  const [adConfig, setAdConfig] = useState<{
    type: 'mode_unlock' | 'revive' | 'play_again' | 'replay_level';
    modeName?: string;
    onComplete: () => void;
  } | null>(null);

  const showAd = useCallback((
    type: 'mode_unlock' | 'revive' | 'play_again' | 'replay_level',
    onComplete: () => void,
    modeName?: string
  ) => {
    setAdConfig({ type, modeName, onComplete });
    setIsOpen(true);
  }, []);

  const hideAd = useCallback(() => {
    setIsOpen(false);
    setAdConfig(null);
  }, []);

  return {
    isOpen,
    showAd,
    hideAd,
    adType: adConfig?.type || 'mode_unlock',
    modeName: adConfig?.modeName,
    onComplete: adConfig?.onComplete || (() => {}),
  };
}
