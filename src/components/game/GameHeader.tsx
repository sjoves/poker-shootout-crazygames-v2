import { HomeIcon, ArrowPathIcon, QuestionMarkCircleIcon, TrophyIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
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
            <TrophyIcon className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-gold">{highScore.toLocaleString()}</span>
          </div>
        )}
        
        {onPause && (
          <Button variant="ghost" size="icon" onClick={onPause}>
            {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
          </Button>
        )}
        
        <Button variant="ghost" size="icon" onClick={onHome}>
          <HomeIcon className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onRestart}>
          <ArrowPathIcon className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onHelp}>
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
