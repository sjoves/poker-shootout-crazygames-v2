import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getSSCLevelInfo } from '@/lib/pokerEngine';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PHASES = ['sitting_duck', 'conveyor', 'falling', 'orbit'] as const;
type Phase = typeof PHASES[number];

const PHASE_LABELS: Record<Phase, string> = {
  sitting_duck: 'Sitting Duck',
  conveyor: 'Conveyor',
  falling: 'Falling',
  orbit: 'Orbit',
};

export default function DevSSCLevelJump() {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [testBonus, setTestBonus] = useState(false);

  const handleStartLevel = () => {
    if (selectedLevel === null) return;
    
    let url = `/play/ssc?startLevel=${selectedLevel}`;
    if (selectedPhase) {
      url += `&phase=${selectedPhase}`;
    }
    if (testBonus) {
      url += `&testBonus=true`;
    }
    navigate(url);
  };

  // Generate level buttons (1-50 for now)
  const levels = Array.from({ length: 50 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 modern-bg flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-display text-foreground">SSC Level Jump</h1>
          </div>

          {/* Phase Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">Phase Override (optional)</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPhase === null ? 'default' : 'outline'}
                onClick={() => setSelectedPhase(null)}
                className="border-primary"
              >
                Auto (based on level)
              </Button>
              {PHASES.map((phase) => (
                <Button
                  key={phase}
                  variant={selectedPhase === phase ? 'default' : 'outline'}
                  onClick={() => setSelectedPhase(phase)}
                  className="border-primary"
                >
                  {PHASE_LABELS[phase]}
                </Button>
              ))}
            </div>
          </div>

          {/* Bonus Round Toggle */}
          <div className="mb-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testBonus}
                onChange={(e) => setTestBonus(e.target.checked)}
                className="w-5 h-5 rounded border-primary accent-primary"
              />
              <span className="text-foreground font-medium">Start with Bonus Round</span>
            </label>
          </div>

          {/* Level Selection Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">Select Level</h2>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {levels.map((level) => {
                const levelInfo = getSSCLevelInfo(level);
                const phaseColor = {
                  sitting_duck: 'border-green-500/50 hover:bg-green-500/20',
                  conveyor: 'border-yellow-500/50 hover:bg-yellow-500/20',
                  falling: 'border-blue-500/50 hover:bg-blue-500/20',
                  orbit: 'border-purple-500/50 hover:bg-purple-500/20',
                }[levelInfo.phase];
                
                return (
                  <motion.button
                    key={level}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedLevel(level)}
                    className={`
                      aspect-square rounded-lg border-2 text-lg font-bold transition-colors
                      ${selectedLevel === level 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : `bg-transparent text-foreground ${phaseColor}`
                      }
                    `}
                  >
                    {level}
                  </motion.button>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-500/50" /> Sitting Duck
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-yellow-500/50" /> Conveyor
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500/50" /> Falling
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-500/50" /> Orbit
              </span>
            </div>
          </div>

          {/* Selected Level Info */}
          {selectedLevel !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 border border-primary/30 rounded-xl p-6"
            >
              <h3 className="text-xl font-display text-foreground mb-2">Level {selectedLevel}</h3>
              {(() => {
                const info = getSSCLevelInfo(selectedLevel);
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Phase:</span>{' '}
                      <span className="text-foreground font-medium">
                        {selectedPhase ? PHASE_LABELS[selectedPhase] : PHASE_LABELS[info.phase]}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Round:</span>{' '}
                      <span className="text-foreground font-medium">{info.round}</span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky Start Button */}
      <div className="shrink-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="max-w-4xl mx-auto">
          <Button
            size="lg"
            disabled={selectedLevel === null}
            onClick={handleStartLevel}
            className="w-full h-14 text-lg font-display"
          >
            {selectedLevel !== null ? `Start Level ${selectedLevel}` : 'Select a Level'}
          </Button>
        </div>
      </div>
    </div>
  );
}
