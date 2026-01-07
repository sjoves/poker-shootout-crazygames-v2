import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  const handleTestBonusRound = () => {
    navigate('/game?testBonus=true');
  };

  const handleTestOrbitMode = () => {
    // Level 22 is the first Orbit level in Cycle 2
    navigate('/game?startLevel=22');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground mb-8">Start building your amazing project here!</p>
        <div className="flex flex-col gap-4">
          <Button onClick={handleTestBonusRound} size="lg">
            Test Bonus Round
          </Button>
          <Button onClick={handleTestOrbitMode} size="lg" variant="outline">
            Test Orbit Mode (Level 22)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
