import React from 'react';
import type { Trick, Suit, PlayerPosition, Bid } from '../types';
import { SUIT_SYMBOLS, SUIT_COLORS, cardsEqual } from '../types';
import { Trophy, TrendingUp, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HandReviewProps {
  tricks: Trick[];
  playerBid: number | null;
  teamTricks: { team1: number; team2: number };
  trumpSuit: Suit | null;
  winningBid: Bid | null;
  onNewGame: () => void;
}

function cardLabel(card: { suit: Suit; rank: string }, trumpSuit: Suit | null): React.ReactNode {
  const sym = SUIT_SYMBOLS[card.suit];
  const isRed = SUIT_COLORS[card.suit] === 'red';
  const isTrump = trumpSuit === card.suit;
  return (
    <span className={`font-bold tabular-nums ${
      isTrump ? 'text-amber-400' : isRed ? 'text-rose-400' : 'text-white/80'
    }`}>
      {sym}{card.rank}
    </span>
  );
}

export const HandReview: React.FC<HandReviewProps> = ({
  tricks,
  playerBid,
  teamTricks,
  trumpSuit,
  winningBid,
  onNewGame,
}) => {
  const team1IsBidder = !winningBid || winningBid.player === 'south' || winningBid.player === 'north';
  const bidTricks = winningBid?.tricks ?? playerBid ?? 0;

  const madeIt = team1IsBidder
    ? teamTricks.team1 >= bidTricks
    : teamTricks.team2 < bidTricks;

  // Divergence stats
  let followed = 0;
  let diverged = 0;
  let followedTeam1Wins = 0;
  let divergedTeam1Wins = 0;

  for (const trick of tricks) {
    if (!trick.engineRec) continue;
    const southPlay = trick.cards.find(c => c.player === 'south')?.card;
    if (!southPlay) continue;
    const didFollow = cardsEqual(southPlay, trick.engineRec.card);
    const team1Won = trick.winner === 'south' || trick.winner === 'north';
    if (didFollow) {
      followed++;
      if (team1Won) followedTeam1Wins++;
    } else {
      diverged++;
      if (team1Won) divergedTeam1Wins++;
    }
  }

  const totalWithRec = followed + diverged;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Outcome header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Result card */}
        <div className={`glass-panel rounded-2xl p-6 shadow-2xl relative overflow-hidden border ${
          madeIt ? 'border-emerald-500/30' : 'border-rose-500/30'
        }`}>
          <div className={`absolute inset-0 opacity-10 ${madeIt ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          <div className="relative z-10 flex flex-col items-center text-center gap-3">
            {madeIt
              ? <CheckCircle className="w-10 h-10 text-emerald-400" />
              : <XCircle className="w-10 h-10 text-rose-400" />
            }
            <div>
              <p className={`text-2xl font-black uppercase tracking-tight ${madeIt ? 'text-emerald-300' : 'text-rose-300'}`}>
                {madeIt ? 'Made It!' : 'Set!'}
              </p>
              <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">
                Bid {bidTricks} · Won {team1IsBidder ? teamTricks.team1 : teamTricks.team2}
              </p>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="glass-panel rounded-2xl p-6 shadow-2xl">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center">Tricks Won</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Team 1</p>
              <p className="text-4xl font-black text-white">{teamTricks.team1}</p>
              <p className="text-white/30 text-[10px] mt-1">You + N</p>
            </div>
            <div className="text-white/20 font-black text-sm">VS</div>
            <div className="text-center">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-1">Team 2</p>
              <p className="text-4xl font-black text-white">{teamTricks.team2}</p>
              <p className="text-white/30 text-[10px] mt-1">W + E</p>
            </div>
          </div>
        </div>

        {/* Recommendation adherence */}
        <div className="glass-panel rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">AI Adherence</p>
          </div>
          {totalWithRec > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">Followed rec</span>
                <span className="text-emerald-400 font-black">{followed}/{totalWithRec}</span>
              </div>
              {followed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs">Tricks won (followed)</span>
                  <span className="text-white/60 font-bold text-xs">{followedTeam1Wins}/{followed}</span>
                </div>
              )}
              {diverged > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs">Tricks won (diverged)</span>
                  <span className="text-amber-400 font-bold text-xs">{divergedTeam1Wins}/{diverged}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/20 text-xs">No engine recs recorded</p>
          )}
        </div>
      </div>

      {/* Trick-by-trick breakdown */}
      <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Trick Breakdown</h2>
          {trumpSuit && (
            <span className="ml-auto text-amber-400 text-xs font-bold">
              Trump: {SUIT_SYMBOLS[trumpSuit]} {trumpSuit}
            </span>
          )}
        </div>

        <div className="divide-y divide-white/5">
          {tricks.map((trick, idx) => {
            const southPlay = trick.cards.find(c => c.player === 'south')?.card;
            const westPlay = trick.cards.find(c => c.player === 'west')?.card;
            const northPlay = trick.cards.find(c => c.player === 'north')?.card;
            const eastPlay = trick.cards.find(c => c.player === 'east')?.card;

            const hasRec = !!trick.engineRec && !!southPlay;
            const followed = hasRec && cardsEqual(southPlay!, trick.engineRec!.card);
            const team1Won = trick.winner === 'south' || trick.winner === 'north';

            return (
              <div
                key={idx}
                className={`flex items-center gap-4 px-6 py-3 transition-colors ${
                  hasRec && !followed ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-white/3'
                }`}
              >
                {/* Trick number */}
                <div className="w-8 flex-shrink-0 text-center">
                  <span className="text-white/25 text-xs font-black">{idx + 1}</span>
                </div>

                {/* Opponent cards */}
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center min-w-[32px]">
                    <span className="text-white/20 text-[9px] uppercase font-bold mb-0.5">W</span>
                    {westPlay ? cardLabel(westPlay, trumpSuit) : <span className="text-white/10">—</span>}
                  </div>
                  <div className="flex flex-col items-center min-w-[32px]">
                    <span className="text-white/20 text-[9px] uppercase font-bold mb-0.5">N</span>
                    {northPlay ? cardLabel(northPlay, trumpSuit) : <span className="text-white/10">—</span>}
                  </div>
                  <div className="flex flex-col items-center min-w-[32px]">
                    <span className="text-white/20 text-[9px] uppercase font-bold mb-0.5">E</span>
                    {eastPlay ? cardLabel(eastPlay, trumpSuit) : <span className="text-white/10">—</span>}
                  </div>
                </div>

                {/* South's play */}
                <div className="flex flex-col items-center min-w-[40px]">
                  <span className="text-emerald-400/50 text-[9px] uppercase font-bold mb-0.5">You</span>
                  {southPlay
                    ? <span className={`font-black text-sm ${
                        hasRec && !followed
                          ? 'text-amber-300'
                          : hasRec && followed
                            ? 'text-emerald-300'
                            : 'text-white/80'
                      }`}>
                        {SUIT_SYMBOLS[southPlay.suit]}{southPlay.rank}
                      </span>
                    : <span className="text-white/10">—</span>
                  }
                </div>

                {/* Engine rec */}
                <div className="flex flex-col items-center min-w-[48px]">
                  <span className="text-blue-400/40 text-[9px] uppercase font-bold mb-0.5">Engine</span>
                  {trick.engineRec ? (
                    <div className="flex items-center gap-1">
                      <span className={`font-bold text-sm ${
                        SUIT_COLORS[trick.engineRec.card.suit] === 'red' ? 'text-rose-400/70' : 'text-white/40'
                      }`}>
                        {SUIT_SYMBOLS[trick.engineRec.card.suit]}{trick.engineRec.card.rank}
                      </span>
                      {trick.engineRec.winRate !== undefined && (
                        <span className="text-[8px] text-white/20 font-bold">
                          {Math.round(trick.engineRec.winRate * 100)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-white/10 text-xs">—</span>
                  )}
                </div>

                {/* Divergence indicator */}
                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                  {hasRec && !followed && (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  {hasRec && followed && (
                    <CheckCircle className="w-4 h-4 text-emerald-500/40" />
                  )}
                </div>

                {/* Winner */}
                <div className="w-14 flex-shrink-0 text-right">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    team1Won
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {trick.winner === 'south' ? 'YOU' : trick.winner?.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New hand button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={onNewGame}
          className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-sm shadow-2xl shadow-blue-500/30 border border-white/10"
        >
          <RotateCcw className="w-5 h-5" />
          New Hand
        </button>
      </div>
    </div>
  );
};
