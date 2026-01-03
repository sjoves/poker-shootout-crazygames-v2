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
  inventoryFull: boolean;
  currentPowerUps: string[];
  onClaim: () => void;
  onSwap: (discardId: string) => void;
  onDiscard: () => void;
}

type RevealPhase = 'closed' | 'shaking' | 'opening' | 'revealed';

export function LootBoxReveal({
  isOpen,
  powerUpId,
  tier,
  inventoryFull,
  currentPowerUps,
  onClaim,
  onSwap,
  onDiscard,
}: LootBoxRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>('closed');
  const [selectedToDiscard, setSelectedToDiscard] = useState<string | null>(null);

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

  const handleSwap = () => {
    if (selectedToDiscard) {
      onSwap(selectedToDiscard);
    }
  };

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
                  tier === 'gold' && "bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_40px_rgba(251,191,36,0.5)]",
                  tier === 'silver' && "bg-gradient-to-br from-slate-300 to-slate-500 shadow-[0_0_40px_rgba(148,163,184,0.5)]",
                  tier === 'bronze' && "bg-gradient-to-br from-amber-600 to-amber-800 shadow-[0_0_40px_rgba(180,83,9,0.5)]",
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
                  tier === 'gold' && "bg-amber-400",
                  tier === 'silver' && "bg-slate-300",
                  tier === 'bronze' && "bg-amber-600",
                )}
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />

              {/* Power-up Card */}
              <motion.div
                className={cn(
                  "relative bg-card border-2 rounded-2xl p-6 shadow-2xl",
                  tier === 'gold' && "border-amber-400",
                  tier === 'silver' && "border-slate-400",
                  tier === 'bronze' && "border-amber-600",
                )}
              >
                {/* Tier Badge */}
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold",
                  tier === 'gold' && "bg-amber-400 text-amber-900",
                  tier === 'silver' && "bg-slate-300 text-slate-900",
                  tier === 'bronze' && "bg-amber-600 text-amber-100",
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
                    <span className="text-primary block mt-1">(Static mode only)</span>
                  )}
                </p>

                {/* Tier indicator */}
                <div className={cn("text-xs font-medium", tierInfo.color)}>
                  {tier === 'gold' ? 'Rare' : tier === 'silver' ? 'Uncommon' : 'Common'} Power-up
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 space-y-3"
              >
                {!inventoryFull ? (
                  <Button
                    onClick={onClaim}
                    size="lg"
                    className="w-full font-display text-lg"
                  >
                    Claim Power-up!
                  </Button>
                ) : (
                  <>
                    <p className="text-amber-400 text-sm font-medium mb-3">
                      ⚠️ Inventory Full! (3/3)
                    </p>
                    <p className="text-muted-foreground text-xs mb-3">
                      Choose a power-up to replace:
                    </p>
                    
                    {/* Current Power-ups to swap */}
                    <div className="flex gap-2 justify-center mb-4">
                      {currentPowerUps.map(id => {
                        const pu = POWER_UPS.find(p => p.id === id);
                        if (!pu) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedToDiscard(id)}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all",
                              selectedToDiscard === id
                                ? "border-destructive bg-destructive/10"
                                : "border-border hover:border-muted-foreground"
                            )}
                          >
                            <span className="text-2xl">{pu.emoji}</span>
                            <p className="text-xs mt-1">{pu.name}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSwap}
                        disabled={!selectedToDiscard}
                        size="lg"
                        className="flex-1 font-display"
                      >
                        Swap
                      </Button>
                      <Button
                        onClick={onDiscard}
                        variant="outline"
                        size="lg"
                        className="flex-1 font-display"
                      >
                        Discard New
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}