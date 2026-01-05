import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionState {
  isPremium: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, isPremium: false, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Subscription check error:', error);
        setState(prev => ({ ...prev, isPremium: false, loading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        isPremium: data?.isPremium || false,
        subscriptionEnd: data?.subscription_end || null,
        loading: false,
      }));
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setState(prev => ({ ...prev, isPremium: false, loading: false }));
    }
  }, [session?.access_token]);

  // Check subscription on mount and when session changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription status every minute
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const openCheckout = useCallback(async () => {
    if (!session?.access_token) {
      return { error: 'Please sign in to subscribe' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }

      return { error: null };
    } catch (err) {
      console.error('Checkout error:', err);
      return { error: 'Failed to open checkout' };
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) {
      return { error: 'Please sign in first' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }

      return { error: null };
    } catch (err) {
      console.error('Portal error:', err);
      return { error: 'Failed to open portal' };
    }
  }, [session?.access_token]);

  return {
    isPremium: state.isPremium,
    subscriptionEnd: state.subscriptionEnd,
    loading: state.loading,
    isLoggedIn: !!user,
    checkSubscription,
    openCheckout,
    openCustomerPortal,
  };
}
