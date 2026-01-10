import { motion } from 'framer-motion';
import { POWER_UPS } from '@/types/game';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PowerUpBarProps {
  earnedPowerUps: string[];
  activePowerUps: string[];
  onUsePowerUp: (id: string) => void;
  currentPhase?: 'sitting_duck' | 'conveyor' | 'falling' | 'orbit';
}

export function PowerUpBar({ 
  earnedPowerUps, 
  activePowerUps, 
  onUsePowerUp,
  currentPhase,
}: PowerUpBarProps) {
  const isMobile = useIsMobile();
  
  // Filter power-ups: Reshuffle only visible during Static mode
  const earnedPowerUpData = POWER_UPS.filter(p => {
    if (!earnedPowerUps.includes(p.id)) return false;
    // Hide Reshuffle during non-Sitting Duck modes
    if (p.id === 'reshuffle' && currentPhase && currentPhase !== 'sitting_duck') return false;
    return true;
  });
  
  // Count how many of each power-up type the player has
  const powerUpCounts = earnedPowerUps.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Get unique power-up IDs for display
  const uniquePowerUpIds = [...new Set(earnedPowerUpData.map(p => p.id))];
  
  if (uniquePowerUpIds.length === 0) {
    return null;
  }
  
  return (
    <ScrollArea className="max-h-48 sm:max-h-64">
      <div className="flex flex-col gap-1 sm:gap-2 pr-2">
        {uniquePowerUpIds.map(powerUpId => {
          const powerUp = POWER_UPS.find(p => p.id === powerUpId);
          if (!powerUp) return null;
          
          const count = powerUpCounts[powerUpId] || 0;
          const isActive = activePowerUps.includes(powerUp.id);
          const wasUsed = !isActive;
          
          return (
            <Tooltip key={powerUp.id}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={isActive ? { scale: 1.1 } : {}}
                  whileTap={isActive ? { scale: 0.9 } : {}}
                  onClick={() => {
                    console.log('[PowerUpBar] Button clicked:', powerUp.id, 'isActive:', isActive);
                    if (isActive) {
                      onUsePowerUp(powerUp.id);
                    }
                  }}
                  disabled={!isActive}
                  className={cn(
                    'relative w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-xl',
                    'border-2 transition-all',
                    isActive && 'bg-primary/20 border-primary cursor-pointer hover:bg-primary/30 animate-pulse-glow',
                    wasUsed && !powerUp.isReusable && 'bg-muted/50 border-muted-foreground/50 opacity-60 cursor-not-allowed',
                  )}
                >
                  {powerUp.emoji}
                  {/* Count badge for multiple power-ups */}
                  {count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="font-bold">{powerUp.name} {count > 1 && `(×${count})`}</p>
                <p className="text-xs text-muted-foreground">{powerUp.description}</p>
                {wasUsed && !powerUp.isReusable && (
                  <p className="text-xs text-muted-foreground mt-1">Already used this level</p>
                )}
                {isActive && (
                  <p className="text-xs text-primary mt-1">Click to use!</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </ScrollArea>
  );
}
