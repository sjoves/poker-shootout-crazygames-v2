import { POWER_UPS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TestPowerUps() {
  const navigate = useNavigate();

  const tierColors = {
    1: 'border-bronze bg-bronze/10',
    2: 'border-silver bg-silver/10',
    3: 'border-gold bg-gold/10',
  };

  const tierNames = {
    1: 'Common (Bronze)',
    2: 'Uncommon (Silver)',
    3: 'Rare (Gold)',
  };

  return (
    <div className="min-h-screen modern-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-display text-primary">Power-Ups Test Screen</h1>
        </div>

        <div className="grid gap-6">
          {[1, 2, 3].map(tier => (
            <div key={tier} className="space-y-4">
              <h2 className="text-xl font-display text-foreground">
                Tier {tier}: {tierNames[tier as 1 | 2 | 3]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {POWER_UPS.filter(p => p.tier === tier).map(powerUp => (
                  <div
                    key={powerUp.id}
                    className={`border-2 rounded-xl p-4 ${tierColors[tier as 1 | 2 | 3]}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{powerUp.emoji}</span>
                      <div>
                        <h3 className="font-display text-lg text-foreground">{powerUp.name}</h3>
                        <p className="text-xs text-muted-foreground">ID: {powerUp.id}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{powerUp.description}</p>
                    {powerUp.handType && (
                      <p className="text-xs text-primary mt-2">Hand Type: {powerUp.handType}</p>
                    )}
                    {powerUp.isReusable && (
                      <span className="inline-block mt-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Reusable
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-card/60 rounded-xl border border-primary/30">
          <h3 className="font-display text-lg text-foreground mb-2">Summary</h3>
          <p className="text-sm text-muted-foreground">
            Total Power-ups: {POWER_UPS.length} | 
            Tier 1: {POWER_UPS.filter(p => p.tier === 1).length} | 
            Tier 2: {POWER_UPS.filter(p => p.tier === 2).length} | 
            Tier 3: {POWER_UPS.filter(p => p.tier === 3).length}
          </p>
        </div>
      </div>
    </div>
  );
}
