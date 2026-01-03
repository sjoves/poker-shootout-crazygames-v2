import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { POWER_UPS, RewardTier } from '@/types/game';
import { getTierDisplayInfo } from '@/hooks/useGameState';
import { cn } from '@/lib/utils';

interface LootBoxRevealProps {
  isOpen: boolean;
  powerUpId: string | null;
  tier: RewardTier | null;
  inventoryFull?: boolean; // Kept for backwards compatibility, but unused
  currentPowerUps?: string[]; // Kept for backwards compatibility, but unused
  onClaim: () => void;
  onSwap?: (discardId: string) => void; // Kept for backwards compatibility, but unused
  onDiscard?: () => void; // Kept for backwards compatibility, but unused
}

type RevealPhase = 'closed' | 'shaking' | 'opening' | 'revealed';

export function LootBoxReveal({
  isOpen,
  powerUpId,
  tier,
  onClaim,
}: LootBoxRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>('closed');

  const powerUp = powerUpId ? POWER_UPS.find(p => p.id === powerUpId) : null;
  const tierInfo = tier ? getTierDisplayInfo(tier) : null;

  // Animation sequence
  useEffect(() => {
    if (isOpen && powerUp) {
      setPhase('closed');
      const shakingTimer = setTimeout(() => setPhase('shaking'), 300);
      const openingTimer = setTimeout(() => setPhase('opening'), 1500);
      const revealedTimer = setTimeout(() => setPhase('revealed'), 2000);
      
      return () => {
        clearTimeout(shakingTimer);
        clearTimeout(openingTimer);
        clearTimeout(revealedTimer);
      };
    }
  }, [isOpen, powerUp]);

  if (!isOpen || !powerUp || !tierInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md z-50"
      >
        <div className="text-center max-w-md mx-4">
          {/* Pre-reveal: Loot Box Animation */}
          {phase !== 'revealed' && (
            <motion.div
              className="relative"
              animate={phase === 'shaking' ? {
                rotate: [-2, 2, -2, 2, -3, 3, -3, 3, 0],
                scale: [1, 1.02, 1, 1.02, 1.03, 1, 1.03, 1],
              } : {}}
              transition={{ duration: 1.2, repeat: phase === 'shaking' ? 0 : 0 }}
            >
              {/* Loot Box */}
              <motion.div
                className={cn(
                  "w-32 h-32 mx-auto rounded-xl flex items-center justify-center relative overflow-hidden",
                  tier === 'gold' && "bg-gradient-to-br from-gold to-primary shadow-[var(--shadow-glow)]",
                  tier === 'silver' && "bg-gradient-to-br from-silver to-muted-foreground shadow-[0_0_40px_hsl(var(--silver)/0.5)]",
                  tier === 'bronze' && "bg-gradient-to-br from-bronze to-primary shadow-[0_0_40px_hsl(var(--bronze)/0.5)]",
                )}
                animate={phase === 'opening' ? {
                  scale: [1, 1.2, 0],
                  rotate: [0, 10, -10, 0],
                } : {}}
                transition={{ duration: 0.5 }}
              >
                {/* Box Icon */}
                <motion.span 
                  className="text-6xl"
                  animate={phase === 'shaking' ? { y: [0, -5, 0] } : {}}
                  transition={{ repeat: phase === 'shaking' ? Infinity : 0, duration: 0.2 }}
                >
                  🎁
                </motion.span>
                
                {/* Sparkles */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={phase === 'shaking' ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.3 }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                >
                  <div className="absolute top-2 left-4 text-lg">✨</div>
                  <div className="absolute top-4 right-3 text-sm">✨</div>
                  <div className="absolute bottom-3 left-6 text-sm">✨</div>
                  <div className="absolute bottom-2 right-4 text-lg">✨</div>
                </motion.div>
              </motion.div>

              {/* Tier Label */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={cn("mt-4 text-xl font-display", tierInfo.color)}
              >
                {tierInfo.emoji} {tierInfo.name} Reward
              </motion.p>
            </motion.div>
          )}

          {/* Post-reveal: Power-up Display */}
          {phase === 'revealed' && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {/* Glow Effect */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-full blur-3xl opacity-30 mx-auto pointer-events-none",
                  tier === 'gold' && "bg-gold",
                  tier === 'silver' && "bg-silver",
                  tier === 'bronze' && "bg-bronze",
                )}
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />

              {/* Power-up Card */}
              <motion.div
                className={cn(
                  "relative bg-card border-2 rounded-2xl p-6 shadow-2xl",
                  tier === 'gold' && "border-gold",
                  tier === 'silver' && "border-silver",
                  tier === 'bronze' && "border-bronze",
                )}
              >
                {/* Tier Badge */}
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold",
                  tier === 'gold' && "bg-gold text-background",
                  tier === 'silver' && "bg-silver text-background",
                  tier === 'bronze' && "bg-bronze text-primary-foreground",
                )}>
                  {tierInfo.name} Tier
                </div>

                {/* Power-up Emoji */}
                <motion.div
                  className="text-7xl mb-4 mt-2"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                >
                  {powerUp.emoji}
                </motion.div>

                {/* Power-up Name */}
                <h3 className="text-2xl font-display text-foreground mb-2">
                  {powerUp.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4">
                  {powerUp.description}
                  {powerUp.id === 'reshuffle' && (
                    <span className="text-primary block mt-1">(Sitting Duck mode only)</span>
                  )}
                </p>

                {/* Tier indicator */}
                <div className={cn("text-xs font-medium", tierInfo.color)}>
                  {tier === 'gold' ? 'Rare' : tier === 'silver' ? 'Uncommon' : 'Common'} Power-up
                </div>
              </motion.div>

              {/* Action Button - Always show Claim since inventory is unlimited */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <Button
                  onClick={onClaim}
                  size="lg"
                  className="w-full font-display text-lg"
                >
                  Claim Power-up!
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}