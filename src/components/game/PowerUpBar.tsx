import { motion } from 'framer-motion';
import { POWER_UPS } from '@/types/game';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface PowerUpBarProps {
  unlockedPowerUps: string[];
  activePowerUps: string[];
  currentLevel: number;
  onUsePowerUp: (id: string) => void;
}

export function PowerUpBar({ 
  unlockedPowerUps, 
  activePowerUps, 
  currentLevel, 
  onUsePowerUp 
}: PowerUpBarProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col gap-1 sm:gap-2">
      {POWER_UPS.map(powerUp => {
        const isUnlocked = powerUp.unlockedAtLevel <= currentLevel;
        const isActive = activePowerUps.includes(powerUp.id);
        const wasUsed = unlockedPowerUps.includes(powerUp.id) && !isActive;
        
        return (
          <Tooltip key={powerUp.id}>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={isActive ? { scale: 1.1 } : {}}
                whileTap={isActive ? { scale: 0.9 } : {}}
                onClick={() => isActive && onUsePowerUp(powerUp.id)}
                disabled={!isActive}
                className={cn(
                  'w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-xl',
                  'border-2 transition-all',
                  isActive && 'bg-primary/20 border-primary cursor-pointer hover:bg-primary/30 animate-pulse-glow',
                  !isUnlocked && 'bg-muted/50 border-muted-foreground/30 opacity-40 cursor-not-allowed',
                  wasUsed && 'bg-muted/50 border-muted-foreground/50 opacity-60 cursor-not-allowed',
                )}
              >
                {powerUp.emoji}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-bold">{powerUp.name}</p>
              {!isUnlocked && (
                <p className="text-xs text-muted-foreground">Unlocks at Level {powerUp.unlockedAtLevel}</p>
              )}
              {wasUsed && !powerUp.isReusable && (
                <p className="text-xs text-muted-foreground">Already used this level</p>
              )}
              {isActive && (
                <p className="text-xs text-primary">Click to use!</p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
