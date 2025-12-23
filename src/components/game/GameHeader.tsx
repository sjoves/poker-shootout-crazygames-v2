import { Home, RotateCcw, HelpCircle, Trophy, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameHeaderProps {
  highScore?: number;
  isPaused?: boolean;
  onHome: () => void;
  onRestart: () => void;
  onHelp: () => void;
  onPause?: () => void;
  className?: string;
}

export function GameHeader({
  highScore = 0,
  isPaused,
  onHome,
  onRestart,
  onHelp,
  onPause,
  className,
}: GameHeaderProps) {
  return (
    <header className={cn(
      'flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-sm border-b border-border',
      className
    )}>
      <h1 className="text-xl font-display text-primary tracking-wide">
        POKER RUSH
      </h1>
      
      <div className="flex items-center gap-2">
        {highScore > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gold/20 border border-gold/30">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-gold">{highScore.toLocaleString()}</span>
          </div>
        )}
        
        {onPause && (
          <Button variant="ghost" size="icon" onClick={onPause}>
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
        )}
        
        <Button variant="ghost" size="icon" onClick={onHome}>
          <Home className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onRestart}>
          <RotateCcw className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onHelp}>
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
