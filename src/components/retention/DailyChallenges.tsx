import { motion } from 'framer-motion';
import { CheckCircle, Circle, Target, Zap, Trophy, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { DailyChallenge } from '@/hooks/useRetention';

interface DailyChallengesProps {
  challenges: DailyChallenge[];
  getChallengeInfo: (type: string) => { name: string; description: string };
}

const challengeIcons: Record<string, React.ReactNode> = {
  play_games: <Target className="w-5 h-5" />,
  make_flush: <Sparkles className="w-5 h-5" />,
  make_straight: <Zap className="w-5 h-5" />,
  score_target: <Trophy className="w-5 h-5" />,
  make_full_house: <Sparkles className="w-5 h-5" />,
};

export function DailyChallenges({ challenges, getChallengeInfo }: DailyChallengesProps) {
  const completedCount = challenges.filter(c => c.completed).length;
  const allCompleted = completedCount === challenges.length && challenges.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Daily Challenges</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {completedCount}/{challenges.length}
        </div>
      </div>

      {allCompleted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-primary/20 border border-primary/30 rounded-lg p-3 mb-4 text-center"
        >
          <span className="text-primary font-medium">🎉 All challenges complete!</span>
        </motion.div>
      )}

      <div className="space-y-3">
        {challenges.map((challenge, index) => {
          const info = getChallengeInfo(challenge.challenge_type);
          const progress = Math.min((challenge.current_value / challenge.target_value) * 100, 100);

          return (
            <motion.div
              key={challenge.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border transition-colors ${
                challenge.completed 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-secondary/50 border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  challenge.completed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {challengeIcons[challenge.challenge_type] || <Target className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{info.name}</span>
                    {challenge.completed ? (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                  
                  <div className="mt-2">
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {challenge.current_value} / {challenge.target_value}
                      </span>
                      {!challenge.completed && (
                        <span className="text-xs text-primary">
                          +100 pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
