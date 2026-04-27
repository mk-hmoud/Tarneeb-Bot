import React from 'react';
import type { Card, Suit, PlayedCard, PlayerPosition, Recommendation } from '../types';
import { SUITS, SUIT_SYMBOLS, SUIT_COLORS, sortCards, groupCardsBySuit } from '../types';
import { Card as CardComponent, MiniCard } from './Card';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface GameTableProps {
  playerHand: Card[];
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  teamTricks: { team1: number; team2: number };
  playerBid: number | null;
  playedCards: Card[];
  recommendation: Recommendation | null;
  onPlayCard: (card: Card) => void;
  onAwardTrick: (winner: PlayerPosition) => void;
  onUndoLastPlay: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  playerHand,
  trumpSuit,
  currentTrick,
  teamTricks,
  playerBid,
  playedCards,
  recommendation,
  onPlayCard,
  onAwardTrick,
  onUndoLastPlay,
}) => {
  const sortedHand = sortCards([...playerHand]);
  const groupedHand = groupCardsBySuit(sortedHand);
  
  const getPlayerTrickCard = (player: PlayerPosition): Card | undefined => {
    return currentTrick.find(p => p.player === player)?.card;
  };

  const tricksNeeded = playerBid ? playerBid - teamTricks.team1 : 0;
  const progress = playerBid ? Math.round((teamTricks.team1 / playerBid) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trump & Bid */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className={`
              w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border
              ${trumpSuit 
                ? 'bg-amber-500 border-amber-300 text-white animate-bounce-subtle' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
              }
            `}>
              {trumpSuit ? SUIT_SYMBOLS[trumpSuit] : '?'}
            </div>
            <div className="flex-1">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Trump</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white capitalize">{trumpSuit || 'None'}</span>
                <span className="text-amber-500/50 font-bold text-xs">BID: {playerBid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="text-center">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">TEAM 1</p>
              <p className="text-4xl font-black text-white tabular-nums">{teamTricks.team1}</p>
            </div>
            
            <div className="flex flex-col items-center px-4">
              <div className="h-8 w-px bg-white/10 mb-2"></div>
              <span className="text-white/20 font-black text-xs italic">VS</span>
              <div className="h-8 w-px bg-white/10 mt-2"></div>
            </div>

            <div className="text-center">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">TEAM 2</p>
              <p className="text-4xl font-black text-white tabular-nums">{teamTricks.team2}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          {playerBid && (
            <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)] ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <span className="text-xl font-black text-white tabular-nums">{playedCards.length}</span>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Deck</p>
              <p className="text-xs font-bold text-white/60">Played</p>
            </div>
          </div>
          
          <button
            onClick={onUndoLastPlay}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      </div>

      {/* Main Game Table */}
      <div className="relative felt-table rounded-[3rem] p-6 md:p-12 shadow-2xl border-[12px] border-slate-900 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 left-4 w-24 h-24 border-t-2 border-l-2 border-white/5 rounded-tl-3xl pointer-events-none"></div>
        <div className="absolute top-4 right-4 w-24 h-24 border-t-2 border-r-2 border-white/5 rounded-tr-3xl pointer-events-none"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 border-b-2 border-l-2 border-white/5 rounded-bl-3xl pointer-events-none"></div>
        <div className="absolute bottom-4 right-4 w-24 h-24 border-b-2 border-r-2 border-white/5 rounded-br-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          {/* North player (Partner) */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex flex-col items-center gap-1 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 ring-4 ring-blue-900/30">
                N
              </div>
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Partner</span>
            </div>
            <div className="h-24 flex items-center justify-center">
              {getPlayerTrickCard('north') ? (
                <div className="animate-fade-in">
                  <MiniCard card={getPlayerTrickCard('north')!} isTrump={trumpSuit === getPlayerTrickCard('north')!.suit} />
                </div>
              ) : (
                <div className="w-14 h-20 rounded-xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/5 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Middle row - West, Center (trick), East */}
          <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
            {/* West player (Opponent) */}
            <div className="flex flex-col items-center -rotate-90 sm:rotate-0">
              <div className="flex flex-col items-center gap-1 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 ring-4 ring-rose-900/30">
                  W
                </div>
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Opponent</span>
              </div>
              <div className="h-24 flex items-center justify-center">
                {getPlayerTrickCard('west') ? (
                  <div className="animate-fade-in">
                    <MiniCard card={getPlayerTrickCard('west')!} isTrump={trumpSuit === getPlayerTrickCard('west')!.suit} />
                  </div>
                ) : (
                  <div className="w-14 h-20 rounded-xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/5 animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Center - Current trick display */}
            <div className="flex-1 px-4">
              <div className="glass-panel rounded-3xl p-6 min-h-[220px] flex items-center justify-center relative overflow-hidden group">
                {/* Center glow */}
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700"></div>
                
                {currentTrick.length === 0 ? (
                  <div className="text-center relative z-10 animate-fade-in">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center ring-1 ring-white/10">
                      <Sparkles className="w-8 h-8 text-blue-400/50" />
                    </div>
                    <p className="text-white/80 font-bold text-lg tracking-tight uppercase">New Trick</p>
                    <p className="text-white/40 text-xs mt-1">Waiting for play...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 w-full relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                      {currentTrick.map((played, idx) => (
                        <div key={idx} className="flex flex-col items-center animate-scale-in">
                          <MiniCard card={played.card} isTrump={trumpSuit === played.card.suit} />
                          <span className="text-white/40 text-[10px] mt-2 uppercase font-black tracking-widest">
                            {played.player}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Trick winner selection (when all 4 cards played) */}
                    {currentTrick.length === 4 && (
                      <div className="w-full animate-bounce-subtle">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                            Select Winner
                          </p>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap">
                          {(['south', 'west', 'north', 'east'] as PlayerPosition[]).map(player => (
                            <button
                              key={player}
                              onClick={() => onAwardTrick(player)}
                              className={`
                                px-5 py-2 rounded-full text-xs font-bold transition-all border-2
                                ${player === 'south' || player === 'north'
                                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500'
                                  : 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-500'
                                }
                              `}
                            >
                              {player === 'south' ? 'YOU' : player.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* East player (Opponent) */}
            <div className="flex flex-col items-center rotate-90 sm:rotate-0">
              <div className="flex flex-col items-center gap-1 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 ring-4 ring-rose-900/30">
                  E
                </div>
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Opponent</span>
              </div>
              <div className="h-24 flex items-center justify-center">
                {getPlayerTrickCard('east') ? (
                  <div className="animate-fade-in">
                    <MiniCard card={getPlayerTrickCard('east')!} isTrump={trumpSuit === getPlayerTrickCard('east')!.suit} />
                  </div>
                ) : (
                  <div className="w-14 h-20 rounded-xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/5 animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* South player (You) - Your hand */}
          <div className="mt-12">
            <div className="flex items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 ring-4 ring-emerald-900/30">
                S
              </div>
              <div>
                <span className="text-white font-bold uppercase tracking-widest text-sm">Your Hand</span>
                <p className="text-white/40 text-[10px] font-bold">{playerHand.length} CARDS REMAINING</p>
              </div>
            </div>
            
            {/* Cards grouped by suit */}
            <div className="space-y-4 max-w-5xl mx-auto">
              {(() => {
                // Determine led suit (first card played in current trick)
                const ledSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
                
                // Check if player has cards of led suit
                const hasLedSuit = ledSuit ? (groupedHand[ledSuit]?.length > 0) : false;
                
                return SUITS.map(suit => {
                  const cards = groupedHand[suit];
                  if (cards.length === 0) return null;
                  
                  const isTrump = trumpSuit === suit;
                  
                  // Must follow suit if possible
                  const mustFollowSuit = ledSuit && hasLedSuit;
                  const canPlaySuit = !mustFollowSuit || suit === ledSuit;
                  
                  return (
                    <div key={suit} className={`flex items-center gap-4 bg-black/20 p-2 rounded-2xl border ${canPlaySuit ? 'border-white/5' : 'border-red-900/20 opacity-50'}`}>
                      <div
                        className={`
                          w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-2xl border
                          ${isTrump 
                            ? 'bg-amber-500 border-amber-300 text-white ring-2 ring-amber-500/20' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                          }
                          ${!canPlaySuit ? 'opacity-30' : ''}
                        `}
                      >
                        {SUIT_SYMBOLS[suit]}
                      </div>
                      <div className="flex gap-2 flex-wrap flex-1">
                        {cards.map(card => {
                          const isRecommended = recommendation?.card.suit === card.suit && 
                                               recommendation?.card.rank === card.rank;
                          const isMyTurn = currentTrick.length < 4;
                          const canPlay = isMyTurn && canPlaySuit;
                          
                          return (
                            <div key={`${card.suit}_${card.rank}`} className={`transition-transform ${canPlay ? 'hover:-translate-y-2' : ''}`}>
                              <CardComponent
                                card={card}
                                size="md"
                                isTrump={isTrump}
                                isRecommended={isRecommended}
                                disabled={!canPlay}
                                onClick={() => canPlay && onPlayCard(card)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
              
              {sortedHand.length === 0 && (
                <div className="glass-panel rounded-2xl py-12 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-sm">Round Complete</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation panel */}
      {recommendation && (
        <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden group border-blue-500/20">
          <div className={`absolute inset-0 opacity-10 transition-colors duration-1000 ${
            recommendation.confidence === 'high' ? 'bg-emerald-500 animate-pulse' :
            recommendation.confidence === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
          }`}></div>
          
          <div className="flex items-start gap-6 relative z-10">
            <div className="flex-shrink-0 relative group-hover:scale-110 transition-transform duration-500">
              <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
              <CardComponent 
                card={recommendation.card} 
                size="md" 
                isTrump={trumpSuit === recommendation.card.suit}
                isRecommended={true}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                  <span className="text-xl font-black text-white tracking-tight uppercase">AI Recommendation</span>
                </div>
                <span className={`
                  px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] border
                  ${recommendation.confidence === 'high' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                    recommendation.confidence === 'medium' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                    'bg-blue-500/20 border-blue-500/50 text-blue-400'}
                `}>
                  {recommendation.confidence.toUpperCase()} CONFIDENCE
                </span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed font-medium italic">"{recommendation.reason}"</p>
              
              {recommendation.alternativeCards && recommendation.alternativeCards.length > 0 && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">Secondary Options</span>
                  <div className="flex gap-2">
                    {recommendation.alternativeCards.map((card, idx) => (
                      <span
                        key={idx}
                        className={`
                          px-3 py-1 rounded-lg text-xs font-bold border transition-colors
                          ${trumpSuit === card.suit 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-white/5 border-white/10 text-white/40'
                          }
                        `}
                      >
                        {SUIT_SYMBOLS[card.suit]} {card.rank}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card counter / Played cards summary */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg border border-gray-700">
        <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Cards Played ({playedCards.length}/52)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SUITS.map(suit => {
            const playedInSuit = playedCards.filter(c => c.suit === suit);
            const color = SUIT_COLORS[suit];
            const remaining = 13 - playedInSuit.length;
            
            return (
              <div key={suit} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg ${color === 'red' ? 'text-red-400' : 'text-gray-300'}`}>
                    {SUIT_SYMBOLS[suit]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    remaining === 0 ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {remaining} left
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {playedInSuit.map(card => (
                    <span
                      key={`${card.suit}_${card.rank}`}
                      className={`
                        text-xs px-1.5 py-0.5 rounded font-medium
                        ${color === 'red' ? 'bg-red-900/50 text-red-300' : 'bg-gray-600 text-gray-300'}
                      `}
                    >
                      {card.rank}
                    </span>
                  ))}
                  {playedInSuit.length === 0 && (
                    <span className="text-gray-600 text-xs italic">None played</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};