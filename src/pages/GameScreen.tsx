import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudio } from '@/contexts/AudioContext';
import { ScorePanel } from '@/components/game/ScoreDisplay';
import { HandDisplay } from '@/components/game/HandDisplay';
import { FallingCards } from '@/components/game/FallingCards';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { StaticGrid } from '@/components/game/StaticGrid';
import { PowerUpBar } from '@/components/game/PowerUpBar';
import { BonusRound } from '@/components/game/BonusRound';
import { GameMode } from '@/types/game';
import { TrophyIcon, StarIcon, BoltIcon } from '@heroicons/react/24/outline';


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
    usePowerUp, 
    pauseGame, 
    resetGame, 
    nextLevel,
    reshuffleUnselected,
  } = useGameState();
  const { playSound } = useAudio();
  const isMobile = useIsMobile();
  const baseSpeed = isMobile ? 0.6 : 1; // Slower speed on mobile
  const [isMuted, setIsMuted] = useState(false);
  const [showUsedCards, setShowUsedCards] = useState(false);
  const prevHandsPlayed = useRef(state.handsPlayed);
  
  const isTestBonus = searchParams.get('testBonus') === 'true';

  useEffect(() => {
    if (isTestBonus && !state.isPlaying && !state.isGameOver && !state.isLevelComplete) {
      startGame('ssc', true); // Start in bonus mode
    } else if (mode && !state.isPlaying && !state.isGameOver && !state.isLevelComplete) {
      startGame(mode as GameMode);
    }
  }, [mode, isTestBonus, state.isPlaying, state.isGameOver, state.isLevelComplete, startGame]);

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

  // Play sound on level complete
  useEffect(() => {
    if (state.isLevelComplete) {
      playSound('levelComplete');
    }
  }, [state.isLevelComplete, playSound]);

  // Play sound on game over
  useEffect(() => {
    if (state.isGameOver) {
      playSound('gameOver');
    }
  }, [state.isGameOver, playSound]);

  // Auto-advance to next level after showing congratulations
  useEffect(() => {
    if (state.isLevelComplete) {
      const timer = setTimeout(() => {
        nextLevel();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isLevelComplete, nextLevel]);

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
  const isSSC = state.mode === 'ssc';
  const isBonusRound = isSSC && state.isBonusLevel && !state.isLevelComplete;
  const isFalling = !isBonusRound && (state.mode === 'classic_fc' || state.mode === 'blitz_fc' || (isSSC && state.sscPhase === 'falling'));
  const isConveyor = !isBonusRound && (state.mode === 'classic_cb' || state.mode === 'blitz_cb' || (isSSC && state.sscPhase === 'conveyor'));
  const isStatic = !isBonusRound && isSSC && state.sscPhase === 'static';

  const timeDisplay = isBlitz || isSSC ? formatTime(state.timeRemaining) : formatTime(state.timeElapsed);
  const progress = getProgressInfo();

  if (state.isGameOver) {
    navigate('/game-over', { state: { gameState: state } });
  }

  const selectedIds = state.selectedCards.map(c => c.id);

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden modern-bg">
      {!isBonusRound && (
        <ScorePanel
          score={state.score}
          timeDisplay={timeDisplay}
          progressLabel={progress.label}
          progressValue={progress.value}
          currentHand={state.currentHand}
          goalScore={isSSC ? state.levelGoal : undefined}
          level={isSSC ? state.sscLevel : undefined}
          onHome={() => { resetGame(); navigate('/'); }}
          onRestart={() => { resetGame(); startGame(mode as GameMode); }}
          onPause={pauseGame}
          isPaused={state.isPaused}
        />
      )}

      <div className="flex-1 min-h-0 relative overflow-hidden p-2 sm:p-4">
        {isFalling && (
          <FallingCards
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={baseSpeed * (isBlitz ? 1.2 : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
            isRecycling={isBlitz}
          />
        )}
        {isConveyor && (
          <ConveyorBelt
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={baseSpeed * (isBlitz ? 1.5 : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
          />
        )}
        {isStatic && (
          <StaticGrid
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            onReshuffle={reshuffleUnselected}
          />
        )}
        {isBonusRound && (
          <BonusRound
            deck={state.deck}
            onSubmitHand={submitBonusHand}
            onSkip={skipBonusRound}
            timeRemaining={state.timeRemaining}
            pointMultiplier={state.pointMultiplier}
            score={state.score}
            level={state.sscLevel}
            onHome={() => { resetGame(); navigate('/'); }}
            onRestart={() => { resetGame(); startGame(mode as GameMode); }}
            onPause={pauseGame}
            isPaused={state.isPaused}
          />
        )}

        {isSSC && !state.isLevelComplete && !isBonusRound && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <PowerUpBar
              unlockedPowerUps={state.unlockedPowerUps}
              activePowerUps={state.activePowerUps}
              currentLevel={state.sscLevel}
              onUsePowerUp={usePowerUp}
            />
          </div>
        )}

        {/* Level Complete Overlay */}
        <AnimatePresence>
          {state.isLevelComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                className="text-center p-8 bg-card border border-border rounded-2xl shadow-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {state.isBonusLevel ? (
                    <StarIcon className="w-16 h-16 text-accent mx-auto mb-4" />
                  ) : (
                    <TrophyIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                  )}
                </motion.div>
                <h2 className="text-3xl font-display text-foreground mb-2">
                  {state.isBonusLevel ? 'Bonus Round Complete!' : `Level ${state.sscLevel} Complete!`}
                </h2>
                {state.isBonusLevel && state.bonusTimePoints ? (
                  <div className="text-sm text-muted-foreground mb-2 space-y-1">
                    <p>Hand Score: {(state.score - state.bonusTimePoints).toLocaleString()}</p>
                    <p className="text-accent">+ Time Bonus: {state.bonusTimePoints.toLocaleString()}</p>
                    <p className="text-lg text-foreground font-bold border-t border-border pt-1 mt-1">
                      Total: {state.score.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg text-muted-foreground mb-2">
                    Score: {state.score.toLocaleString()}
                  </p>
                )}
                {state.pointMultiplier > 1 && (
                  <p className="text-sm text-accent flex items-center justify-center gap-1 mb-4">
                    <BoltIcon className="w-4 h-4" />
                    {state.pointMultiplier}x Points Active
                  </p>
                )}
                <p className="text-sm text-primary animate-pulse">
                  Next level starting...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Point Multiplier Indicator - only show when not in bonus round */}
        {isSSC && state.pointMultiplier > 1 && !state.isLevelComplete && !isBonusRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 right-4 bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-1 font-display text-xs"
          >
            <BoltIcon className="w-3 h-3" />
            {state.pointMultiplier}x
          </motion.div>
        )}
      </div>

      {/* Hand display - hide during bonus round */}
      {!isBonusRound && (
        <div className="flex-shrink-0 p-2 sm:p-4">
          <HandDisplay cards={state.selectedCards} currentHand={state.currentHand} />
        </div>
      )}
    </div>
  );
}
