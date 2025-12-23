import { motion, AnimatePresence } from 'framer-motion';
import { HandResult } from '@/types/game';
import { cn } from '@/lib/utils';

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
}

export function ScorePanel({ score, timeDisplay, progressLabel, progressValue, goalScore }: ScorePanelProps) {
  return (
    <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border">
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Score</div>
        <motion.div
          key={score}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-2xl font-display text-gold"
        >
          {goalScore ? `${score.toLocaleString()}/${goalScore.toLocaleString()}` : score.toLocaleString()}
        </motion.div>
      </div>
      
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Time</div>
        <div className="text-2xl font-mono text-foreground">{timeDisplay}</div>
      </div>
      
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{progressLabel}</div>
        <div className="text-2xl font-bold text-foreground">{progressValue}</div>
      </div>
    </div>
  );
}
