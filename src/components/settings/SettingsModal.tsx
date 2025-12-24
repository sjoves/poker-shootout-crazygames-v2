import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/solid';
import { SpeakerWaveIcon, SpeakerXMarkIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, themes } = useTheme();
  const {
    masterVolume,
    sfxEnabled,
    sfxVolume,
    musicEnabled,
    musicVolume,
    setMasterVolume,
    setSfxEnabled,
    setSfxVolume,
    setMusicEnabled,
    setMusicVolume,
    playSound,
  } = useAudio();

  const handleSfxToggle = (enabled: boolean) => {
    setSfxEnabled(enabled);
    if (enabled) {
      setTimeout(() => playSound('buttonClick'), 50);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Audio Settings */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Audio</h3>
            
            {/* Master Volume */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SpeakerWaveIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Master Volume</span>
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[masterVolume * 100]}
                onValueChange={([value]) => setMasterVolume(value / 100)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Sound Effects */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sfxEnabled ? (
                    <SpeakerWaveIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Sound Effects</span>
                </div>
                <Switch
                  checked={sfxEnabled}
                  onCheckedChange={handleSfxToggle}
                />
              </div>
              {sfxEnabled && (
                <div className="pl-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Volume</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(sfxVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[sfxVolume * 100]}
                    onValueChange={([value]) => {
                      setSfxVolume(value / 100);
                    }}
                    onValueCommit={() => playSound('buttonClick')}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Music (Future Feature) */}
            <div className="mt-6 space-y-4 opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MusicalNoteIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Music</span>
                  <span className="text-xs text-muted-foreground">(Coming Soon)</span>
                </div>
                <Switch
                  checked={musicEnabled}
                  onCheckedChange={setMusicEnabled}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Theme Selection */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Theme</h3>
            <div className="grid gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    playSound('buttonClick');
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all",
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ThemePreview themeId={t.id} />
                    <div className="text-left">
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  {theme === t.id && (
                    <CheckIcon className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemePreview({ themeId }: { themeId: ThemeName }) {
  const colors = themeId === 'lucky-green' 
    ? { bg: '#0d1a14', primary: '#1a9c6c', accent: '#4de6ac' }
    : { bg: '#141414', primary: '#5ccc7a', accent: '#5ccc7a' };

  return (
    <div 
      className="w-10 h-10 rounded-lg border border-border overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      <div 
        className="w-4 h-4 rounded-full"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` 
        }}
      />
    </div>
  );
}
