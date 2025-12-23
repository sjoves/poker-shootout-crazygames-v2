import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import { GameHeader } from '@/components/game/GameHeader';
import { ScorePanel } from '@/components/game/ScoreDisplay';
import { HandDisplay } from '@/components/game/HandDisplay';
import { FallingCards } from '@/components/game/FallingCards';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { StaticGrid } from '@/components/game/StaticGrid';
import { GameControls } from '@/components/game/GameControls';
import { PowerUpBar } from '@/components/game/PowerUpBar';
import { GameMode } from '@/types/game';
import { useEffect } from 'react';

export default function GameScreen() {
  const { mode } = useParams<{ mode: GameMode }>();
  const navigate = useNavigate();
  const { state, startGame, selectCard, usePowerUp, pauseGame, resetGame } = useGameState();
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showUsedCards, setShowUsedCards] = useState(false);

  useEffect(() => {
    if (mode && !state.isPlaying && !state.isGameOver) {
      startGame(mode as GameMode);
    }
  }, [mode, state.isPlaying, state.isGameOver, startGame]);

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
    return { label: 'Hands', value: `${state.handsPlayed}/10` };
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
    <div className="min-h-screen modern-bg flex flex-col">
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
      />

      <div className="flex-1 relative overflow-hidden p-4">
        {isFalling && (
          <FallingCards
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={speed * (isBlitz ? 1.2 : 1)}
            isPaused={state.isPaused}
            isRecycling={isBlitz}
          />
        )}
        {isConveyor && (
          <ConveyorBelt
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
            speed={speed * (isBlitz ? 1.5 : 1)}
            isPaused={state.isPaused}
          />
        )}
        {isStatic && (
          <StaticGrid
            deck={state.deck}
            selectedCardIds={selectedIds}
            onSelectCard={selectCard}
          />
        )}

        {isSSC && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <PowerUpBar
              unlockedPowerUps={state.unlockedPowerUps}
              activePowerUps={state.activePowerUps}
              currentLevel={state.sscLevel}
              onUsePowerUp={usePowerUp}
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
        <HandDisplay cards={state.selectedCards} currentHand={state.currentHand} />
      </div>
    </div>
  );
}
