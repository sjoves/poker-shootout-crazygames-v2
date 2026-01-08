import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useCrazyGames } from '@/contexts/CrazyGamesContext';

interface LevelCompleteModalProps {
  isOpen: boolean;
  level: number;
  score: number;
  levelScore: number;
  cumulativeScore: number;
  goalScore: number;
  starRating: number;
  isBonusRound: boolean;
  isBonusFailed: boolean;
  pendingBonusRound: boolean;
  bonusTimePoints?: number;
  onNextLevel: () => void;
  onStartBonusRound: () => void;
}

export function LevelCompleteModal({
  isOpen,
  level,
  score,
  levelScore,
  cumulativeScore,
  goalScore,
  starRating,
  isBonusRound,
  isBonusFailed,
  pendingBonusRound,
  bonusTimePoints,
  onNextLevel,
  onStartBonusRound,
}: LevelCompleteModalProps) {
  const stars = [1, 2, 3];
  const { showMidgameAd, isAvailable: isCrazyGamesAvailable } = useCrazyGames();
  const [isShowingAd, setIsShowingAd] = useState(false);
  
  // Calculate thresholds for display
  const twoStarThreshold = Math.floor(goalScore * 1.25);
  const threeStarThreshold = Math.floor(goalScore * 1.5);

  // Determine button text and action based on state
  const getButtonConfig = () => {
    if (isBonusFailed) {
      // After failed bonus round, continue to next level
      return { text: `Continue to Level ${level + 1}`, action: onNextLevel };
    }
    if (isBonusRound) {
      // After successful bonus round, continue to next level
      return { text: `Continue to Level ${level + 1}`, action: onNextLevel };
    }
    if (pendingBonusRound) {
      // After completing a level that triggers bonus, go to bonus round
      return { text: 'Bonus Round!', action: onStartBonusRound };
    }
    // Normal level complete, go to next level
    return { text: 'Next Level', action: onNextLevel };
  };

  const buttonConfig = getButtonConfig();

  // Handle button click with midgame ad
  const handleButtonClick = async () => {
    // Show midgame ad every 3 levels (on levels 3, 6, 9, etc.)
    const shouldShowAd = isCrazyGamesAvailable && level % 3 === 0 && !isBonusRound && !isBonusFailed;
    
    if (shouldShowAd) {
      setIsShowingAd(true);
      await showMidgameAd();
      setIsShowingAd(false);
    }
    
    buttonConfig.action();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-center p-8 bg-card border border-border rounded-2xl shadow-2xl max-w-md mx-4"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-4"
            >
              {isBonusFailed ? (
                <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                  <span className="text-4xl">😅</span>
                </div>
              ) : isBonusRound ? (
                <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🎁</span>
                </div>
              ) : pendingBonusRound ? (
                <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🎉</span>
                </div>
              ) : (
                <TrophyIcon className="w-16 h-16 text-primary mx-auto" />
              )}
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl font-display text-foreground mb-2">
              {isBonusFailed 
                ? 'Better Luck Next Time!' 
                : isBonusRound 
                  ? 'Bonus Round Complete!' 
                  : `Level ${level} Complete!`}
            </h2>

            {/* Stars (only for regular levels, not bonus) */}
            {!isBonusRound && !isBonusFailed && (
              <div className="flex justify-center gap-2 mb-4">
                {stars.map((star, index) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4 + index * 0.15, type: 'spring', stiffness: 400 }}
                  >
                    {starRating >= star ? (
                      <StarIcon className="w-10 h-10 text-accent drop-shadow-lg" />
                    ) : (
                      <StarOutlineIcon className="w-10 h-10 text-muted-foreground/40" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Score breakdown */}
            <div className="space-y-2 mb-6">
              {isBonusFailed ? (
                <p className="text-muted-foreground">
                  No worries! Bonus rounds are just for extra rewards.
                </p>
              ) : isBonusRound && bonusTimePoints !== undefined ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p>Hand Score: {(levelScore - bonusTimePoints).toLocaleString()}</p>
                    <p className="text-accent">+ Time Bonus: {bonusTimePoints.toLocaleString()}</p>
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-lg text-foreground font-bold">
                      Level Score: {levelScore.toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Goal: {goalScore.toLocaleString()}</p>
                    <p>Your Score: {score.toLocaleString()}</p>
                    {starRating < 3 && (
                      <p className="text-xs opacity-70">
                        {starRating < 2 
                          ? `${twoStarThreshold.toLocaleString()} for 2 stars` 
                          : `${threeStarThreshold.toLocaleString()} for 3 stars`}
                      </p>
                    )}
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-lg text-foreground font-bold">
                      Level Score: {levelScore.toLocaleString()}
                    </p>
                  </div>
                </>
              )}
              
              <p className="text-xl text-primary font-bold mt-2">
                Total Score: {cumulativeScore.toLocaleString()}
              </p>
            </div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={handleButtonClick}
                size="lg"
                className="w-full font-display text-lg"
                disabled={isShowingAd}
              >
                {isShowingAd ? 'Loading...' : buttonConfig.text}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}