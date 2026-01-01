import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AudioProvider } from "@/contexts/AudioContext";
import SplashScreen from "./pages/SplashScreen";
import GameScreen from "./pages/GameScreen";
import GameOverScreen from "./pages/GameOverScreen";
import AuthScreen from "./pages/AuthScreen";
import AccountScreen from "./pages/AccountScreen";
import LeaderboardScreen from "./pages/LeaderboardScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AudioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/play/:mode" element={<GameScreen />} />
              <Route path="/game-over" element={<GameOverScreen />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/account" element={<AccountScreen />} />
              <Route path="/leaderboard" element={<LeaderboardScreen />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
