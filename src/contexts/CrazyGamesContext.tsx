import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// CrazyGames SDK types
interface CrazyGamesUser {
  userId: string;
  username: string;
  profilePictureUrl: string;
}

interface CrazyGamesSDK {
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
    sdkGameLoadingStart: () => void;
    sdkGameLoadingStop: () => void;
  };
  user: {
    isUserAccountAvailable: boolean;
    getUser: () => Promise<CrazyGamesUser | null>;
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

declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDK;
    };
  }
}

interface CrazyGamesContextValue {
  isAvailable: boolean;
  isInitialized: boolean;
  user: CrazyGamesUser | null;
  hasAdblock: boolean;
  // SDK methods
  gameplayStart: () => void;
  gameplayStop: () => void;
  happytime: () => void;
  showMidgameAd: () => Promise<boolean>;
  showRewardedAd: () => Promise<boolean>;
  showAuthPrompt: () => Promise<CrazyGamesUser | null>;
  // Data persistence
  saveData: (key: string, value: string) => Promise<void>;
  loadData: (key: string) => Promise<string | null>;
  deleteData: (key: string) => Promise<void>;
}

const CrazyGamesContext = createContext<CrazyGamesContextValue | null>(null);

export function CrazyGamesProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [user, setUser] = useState<CrazyGamesUser | null>(null);
  const [hasAdblock, setHasAdblock] = useState(false);

  useEffect(() => {
    const initSDK = async () => {
      // Check if SDK is loaded
      if (!window.CrazyGames?.SDK) {
        console.log('CrazyGames SDK not available (not running on CrazyGames)');
        setIsInitialized(true);
        return;
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

        // Try to get logged in user
        if (window.CrazyGames.SDK.user.isUserAccountAvailable) {
          try {
            const cgUser = await window.CrazyGames.SDK.user.getUser();
            if (cgUser) {
              setUser(cgUser);
              console.log('CrazyGames user logged in:', cgUser.username);
            }

            // Listen for auth changes
            window.CrazyGames.SDK.user.addAuthListener((newUser) => {
              setUser(newUser);
              console.log('CrazyGames auth changed:', newUser?.username || 'logged out');
            });
          } catch {
            // Ignore user fetch errors
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

  const saveData = useCallback(async (key: string, value: string) => {
    if (!isAvailable || !window.CrazyGames?.SDK) {
      localStorage.setItem(key, value);
      return;
    }
    await window.CrazyGames.SDK.data.setValue(key, value);
  }, [isAvailable]);

  const loadData = useCallback(async (key: string): Promise<string | null> => {
    if (!isAvailable || !window.CrazyGames?.SDK) {
      return localStorage.getItem(key);
    }
    return window.CrazyGames.SDK.data.getValue(key);
  }, [isAvailable]);

  const deleteData = useCallback(async (key: string) => {
    if (!isAvailable || !window.CrazyGames?.SDK) {
      localStorage.removeItem(key);
      return;
    }
    await window.CrazyGames.SDK.data.deleteValue(key);
  }, [isAvailable]);

  return (
    <CrazyGamesContext.Provider
      value={{
        isAvailable,
        isInitialized,
        user,
        hasAdblock,
        gameplayStart,
        gameplayStop,
        happytime,
        showMidgameAd,
        showRewardedAd,
        showAuthPrompt,
        saveData,
        loadData,
        deleteData,
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
