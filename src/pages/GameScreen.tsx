import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/hooks/useAuth';
import { useCrazyGames } from '@/contexts/CrazyGamesContext';
import { supabase } from '@/integrations/supabase/client';
import { ScorePanel } from '@/components/game/ScoreDisplay';
import { HandDisplay } from '@/components/game/HandDisplay';
import { FallingCards } from '@/components/game/FallingCards';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { StaticGrid } from '@/components/game/StaticGrid';
import { OrbitCards } from '@/components/game/OrbitCards';
import { PowerUpBar } from '@/components/game/PowerUpBar';
import { PowerUpSelection } from '@/components/game/PowerUpSelection';
import { BonusRound } from '@/components/game/BonusRound';
import { LevelCompleteModal } from '@/components/game/LevelCompleteModal';
import { LootBoxReveal } from '@/components/game/LootBoxReveal';

import { GameMode } from '@/types/game';
import { getSSCSpeed } from '@/lib/pokerEngine';
import { BoltIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';


export default function GameScreen() {
  const { mode } = useParams<{ mode: GameMode }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    state, 
    startGame, 
    selectCard, 
    submitBonusHand, 
    skipBonusRound, 
    selectPowerUp,
    dismissPowerUpSelection,
    usePowerUp, 
    pauseGame,
    setPaused,
    resetGame, 
    nextLevel,
    startBonusRound,
    markExplainerSeen,
    claimReward,
    swapPowerUp,
    discardReward,
    getHandResults,
  } = useGameState();
  const { playSound, startMusic, stopMusic, isMusicLoading } = useAudio();
  const isMobile = useIsMobile();
  const isSSC = state.mode === 'ssc';
  const baseSpeed = isMobile ? 0.6 : 1;
  const sscSpeed = isSSC ? getSSCSpeed(state.sscLevel) : 1;
  
  const [isMuted, setIsMuted] = useState(false);
  const [showUsedCards, setShowUsedCards] = useState(false);
  const [bonusIntroActive, setBonusIntroActive] = useState(false);
  const [isLoadingMusic, setIsLoadingMusic] = useState(true);
  const [introPhase, setIntroPhase] = useState<'loading' | 'ready' | 'begin' | 'playing'>('loading');
  const prevHandsPlayed = useRef(state.handsPlayed);
  const gameInitializedRef = useRef(false);
  const didStartGameRef = useRef(false);
  const didForceUnpauseRef = useRef(false);

  const isTestBonus = searchParams.get('testBonus') === 'true';
  const startLevelParam = searchParams.get('startLevel');
  const startLevel = startLevelParam ? parseInt(startLevelParam, 10) : undefined;
  const phaseOverride = searchParams.get('phase') as 'sitting_duck' | 'conveyor' | 'falling' | null;

  const { user } = useAuth();
  const { gameplayStart, gameplayStop, happytime, showMidgameAd } = useCrazyGames();
  const lastTrackedChallengeHandRef = useRef<string | null>(null);

  // Hand Detection Event Hook: update daily challenge progress immediately on each submitted hand
  useEffect(() => {
    if (!user) return;
    if (!state.currentHand) return;

    const handName = state.currentHand.hand.name;
    const challengeType = handName === 'Straight'
      ? 'make_straight'
      : handName === 'Full House'
        ? 'make_full_house'
        : null;

    if (!challengeType) return;

    const dedupeKey = `${state.handsPlayed}-${handName}-${state.currentHand.totalPoints}`;
    if (lastTrackedChallengeHandRef.current === dedupeKey) return;
    lastTrackedChallengeHandRef.current = dedupeKey;

    const today = new Date().toISOString().split('T')[0];

    (async () => {
      const { data: challenge, error } = await supabase
        .from('daily_challenges')
        .select('id, current_value, target_value, completed')
        .eq('user_id', user.id)
        .eq('challenge_date', today)
        .eq('challenge_type', challengeType)
        .maybeSingle();

      if (error || !challenge || challenge.completed) return;

      const currentValue = typeof challenge.current_value === 'number' ? challenge.current_value : 0;
      const targetValue = typeof challenge.target_value === 'number' ? challenge.target_value : 1;
      const newValue = Math.min(currentValue + 1, targetValue);
      const completed = newValue >= targetValue;

      await supabase
        .from('daily_challenges')
        .update({ current_value: newValue, completed })
        .eq('id', challenge.id);
    })();
  }, [user, state.currentHand, state.handsPlayed]);

  // Start background music first, then show intro sequence
  useEffect(() => {
    if (gameInitializedRef.current) return;

    const initGame = async () => {
      console.log('Game init effect:', { mode, isTestBonus, startLevel });
      setIsLoadingMusic(true);
      setIntroPhase('loading');

      // Wait for music to load with a timeout to prevent hanging
      try {
        await Promise.race([
          startMusic(),
          new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]);
      } catch (err) {
        console.log('Music failed to start, continuing anyway:', err);
      }

      setIsLoadingMusic(false);

      // Pre-start the game (populate deck) but keep it paused until intro completes
      if (!didStartGameRef.current) {
        try {
          if (isTestBonus) {
            didStartGameRef.current = true;
            startGame('ssc', true);
            setPaused(true);
          } else if (mode) {
            didStartGameRef.current = true;
            startGame(mode as GameMode, false, startLevel ?? 1, phaseOverride || undefined);
            setPaused(true);
          }
        } catch (e) {
          didStartGameRef.current = false;
          console.error('Failed to pre-start game:', e);
        }
      }

      // Start intro sequence
      setIntroPhase('ready');

      gameInitializedRef.current = true;
    };

    initGame();

    // Stop music when component unmounts
    return () => {
      stopMusic();
    };
  }, [mode, isTestBonus, startLevel, phaseOverride, startGame, setPaused, startMusic, stopMusic]);


  // Intro sequence: Ready -> Begin -> Playing
  useEffect(() => {
    if (introPhase === 'loading' || isLoadingMusic) return;

    if (introPhase === 'ready') {
      const timer = setTimeout(() => setIntroPhase('begin'), 1200);
      return () => clearTimeout(timer);
    }

    if (introPhase === 'begin') {
      const timer = setTimeout(() => {
        setIntroPhase('playing');
        gameplayStart();
        // Unpause now that gameplay is visible
        setPaused(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [introPhase, isLoadingMusic, gameplayStart, setPaused]);

  // Failsafe: if we reach the playing phase but game state didn't start, start it once.
  useEffect(() => {
    if (introPhase !== 'playing') return;
    if (state.isPlaying) return;

    try {
      if (isTestBonus) {
        didStartGameRef.current = true;
        startGame('ssc', true);
      } else if (mode) {
        didStartGameRef.current = true;
        startGame(mode as GameMode, false, startLevel ?? 1, phaseOverride || undefined);
      }
    } catch (e) {
      didStartGameRef.current = false;
      console.error('Failed to start game (failsafe):', e);
    }
  }, [introPhase, state.isPlaying, isTestBonus, mode, startLevel, phaseOverride, startGame]);

  // Failsafe: prevent getting stuck paused after intro (would freeze timer + animations)
  useEffect(() => {
    if (introPhase !== 'playing') return;
    if (!state.isPlaying || state.isGameOver || state.isLevelComplete) return;
    if (!state.isPaused) return;
    if (didForceUnpauseRef.current) return;

    didForceUnpauseRef.current = true;
    setPaused(false);
  }, [introPhase, state.isPlaying, state.isGameOver, state.isLevelComplete, state.isPaused, setPaused]);

  // Signal CrazyGames when gameplay stops (game over or level complete)
  useEffect(() => {
    if (state.isGameOver || state.isLevelComplete) {
      gameplayStop();
    }
  }, [state.isGameOver, state.isLevelComplete, gameplayStop]);

  // Trigger happytime on high-value hands (achievement moment)
  useEffect(() => {
    if (state.currentHand && state.currentHand.totalPoints >= 200) {
      happytime();
    }
  }, [state.currentHand, happytime]);

  // Play sound when hand is submitted
  useEffect(() => {
    if (state.handsPlayed > prevHandsPlayed.current) {
      playSound('handSubmit');
      if (state.currentHand && state.currentHand.totalPoints >= 100) {
        setTimeout(() => playSound('handWin'), 200);
      }
    }
    prevHandsPlayed.current = state.handsPlayed;
  }, [state.handsPlayed, state.currentHand, playSound]);

  // Play countdown sounds during final 10 seconds and game over sound when time hits 0
  const prevTimeRef = useRef(state.timeRemaining);
  useEffect(() => {
    const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
    const isSSC = state.mode === 'ssc';
    
    // Only trigger on time change, not on initial render
    if (prevTimeRef.current !== state.timeRemaining && (isBlitz || isSSC)) {
      if (state.timeRemaining <= 10 && state.timeRemaining > 0 && !state.isGameOver && !state.isLevelComplete) {
        // Play the pulsed 808 countdown sound each second
        playSound('bonusCountdown');
      }
      // Play game over sound immediately when time hits 0
      if (state.timeRemaining === 0 && prevTimeRef.current > 0) {
        playSound('gameOver');
      }
    }
    prevTimeRef.current = state.timeRemaining;
  }, [state.timeRemaining, state.mode, state.isGameOver, state.isLevelComplete, playSound]);

  // Play sound on level complete
  useEffect(() => {
    if (state.isLevelComplete) {
      playSound('levelComplete');
    }
  }, [state.isLevelComplete, playSound]);

  // Play sound on game over (only for non-timed modes - timed modes play sound when time hits 0)
  useEffect(() => {
    const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
    const isSSC = state.mode === 'ssc';
    // Only play here for Classic modes - Blitz/SSC play sound when time hits 0
    if (state.isGameOver && !isBlitz && !isSSC) {
      playSound('gameOver');
    }
  }, [state.isGameOver, state.mode, playSound]);


  // Activate bonus intro when entering bonus round - pause timer during intro
  useEffect(() => {
    if (state.isBonusLevel && state.isPlaying && !state.isLevelComplete && !state.isGameOver) {
      setBonusIntroActive(true);
      setPaused(true); // Pause the timer during intro
    }
  }, [state.isBonusLevel, state.isPlaying, state.isLevelComplete, state.isGameOver, setPaused]);

  // Handle bonus intro completion
  const handleBonusIntroComplete = useCallback(() => {
    setBonusIntroActive(false);
    setPaused(false); // Resume the timer
  }, [setPaused]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getProgressInfo = () => {
    if (state.mode === 'ssc') {
      return { label: 'Level', value: `${state.sscLevel}` };
    }
    if (state.mode === 'blitz_fc' || state.mode === 'blitz_cb') {
      return { label: 'Hands', value: `${state.handsPlayed}` };
    }
    // Classic modes: show remaining cards in deck (52 total - used cards)
    const remainingCards = 52 - state.usedCards.length;
    return { label: 'Cards', value: `${remainingCards}` };
  };

  const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
  const isClassic = state.mode === 'classic_fc' || state.mode === 'classic_cb';
  const isBonusRound = isSSC && state.isBonusLevel && !state.isLevelComplete;
  
  // Determine effective phase based on mode and phase override
  const effectivePhase = phaseOverride || (state.mode === 'classic_fc' || state.mode === 'blitz_fc' ? 'falling' : 
                                            state.mode === 'classic_cb' || state.mode === 'blitz_cb' ? 'conveyor' : 
                                            state.sscPhase);
  
  const isFalling = !isBonusRound && (effectivePhase === 'falling');
  const isConveyor = !isBonusRound && (effectivePhase === 'conveyor');
  const isStatic = !isBonusRound && (effectivePhase === 'sitting_duck');
  const isOrbit = !isBonusRound && isSSC && state.sscPhase === 'orbit';
  
  // Final stretch bonus (last 10 seconds in Blitz/SSC)
  const inFinalStretch = (isBlitz || isSSC) && state.timeRemaining <= 10 && state.timeRemaining > 0 && !state.isLevelComplete && !state.isGameOver;

  const timeDisplay = isBlitz || isSSC ? formatTime(state.timeRemaining) : formatTime(state.timeElapsed);
  const progress = getProgressInfo();

  // Navigate to game over screen when game ends
  useEffect(() => {
    if (state.isGameOver) {
      const handHistory = getHandResults();
      navigate('/game-over', { state: { gameState: state, handHistory } });
    }
  }, [state.isGameOver, state, getHandResults, navigate]);

  const selectedIds = state.selectedCards.map(c => c.id);

  // Show loading screen while music is loading
  if (isLoadingMusic || introPhase === 'loading') {
    return (
      <div className="h-screen max-h-screen flex flex-col items-center justify-center overflow-hidden modern-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-display text-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Show intro sequence (Ready? / Begin!)
  if (introPhase === 'ready' || introPhase === 'begin') {
    return (
      <div className="h-screen max-h-screen flex flex-col items-center justify-center overflow-hidden modern-bg">
        <AnimatePresence mode="wait">
          {introPhase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.h1
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-6xl font-display text-accent drop-shadow-lg"
              >
                Ready?
              </motion.h1>
            </motion.div>
          )}

          {introPhase === 'begin' && (
            <motion.div
              key="begin"
              initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="text-center"
            >
              <motion.h1
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.4 }}
                className="text-7xl font-display text-primary drop-shadow-lg"
              >
                BEGIN!
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden modern-bg relative">
      {/* Main game area - takes full screen */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* ScorePanel overlay */}
        {!isBonusRound && (
          <>
            <ScorePanel
              score={state.score}
              timeDisplay={timeDisplay}
              progressLabel={progress.label}
              progressValue={progress.value}
              currentHand={state.currentHand}
              goalScore={isSSC ? state.levelGoal : undefined}
              level={isSSC ? state.sscLevel : undefined}
              isUrgent={inFinalStretch}
              onHome={() => { resetGame(); navigate('/'); }}
              onRestart={() => { resetGame(); startGame(mode as GameMode); }}
              onPause={pauseGame}
              isPaused={state.isPaused}
              gameMode={isSSC ? 'ssc' : isBlitz ? 'blitz' : 'classic'}
            />
            {/* Better-Hand Multiplier Indicator */}
            <AnimatePresence>
              {isSSC && !state.isBonusLevel && state.currentMultiplier > 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute top-20 left-4 z-40"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center gap-2 bg-accent/20 backdrop-blur-sm border border-accent/30 rounded-lg px-3 py-2"
                  >
                    <ArrowTrendingUpIcon className="w-5 h-5 text-accent" />
                    <span className="font-display text-lg font-bold text-accent">
                      {state.currentMultiplier}x
                    </span>
                    <span className="text-xs text-accent/80">
                      ({state.betterHandStreak} streak)
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final Stretch Bonus Indicator */}
            <AnimatePresence>
              {inFinalStretch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-20 left-1/2 -translate-x-1/2 z-40"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center gap-2 font-display text-lg font-bold text-primary"
                  >
                    <BoltIcon className="w-5 h-5" />
                    BONUS x2
                    <BoltIcon className="w-5 h-5" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {isFalling && (
          <FallingCards
            deck={state.deck}
            selectedCards={state.selectedCards}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={baseSpeed * (isBlitz ? 1.2 : isSSC ? sscSpeed : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
            isRecycling={isBlitz || isSSC}
            reshuffleTrigger={state.reshuffleTrigger}
            gameMode={isSSC ? 'ssc' : isBlitz ? 'blitz' : 'classic'}
          />
        )}
        {isConveyor && (
          <ConveyorBelt
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={baseSpeed * (isBlitz ? 1.5 : isSSC ? sscSpeed : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
            isRecycling={isBlitz || isSSC}
            reshuffleTrigger={state.reshuffleTrigger}
          />
        )}
        {isStatic && (
          <StaticGrid
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
          />
        )}
        {isOrbit && (
          <OrbitCards
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            level={state.sscLevel}
            isPaused={state.isPaused || state.isLevelComplete}
            reshuffleTrigger={state.reshuffleTrigger}
          />
        )}
        {isBonusRound && (
          <BonusRound
            deck={state.deck}
            onSubmitHand={submitBonusHand}
            onSkip={skipBonusRound}
            timeRemaining={state.timeRemaining}
            score={state.score}
            level={state.sscLevel}
            bonusRoundNumber={state.bonusRoundCount}
            onHome={() => { resetGame(); navigate('/'); }}
            onRestart={() => { resetGame(); startGame(mode as GameMode); }}
            onPause={pauseGame}
            isPaused={state.isPaused}
            onIntroComplete={handleBonusIntroComplete}
          />
        )}

        {isSSC && !state.isLevelComplete && !isBonusRound && state.earnedPowerUps.length > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <PowerUpBar
              earnedPowerUps={state.earnedPowerUps}
              activePowerUps={state.activePowerUps}
              onUsePowerUp={usePowerUp}
              currentPhase={state.sscPhase}
            />
          </div>
        )}

        {/* Power-Up Selection Modal */}
        <AnimatePresence>
          {state.showPowerUpSelection && (
            <PowerUpSelection
              choices={state.powerUpChoices}
              onSelect={selectPowerUp}
              onDismiss={dismissPowerUpSelection}
            />
          )}
        </AnimatePresence>

        {/* Hand display overlay - positioned at bottom */}
        {!isBonusRound && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
            <HandDisplay cards={state.selectedCards} currentHand={state.currentHand} />
          </div>
        )}

        {/* Loot Box Reveal (for bonus round rewards) */}
        <LootBoxReveal
          isOpen={state.showLootBox && state.isBonusLevel}
          powerUpId={state.pendingReward}
          tier={state.rewardTier}
          inventoryFull={state.inventoryFull}
          currentPowerUps={state.earnedPowerUps}
          onClaim={claimReward}
          onSwap={swapPowerUp}
          onDiscard={discardReward}
        />

        {/* Level Complete Modal */}
        <LevelCompleteModal
          isOpen={state.isLevelComplete && !state.showPowerUpSelection && !state.showLootBox}
          level={state.sscLevel}
          score={state.score}
          levelScore={state.levelScore}
          cumulativeScore={state.cumulativeScore}
          goalScore={state.levelGoal}
          starRating={state.starRating}
          isBonusRound={state.isBonusLevel}
          isBonusFailed={state.isBonusFailed}
          pendingBonusRound={state.pendingBonusRound}
          bonusTimePoints={state.bonusTimePoints}
          onNextLevel={nextLevel}
          onStartBonusRound={startBonusRound}
        />

      </div>
    </div>
  );
}
