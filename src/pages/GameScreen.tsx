import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { GameHeader } from '@/components/game/GameHeader';
import { ScorePanel } from '@/components/game/ScoreDisplay';
import { HandDisplay } from '@/components/game/HandDisplay';
import { FallingCards } from '@/components/game/FallingCards';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { StaticGrid } from '@/components/game/StaticGrid';
import { PowerUpBar } from '@/components/game/PowerUpBar';
import { GameMode } from '@/types/game';
import { Trophy } from 'lucide-react';

export default function GameScreen() {
  const { mode } = useParams<{ mode: GameMode }>();
  const navigate = useNavigate();
  const { state, startGame, selectCard, usePowerUp, pauseGame, resetGame, nextLevel } = useGameState();
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showUsedCards, setShowUsedCards] = useState(false);

  useEffect(() => {
    if (mode && !state.isPlaying && !state.isGameOver && !state.isLevelComplete) {
      startGame(mode as GameMode);
    }
  }, [mode, state.isPlaying, state.isGameOver, state.isLevelComplete, startGame]);

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
    // Classic modes: show remaining cards in deck (52 total, using all for 10 hands + 2 leftover)
    const remainingCards = state.deck.length + (5 - state.selectedCards.length);
    return { label: 'Cards', value: `${remainingCards}` };
  };

  const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
  const isSSC = state.mode === 'ssc';
  const isFalling = state.mode === 'classic_fc' || state.mode === 'blitz_fc' || (isSSC && state.sscPhase === 'falling');
  const isConveyor = state.mode === 'classic_cb' || state.mode === 'blitz_cb' || (isSSC && state.sscPhase === 'conveyor');
  const isStatic = isSSC && state.sscPhase === 'static';

  const timeDisplay = isBlitz || isSSC ? formatTime(state.timeRemaining) : formatTime(state.timeElapsed);
  const progress = getProgressInfo();

  if (state.isGameOver) {
    navigate('/game-over', { state: { gameState: state } });
  }

  const selectedIds = state.selectedCards.map(c => c.id);

  return (
    <div className="min-h-screen game-field-bg flex flex-col">
      <GameHeader
        isPaused={state.isPaused}
        onHome={() => { resetGame(); navigate('/'); }}
        onRestart={() => { resetGame(); startGame(mode as GameMode); }}
        onHelp={() => {}}
        onPause={pauseGame}
      />

      <ScorePanel
        score={state.score}
        timeDisplay={timeDisplay}
        progressLabel={progress.label}
        progressValue={progress.value}
        currentHand={state.currentHand}
        goalScore={isSSC ? state.levelGoal : undefined}
      />

      <div className="flex-1 relative overflow-hidden p-4">
        {isFalling && (
          <FallingCards
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={speed * (isBlitz ? 1.2 : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
            isRecycling={isBlitz}
          />
        )}
        {isConveyor && (
          <ConveyorBelt
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={speed * (isBlitz ? 1.5 : 1)}
            isPaused={state.isPaused || state.isLevelComplete}
          />
        )}
        {isStatic && (
          <StaticGrid
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
          />
        )}

        {isSSC && !state.isLevelComplete && (
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
                  <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-display text-foreground mb-2">
                  Level {state.sscLevel} Complete!
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Score: {state.score.toLocaleString()}
                </p>
                <p className="text-sm text-primary animate-pulse">
                  Next level starting...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
        <HandDisplay cards={state.selectedCards} currentHand={state.currentHand} />
      </div>
    </div>
  );
}
