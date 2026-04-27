import { useState } from 'react';
import type { Card, Suit, Rank, PlayerPosition } from '../types';
import { SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS } from '../types';
import { X, ChevronLeft, User, UserCheck, Users } from 'lucide-react';

interface OpponentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (player: PlayerPosition, card: Card) => void;
  playedCards: Card[];
}

export const OpponentCardModal: React.FC<OpponentCardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  playedCards,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPosition | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);

  if (!isOpen) return null;

  const isCardPlayed = (suit: Suit, rank: Rank) => {
    return playedCards.some(c => c.suit === suit && c.rank === rank);
  };

  const handleSubmit = (rank: Rank) => {
    if (selectedPlayer && selectedSuit) {
      onSubmit(selectedPlayer, { suit: selectedSuit, rank });
      setSelectedPlayer(null);
      setSelectedSuit(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    setSelectedSuit(null);
    onClose();
  };

  const players: { value: PlayerPosition; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      value: 'west', 
      label: 'West (Opponent)', 
      icon: <Users className="w-6 h-6" />,
      color: 'from-red-600 to-red-800'
    },
    { 
      value: 'north', 
      label: 'North (Partner)', 
      icon: <UserCheck className="w-6 h-6" />,
      color: 'from-blue-600 to-blue-800'
    },
    { 
      value: 'east', 
      label: 'East (Opponent)', 
      icon: <Users className="w-6 h-6" />,
      color: 'from-red-600 to-red-800'
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-panel rounded-[2rem] p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 max-h-[90vh] overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
                <User className="w-5 h-5 text-violet-400" />
              </div>
              Track Play
            </h2>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Manual observation record</p>
          </div>
          <button
            onClick={handleClose}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
          >
            <X className="w-6 h-6 text-white/40 group-hover:text-white" />
          </button>
        </div>

        {/* Step 1: Select Player */}
        {!selectedPlayer && (
          <div className="animate-scale-in">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Choose Actor</p>
            <div className="grid grid-cols-1 gap-3">
              {players.map(player => (
                <button
                  key={player.value}
                  onClick={() => setSelectedPlayer(player.value)}
                  className="w-full p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-left transition-all flex items-center gap-5 border border-white/5 group"
                >
                  <div className={`
                    w-14 h-14 rounded-2xl bg-gradient-to-br ${player.color} 
                    flex items-center justify-center text-white shadow-2xl border border-white/20 group-hover:scale-110 transition-transform
                  `}>
                    {player.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-black text-white tracking-tight">{player.label}</span>
                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-0.5">
                      {player.value === 'north' ? 'Strategic Ally' : 'Tactical Opponent'}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-white/10 rotate-180 group-hover:text-white/40 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Suit */}
        {selectedPlayer && !selectedSuit && (
          <div className="animate-scale-in">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="text-white/40 hover:text-white mb-6 flex items-center gap-2 transition-all font-black uppercase tracking-widest text-[10px] group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Actors
            </button>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Select Suit</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUITS.map(suit => (
                <button
                  key={suit}
                  onClick={() => setSelectedSuit(suit)}
                  className={`
                    p-6 rounded-2xl text-4xl font-bold transition-all border group
                    ${SUIT_COLORS[suit] === 'red'
                      ? 'bg-rose-600/10 border-rose-500/20 text-rose-500 hover:bg-rose-600/20 hover:border-rose-500/40 hover:scale-105 shadow-lg shadow-rose-500/5'
                      : 'bg-slate-800/20 border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:scale-105 shadow-lg'
                    }
                  `}
                >
                  <span className="block drop-shadow-xl">{SUIT_SYMBOLS[suit]}</span>
                  <span className="block text-[10px] font-black uppercase tracking-widest mt-3 opacity-40">{suit}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Rank */}
        {selectedPlayer && selectedSuit && (
          <div className="animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedSuit(null)}
                className="text-white/40 hover:text-white flex items-center gap-2 transition-all font-black uppercase tracking-widest text-[10px] group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Change Suit
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <span className={`text-xl ${SUIT_COLORS[selectedSuit] === 'red' ? 'text-rose-500' : 'text-white'}`}>
                  {SUIT_SYMBOLS[selectedSuit]}
                </span>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{selectedSuit}</span>
              </div>
            </div>
            
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Final Value</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {RANKS.map(rank => {
                const played = isCardPlayed(selectedSuit, rank);
                return (
                  <button
                    key={rank}
                    onClick={() => !played && handleSubmit(rank)}
                    disabled={played}
                    className={`
                      aspect-square rounded-xl font-black text-xs transition-all border
                      ${played
                        ? 'bg-white/5 border-transparent text-white/10 cursor-not-allowed line-through'
                        : SUIT_COLORS[selectedSuit] === 'red'
                          ? 'bg-rose-600/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:scale-110'
                          : 'bg-white/5 border-white/10 text-white hover:bg-blue-600 hover:border-blue-400 hover:scale-110'
                      }
                    `}
                  >
                    {rank}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Active Selection</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-black text-xl uppercase">{selectedPlayer}</span>
                  <span className="text-white/40 text-sm font-medium">playing in</span>
                  <span className={`text-xl font-black ${SUIT_COLORS[selectedSuit] === 'red' ? 'text-rose-500' : 'text-white'}`}>
                    {selectedSuit.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};