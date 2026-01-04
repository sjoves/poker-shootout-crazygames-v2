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
import { RewardedAd, useRewardedAd } from '@/components/ads/RewardedAd';
import { TutorialModal } from '@/components/tutorial/TutorialModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { StreakDisplay } from '@/components/retention/StreakDisplay';
import { DailyChallenges } from '@/components/retention/DailyChallenges';
import { AchievementsPanel, AchievementNotification } from '@/components/retention/AchievementsPanel';
import { DailyRewardWheel } from '@/components/retention/DailyRewardWheel';
import { StarIcon } from '@heroicons/react/24/solid';
import { Target, Zap, Trophy, Gift, HelpCircle, User, Settings } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPremium, requiresAdForMode, markAdWatchedForMode, openCheckout, loading } = useSubscription();
  const { currentLogo } = useTheme();
  const { user: crazyGamesUser, isAvailable: isCrazyGamesAvailable, showAuthPrompt } = useCrazyGames();
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
  const rewardedAd = useRewardedAd();

  // Use CrazyGames user if available, otherwise fall back to Supabase user
  const displayUsername = crazyGamesUser?.username || profile?.username;
  const displayAvatar = crazyGamesUser?.profilePictureUrl || profile?.avatar_url;
  const isLoggedIn = !!crazyGamesUser || !!user;

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

  const handleModeSelect = (mode: GameMode, phaseOverride?: string) => {
    // Build URL with optional phase override for Classic/Blitz modes
    let url = `/play/${mode}`;
    if (phaseOverride) {
      url += `?phase=${phaseOverride}`;
    }
    
    if (requiresAdForMode(mode)) {
      const modeName = mode.startsWith('blitz') ? 'Blitz Mode' : 'SSC Mode';
      rewardedAd.showAd('mode_unlock', () => {
        markAdWatchedForMode(mode);
        navigate(url);
      }, modeName);
    } else {
      navigate(url);
    }
  };

  const handleSSCStart = (startLevel: number) => {
    if (requiresAdForMode('ssc')) {
      rewardedAd.showAd('mode_unlock', () => {
        markAdWatchedForMode('ssc');
        navigate(`/play/ssc?startLevel=${startLevel}`);
      }, 'SSC Mode');
    } else {
      navigate(`/play/ssc?startLevel=${startLevel}`);
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
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('classic_cb', 'sitting_duck')}>Sitting Duck</Button>
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('classic_cb')}>Carnival Gallery</Button>
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('classic_fc')}>Sky is Falling</Button>
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
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('blitz_cb', 'sitting_duck')}>Sitting Duck</Button>
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('blitz_cb')}>Carnival Gallery</Button>
              <Button variant="secondary" className="w-full" onClick={() => handleModeSelect('blitz_fc')}>Sky is Falling</Button>
            </motion.div>
          )}
        </div>

        {/* SSC Mode */}
        {user && profile?.highest_ssc_level && profile.highest_ssc_level > 1 ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
              onClick={() => setSelectedMode(selectedMode === 'ssc' ? null : 'ssc')}
            >
              <Trophy className="w-5 h-5 text-primary" />
              Sharp Shooter Challenge
              {getModeLabel('ssc')}
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
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground gap-2"
            onClick={() => handleSSCStart(1)}
          >
            <Trophy className="w-5 h-5 text-primary" />
            Sharp Shooter Challenge
            {getModeLabel('ssc')}
          </Button>
        )}

        {/* Daily Challenges - Contains Streak, Reward, and Challenges */}
        {user && (
          <div className="space-y-2">
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
        className="mt-6 flex justify-center gap-3"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-10 h-10" 
          onClick={async () => {
            // On CrazyGames, use their auth prompt
            if (isCrazyGamesAvailable && !crazyGamesUser) {
              await showAuthPrompt();
            } else if (user) {
              navigate('/account');
            } else {
              navigate('/auth');
            }
          }}
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="Profile" className="w-8 h-8 rounded-full" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => navigate('/leaderboard')}>
          <Trophy className="w-5 h-5 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => setShowTutorial(true)}>
          <HelpCircle className="w-5 h-5 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5 text-primary" />
        </Button>
        {!isCrazyGamesAvailable && (
          <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => navigate('/dev-sandbox')}>
            <Zap className="w-5 h-5 text-primary" />
          </Button>
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
