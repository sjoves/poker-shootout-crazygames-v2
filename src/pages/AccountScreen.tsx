import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Trophy, Target, Flame, LogOut, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRetention } from '@/hooks/useRetention';
import { useToast } from '@/hooks/use-toast';

export default function AccountScreen() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateUsername } = useAuth();
  const { stats, streak, achievements, userAchievements } = useRetention();
  const { toast } = useToast();
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    navigate('/');
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      toast({ title: 'Username cannot be empty', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    const { error } = await updateUsername(newUsername.trim());
    setSaving(false);
    
    if (error) {
      toast({ title: 'Error updating username', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Username updated!' });
      setIsEditingUsername(false);
    }
  };

  const unlockedCount = userAchievements?.length || 0;
  const totalCount = achievements?.length || 0;

  return (
    <div className="min-h-screen modern-bg p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display text-primary">My Account</h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                        className="max-w-[200px]"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={handleSaveUsername}
                        disabled={saving}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername(profile?.username || '');
                        }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold">{profile?.username || 'Anonymous'}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => {
                          setNewUsername(profile?.username || '');
                          setIsEditingUsername(true);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats?.total_games || 0}</div>
                  <div className="text-xs text-muted-foreground">Games Played</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats?.highest_score || 0}</div>
                  <div className="text-xs text-muted-foreground">Best Score</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats?.total_hands || 0}</div>
                  <div className="text-xs text-muted-foreground">Hands Made</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {((stats?.total_score || 0) / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
              </div>
              
              {/* Hand stats */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Best Hands Made</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <span className="text-lg">🃏</span>
                    <div className="font-medium">{stats?.flushes_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Flushes</div>
                  </div>
                  <div>
                    <span className="text-lg">📊</span>
                    <div className="font-medium">{stats?.straights_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Straights</div>
                  </div>
                  <div>
                    <span className="text-lg">🏠</span>
                    <div className="font-medium">{stats?.full_houses_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Full Houses</div>
                  </div>
                  <div>
                    <span className="text-lg">4️⃣</span>
                    <div className="font-medium">{stats?.four_of_kinds_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Four of a Kind</div>
                  </div>
                  <div>
                    <span className="text-lg">💫</span>
                    <div className="font-medium">{stats?.straight_flushes_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Straight Flush</div>
                  </div>
                  <div>
                    <span className="text-lg">👑</span>
                    <div className="font-medium">{stats?.royal_flushes_made || 0}</div>
                    <div className="text-xs text-muted-foreground">Royal Flush</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements & Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{unlockedCount}/{totalCount}</div>
              <div className="text-sm text-muted-foreground">Achievements</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardContent className="pt-6 text-center">
              <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">{streak?.current_streak || 0}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            variant="destructive" 
            className="w-full" 
            size="lg"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
