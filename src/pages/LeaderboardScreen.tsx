import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GameMode, LeaderboardEntry } from '@/types/game';
import { Trophy, Medal, Award, ArrowLeft, User, Clock, Zap, Target } from 'lucide-react';

const GAME_MODES: { value: GameMode | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Trophy className="w-4 h-4" /> },
  { value: 'classic_fc', label: 'Classic FC', icon: <Target className="w-4 h-4" /> },
  { value: 'classic_cb', label: 'Classic CB', icon: <Target className="w-4 h-4" /> },
  { value: 'blitz_fc', label: 'Blitz FC', icon: <Zap className="w-4 h-4" /> },
  { value: 'blitz_cb', label: 'Blitz CB', icon: <Zap className="w-4 h-4" /> },
  { value: 'ssc', label: 'SSC', icon: <Medal className="w-4 h-4" /> },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-6 h-6 text-gold" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-silver" />;
  if (rank === 3) return <Award className="w-6 h-6 text-bronze" />;
  return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-mono">#{rank}</span>;
}

function formatTime(seconds: number | null | undefined) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getModeName(mode: GameMode) {
  switch (mode) {
    case 'classic_fc': return 'Classic Falling';
    case 'classic_cb': return 'Classic Conveyor';
    case 'blitz_fc': return 'Blitz Falling';
    case 'blitz_cb': return 'Blitz Conveyor';
    case 'ssc': return 'Sharp Shooter';
  }
}

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<GameMode | 'all'>('all');

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard', selectedMode],
    queryFn: async () => {
      // Only select safe public fields - explicitly exclude user_id to prevent account correlation attacks
      let query = supabase
        .from('leaderboard_entries')
        .select(`
          id,
          profile_id,
          game_mode,
          score,
          hands_played,
          time_seconds,
          best_hand,
          ssc_level,
          created_at,
          profiles:profile_id (
            username,
            avatar_url
          )
        `)
        .order('score', { ascending: false })
        .limit(50);

      if (selectedMode !== 'all') {
        query = query.eq('game_mode', selectedMode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LeaderboardEntry[];
    },
  });

  return (
    <div className="min-h-screen modern-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display text-primary">Leaderboard</h1>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {GAME_MODES.map((mode) => (
              <Button
                key={mode.value}
                variant={selectedMode === mode.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMode(mode.value)}
                className="gap-1.5"
              >
                {mode.icon}
                {mode.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  className={`
                    relative overflow-hidden rounded-xl border
                    ${index === 0 ? 'bg-gradient-to-r from-gold/15 to-gold/5 border-gold/50' : ''}
                    ${index === 1 ? 'bg-gradient-to-r from-silver/15 to-silver/5 border-silver/50' : ''}
                    ${index === 2 ? 'bg-gradient-to-r from-bronze/15 to-bronze/5 border-bronze/50' : ''}
                    ${index > 2 ? 'bg-card/50 border-border' : ''}
                  `}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankIcon(index + 1)}
                    </div>

                    {/* Avatar & Username */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {entry.profiles?.avatar_url ? (
                          <img
                            src={entry.profiles.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {entry.profiles?.username || 'Anonymous'}
                        </p>
                        {selectedMode === 'all' && (
                          <p className="text-xs text-muted-foreground">
                            {getModeName(entry.game_mode)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-display text-primary">
                        {entry.score.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {entry.game_mode === 'ssc' && entry.ssc_level && (
                          <span>Lv.{entry.ssc_level}</span>
                        )}
                        {entry.time_seconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.time_seconds)}
                          </span>
                        )}
                        {/* Hide hands count for Classic modes - only show for Blitz and SSC */}
                        {entry.game_mode !== 'classic_fc' && entry.game_mode !== 'classic_cb' && (
                          <span>{entry.hands_played} hands</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">No scores yet!</p>
            <p className="text-sm text-muted-foreground/60 mb-4">
              Be the first to set a record
            </p>
            <Button onClick={() => navigate('/')}>
              Play Now
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
