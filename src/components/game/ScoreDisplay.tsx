import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, ClockIcon, Cog6ToothIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { HandResult } from '@/types/game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScoreDisplayProps {
  score: number;
  currentHand: HandResult | null;
  className?: string;
}

export function ScoreDisplay({ score, currentHand, className }: ScoreDisplayProps) {
  return (
    <div className={cn('text-center', className)}>
      <motion.div
        key={score}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="text-4xl font-display text-gold text-glow"
      >
        {score.toLocaleString()}
      </motion.div>
      
      <AnimatePresence mode="wait">
        {currentHand && (
          <motion.div
            key={currentHand.hand.name}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="mt-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30"
          >
            <div className="text-lg font-bold text-primary">
              {currentHand.hand.name}
            </div>
            <div className="text-sm text-muted-foreground">
              +{currentHand.totalPoints} points
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ScorePanelProps {
  score: number;
  timeDisplay: string;
  progressLabel: string;
  progressValue: string;
  currentHand?: HandResult | null;
  goalScore?: number;
  level?: number;
  onHome?: () => void;
  onRestart?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}

export function ScorePanel({ 
  score, 
  timeDisplay, 
  progressLabel, 
  progressValue, 
  goalScore,
  level,
  onHome,
  onRestart,
  onPause,
  isPaused
}: ScorePanelProps) {
  const { sfxEnabled, setSfxEnabled, musicEnabled, setMusicEnabled, stopMusic, startMusic } = useAudio();
  const isSoundOn = sfxEnabled || musicEnabled;
  
  const toggleAllSounds = () => {
    if (isSoundOn) {
      setSfxEnabled(false);
      setMusicEnabled(false);
      stopMusic();
    } else {
      setSfxEnabled(true);
      setMusicEnabled(true);
      startMusic();
    }
  };
  
  return (
    <div className="flex items-center justify-center gap-3 p-3">
      {/* Main stats pill */}
      <div className="flex items-center gap-4 bg-card/90 backdrop-blur-sm rounded-full px-5 py-2.5 border-2 border-primary/40">
        {/* Score */}
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-primary" />
          <motion.span
            key={score}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-foreground tabular-nums"
          >
            {goalScore ? `${score}/${goalScore}` : score.toLocaleString()}
          </motion.span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Time */}
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-accent" />
          <span className="text-lg font-mono text-foreground tabular-nums">{timeDisplay}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Level (SSC mode only) */}
        {level !== undefined && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="11" />
            </svg>
            <span className="text-lg font-semibold text-foreground">Lvl {level}</span>
          </div>
        )}

        {/* Progress - cards/hands (Classic & Blitz modes only) */}
        {level === undefined && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="4" rx="1" />
              <rect x="4" y="10" width="16" height="4" rx="1" />
              <rect x="4" y="16" width="16" height="4" rx="1" />
            </svg>
            <span className="text-lg font-semibold text-foreground tabular-nums">{progressValue}</span>
          </div>
        )}
      </div>

      {/* Sound toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-11 h-11 border-2 border-primary/40 bg-card/90 hover:bg-card"
        onClick={toggleAllSounds}
      >
        {isSoundOn ? (
          <SpeakerWaveIcon className="w-5 h-5 text-primary" />
        ) : (
          <SpeakerXMarkIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </Button>

      {/* Settings button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full w-11 h-11 border-2 border-primary/40 bg-card/90 hover:bg-card"
          >
            <Cog6ToothIcon className="w-5 h-5 text-accent" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          {onPause && (
            <DropdownMenuItem onClick={onPause}>
              {isPaused ? 'Resume' : 'Pause'}
            </DropdownMenuItem>
          )}
          {onRestart && (
            <DropdownMenuItem onClick={onRestart}>
              Restart
            </DropdownMenuItem>
          )}
          {onHome && (
            <DropdownMenuItem onClick={onHome}>
              Home
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}