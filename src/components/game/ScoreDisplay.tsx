import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, ClockIcon, Cog6ToothIcon, SpeakerWaveIcon, SpeakerXMarkIcon, HandRaisedIcon, MusicalNoteIcon, HomeIcon, ArrowPathIcon, PauseIcon, PlayIcon, CheckIcon } from '@heroicons/react/24/outline';
import { RectangleVertical } from 'lucide-react';
import { HandResult } from '@/types/game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

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
  onHome,
  onRestart,
  onPause,
  isPaused,
  gameMode = 'classic'
}: ScorePanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, setTheme, themes } = useTheme();
  const {
    masterVolume,
    sfxEnabled,
    sfxVolume,
    musicEnabled,
    musicVolume,
    setMasterVolume,
    setSfxEnabled,
    setSfxVolume,
    setMusicEnabled,
    setMusicVolume,
    playSound,
  } = useAudio();

  const handleSfxToggle = (enabled: boolean) => {
    setSfxEnabled(enabled);
    if (enabled) {
      setTimeout(() => playSound('buttonClick'), 50);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handlePause = () => {
    handleSettingsClose();
    onPause?.();
  };

  const handleRestart = () => {
    handleSettingsClose();
    onRestart?.();
  };

  const handleHome = () => {
    handleSettingsClose();
    onHome?.();
  };
  
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {/* Main stats pill */}
        <div className="flex items-center gap-4 bg-transparent rounded-full px-5 py-2.5 border border-primary">
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
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wide whitespace-nowrap">BONUS ROUND</span>
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

        {/* Settings button only (audio button removed) */}
        <Button 
          variant="outline" 
          size="icon" 
          className="w-11 h-11 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Cog6ToothIcon className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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
                  onClick={handlePause}
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
            <div className="grid grid-cols-2 gap-6">
              {/* Audio Settings */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Audio</h3>
                
                {/* Master Volume */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {masterVolume > 0 ? (
                        <SpeakerWaveIcon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <SpeakerXMarkIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">Master</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(masterVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[masterVolume * 100]}
                    onValueChange={([value]) => setMasterVolume(value / 100)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Sound Effects */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SpeakerWaveIcon className={cn("w-4 h-4", sfxEnabled ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-medium">SFX</span>
                    </div>
                    <Switch
                      checked={sfxEnabled}
                      onCheckedChange={handleSfxToggle}
                    />
                  </div>
                  {sfxEnabled && (
                    <Slider
                      value={[sfxVolume * 100]}
                      onValueChange={([value]) => setSfxVolume(value / 100)}
                      onValueCommit={() => playSound('buttonClick')}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  )}
                </div>

                {/* Music */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MusicalNoteIcon className={cn("w-4 h-4", musicEnabled ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-medium">Music</span>
                    </div>
                    <Switch
                      checked={musicEnabled}
                      onCheckedChange={setMusicEnabled}
                    />
                  </div>
                  {musicEnabled && (
                    <Slider
                      value={[musicVolume * 100]}
                      onValueChange={([value]) => setMusicVolume(value / 100)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  )}
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Theme</h3>
                <div className="grid grid-cols-1 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        playSound('buttonClick');
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded-lg border transition-all",
                        theme === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <p className="font-medium text-sm text-foreground">{t.name}</p>
                      {theme === t.id && (
                        <CheckIcon className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}