import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, CheckCircle2, Gift } from 'lucide-react';
import type { Achievement, UserAchievement } from '@/hooks/useRetention';

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  userAchievements: UserAchievement[];
}

export function AchievementsPanel({ 
  isOpen, 
  onClose, 
  achievements, 
  userAchievements 
}: AchievementsPanelProps) {
  const isUnlocked = (id: string) => userAchievements.some(ua => ua.achievement_id === id);
  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;

  const categories = ['all', 'games', 'hands', 'streaks', 'special'];
  
  const getFilteredAchievements = (category: string) => {
    if (category === 'all') return achievements;
    return achievements.filter(a => a.category === category);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-display text-xl">Achievements</span>
            <span className="text-sm text-muted-foreground font-normal">
              {unlockedCount}/{totalCount} unlocked
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="hands">Hands</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="special">Special</TabsTrigger>
          </TabsList>

          {categories.map(category => (
            <TabsContent 
              key={category} 
              value={category} 
              className="flex-1 overflow-y-auto mt-4"
            >
              <div className="grid gap-3 pb-4">
                {getFilteredAchievements(category).map((achievement, index) => {
                  const unlocked = isUnlocked(achievement.id);
                  
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border transition-all ${
                        unlocked 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-secondary/30 border-border opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-3xl ${!unlocked && 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{achievement.name}</h4>
                            {unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {achievement.description}
                          </p>
                          {achievement.reward_type && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                              <Gift className="w-3 h-3" />
                              <span>Unlocks: {achievement.reward_id} card back</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Achievement unlock notification
interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.8 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 0.5 }}
              className="text-4xl"
            >
              {achievement.icon}
            </motion.div>
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wider">
                Achievement Unlocked!
              </p>
              <h4 className="font-bold text-lg">{achievement.name}</h4>
              <p className="text-sm text-muted-foreground">{achievement.description}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
