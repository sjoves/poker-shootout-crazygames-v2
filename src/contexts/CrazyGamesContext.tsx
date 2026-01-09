import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// Sitelock - check if origin ends with allowed domain or is localhost
function isAllowedOrigin(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  // CrazyGames requirement: must end with 'crazygames.com' OR be 'localhost'
  // Also allow dev/preview domains for development
  return hostname.endsWith('crazygames.com') || 
         hostname === 'localhost' || 
         hostname.endsWith('lovable.app') || 
         hostname.endsWith('lovableproject.com');
}

// CrazyGames SDK types
interface CrazyGamesUser {
  userId: string;
  username: string;
  profilePictureUrl: string;
}

interface CrazyGamesSDK {
  [key: string]: any;
  init: () => Promise<void>;
  ad: {
    requestAd: (type: 'midgame' | 'rewarded', callbacks?: {
      adStarted?: () => void;
      adFinished?: () => void;
      adError?: (error: string) => void;
    }) => Promise<void>;
    hasAdblock: () => boolean;
  };
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
    loadingStart: () => void;
    loadingStop: () => void;
  };
  user: {
    isUserAccountAvailable: boolean;
    getUser: () => Promise<CrazyGamesUser | null>;
    getUserToken: () => Promise<string | null>;
    showAuthPrompt: () => Promise<CrazyGamesUser | null>;
    addAuthListener: (callback: (user: CrazyGamesUser | null) => void) => void;
    removeAuthListener: (callback: (user: CrazyGamesUser | null) => void) => void;
  };
  data: {
    getValue: (key: string) => Promise<string | null>;
    setValue: (key: string, value: string) => Promise<void>;
    deleteValue: (key: string) => Promise<void>;
  };
}

// Local storage keys for guest data fallback
const GUEST_PROGRESS_KEY = 'poker_shootout_guest_progress';

declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init: () => Promise<void>;
        [key: string]: any;
      };
    };
  }
}

interface CrazyGamesContextValue {
  isAvailable: boolean;
  isInitialized: boolean;
  user: CrazyGamesUser | null;
  userToken: string | null;
  hasAdblock: boolean;
  isUserLoggedIn: boolean;
  // SDK methods
  gameplayStart: () => void;
  gameplayStop: () => void;
  happytime: () => void;
  loadingStart: () => void;
  loadingStop: () => void;
  showMidgameAd: () => Promise<boolean>;
  showRewardedAd: () => Promise<boolean>;
  showAuthPrompt: () => Promise<CrazyGamesUser | null>;
  // Data persistence - auto-syncs to cloud for logged-in users, local for guests
  saveData: (key: string, value: string) => Promise<void>;
  loadData: (key: string) => Promise<string | null>;
  deleteData: (key: string) => Promise<void>;
  // Progress sync helpers
  saveProgress: (progress: Record<string, unknown>) => Promise<void>;
  loadProgress: () => Promise<Record<string, unknown> | null>;
}

const CrazyGamesContext = createContext<CrazyGamesContextValue | null>(null);

// Keys to block for CrazyGames input protection
const BLOCKED_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'];

