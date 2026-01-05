import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme, ThemeName, THEMES } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/solid';
import { SpeakerWaveIcon, SpeakerXMarkIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

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
                  {masterVolume > 0 ? (
                    <SpeakerWaveIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Master Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {Math.round(masterVolume * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setMasterVolume(masterVolume > 0 ? 0 : 0.7)}
                  >
                    {masterVolume > 0 ? (
                      <SpeakerWaveIcon className="w-4 h-4" />
                    ) : (
                      <SpeakerXMarkIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
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

            {/* Music */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MusicalNoteIcon className={cn("w-5 h-5", musicEnabled ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">Music</span>
                </div>
                <Switch
                  checked={musicEnabled}
                  onCheckedChange={setMusicEnabled}
                />
              </div>
              {musicEnabled && (
                <div className="pl-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Volume</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(musicVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[musicVolume * 100]}
                    onValueChange={([value]) => setMusicVolume(value / 100)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Theme Selection */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    playSound('buttonClick');
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <p className="font-medium text-sm text-foreground">{t.name}</p>
                  {theme === t.id && (
                    <CheckIcon className="w-4 h-4 text-primary" />
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
