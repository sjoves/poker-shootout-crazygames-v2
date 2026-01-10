import React, { useEffect, useCallback, useRef, useState } from "react";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";
import { useAudio } from "@/contexts/AudioContext";

// ============= DEBUG INSTRUMENTATION =============
// Enable via ?debugInput=1 in URL
const isDebugInput = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugInput');

interface DebugEvent {
  seq: number;
  source: string;
  action: string;
  cardId?: string;
  instanceKey?: string;
  pointerId?: number;
  pointerType?: string;
  isPrimary?: boolean;
  buttons?: number;
  nativeTs?: number;
  perfNow: number;
  dateNow: number;
  selectedCount?: number;
  extra?: string;
}

let debugEventSeq = 0;
const debugLog: DebugEvent[] = [];
const MAX_DEBUG_LOG = 100;

function logDebugEvent(event: Omit<DebugEvent, 'seq' | 'perfNow' | 'dateNow'>) {
  if (!isDebugInput) return;
  const entry: DebugEvent = {
    ...event,
    seq: ++debugEventSeq,
    perfNow: performance.now(),
    dateNow: Date.now(),
  };
  debugLog.push(entry);
  if (debugLog.length > MAX_DEBUG_LOG) debugLog.shift();
  // eslint-disable-next-line no-console
  console.log(`[DEBUG ${entry.seq}] ${entry.source} | ${entry.action}`, entry);
}

// Expose debug log to console for inspection
if (isDebugInput && typeof window !== 'undefined') {
  (window as any).__fallingCardsDebugLog = debugLog;
}
// ============= END DEBUG INSTRUMENTATION =============

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

// Atomic boolean lock (no time-based gating)
let isSelectingGlobal = false;

// Native event timestamp deduplication
let lastNativeEventTs = 0;
let lastNativePointerId = -1;

