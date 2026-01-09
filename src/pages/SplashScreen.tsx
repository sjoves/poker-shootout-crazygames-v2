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
import { StarIcon, UserIcon } from '@heroicons/react/24/solid';
import { Target, Zap, Trophy, Gift, Settings, HelpCircle, LogIn } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPremium, loading } = useSubscription();
  const { currentLogo } = useTheme();
  const { user: crazyGamesUser, loadingStop, isAvailable: isCrazyGamesAvailable, isUserLoggedIn: isCrazyGamesLoggedIn, showAuthPrompt } = useCrazyGames();
  const { unlockAudio } = useAudio();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  // Handle CrazyGames login button click
  const handleCrazyGamesLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await showAuthPrompt();
    } catch (err) {
      console.log('CrazyGames login prompt failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6 overflow-y-auto relative">
      {/* CrazyGames Login Button - Top Right Corner (non-intrusive) */}
      {isCrazyGamesAvailable && !isCrazyGamesLoggedIn && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-4 right-4 z-10"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCrazyGamesLogin}
            disabled={isLoggingIn}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/10 border border-primary/20"
          >
            <LogIn className="w-4 h-4" />
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </Button>
        </motion.div>
      )}
      
      {/* Show logged-in CrazyGames user avatar in top right */}
      {isCrazyGamesAvailable && isCrazyGamesLoggedIn && crazyGamesUser && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5 border border-primary/20"
        >
          {crazyGamesUser.profilePictureUrl ? (
            <img 
              src={crazyGamesUser.profilePictureUrl} 
              alt={crazyGamesUser.username} 
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <UserIcon className="w-5 h-5 text-primary" />
          )}
          <span className="text-sm text-foreground font-medium">{crazyGamesUser.username}</span>
        </motion.div>
      )}
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
        className="text-center mb-6 md:-mt-5"
      >
        <img src={currentLogo} alt="Poker Shootout" className="w-[22rem] md:w-[19rem] mx-auto mb-4" />
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

      {/* Game Mode Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 w-full max-w-4xl"
      >
        {/* Main Game Mode Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </Button>
            {selectedMode === 'classic' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_cb', 'sitting_duck')}>Sitting Duck</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_cb')}>Carnival Gallery</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('classic_fc')}>Sky is Falling</Button>
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
            </Button>
            {selectedMode === 'blitz' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_cb', 'sitting_duck')}>Sitting Duck</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_cb')}>Carnival Gallery</Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleModeSelect('blitz_fc')}>Sky is Falling</Button>
              </motion.div>
            )}
          </div>

          {/* SSC Mode */}
          <div className="space-y-2">
            {user && profile?.highest_ssc_level && profile.highest_ssc_level > 1 ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                  onClick={() => setSelectedMode(selectedMode === 'ssc' ? null : 'ssc')}
                >
                  <Trophy className="w-5 h-5 text-primary" />
                  Sharp Shooter Challenge
                </Button>
                {selectedMode === 'ssc' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => handleSSCStart(1)}>
                      Start Level 1
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => handleSSCStart(profile.highest_ssc_level)}>
                      Continue Lv.{profile.highest_ssc_level}
                    </Button>
                  </motion.div>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
                onClick={() => handleSSCStart(1)}
              >
                <Trophy className="w-5 h-5 text-primary" />
                Sharp Shooter Challenge
              </Button>
            )}
          </div>
        </div>

        {/* Settings & Tutorial Buttons - Centered below game modes */}
        <div className="flex justify-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground" 
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground" 
            onClick={() => setShowTutorial(true)}
          >
            <HelpCircle className="w-5 h-5 text-primary" />
            Tutorial
          </Button>
        </div>

        {/* Daily Challenges - Contains Streak, Reward, and Challenges */}
        {user && (
          <div className="space-y-2 max-w-md mx-auto w-full">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
              onClick={() => setShowChallenges(!showChallenges)}
            >
              <Target className="w-5 h-5 text-primary" />
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
        timeUntilNext={getTimeUntilNextReward()}
      />
    </div>
  );
}
