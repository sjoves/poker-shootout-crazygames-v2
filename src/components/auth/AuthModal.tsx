import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });
const emailOrUsernameSchema = z.string().trim().min(1, { message: "Please enter your email or username" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });
const usernameSchema = z.string().trim().min(2, { message: "Username must be at least 2 characters" }).max(20, { message: "Username must be less than 20 characters" }).regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }).optional();

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; username?: string } = {};
    
    if (mode === 'signin') {
      const result = emailOrUsernameSchema.safeParse(emailOrUsername);
      if (!result.success) {
        newErrors.email = result.error.errors[0].message;
      }
    } else {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password, username.trim() || undefined);
      setLoading(false);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Account created & progress saved!' });
        onSuccess?.();
        onClose();
      }
      return;
    }

    // Sign in - check if input is email or username
    const input = emailOrUsername.trim();
    const isEmail = input.includes('@');
    
    let loginEmail = input;
    
    if (!isEmail) {
      try {
        const { data, error: lookupError } = await supabase.functions.invoke('username-lookup', {
          body: { username: input }
        });
        
        if (lookupError || !data?.email) {
          setLoading(false);
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
      toast({ title: 'Signed in! Progress saved.' });
      onSuccess?.();
      onClose();
    }
  };

  const resetForm = () => {
    setEmailOrUsername('');
    setEmail('');
    setPassword('');
    setUsername('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-card rounded-2xl p-6 border border-border shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-display text-primary text-center mb-4">
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
          
          <p className="text-sm text-muted-foreground text-center mb-6">
            Save your scores and sync your Power-Ups
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="modal-username">Username</Label>
                <Input
                  id="modal-username"
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
                <Label htmlFor="modal-emailOrUsername">Email or Username</Label>
                <Input
                  id="modal-emailOrUsername"
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
            
            {mode === 'signup' && (
              <div>
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
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

            <div>
              <Label htmlFor="modal-password">Password</Label>
              <Input
                id="modal-password"
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

            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-background font-display" size="lg" disabled={loading}>
              {loading ? 'Loading...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                resetForm();
              }}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
