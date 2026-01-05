import React, { useEffect, useCallback, useRef, useState } from "react";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";
import { useAudio } from "@/contexts/AudioContext";


interface FallingCardsProps {
  deck: Card[];
  selectedCards: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  isRecycling?: boolean;
  reshuffleTrigger?: number;
  gameMode?: 'ssc' | 'classic' | 'blitz';
}

type LocalFallingCard = FallingCard & { instanceKey: string; isTouched?: boolean; isPicked?: boolean };

// Fisher-Yates shuffle using crypto for high-entropy randomness
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const j = randomValues[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Module-level global pick lock (prevents a single tap from selecting multiple cards)
const PICK_LOCK_MS = 250;
const PARENT_POINTER_BLOCK_MS = 100;
const HITBOX_INSET_PERCENT = 15; // center 70%
const REPULSION_RADIUS_PX = 50;
const CARD_W = 64;
const CARD_H = 96;
let globalPickLockUntil = 0;

export function FallingCards({
  deck,
  selectedCards,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  isRecycling = false,
  reshuffleTrigger = 0,
  gameMode = 'classic',
}: FallingCardsProps) {
  const effectiveSpeed = gameMode === 'ssc' ? speed * 0.8 : speed;
  
  // Use refs for card positions to avoid React state updates on every frame
  const cardsRef = useRef<LocalFallingCard[]>([]);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pickedInstanceKeysRef = useRef<Set<string>>(new Set());
  const selectedCountRef = useRef<number>(selectedCardIds.length);
  const activePointerIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerBlockTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const spawnCountRef = useRef<number>(0);
  const { playSound } = useAudio();

  useEffect(() => {
    selectedCountRef.current = selectedCardIds.length;
  }, [selectedCardIds.length]);
  
  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);
  
  // Exhaustive deck system: shuffled queue of cards to deal
  const shuffledDeckRef = useRef<Card[]>([]);
  const dealtCardIdsRef = useRef<Set<string>>(new Set());

  // Initialize/reshuffle the deck
  const reshuffleDeck = useCallback(() => {
    shuffledDeckRef.current = fisherYatesShuffle(deck);
    dealtCardIdsRef.current.clear();
  }, [deck]);

  // Reset on reshuffle trigger or new game
  useEffect(() => {
    reshuffleDeck();
    cardsRef.current = [];
    cardElementsRef.current.clear();
    pickedInstanceKeysRef.current.clear();
    globalPickLockUntil = 0;
    if (containerBlockTimeoutRef.current) {
      window.clearTimeout(containerBlockTimeoutRef.current);
      containerBlockTimeoutRef.current = null;
    }
    if (containerRef.current) containerRef.current.style.pointerEvents = '';
    triggerRender();
  }, [reshuffleTrigger, reshuffleDeck, triggerRender]);

  // Reset on new game (full deck)
  useEffect(() => {
    if (deck.length === 52) {
      reshuffleDeck();
      cardsRef.current = [];
      cardElementsRef.current.clear();
      pickedInstanceKeysRef.current.clear();
      globalPickLockUntil = 0;
      if (containerBlockTimeoutRef.current) {
        window.clearTimeout(containerBlockTimeoutRef.current);
        containerBlockTimeoutRef.current = null;
      }
      if (containerRef.current) containerRef.current.style.pointerEvents = '';
      triggerRender();
    }
  }, [deck.length, reshuffleDeck, triggerRender]);

  // Deal next card from shuffled deck - completely hand-blind
  const dealNextCard = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      // Find next card in shuffled deck that hasn't been dealt or selected
      let picked: Card | null = null;
      
      while (shuffledDeckRef.current.length > 0) {
        const candidate = shuffledDeckRef.current.shift()!;
        
        // Skip if already selected by player
        if (selectedCardIds.includes(candidate.id)) {
          continue;
        }
        
        // Skip if currently on screen (already dealt but not collected)
        if (dealtCardIdsRef.current.has(candidate.id)) {
          continue;
        }
        
        picked = candidate;
        break;
      }
      
      // If deck exhausted, reshuffle and try again
      if (!picked && shuffledDeckRef.current.length === 0) {
        // Reshuffle: get all cards not currently selected
        const availableForReshuffle = deck.filter(c => !selectedCardIds.includes(c.id));
        shuffledDeckRef.current = fisherYatesShuffle(availableForReshuffle);
        dealtCardIdsRef.current.clear();
        
        // Try to get next card from reshuffled deck
        while (shuffledDeckRef.current.length > 0) {
          const candidate = shuffledDeckRef.current.shift()!;
          if (!selectedCardIds.includes(candidate.id)) {
            picked = candidate;
            break;
          }
        }
      }
      
      if (!picked) return null;

      dealtCardIdsRef.current.add(picked.id);
      spawnCountRef.current += 1;
      const cardWidth = 64;

      return {
        ...picked,
        instanceKey: `${picked.id}-${spawnCountRef.current}`,
        x: Math.random() * Math.max(0, containerWidth - cardWidth),
        y: -110,
        speed: (1.2 + Math.random() * 1.4) * effectiveSpeed,
        rotation: (Math.random() - 0.5) * 40,
        rotationSpeed: (Math.random() - 0.5) * 2.5,
        sway: 12 + Math.random() * 16,
        swaySpeed: 1.2 + Math.random() * 1.6,
      };
    },
    [deck, selectedCardIds, effectiveSpeed]
  );

  // Seed first card - only when deck is populated
  useEffect(() => {
    if (isPaused) return;
    if (deck.length === 0) return;
    if (cardsRef.current.length > 0) return;
    if (shuffledDeckRef.current.length === 0) return; // Wait for deck to be shuffled

    const measuredWidth = containerRef.current?.offsetWidth ?? 0;
    const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;
    const next = dealNextCard(effectiveWidth);
    if (next) {
      cardsRef.current = [next];
      lastSpawnRef.current = performance.now();
      triggerRender();
    }
  }, [deck.length, isPaused, dealNextCard, triggerRender]);

  // Main animation loop - updates DOM directly via refs
  useEffect(() => {
    if (isPaused) return;

    const tick = (t: number) => {
      const containerHeight = containerRef.current?.offsetHeight ?? 600;
      const measuredWidth = containerRef.current?.offsetWidth ?? 0;
      const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;

      let needsRender = false;
      const movedCards: LocalFallingCard[] = [];

      // 1) Advance motion (no DOM writes yet)
      for (const card of cardsRef.current) {
        card.y += card.speed;
        card.rotation += card.rotationSpeed;
        card.x += Math.sin((t / 1000) * card.swaySpeed) * 0.35;

        // Fell off screen → allow it to be dealt again
        if (card.y > containerHeight + 60) {
          dealtCardIdsRef.current.delete(card.id);
          needsRender = true;
          continue;
        }

        // Selected elsewhere → drop it
        if (selectedCardIds.includes(card.id)) {
          needsRender = true;
          continue;
        }

        movedCards.push(card);
      }

      // 2) Repulsion: nudge cards apart when too close to prevent overlapping hitboxes
      const clampX = (x: number) => Math.max(0, Math.min(x, effectiveWidth - CARD_W));
      for (let i = 0; i < movedCards.length; i++) {
        for (let j = i + 1; j < movedCards.length; j++) {
          const a = movedCards[i];
          const b = movedCards[j];

          const ax = a.x + CARD_W / 2;
          const ay = a.y + CARD_H / 2;
          const bx = b.x + CARD_W / 2;
          const by = b.y + CARD_H / 2;

          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.hypot(dx, dy);

          if (dist > 0 && dist < REPULSION_RADIUS_PX) {
            const push = ((REPULSION_RADIUS_PX - dist) / REPULSION_RADIUS_PX) * 2.5;
            const dir = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            a.x = clampX(a.x + push * dir);
            b.x = clampX(b.x - push * dir);
          }
        }
      }

      // 3) Write transforms to DOM (once per frame)
      for (const card of movedCards) {
        const element = cardElementsRef.current.get(card.instanceKey);
        if (element) {
          element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rotation}deg)`;
        }
      }

      // 4) Spawn
      const shouldSpawn = t - lastSpawnRef.current > 600 / effectiveSpeed;
      if (shouldSpawn && movedCards.length < 14 && deck.length > 0) {
        const next = dealNextCard(effectiveWidth);
        if (next) {
          movedCards.push(next);
          lastSpawnRef.current = t;
          needsRender = true;
        }
      }

      cardsRef.current = movedCards;

      // Only trigger React render when cards added/removed
      if (needsRender) {
        triggerRender();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused, effectiveSpeed, selectedCardIds, dealNextCard, deck.length, triggerRender]);

  const handleCardPointerDown = useCallback(
    (card: LocalFallingCard, e: React.PointerEvent) => {
      // Ensure one selection per press (some browsers can retarget quickly when elements move)
      if (activePointerIdRef.current !== null) return;
      activePointerIdRef.current = e.pointerId;

      const releasePointer = () => {
        activePointerIdRef.current = null;
      };
      window.addEventListener('pointerup', releasePointer, { once: true });
      window.addEventListener('pointercancel', releasePointer, { once: true });

      // Capture the pointer so other cards can't receive events for this press
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      // Synchronous per-instance guard (works even if multiple events fire before React re-renders)
      if (pickedInstanceKeysRef.current.has(card.instanceKey)) return;

      // Global guard: prevents a single tap from selecting multiple overlapping cards
      const tNow = performance.now();
      if (tNow < globalPickLockUntil) return;

      // Hard cap (use ref to avoid stale prop in same-tick multi-dispatch)
      if (selectedCountRef.current >= 5) return;

      // Lock immediately
      globalPickLockUntil = tNow + PICK_LOCK_MS;
      pickedInstanceKeysRef.current.add(card.instanceKey);

      // Pointer event termination (avoid ghost double-trigger / bubbling)
      (e.nativeEvent as any)?.stopImmediatePropagation?.();
      e.preventDefault();
      e.stopPropagation();

      // Pointer-events 'none' propagation: block the whole falling-cards layer briefly
      const containerEl = containerRef.current;
      if (containerEl) {
        containerEl.style.pointerEvents = 'none';
        if (containerBlockTimeoutRef.current) {
          window.clearTimeout(containerBlockTimeoutRef.current);
        }
        containerBlockTimeoutRef.current = window.setTimeout(() => {
          if (containerRef.current) containerRef.current.style.pointerEvents = '';
        }, PARENT_POINTER_BLOCK_MS);
      }

      // Instant visual death + hitbox disable BEFORE any global selection logic
      const wrapper = cardElementsRef.current.get(card.instanceKey);
      if (wrapper) {
        wrapper.style.pointerEvents = 'none';
        wrapper.style.display = 'none';
      }
      const target = e.currentTarget as HTMLElement;
      target.style.pointerEvents = 'none';
      target.style.display = 'none';

      // Debug instrumentation (remove once confirmed)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[FallingCards] pick', {
          instanceKey: card.instanceKey,
          id: card.id,
          pointerId: e.pointerId,
          selectedCount: selectedCountRef.current,
          t: tNow,
        });
      }

      // Update touched state
      card.isTouched = true;

      playSound('cardSelect');
      onSelectCard(card);

      // Remove from refs
      cardsRef.current = cardsRef.current.filter((c) => c.instanceKey !== card.instanceKey);
      cardElementsRef.current.delete(card.instanceKey);
      triggerRender();
    },
    [onSelectCard, playSound, triggerRender]
  );

  // Get current cards for render
  const visibleCards = cardsRef.current;

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 overflow-hidden touch-none">
      {visibleCards.map((card) => (
        <div
          key={card.instanceKey}
          ref={(el) => {
            if (el) cardElementsRef.current.set(card.instanceKey, el);
            else cardElementsRef.current.delete(card.instanceKey);
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rotation}deg)`,
            willChange: "transform",
          }}
          className="z-10 relative"
        >
          {/* Visual card (never receives pointer events) */}
          <PlayingCard card={card} size="md" animate={false} className="pointer-events-none" />

          {/* Click hitbox: center 70% only (15% inset per side) */}
          <div
            onPointerDown={(e) => handleCardPointerDown(card, e)}
            style={{
              position: 'absolute',
              inset: `${HITBOX_INSET_PERCENT}%`,
              borderRadius: 12,
            }}
            className="cursor-pointer touch-none"
            role="button"
            aria-label={`Select ${card.rank} of ${card.suit}`}
          />
        </div>
      ))}
    </div>
  );
}