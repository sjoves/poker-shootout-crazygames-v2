import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameMode } from '@/types/game';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<'classic' | 'blitz' | 'ssc' | null>(null);

  const handleModeSelect = (mode: GameMode) => {
    navigate(`/play/${mode}`);
  };

  return (
    <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-display text-primary text-glow mb-4">
          POKER RUSH
        </h1>
        <p className="text-lg text-muted-foreground">
          Collect cards. Build hands. Beat the clock.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        {/* Classic Mode */}
        <div className="space-y-2">
          <Button
            variant={selectedMode === 'classic' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-16 text-lg font-display"
            onClick={() => setSelectedMode(selectedMode === 'classic' ? null : 'classic')}
          >
            🎯 Classic Mode
          </Button>
          {selectedMode === 'classic' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_fc')}>
                Falling Cards
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('classic_cb')}>
                Conveyor Belt
              </Button>
            </motion.div>
          )}
        </div>

        {/* Blitz Mode */}
        <div className="space-y-2">
          <Button
            variant={selectedMode === 'blitz' ? 'default' : 'outline'}
            size="lg"
            className="w-full h-16 text-lg font-display"
            onClick={() => setSelectedMode(selectedMode === 'blitz' ? null : 'blitz')}
          >
            ⚡ 52-Card Blitz
          </Button>
          {selectedMode === 'blitz' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('blitz_fc')}>
                Falling Cards
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleModeSelect('blitz_cb')}>
                Conveyor Belt
              </Button>
            </motion.div>
          )}
        </div>

        {/* SSC Mode */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-16 text-lg font-display"
          onClick={() => handleModeSelect('ssc')}
        >
          🏆 Sharp Shooter Challenge
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex gap-4"
      >
        <Button variant="ghost" onClick={() => navigate('/leaderboard')}>
          🏅 Leaderboard
        </Button>
        <Button variant="ghost" onClick={() => navigate('/auth')}>
          👤 Sign In
        </Button>
      </motion.div>
    </div>
  );
}
