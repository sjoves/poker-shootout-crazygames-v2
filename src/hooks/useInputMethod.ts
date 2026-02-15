import { useState, useEffect } from 'react';

export type InputMethod = 'touch' | 'keyboard-mouse';

/**
 * Detects whether the user is using touch or keyboard/mouse input.
 * Returns 'touch' on mobile/touch devices, 'keyboard-mouse' when
 * a keyboard or mouse interaction is detected.
 */
export function useInputMethod(): InputMethod {
  const [method, setMethod] = useState<InputMethod>(() => {
    // Default: if coarse pointer or no hover, assume touch
    if (typeof window !== 'undefined') {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      return isTouch ? 'touch' : 'keyboard-mouse';
    }
    return 'touch';
  });

  useEffect(() => {
    const onKeyDown = () => setMethod('keyboard-mouse');
    const onMouseMove = () => setMethod('keyboard-mouse');
    const onTouchStart = () => setMethod('touch');

    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  return method;
}