export function CrazyGamesProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [user, setUser] = useState<CrazyGamesUser | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [hasAdblock, setHasAdblock] = useState(false);
  
  // User is logged in if they have a CrazyGames user account
  const isUserLoggedIn = !!user;

  // Input protection: prevent scrolling on arrow keys, spacebar, and wheel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.includes(e.key) || BLOCKED_KEYS.includes(e.code)) {
        // Only prevent if not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
        }
      }
    };

    // Prevent unwanted page scroll from mouse wheel
    const handleWheel = (e: WheelEvent) => {
      // Prevent wheel scroll on the document level to avoid page scrolling
      // Allow scrolling inside specific scrollable containers if needed
      const target = e.target as HTMLElement;
      const isScrollableContainer = target.closest('[data-allow-scroll]');
      if (!isScrollableContainer) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const initSDK = async () => {
      // Check if SDK is loaded
      if (!window.CrazyGames?.SDK) {
        console.log('CrazyGames SDK not available (not running on CrazyGames)');
        setIsInitialized(true);
        return;
      }

      // Call loadingStart before init
      try {
        window.CrazyGames.SDK.game.loadingStart();
        console.log('CrazyGames: loadingStart');
      } catch {
        // Ignore if not available
      }

      try {
        await window.CrazyGames.SDK.init();
        setIsAvailable(true);
        setIsInitialized(true);
        console.log('CrazyGames SDK initialized');

        // Check for adblock
        try {
          setHasAdblock(window.CrazyGames.SDK.ad.hasAdblock());
        } catch {
          // Ignore adblock check errors
        }

        // Try to get logged in user and token for identification
        if (window.CrazyGames.SDK.user.isUserAccountAvailable) {
          try {
            // Get user token first for identification (works for both guests and logged-in users)
            const token = await window.CrazyGames.SDK.user.getUserToken();
            if (token) {
              setUserToken(token);
              console.log('CrazyGames: Got user token for identification');
            }

            // Get user profile if logged in
            const cgUser = await window.CrazyGames.SDK.user.getUser();
            if (cgUser) {
              setUser(cgUser);
              console.log('CrazyGames user logged in:', cgUser.username);
              
              // Migrate any local guest progress to cloud
              await migrateGuestProgressToCloud(cgUser.userId);
            }

            // Listen for auth changes
            window.CrazyGames.SDK.user.addAuthListener(async (newUser) => {
              setUser(newUser);
              console.log('CrazyGames auth changed:', newUser?.username || 'logged out');
              
              // When user logs in, migrate guest progress and refresh token
              if (newUser) {
                const newToken = await window.CrazyGames.SDK.user.getUserToken();
                setUserToken(newToken);
                await migrateGuestProgressToCloud(newUser.userId);
              }
            });
          } catch (err) {
            console.log('CrazyGames user/token fetch error:', err);
          }
        }
      } catch (error: unknown) {
        // Handle SDK disabled or other init errors gracefully
        const errorCode = (error as { code?: string })?.code;
        if (errorCode === 'sdkDisabled') {
          console.log('CrazyGames SDK disabled on this domain (expected in dev)');
        } else {
          console.log('CrazyGames SDK init failed:', error);
        }
        setIsAvailable(false);
        setIsInitialized(true);
      }
    };

    // Wait a bit for the SDK script to load
    if (window.CrazyGames?.SDK) {
      initSDK();
    } else {
      // SDK script might still be loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.CrazyGames?.SDK) {
          clearInterval(checkInterval);
          initSDK();
        }
      }, 100);

      // Give up after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isInitialized) {
          console.log('CrazyGames SDK not loaded after 5s');
          setIsInitialized(true);
        }
      }, 5000);

      return () => clearInterval(checkInterval);
    }
  }, []);

  const loadingStart = useCallback(() => {
    if (window.CrazyGames?.SDK) {
      try {
        window.CrazyGames.SDK.game.loadingStart();
        console.log('CrazyGames: loadingStart');
      } catch {
        // Ignore errors
      }
    }
  }, []);

  const loadingStop = useCallback(() => {
    if (window.CrazyGames?.SDK) {
      try {
        window.CrazyGames.SDK.game.loadingStop();
        console.log('CrazyGames: loadingStop');
      } catch {
        // Ignore errors
      }
    }
  }, []);

  const gameplayStart = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStart();
      console.log('CrazyGames: gameplayStart');
    }
  }, [isAvailable]);

  const gameplayStop = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStop();
      console.log('CrazyGames: gameplayStop');
    }
  }, [isAvailable]);

  const happytime = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.happytime();
      console.log('CrazyGames: happytime (achievement moment)');
    }
  }, [isAvailable]);

  const showMidgameAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !window.CrazyGames?.SDK) {
      console.log('CrazyGames SDK not available, skipping midgame ad');
      return true; // Return true to allow game to continue
    }

    return new Promise((resolve) => {
      window.CrazyGames!.SDK.ad.requestAd('midgame', {
        adStarted: () => {
          console.log('CrazyGames: midgame ad started');
        },
        adFinished: () => {
          console.log('CrazyGames: midgame ad finished');
          resolve(true);
        },
        adError: (error) => {
          console.log('CrazyGames: midgame ad error:', error);
          resolve(true); // Continue game even on ad error
        },
      });
    });
  }, [isAvailable]);

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !window.CrazyGames?.SDK) {
      console.log('CrazyGames SDK not available, skipping rewarded ad');
      return false; // Don't grant reward if SDK unavailable
    }

    return new Promise((resolve) => {
      window.CrazyGames!.SDK.ad.requestAd('rewarded', {
        adStarted: () => {
          console.log('CrazyGames: rewarded ad started');
        },
        adFinished: () => {
          console.log('CrazyGames: rewarded ad completed - granting reward');
          resolve(true);
        },
        adError: (error) => {
          console.log('CrazyGames: rewarded ad error:', error);
          resolve(false); // No reward on error
        },
      });
    });
  }, [isAvailable]);

  const showAuthPrompt = useCallback(async (): Promise<CrazyGamesUser | null> => {
    if (!isAvailable || !window.CrazyGames?.SDK?.user.isUserAccountAvailable) {
      return null;
    }

    try {
      const cgUser = await window.CrazyGames.SDK.user.showAuthPrompt();
      if (cgUser) {
        setUser(cgUser);
      }
      return cgUser;
    } catch (error) {
      console.error('CrazyGames auth prompt error:', error);
      return null;
    }
  }, [isAvailable]);

  // Data persistence - for logged-in users, sync to CrazyGames cloud; for guests, use localStorage
  const saveData = useCallback(async (key: string, value: string) => {
    // If SDK available AND user is logged in, save to cloud
    if (isAvailable && window.CrazyGames?.SDK && isUserLoggedIn) {
      try {
        await window.CrazyGames.SDK.data.setValue(key, value);
        console.log('CrazyGames: Saved data to cloud:', key);
        return;
      } catch (err) {
        console.log('CrazyGames cloud save failed, falling back to local:', err);
      }
    }
    // Fallback to localStorage for guests or if cloud fails
    localStorage.setItem(key, value);
  }, [isAvailable, isUserLoggedIn]);

  const loadData = useCallback(async (key: string): Promise<string | null> => {
    // If SDK available AND user is logged in, load from cloud
    if (isAvailable && window.CrazyGames?.SDK && isUserLoggedIn) {
      try {
        const cloudValue = await window.CrazyGames.SDK.data.getValue(key);
        if (cloudValue !== null) {
          console.log('CrazyGames: Loaded data from cloud:', key);
          return cloudValue;
        }
      } catch (err) {
        console.log('CrazyGames cloud load failed, falling back to local:', err);
      }
    }
    // Fallback to localStorage for guests or if cloud fails
    return localStorage.getItem(key);
  }, [isAvailable, isUserLoggedIn]);

  const deleteData = useCallback(async (key: string) => {
    // If SDK available AND user is logged in, delete from cloud
    if (isAvailable && window.CrazyGames?.SDK && isUserLoggedIn) {
      try {
        await window.CrazyGames.SDK.data.deleteValue(key);
        console.log('CrazyGames: Deleted data from cloud:', key);
      } catch (err) {
        console.log('CrazyGames cloud delete failed:', err);
      }
    }
    // Also clear from localStorage
    localStorage.removeItem(key);
  }, [isAvailable, isUserLoggedIn]);

  // Helper to migrate guest progress to cloud when user logs in
  const migrateGuestProgressToCloud = async (userId: string) => {
    if (!isAvailable || !window.CrazyGames?.SDK) return;
    
    try {
      const guestProgress = localStorage.getItem(GUEST_PROGRESS_KEY);
      if (guestProgress) {
        // Save guest progress to cloud under user's account
        await window.CrazyGames.SDK.data.setValue('game_progress', guestProgress);
        // Clear local guest progress after successful migration
        localStorage.removeItem(GUEST_PROGRESS_KEY);
        console.log('CrazyGames: Migrated guest progress to cloud for user:', userId);
      }
    } catch (err) {
      console.log('CrazyGames: Failed to migrate guest progress:', err);
    }
  };

  // Convenience methods for game progress sync
  const saveProgress = useCallback(async (progress: Record<string, unknown>) => {
    const progressJson = JSON.stringify(progress);
    
    if (isUserLoggedIn && isAvailable && window.CrazyGames?.SDK) {
      // Logged-in user: save to cloud
      try {
        await window.CrazyGames.SDK.data.setValue('game_progress', progressJson);
        console.log('CrazyGames: Saved progress to cloud');
        return;
      } catch (err) {
        console.log('CrazyGames cloud progress save failed:', err);
      }
    }
    // Guest: save to local storage
    localStorage.setItem(GUEST_PROGRESS_KEY, progressJson);
  }, [isAvailable, isUserLoggedIn]);

  const loadProgress = useCallback(async (): Promise<Record<string, unknown> | null> => {
    let progressJson: string | null = null;
    
    if (isUserLoggedIn && isAvailable && window.CrazyGames?.SDK) {
      // Logged-in user: load from cloud
      try {
        progressJson = await window.CrazyGames.SDK.data.getValue('game_progress');
        if (progressJson) {
          console.log('CrazyGames: Loaded progress from cloud');
        }
      } catch (err) {
        console.log('CrazyGames cloud progress load failed:', err);
      }
    }
    
    // Fallback to guest local storage
    if (!progressJson) {
      progressJson = localStorage.getItem(GUEST_PROGRESS_KEY);
    }
    
    if (progressJson) {
      try {
        return JSON.parse(progressJson);
      } catch {
        return null;
      }
    }
    return null;
  }, [isAvailable, isUserLoggedIn]);

  // Check sitelock on mount
  const [isSitelocked, setIsSitelocked] = useState(false);

  useEffect(() => {
    if (!isAllowedOrigin()) {
      setIsSitelocked(true);
    }
  }, []);

  // Sitelock overlay - blocks the game on unauthorized domains
  if (isSitelocked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
          🎮 Game Access Restricted
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem', opacity: 0.9 }}>
          Please play this game on CrazyGames
        </p>
        <a
          href="https://www.crazygames.com/game/poker-shootout"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '1.125rem',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
          }}
        >
          Play on CrazyGames →
        </a>
      </div>
    );
  }

  return (
    <CrazyGamesContext.Provider
      value={{
        isAvailable,
        isInitialized,
        user,
        userToken,
        hasAdblock,
        isUserLoggedIn,
        gameplayStart,
        gameplayStop,
        happytime,
        loadingStart,
        loadingStop,
        showMidgameAd,
        showRewardedAd,
        showAuthPrompt,
        saveData,
        loadData,
        deleteData,
        saveProgress,
        loadProgress,
      }}
    >
      {children}
    </CrazyGamesContext.Provider>
  );
}

export function useCrazyGames() {
  const context = useContext(CrazyGamesContext);
  if (!context) {
    throw new Error('useCrazyGames must be used within a CrazyGamesProvider');
  }
  return context;
}
