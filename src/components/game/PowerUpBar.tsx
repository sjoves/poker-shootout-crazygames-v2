import { motion } from 'framer-motion';
import { POWER_UPS } from '@/types/game';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface PowerUpBarProps {
  earnedPowerUps: string[];
  activePowerUps: string[];
  onUsePowerUp: (id: string) => void;
}

export function PowerUpBar({ 
  earnedPowerUps, 
  activePowerUps, 
  onUsePowerUp 
}: PowerUpBarProps) {
  const isMobile = useIsMobile();
  
  // Only show power-ups the player has earned
  const earnedPowerUpData = POWER_UPS.filter(p => earnedPowerUps.includes(p.id));
  
  if (earnedPowerUpData.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-col gap-1 sm:gap-2">
      {earnedPowerUpData.map(powerUp => {
        const isActive = activePowerUps.includes(powerUp.id);
        const wasUsed = !isActive;
        
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
                  wasUsed && !powerUp.isReusable && 'bg-muted/50 border-muted-foreground/50 opacity-60 cursor-not-allowed',
                )}
              >
                {powerUp.emoji}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-bold">{powerUp.name}</p>
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
  );
}
