import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, ClockIcon, Cog6ToothIcon, SpeakerWaveIcon, SpeakerXMarkIcon, HandRaisedIcon, HomeIcon, ArrowPathIcon, PauseIcon, PlayIcon, CheckIcon, BoltIcon } from '@heroicons/react/24/outline';
import { RectangleVertical } from 'lucide-react';
import { HandResult } from '@/types/game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  isBonusRound?: boolean;
  isUrgent?: boolean;
  inFinalStretch?: boolean;
  onHome?: () => void;
  onRestart?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  gameMode?: 'classic' | 'blitz' | 'ssc';
}

export function ScorePanel({ 
  score, 
  timeDisplay, 
  progressLabel, 
  progressValue, 
  goalScore,
  level,
  isBonusRound,
  isUrgent,
  inFinalStretch,
  onHome,
  onRestart,
  onPause,
  isPaused,
  gameMode = 'classic'
}: ScorePanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Track if user manually paused while in settings - prevents auto-resume on close
  const [manuallyPausedInSettings, setManuallyPausedInSettings] = useState(false);
  const { theme, setTheme, themes } = useTheme();
  const { isMuted, toggleMute, playSound } = useAudio();

  const handleOpenSettings = () => {
    setManuallyPausedInSettings(false); // Reset on open
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = (open: boolean) => {
    if (!open) {
      setIsSettingsOpen(false);
      // Only auto-resume if user didn't manually pause while in settings
      // and the game is currently paused
      if (!manuallyPausedInSettings && isPaused) {
        onPause?.(); // Toggle pause to resume
      }
      setManuallyPausedInSettings(false);
    }
  };

  const handlePauseToggle = () => {
    onPause?.();
    // If user is pausing (game was not paused), mark that they manually paused
    if (!isPaused) {
      setManuallyPausedInSettings(true);
    } else {
      // If user is resuming, clear the manual pause flag
      setManuallyPausedInSettings(false);
    }
  };

  const handleRestart = () => {
    setIsSettingsOpen(false);
    setManuallyPausedInSettings(false);
    onRestart?.();
  };

  const handleHome = () => {
    setIsSettingsOpen(false);
    onHome?.();
  };
  
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {/* Main stats pill - relative for overlay positioning */}
        <div className="relative flex items-center gap-4 bg-transparent rounded-full px-5 py-2.5 border border-primary">
          {/* Bonus x2 Overlay - shows for 1s then fades over 1s */}
          <AnimatePresence>
            {inFinalStretch && (
              <motion.div
                key="bonus-overlay"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1.05, 1, 1]
                }}
                transition={{ 
                  duration: 2,
                  times: [0, 0.15, 0.5, 1],
                  ease: 'easeOut'
                }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-full pointer-events-none overflow-hidden"
              >
                <motion.div 
                  animate={{ 
                    filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                  }}
                  transition={{ duration: 0.3, repeat: 4, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center gap-2 bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.25, repeat: 5, ease: 'easeInOut' }}
                  >
                    <BoltIcon className="w-5 h-5 text-primary-foreground" />
                  </motion.div>
                  <span className="text-lg font-bold text-primary-foreground whitespace-nowrap">
                    BONUS x2
                  </span>
                  <motion.div
                    animate={{ rotate: [0, -15, 15, 0] }}
                    transition={{ duration: 0.25, repeat: 5, ease: 'easeInOut' }}
                  >
                    <BoltIcon className="w-5 h-5 text-primary-foreground" />
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Score */}
          <div className="flex items-center gap-2 min-w-[5.5rem]">
            <TrophyIcon className="w-5 h-5 text-primary flex-shrink-0" />
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
          <motion.div 
            className="flex items-center gap-2"
            animate={isUrgent ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={isUrgent ? { 
              duration: 0.5, 
              repeat: Infinity,
              ease: 'easeInOut'
            } : {}}
          >
            <ClockIcon className={cn("w-5 h-5", isUrgent ? "text-destructive" : "text-accent")} />
            <span className={cn(
              "text-lg font-mono tabular-nums",
              isUrgent ? "text-destructive font-bold" : "text-foreground"
            )}>
              {timeDisplay}
            </span>
          </motion.div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Level or Bonus Round indicator */}
          {isBonusRound ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wide whitespace-nowrap">BONUS</span>
            </div>
          ) : level !== undefined && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-accent bg-transparent">
              <span className="text-lg font-bold text-accent">{level}</span>
            </div>
          )}

          {/* Progress - cards/hands (Classic & Blitz modes only, hidden during bonus round) */}
          {level === undefined && !isBonusRound && (
            <div className="flex items-center gap-2">
              {gameMode === 'blitz' ? (
                <HandRaisedIcon className="w-5 h-5 text-accent" />
              ) : (
                <RectangleVertical className="w-5 h-5 text-accent" />
              )}
              <span className="text-lg font-semibold text-foreground tabular-nums">{progressValue}</span>
            </div>
          )}
        </div>

        {/* Mute/Unmute button */}
        <Button 
          variant="outline" 
          size="icon" 
          className="w-11 h-11 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
          onClick={toggleMute}
        >
          {isMuted ? (
            <SpeakerXMarkIcon className="w-5 h-5 text-destructive" />
          ) : (
            <SpeakerWaveIcon className="w-5 h-5 text-primary" />
          )}
        </Button>

        {/* Settings button */}
        <Button 
          variant="outline" 
          size="icon" 
          className="w-11 h-11 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
          onClick={handleOpenSettings}
        >
          <Cog6ToothIcon className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={handleSettingsClose}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              {onPause && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-primary"
                  onClick={handlePauseToggle}
                >
                  {isPaused ? (
                    <>
                      <PlayIcon className="w-5 h-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-5 h-5" />
                      Pause
                    </>
                  )}
                </Button>
              )}
              {onRestart && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-primary"
                  onClick={handleRestart}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Restart
                </Button>
              )}
              {onHome && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-primary"
                  onClick={handleHome}
                >
                  <HomeIcon className="w-5 h-5" />
                  Home
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Audio and Theme side by side */}
            <div>
              {/* Theme Selection */}
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Theme</h3>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      playSound('buttonClick');
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1 py-2 px-3 rounded-lg border transition-all text-sm",
                      theme === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/50 hover:bg-secondary"
                    )}
                  >
                    <span className="font-medium text-foreground">{t.name}</span>
                    {theme === t.id && (
                      <CheckIcon className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}