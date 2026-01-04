import { memo } from "react";
import type { Card, Suit } from "@/types/game";
import { cn } from "@/lib/utils";

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_COLOR_CLASS: Record<Suit, string> = {
  hearts: "text-[hsl(var(--suit-hearts))]",
  diamonds: "text-[hsl(var(--suit-diamonds))]",
  clubs: "text-[hsl(var(--suit-clubs))]",
  spades: "text-[hsl(var(--suit-spades))]",
};

const SIZE_CONFIG = {
  ssc: { card: "w-[68px] h-[95px]", rank: "text-sm", corner: "text-[10px]", center: "text-2xl" },
  sd: { card: "w-[85px] h-[119px]", rank: "text-base", corner: "text-xs", center: "text-3xl" },
} as const;

type TutorialCardSize = keyof typeof SIZE_CONFIG;

interface TutorialCardProps {
  card: Card;
  size?: TutorialCardSize;
  className?: string;
}

export const TutorialCard = memo(function TutorialCard({ card, size = "ssc", className }: TutorialCardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const config = SIZE_CONFIG[size];
  const suitColorClass = SUIT_COLOR_CLASS[card.suit];

  return (
    <div
      className={cn(
        config.card,
        "relative rounded-lg bg-primary-foreground shadow-lg",
        "flex items-center justify-center",
        "border border-border/30",
        "select-none",
        suitColorClass,
        className
      )}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      {/* Top-left corner */}
      <div className={cn("absolute top-0.5 left-1 flex flex-col items-center leading-none")} aria-hidden="true">
        <span className={cn("font-bold", config.rank)}>{card.rank}</span>
        <span className={cn("font-bold", config.corner)}>{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <span className={cn(config.center, "font-normal")} aria-hidden="true">
        {suitSymbol}
      </span>

      {/* Bottom-right corner (inverted) */}
      <div
        className={cn("absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180")}
        aria-hidden="true"
      >
        <span className={cn("font-bold", config.rank)}>{card.rank}</span>
        <span className={cn("font-bold", config.corner)}>{suitSymbol}</span>
      </div>
    </div>
  );
});

