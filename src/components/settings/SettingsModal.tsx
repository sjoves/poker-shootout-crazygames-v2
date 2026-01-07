import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/solid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, themes } = useTheme();
  const { playSound } = useAudio();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
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
