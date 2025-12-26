import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles } from 'lucide-react';
import { REWARD_OPTIONS, type DailyReward } from '@/hooks/useRetention';

interface DailyRewardWheelProps {
  isOpen: boolean;
  onClose: () => void;
  canClaim: boolean;
  onClaim: () => Promise<DailyReward | null>;
  todayReward: DailyReward | null;
}

export function DailyRewardWheel({ 
  isOpen, 
  onClose, 
  canClaim, 
  onClaim,
  todayReward 
}: DailyRewardWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<DailyReward | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / REWARD_OPTIONS.length;

  const handleSpin = async () => {
    if (!canClaim || spinning) return;

    setSpinning(true);
    setResult(null);

    // Spin animation
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const extraAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + extraAngle;
    
    setRotation(totalRotation);

    // Wait for spin animation then claim
    setTimeout(async () => {
      const reward = await onClaim();
      setResult(reward);
      setSpinning(false);
    }, 4000);
  };

  const getRewardDisplay = (reward: DailyReward | null) => {
    if (!reward) return null;
    const option = REWARD_OPTIONS.find(o => o.type === reward.reward_type && o.value === reward.reward_value);
    return option?.label || reward.reward_value;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Gift className="w-6 h-6 text-primary" />
            Daily Reward
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Already claimed today */}
          {todayReward && !result && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">Today's reward:</p>
                <p className="text-2xl font-bold text-primary">
                  {getRewardDisplay(todayReward)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Come back tomorrow for another spin!
              </p>
            </div>
          )}

          {/* Wheel */}
          {canClaim && !result && (
            <div className="relative">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
              </div>

              {/* Wheel */}
              <div 
                ref={wheelRef}
                className="relative w-64 h-64 mx-auto rounded-full border-4 border-primary overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
                }}
              >
                {REWARD_OPTIONS.map((option, index) => {
                  const angle = index * segmentAngle;
                  const isEven = index % 2 === 0;
                  
                  return (
                    <div
                      key={index}
                      className="absolute w-full h-full"
                      style={{
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'center',
                      }}
                    >
                      <div 
                        className={`absolute top-0 left-1/2 h-1/2 origin-bottom ${
                          isEven ? 'bg-primary/30' : 'bg-secondary'
                        }`}
                        style={{
                          width: '50%',
                          transform: `translateX(-50%) rotate(${segmentAngle / 2}deg)`,
                          clipPath: `polygon(50% 100%, 0% 0%, 100% 0%)`,
                        }}
                      />
                      <div
                        className="absolute text-xs font-bold text-center"
                        style={{
                          top: '20%',
                          left: '50%',
                          transform: `translateX(-50%) rotate(${segmentAngle / 2}deg)`,
                          width: '60px',
                        }}
                      >
                        {option.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                size="lg"
                onClick={handleSpin}
                disabled={spinning}
                className="w-full mt-6"
              >
                {spinning ? (
                  <span className="animate-pulse">Spinning...</span>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Spin the Wheel!
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-4"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-12 h-12 text-primary" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">You won:</p>
                  <p className="text-3xl font-bold text-primary">
                    {getRewardDisplay(result)}
                  </p>
                </div>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Collect & Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
