import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameMode } from '@/types/game';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useRetention } from '@/hooks/useRetention';
import { RewardedAd, useRewardedAd } from '@/components/ads/RewardedAd';
import { TutorialModal } from '@/components/tutorial/TutorialModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { StreakDisplay } from '@/components/retention/StreakDisplay';
import { DailyChallenges } from '@/components/retention/DailyChallenges';
import { AchievementsPanel, AchievementNotification } from '@/components/retention/AchievementsPanel';
import { DailyRewardWheel } from '@/components/retention/DailyRewardWheel';
import { StarIcon } from '@heroicons/react/24/solid';
import { Target, Zap, Trophy, Gift, Award } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, requiresAdForMode, markAdWatchedForMode, openCheckout, loading } = useSubscription();
  const { currentLogo } = useTheme();
  const {
    streak,
    achievements,
    userAchievements,
    challenges,
    newAchievements,
    clearNewAchievements,
    getChallengeInfo,
    canClaimReward,
    claimDailyReward,
    todayReward,
  } = useRetention();

  const [selectedMode, setSelectedMode] = useState<'classic' | 'blitz' | 'ssc' | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const rewardedAd = useRewardedAd();

  // Show daily reward prompt for logged in users
  useEffect(() => {
    if (user && canClaimReward) {
      const timer = setTimeout(() => setShowRewardWheel(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, canClaimReward]);

  const handleModeSelect = (mode: GameMode) => {
    if (requiresAdForMode(mode)) {
      const modeName = mode.startsWith('blitz') ? 'Blitz Mode' : 'SSC Mode';
      rewardedAd.showAd('mode_unlock', () => {
        markAdWatchedForMode(mode);
        navigate(`/play/${mode}`);
      }, modeName);
    } else {
      navigate(`/play/${mode}`);
    }
  };

  const getModeLabel = (mode: string) => {
    if (isPremium) return null;
    if (mode.startsWith('classic')) return null;
    return (
      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
        Watch Ad
      </span>
    );
  };

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6 overflow-y-auto">
      {/* Achievement notification */}
      {newAchievements.length > 0 && (
        <AchievementNotification 
          achievement={newAchievements[0]} 
          onClose={clearNewAchievements} 
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <img src={currentLogo} alt="Poker Shootout" className="w-[22rem] md:w-[26.4rem] mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">
          Collect cards. Build hands. Beat the clock.
        </p>
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium"
          >
            <StarIcon className="w-4 h-4" />
            Premium Member
          </motion.div>
        )}
      </motion.div>

      {/* Streak & Daily Reward Row */}
      {user && streak && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mb-4 flex gap-3"
        >
          <div className="flex-1">
            <StreakDisplay 
              currentStreak={streak.current_streak} 
              longestStreak={streak.longest_streak} 
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="h-auto border-primary/30 bg-primary/10 hover:bg-primary/20"
            onClick={() => setShowRewardWheel(true)}
          >
            <Gift className={`w-6 h-6 ${canClaimReward ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          </Button>
        </motion.div>
      )}

      {/* Daily Challenges */}
      {user && challenges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md mb-4"
        >
          <DailyChallenges challenges={challenges} getChallengeInfo={getChallengeInfo} />
        </motion.div>
      )}

      {/* Game Mode Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        {/* Classic Mode */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
            onClick={() => setSelectedMode(selectedMode === 'classic' ? null : 'classic')}
          >
            <Target className="w-5 h-5 text-primary" />
            Classic Mode
            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Free</span>
          </Button>
          {selectedMode === 'classic' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_fc')}>Falling Cards</Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_cb')}>Conveyor Belt</Button>
            </motion.div>
          )}
        </div>

        {/* Blitz Mode */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
            onClick={() => setSelectedMode(selectedMode === 'blitz' ? null : 'blitz')}
          >
            <Zap className="w-5 h-5 text-primary" />
            52-Card Blitz
            {getModeLabel('blitz')}
          </Button>
          {selectedMode === 'blitz' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('blitz_fc')}>Falling Cards</Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('blitz_cb')}>Conveyor Belt</Button>
            </motion.div>
          )}
        </div>

        {/* SSC Mode */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
          onClick={() => handleModeSelect('ssc')}
        >
          <Trophy className="w-5 h-5 text-primary" />
          Sharp Shooter Challenge
          {getModeLabel('ssc')}
        </Button>

        {/* Premium Upsell */}
        {!isPremium && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <StarIcon className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Buy Full Game</h3>
                <p className="text-sm text-muted-foreground">Unlock all modes, ad-free forever</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => { !user ? navigate('/auth') : await openCheckout(); }}
              className="w-full border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
              size="lg"
            >
              <StarIcon className="w-4 h-4 mr-2" />
              {user ? 'Buy for $4.99' : 'Sign in to Purchase'}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom Nav */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        <Button variant="ghost" size="sm" onClick={() => setShowTutorial(true)}>❓ How to Play</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')}>🏅 Leaderboard</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAchievements(true)}>
          <Award className="w-4 h-4 mr-1" /> Achievements
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(user ? '/account' : '/auth')}>{user ? '👤 Account' : '👤 Sign In'}</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>⚙️ Settings</Button>
      </motion.div>

      {/* Modals */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <AchievementsPanel 
        isOpen={showAchievements} 
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
        userAchievements={userAchievements}
      />
      <DailyRewardWheel
        isOpen={showRewardWheel}
        onClose={() => setShowRewardWheel(false)}
        canClaim={canClaimReward}
        onClaim={claimDailyReward}
        todayReward={todayReward}
      />
      <RewardedAd
        isOpen={rewardedAd.isOpen}
        onClose={rewardedAd.hideAd}
        onAdComplete={rewardedAd.onComplete}
        adType={rewardedAd.adType}
        modeName={rewardedAd.modeName}
      />
    </div>
  );
}
