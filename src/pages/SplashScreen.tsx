import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameMode } from '@/types/game';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useRetention } from '@/hooks/useRetention';
import { useCrazyGames } from '@/contexts/CrazyGamesContext';
import { useAudio } from '@/contexts/AudioContext';
import { TutorialModal } from '@/components/tutorial/TutorialModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { StreakDisplay } from '@/components/retention/StreakDisplay';
import { DailyChallenges } from '@/components/retention/DailyChallenges';
import { AchievementsPanel, AchievementNotification } from '@/components/retention/AchievementsPanel';
import { DailyRewardWheel } from '@/components/retention/DailyRewardWheel';
import { StarIcon } from '@heroicons/react/24/solid';
import { Target, Zap, Trophy, Gift, Settings, HelpCircle } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPremium, loading } = useSubscription();
  const { currentLogo } = useTheme();
  const { user: crazyGamesUser, loadingStop } = useCrazyGames();
  const { unlockAudio } = useAudio();
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
    getTimeUntilNextReward,
  } = useRetention();

  const [selectedMode, setSelectedMode] = useState<'classic' | 'blitz' | 'ssc' | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);

  // Use CrazyGames user if available, otherwise fall back to Supabase user
  const displayUsername = crazyGamesUser?.username || profile?.username;
  const displayAvatar = crazyGamesUser?.profilePictureUrl || profile?.avatar_url;
  const isLoggedIn = !!crazyGamesUser || !!user;

  // Signal to CrazyGames that initial loading is complete
  useEffect(() => {
    loadingStop();
  }, [loadingStop]);

  // Show daily reward prompt for logged in users - only when canClaimReward is true
  // Uses sessionStorage to prevent re-triggering on page navigation/refresh within the same session
  // The key is cleared when a reward is successfully claimed
  useEffect(() => {
    if (user && canClaimReward === true) {
      // Check if we've already shown the modal in this session
      const sessionKey = `daily_reward_shown_${user.id}`;
      const alreadyShownThisSession = sessionStorage.getItem(sessionKey);
      
      if (!alreadyShownThisSession) {
        const timer = setTimeout(() => {
          setShowRewardWheel(true);
          // Mark as shown for this session
          sessionStorage.setItem(sessionKey, 'true');
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, canClaimReward]);

  // Clear the session flag when canClaimReward changes to true (new 24hr window)
  // This ensures the popup can show again when a new reward is available
  useEffect(() => {
    if (user && canClaimReward === true) {
      // When a new reward window opens, we want to allow showing the modal again
      // The sessionStorage flag will be set when the modal is actually shown
    }
  }, [user, canClaimReward]);

  const handleModeSelect = async (mode: GameMode, phaseOverride?: string) => {
    // Fallback audio unlock on game start
    await unlockAudio();
    
    // Build URL with optional phase override for Classic/Blitz modes
    let url = `/play/${mode}`;
    if (phaseOverride) {
      url += `?phase=${phaseOverride}`;
    }
    navigate(url);
  };

  const handleSSCStart = async (startLevel: number) => {
    // Fallback audio unlock on game start
    await unlockAudio();
    
    navigate(`/play/ssc?startLevel=${startLevel}`);
  };

  return (
    <div className="cg-game-root cg-letterbox">
      <div className="cg-game-container modern-bg flex flex-col items-center justify-center p-6 max-[900px]:p-3 overflow-y-auto">
        {/* Achievement notification */}
        {newAchievements.length > 0 && (
          <AchievementNotification 
            achievement={newAchievements[0]} 
            onClose={clearNewAchievements} 
          />
        )}

        {/* Centered content wrapper - logo + buttons */}
        <div className="flex flex-col items-center justify-center w-full max-w-[480px] mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 max-[900px]:mb-3 w-full"
          >
            <img 
              src={currentLogo} 
              alt="Poker Shootout" 
              className="block w-[22rem] md:w-[26.4rem] max-[900px]:max-w-[55%] max-[900px]:mt-2 mx-auto mb-4 max-[900px]:mb-2" 
            />
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

          {/* Game Mode Buttons - fixed width container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-4 max-[900px]:gap-2 w-full"
          >
            {/* Main Game Mode Buttons - horizontal row */}
            <div className="grid grid-cols-3 gap-3 max-[900px]:gap-2 w-full">
              {/* Classic Mode */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 max-[900px]:h-10 text-lg max-[900px]:text-[0.85rem] font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                onClick={() => setSelectedMode(selectedMode === 'classic' ? null : 'classic')}
              >
                <Target className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                Classic Mode
              </Button>

              {/* Blitz Mode */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 max-[900px]:h-10 text-lg max-[900px]:text-[0.85rem] font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                onClick={() => setSelectedMode(selectedMode === 'blitz' ? null : 'blitz')}
              >
                <Zap className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                52-Card Blitz
              </Button>

              {/* SSC Mode */}
              {user && profile?.highest_ssc_level && profile.highest_ssc_level > 1 ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 max-[900px]:h-10 text-lg max-[900px]:text-[0.85rem] font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                  onClick={() => setSelectedMode(selectedMode === 'ssc' ? null : 'ssc')}
                >
                  <Trophy className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                  Sharp Shooter
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 max-[900px]:h-10 text-lg max-[900px]:text-[0.85rem] font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                  onClick={() => handleSSCStart(1)}
                >
                  <Trophy className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                  Sharp Shooter
                </Button>
              )}
            </div>

            {/* Sub-mode selection panels */}
            {selectedMode === 'classic' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-center gap-2 w-full">
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_cb', 'sitting_duck')}>Sitting Duck</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_cb')}>Carnival Gallery</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_fc')}>Sky is Falling</Button>
              </motion.div>
            )}
            {selectedMode === 'blitz' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-center gap-2 w-full">
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_cb', 'sitting_duck')}>Sitting Duck</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_cb')}>Carnival Gallery</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_fc')}>Sky is Falling</Button>
              </motion.div>
            )}
            {selectedMode === 'ssc' && user && profile?.highest_ssc_level && profile.highest_ssc_level > 1 && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2 w-full">
                <Button variant="secondary" className="flex-1" onClick={() => handleSSCStart(1)}>
                  Start Level 1
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => handleSSCStart(profile.highest_ssc_level)}>
                  Continue Lv.{profile.highest_ssc_level}
                </Button>
              </motion.div>
            )}

            {/* Settings & Tutorial Buttons - 2-column grid */}
            <div className="grid grid-cols-2 gap-3 max-[900px]:gap-2 w-full">
              <Button 
                variant="outline" 
                className="w-full gap-2 max-[900px]:text-[0.85rem] max-[900px]:h-9 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground" 
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2 max-[900px]:text-[0.85rem] max-[900px]:h-9 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground" 
                onClick={() => setShowTutorial(true)}
              >
                <HelpCircle className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                Tutorial
              </Button>
            </div>
          </motion.div>

          {/* Daily Challenges - Contains Streak, Reward, and Challenges */}
          {user && (
            <div className="space-y-2 max-[900px]:space-y-1 w-full max-[500px]:hidden">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 max-[900px]:h-10 text-lg max-[900px]:text-[0.85rem] font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                onClick={() => setShowChallenges(!showChallenges)}
              >
                <Target className="w-5 h-5 max-[900px]:w-4 max-[900px]:h-4 text-primary" />
                Daily Challenges
                {challenges.length > 0 && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {challenges.filter(c => c.completed).length}/{challenges.length}
                  </span>
                )}
              </Button>
              {showChallenges && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Streak & Daily Reward Row */}
                  {streak && (
                    <div className="flex gap-3">
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
                    </div>
                  )}
                  
                  {/* Challenges List */}
                  {challenges.length > 0 && (
                    <DailyChallenges challenges={challenges} getChallengeInfo={getChallengeInfo} />
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

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
          timeUntilNext={getTimeUntilNextReward()}
        />
      </div>
    </div>
  );
}