// Card dimensions for hit-testing
const CARD_WIDTH = 76;
const CARD_HEIGHT = 106;

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

  // Keep latest deck in a ref so internal callbacks don't change identity on every deck update
  const deckRef = useRef<Card[]>(deck);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  // Use refs for card positions to avoid React state updates on every frame
  const cardsRef = useRef<LocalFallingCard[]>([]);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pickedInstanceKeysRef = useRef<Set<string>>(new Set());

  // IMPORTANT: decouple falling simulation from parent state updates.
  // We track selected ids + deck length in refs so effects/callbacks don't churn.
  const selectedIdsRef = useRef<Set<string>>(new Set(selectedCardIds));
  const selectedCountRef = useRef<number>(selectedCardIds.length);
  const deckLengthRef = useRef<number>(deck.length);

  const activePointerIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const spawnCountRef = useRef<number>(0);
  const { playSound } = useAudio();

  useEffect(() => {
    selectedIdsRef.current = new Set(selectedCardIds);
    selectedCountRef.current = selectedCardIds.length;
  }, [selectedCardIds]);

  useEffect(() => {
    deckLengthRef.current = deck.length;
  }, [deck.length]);

  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger((v) => v + 1), []);

  // Exhaustive deck system: shuffled queue of cards to deal
  const shuffledDeckRef = useRef<Card[]>([]);
  const dealtCardIdsRef = useRef<Set<string>>(new Set());

  // Initialize/reshuffle the deck
  const reshuffleDeck = useCallback(() => {
    // IMPORTANT: use deckRef so reshuffleDeck doesn't change identity every time deck updates
    shuffledDeckRef.current = fisherYatesShuffle(deckRef.current);
    dealtCardIdsRef.current.clear();
  }, []);

  // Reset shuffled deck on reshuffle trigger - but DON'T clear visible falling cards
  useEffect(() => {
    reshuffleDeck();
    // Only clear picked tracking, not the visible cards themselves
    pickedInstanceKeysRef.current.clear();
    isSelectingGlobal = false;
    // Don't clear cardsRef.current - let existing cards continue falling
  }, [reshuffleTrigger, reshuffleDeck]);

  // NOTE: We intentionally do NOT clear cardsRef based on parent deck length.
  // Hand submission / deck refills are global state updates and should not wipe
  // the currently falling instances. The falling pool is only mutated by:
  // - the internal animation loop (off-screen cleanup)
  // - an explicit pick of a specific instanceKey
  // If you need a hard reset, use reshuffleTrigger (which reshuffles the deal queue)
  // plus a parent-level remount/reset signal.


  // Deal next card from shuffled deck - completely hand-blind
  const dealNextCard = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      // Find next card in shuffled deck that hasn't been dealt or selected
      let picked: Card | null = null;

      while (shuffledDeckRef.current.length > 0) {
        const candidate = shuffledDeckRef.current.shift()!;

        // Skip if already selected by player (read from ref to avoid callback churn)
        if (selectedIdsRef.current.has(candidate.id)) {
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
        const availableForReshuffle = deckRef.current.filter(
          (c) => !selectedIdsRef.current.has(c.id)
        );
        shuffledDeckRef.current = fisherYatesShuffle(availableForReshuffle);
        dealtCardIdsRef.current.clear();

        // Try to get next card from reshuffled deck
        while (shuffledDeckRef.current.length > 0) {
          const candidate = shuffledDeckRef.current.shift()!;
          if (!selectedIdsRef.current.has(candidate.id)) {
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
    [effectiveSpeed]
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

      for (const card of cardsRef.current) {
        // Update position directly
        card.y += card.speed;
        card.rotation += card.rotationSpeed;
        card.x += Math.sin((t / 1000) * card.swaySpeed) * 0.35;

        // Update DOM element directly if it exists
        const element = cardElementsRef.current.get(card.instanceKey);
        if (element) {
          element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rotation}deg)`;
        }

        // Check bounds - card fell off screen, allow it to be dealt again
        if (card.y > containerHeight + 60) {
          dealtCardIdsRef.current.delete(card.id);
          needsRender = true;
          continue;
        }

        // Only remove cards that were picked via our own pointer handler
        // Do NOT filter based on selectedCardIds - that causes other cards to disappear
        if (pickedInstanceKeysRef.current.has(card.instanceKey)) {
          needsRender = true;
          continue;
        }

        movedCards.push(card);
      }

      // Check if we need to spawn
      const shouldSpawn = t - lastSpawnRef.current > 600 / effectiveSpeed;
      if (shouldSpawn && movedCards.length < 14 && deckLengthRef.current > 0) {
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
  }, [isPaused, effectiveSpeed, dealNextCard, triggerRender]);

  // =========================================================================
  // DELEGATED TAP HANDLER: single container-level listener, hit-test cards
  // =========================================================================
  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const nativeTs = e.nativeEvent.timeStamp;
      
      // Debug: log every handler invocation
      logDebugEvent({
        source: 'FallingCards',
        action: 'handler_enter',
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
        buttons: e.buttons,
        nativeTs,
        selectedCount: selectedCountRef.current,
      });

      // NATIVE EVENT DEDUPLICATION: same pointer + same native timestamp = same physical event
      if (e.pointerId === lastNativePointerId && Math.abs(nativeTs - lastNativeEventTs) < 5) {
        logDebugEvent({ source: 'FallingCards', action: 'BLOCKED_native_dupe', pointerId: e.pointerId, nativeTs });
        return;
      }

      // Block if we're already processing a tap
      if (activePointerIdRef.current !== null) {
        logDebugEvent({ source: 'FallingCards', action: 'BLOCKED_active_pointer', pointerId: e.pointerId });
        return;
      }

      // Atomic lock - reject if already processing
      if (isSelectingGlobal) {
        logDebugEvent({ source: 'FallingCards', action: 'BLOCKED_atomic_lock', pointerId: e.pointerId });
        return;
      }
      isSelectingGlobal = true;

      try {
        // Hand is full
        if (selectedCountRef.current >= 5) {
          logDebugEvent({ source: 'FallingCards', action: 'BLOCKED_hand_full', selectedCount: selectedCountRef.current });
          return;
        }

        // Get pointer position relative to container
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        const pointerX = e.clientX - containerRect.left;
        const pointerY = e.clientY - containerRect.top;

        // Hit-test: find the top-most card under the pointer (highest z-index = last in array)
        let hitCard: LocalFallingCard | null = null;
        for (let i = cardsRef.current.length - 1; i >= 0; i--) {
          const card = cardsRef.current[i];
          // Already picked?
          if (pickedInstanceKeysRef.current.has(card.instanceKey)) continue;
          // Bounding box test (ignore rotation for simplicity)
          if (
            pointerX >= card.x &&
            pointerX <= card.x + CARD_WIDTH &&
            pointerY >= card.y &&
            pointerY <= card.y + CARD_HEIGHT
          ) {
            hitCard = card;
            break; // top-most wins
          }
        }

        if (!hitCard) {
          logDebugEvent({ source: 'FallingCards', action: 'no_hit', extra: `pos(${pointerX.toFixed(0)},${pointerY.toFixed(0)})` });
          return;
        }

        // UPDATE NATIVE EVENT TRACKING
        lastNativeEventTs = nativeTs;
        lastNativePointerId = e.pointerId;

        // Lock pointer
        activePointerIdRef.current = e.pointerId;
        const releasePointer = () => {
          activePointerIdRef.current = null;
        };
        window.addEventListener('pointerup', releasePointer, { once: true });
        window.addEventListener('pointercancel', releasePointer, { once: true });

        pickedInstanceKeysRef.current.add(hitCard.instanceKey);

        // Event termination
        e.preventDefault();
        e.stopPropagation();
        (e.nativeEvent as any)?.stopImmediatePropagation?.();

        // Instant visual removal (opacity: 0 for hardware-accelerated hide)
        const wrapper = cardElementsRef.current.get(hitCard.instanceKey);
        if (wrapper) {
          wrapper.style.opacity = '0';
          wrapper.style.pointerEvents = 'none';
        }

        logDebugEvent({
          source: 'FallingCards',
          action: 'ACCEPTED_pick',
          cardId: hitCard.id,
          instanceKey: hitCard.instanceKey,
          pointerId: e.pointerId,
          nativeTs,
          selectedCount: selectedCountRef.current,
        });

        hitCard.isTouched = true;
        playSound('cardSelect');
        onSelectCard(hitCard);

        // Remove from refs
        cardsRef.current = cardsRef.current.filter((c) => c.instanceKey !== hitCard!.instanceKey);
        cardElementsRef.current.delete(hitCard.instanceKey);
        triggerRender();
      } finally {
        // Release lock in next microtask
        queueMicrotask(() => {
          isSelectingGlobal = false;
        });
      }
    },
    [onSelectCard, playSound, triggerRender]
  );

  // Get current cards for render
  const visibleCards = cardsRef.current;

  return (
    <div
      ref={containerRef}
      onPointerDown={handleContainerPointerDown}
      className="absolute inset-0 z-20 overflow-hidden touch-none cursor-pointer"
    >
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
            willChange: "transform, opacity",
            pointerEvents: 'none', // all pointer events handled by container
          }}
          className="z-10 relative"
        >
          <PlayingCard card={card} size="md" animate={false} className="pointer-events-none" />
        </div>
      ))}
    </div>
  );
}