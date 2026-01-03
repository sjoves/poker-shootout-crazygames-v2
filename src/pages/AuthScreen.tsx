import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });
const emailOrUsernameSchema = z.string().trim().min(1, { message: "Please enter your email or username" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });
const usernameSchema = z.string().trim().min(2, { message: "Username must be at least 2 characters" }).max(20, { message: "Username must be less than 20 characters" }).regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }).optional();

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string; confirmPassword?: string }>({});
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Listen for PASSWORD_RECOVERY event to show reset form
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect to home if already logged in (but NOT if in reset mode)
  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate('/');
    }
  }, [user, mode, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; username?: string; confirmPassword?: string } = {};
    
    if (mode === 'signin') {
      const result = emailOrUsernameSchema.safeParse(emailOrUsername);
      if (!result.success) {
        newErrors.email = result.error.errors[0].message;
      }
    } else if (mode !== 'reset') {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }
    }
    
    if (mode !== 'forgot') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    if (mode === 'reset') {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    if (mode === 'signup' && username) {
      const usernameResult = usernameSchema.safeParse(username);
      if (!usernameResult.success) {
        newErrors.username = usernameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
      setMode('signin');
    }
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      return handleForgotPassword();
    }

    if (mode === 'reset') {
      return handleResetPassword();
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password, username.trim() || undefined);
      setLoading(false);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Account created!' });
        navigate('/');
      }
      return;
    }

    // Sign in - check if input is email or username
    const input = emailOrUsername.trim();
    const isEmail = input.includes('@');
    
    let loginEmail = input;
    
    if (!isEmail) {
      // Use secure edge function for username-to-email lookup
      try {
        const { data, error: lookupError } = await supabase.functions.invoke('username-lookup', {
          body: { username: input }
        });
        
        if (lookupError || !data?.email) {
          setLoading(false);
          // Use generic error message that doesn't reveal if username exists
          toast({ title: 'Error', description: 'Invalid username or password', variant: 'destructive' });
          return;
        }
        
        loginEmail = data.email;
      } catch {
        setLoading(false);
        toast({ title: 'Error', description: 'Invalid username or password', variant: 'destructive' });
        return;
      }
    }

    const { error } = await signIn(loginEmail, password);
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      default: return 'Welcome Back';
    }
  };

  return (
    <div className="min-h-screen modern-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/90 backdrop-blur-sm rounded-2xl p-8 border border-border"
      >
        <h1 className="text-3xl font-display text-primary text-center mb-6">
          {getTitle()}
        </h1>

        {mode === 'forgot' && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            Enter your email and we'll send you a reset link.
          </p>
        )}

        {mode === 'reset' && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            Enter your new password below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
                }}
                placeholder="GunSlinger42"
                className={`mt-1 ${errors.username ? 'border-destructive' : ''}`}
              />
              {errors.username && (
                <p className="text-xs text-destructive mt-1">{errors.username}</p>
              )}
            </div>
          )}
          
          {mode === 'signin' && (
            <div>
              <Label htmlFor="emailOrUsername">Email or Username</Label>
              <Input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="your@email.com or username"
                required
                className={`mt-1 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
          )}
          
          {(mode === 'signup' || mode === 'forgot') && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="your@email.com"
                required
                className={`mt-1 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <Label htmlFor="password">{mode === 'reset' ? 'New Password' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                required
                className={`mt-1 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="••••••••"
                required
                className={`mt-1 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Loading...' : (
              mode === 'signup' ? 'Create Account' : 
              mode === 'forgot' ? 'Send Reset Link' : 
              mode === 'reset' ? 'Update Password' : 'Sign In'
            )}
          </Button>
        </form>

        {mode === 'signin' && (
          <button
            onClick={() => setMode('forgot')}
            className="w-full text-sm text-muted-foreground hover:text-primary mt-3"
          >
            Forgot password?
          </button>
        )}

        <div className="mt-4 text-center">
          {(mode === 'forgot' || mode === 'reset') ? (
            <button
              onClick={() => setMode('signin')}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          )}
        </div>

        <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/')}>
          ← Back to Menu
        </Button>
      </motion.div>
    </div>
  );
}