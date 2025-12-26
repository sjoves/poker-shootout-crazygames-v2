import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, compact = false }: StreakDisplayProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-3 py-1"
      >
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="font-bold text-orange-400">{currentStreak}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Flame className="w-10 h-10 text-orange-400" />
          </motion.div>
          {currentStreak >= 7 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            >
              🔥
            </motion.div>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Daily Streak</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-orange-400">{currentStreak}</span>
            <span className="text-sm text-muted-foreground">day{currentStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      
      {longestStreak > currentStreak && (
        <p className="text-xs text-muted-foreground mt-2">
          Best: {longestStreak} days
        </p>
      )}

      {/* Streak milestone indicators */}
      <div className="flex gap-1 mt-3">
        {[3, 7, 14, 30].map((milestone) => (
          <div
            key={milestone}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              currentStreak >= milestone 
                ? 'bg-gradient-to-r from-orange-400 to-red-500' 
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>3</span>
        <span>7</span>
        <span>14</span>
        <span>30</span>
      </div>
    </motion.div>
  );
}
