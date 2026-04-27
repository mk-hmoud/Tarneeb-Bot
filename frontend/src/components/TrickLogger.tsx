import React, { useState, useEffect } from 'react';
import type { Card, Suit, Rank, PlayerPosition, PlayedCard } from '../types';
import { SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS, RANK_VALUES } from '../types';
import { CheckCircle2, PlusCircle } from 'lucide-react';

interface TrickLoggerProps {
  currentTrick: PlayedCard[];
  playedCards: Card[];
  trumpSuit: Suit | null;
  southPlayed: boolean; // whether the user (south) has already played this trick
  onRecord: (player: PlayerPosition, card: Card) => void;
}

const OPPONENTS: { pos: 'west' | 'north' | 'east'; label: string; short: string }[] = [
  { pos: 'west', label: 'West', short: 'W' },
  { pos: 'north', label: 'North (Partner)', short: 'N' },
  { pos: 'east', label: 'East', short: 'E' },
];

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

function getLoggedCard(trick: PlayedCard[], player: PlayerPosition): Card | undefined {
  return trick.find(p => p.player === player)?.card;
}

function firstUnloggedOpponent(
  trick: PlayedCard[],
): 'west' | 'north' | 'east' | null {
  for (const o of OPPONENTS) {
    if (!getLoggedCard(trick, o.pos)) return o.pos;
  }
  return null;
}

export const TrickLogger: React.FC<TrickLoggerProps> = ({
  currentTrick,
  playedCards,
  trumpSuit,
  southPlayed,
  onRecord,
}) => {
  const [expanded, setExpanded] = useState<'west' | 'north' | 'east' | null>(null);

  // Derive led suit from first card in trick
  const ledSuit: Suit | null = currentTrick.length > 0 ? currentTrick[0].card.suit : null;

  // Auto-expand next unlogged opponent when trick changes
  useEffect(() => {
    const next = firstUnloggedOpponent(currentTrick);
    if (next && !getLoggedCard(currentTrick, expanded ?? 'south')) {
      setExpanded(next);
    }
    if (!next) setExpanded(null);
  }, [currentTrick.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCardAvailable = (card: Card): boolean =>
    !playedCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);

  const handleRecord = (player: 'west' | 'north' | 'east', card: Card) => {
    onRecord(player, card);
    // Auto-advance to next unlogged opponent
    const nextTrick = [...currentTrick, { player, card }];
    const next = firstUnloggedOpponent(nextTrick);
    setExpanded(next);
  };

  // Suits sorted with led suit first
  const sortedSuits: Suit[] = ledSuit
    ? [ledSuit, ...SUIT_ORDER.filter(s => s !== ledSuit)]
    : SUIT_ORDER;

  // Ranks sorted high-to-low for easy scanning
  const ranksHighToLow: Rank[] = [...RANKS].reverse();

  const allOpponentsLogged = OPPONENTS.every(o => getLoggedCard(currentTrick, o.pos));

  if (allOpponentsLogged) return null;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
      {/* Header strip — 3 player slots */}
      <div className="flex items-stretch divide-x divide-white/10">
        {OPPONENTS.map(({ pos, label, short }) => {
          const logged = getLoggedCard(currentTrick, pos);
          const isActive = expanded === pos;

          return (
            <button
              key={pos}
              onClick={() => setExpanded(isActive ? null : pos)}
              className={`
                flex-1 flex items-center justify-between px-4 py-3 transition-all
                ${isActive
                  ? 'bg-blue-600/20 border-b-2 border-blue-500'
                  : logged
                    ? 'bg-emerald-600/10 hover:bg-emerald-600/15'
                    : 'bg-white/5 hover:bg-white/10'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                  ${pos === 'north' ? 'bg-blue-600' : 'bg-rose-700'}
                `}>
                  {short}
                </div>
                <span className="text-xs font-bold text-white/70 hidden sm:inline">{label}</span>
              </div>

              {logged ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-black ${SUIT_COLORS[logged.suit] === 'red' ? 'text-rose-400' : 'text-white'}`}>
                    {SUIT_SYMBOLS[logged.suit]}{logged.rank}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <PlusCircle className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-white/30'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded card picker */}
      {expanded && !getLoggedCard(currentTrick, expanded) && (
        <div className="p-3 bg-black/20 animate-fade-in">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">
            {OPPONENTS.find(o => o.pos === expanded)?.label} played
          </p>
          <div className="space-y-1.5">
            {sortedSuits.map(suit => {
              const isLed = suit === ledSuit;
              const isTrump = suit === trumpSuit;
              const color = SUIT_COLORS[suit];

              return (
                <div
                  key={suit}
                  className={`
                    flex items-center gap-2 px-2 py-1.5 rounded-xl
                    ${isLed ? 'bg-blue-600/15 ring-1 ring-blue-500/30' : isTrump ? 'bg-amber-500/10' : 'bg-white/5'}
                  `}
                >
                  {/* Suit symbol */}
                  <span className={`
                    text-base w-6 text-center shrink-0 font-bold
                    ${color === 'red' ? 'text-rose-400' : 'text-white/80'}
                    ${isTrump ? 'text-amber-400' : ''}
                  `}>
                    {SUIT_SYMBOLS[suit]}
                  </span>

                  {/* Rank buttons */}
                  <div className="flex flex-wrap gap-1 flex-1">
                    {ranksHighToLow.map(rank => {
                      const card: Card = { suit, rank };
                      const available = isCardAvailable(card);
                      return (
                        <button
                          key={rank}
                          disabled={!available}
                          onClick={() => available && handleRecord(expanded, card)}
                          className={`
                            w-8 h-7 rounded-lg text-xs font-black transition-all
                            ${available
                              ? color === 'red'
                                ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-500 hover:text-white active:scale-95'
                                : 'bg-white/10 text-white/80 hover:bg-blue-600 hover:text-white active:scale-95'
                              : 'bg-transparent text-white/10 cursor-not-allowed line-through'
                            }
                            ${isTrump && available ? 'ring-1 ring-amber-500/40' : ''}
                          `}
                        >
                          {rank}
                        </button>
                      );
                    })}
                  </div>

                  {/* Labels */}
                  <div className="flex gap-1 shrink-0">
                    {isLed && (
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">LED</span>
                    )}
                    {isTrump && (
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">TRUMP</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
