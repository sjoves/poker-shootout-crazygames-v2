import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  const handleTestBonusRound = () => {
    navigate('/game?testBonus=true');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground mb-8">Start building your amazing project here!</p>
        <Button onClick={handleTestBonusRound} size="lg">
          Test Bonus Round
        </Button>
      </div>
    </div>
  );
};

export default Index;
