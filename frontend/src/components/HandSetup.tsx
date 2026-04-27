import React from 'react';
import type { Card, Suit, Rank } from '../types';
import { SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS, sortCards } from '../types';
import { Card as CardComponent } from './Card';
import { Play, RotateCcw, Check, Sparkles } from 'lucide-react';

interface HandSetupProps {
  selectedCards: Card[];
  onCardToggle: (card: Card) => void;
  onClear: () => void;
  onStartGame: () => void;
}

export const HandSetup: React.FC<HandSetupProps> = ({
  selectedCards,
  onCardToggle,
  onClear,
  onStartGame,
}) => {
  const isSelected = (suit: Suit, rank: Rank) => {
    return selectedCards.some(c => c.suit === suit && c.rank === rank);
  };

  const getCard = (suit: Suit, rank: Rank): Card => ({ suit, rank });

  const cardCount = selectedCards.length;
  const isComplete = cardCount === 13;
  const progress = (cardCount / 13) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header Card */}
      <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-blue-600/20 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] -ml-32 -mb-32 rounded-full group-hover:bg-purple-600/20 transition-colors duration-1000"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl border border-white/20 ring-4 ring-blue-500/10">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Assemble Hand
                {isComplete && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 text-sm uppercase tracking-widest font-black">Ready</span>
                  </div>
                )}
              </h2>
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-2">
                Select exactly 13 cards from the deck below
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onClear}
              disabled={cardCount === 0}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border
                ${cardCount === 0
                  ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }
              `}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={onStartGame}
              disabled={!isComplete}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl
                ${isComplete
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/40 hover:scale-105 active:scale-95'
                  : 'bg-white/5 text-white/10 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-5 h-5 fill-current" />
              Begin Game
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-10 relative">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Selection Progress</span>
            <span className={`text-sm font-black tracking-tighter ${isComplete ? 'text-emerald-400' : 'text-blue-400'}`}>
              {cardCount} <span className="text-white/20">/</span> 13
            </span>
          </div>
          <div className="h-4 bg-black/40 rounded-full p-1 border border-white/5 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full relative ${
                isComplete 
                  ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600'
              }`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Suit Groups */}
      <div className="space-y-3">
        {SUITS.map((suit, index) => (
          <SuitRow
            key={suit}
            suit={suit}
            ranks={RANKS}
            selectedRanks={selectedCards
              .filter(c => c.suit === suit)
              .map(c => c.rank)}
            onRankToggle={(rank) => onCardToggle(getCard(suit, rank))}
            index={index}
          />
        ))}
      </div>

      {/* Selected Cards Preview */}
      {selectedCards.length > 0 && (
        <div className="mt-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Selected Cards
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortCards([...selectedCards]).map(card => (
              <div key={`${card.suit}_${card.rank}`} className="relative group">
                <CardComponent
                  card={card}
                  size="sm"
                  selected={true}
                  onClick={() => onCardToggle(card)}
                />
                <button
                  onClick={() => onCardToggle(card)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-sm flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                  title="Remove card"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SuitRowProps {
  suit: Suit;
  ranks: Rank[];
  selectedRanks: Rank[];
  onRankToggle: (rank: Rank) => void;
  index: number;
}

const SuitRow: React.FC<SuitRowProps> = ({
  suit,
  ranks,
  selectedRanks,
  onRankToggle,
  index,
}) => {
  const color = SUIT_COLORS[suit];
  const suitSymbol = SUIT_SYMBOLS[suit];
  const isSelected = (rank: Rank) => selectedRanks.includes(rank);
  const count = selectedRanks.length;

  const suitGradients = [
    'from-gray-700 to-gray-800',
    'from-red-900/40 to-red-800/20',
    'from-red-900/40 to-red-800/20',
    'from-gray-700 to-gray-800',
  ];

  return (
    <div className={`
      bg-gradient-to-r ${suitGradients[index]} 
      rounded-xl p-3 shadow-lg border transition-all duration-200
      ${color === 'red' ? 'border-red-800/30' : 'border-gray-700/50'}
      hover:shadow-xl
    `}>
      <div className="flex items-center gap-3">
        {/* Suit Label */}
        <div
          className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            text-2xl font-bold shadow-lg
            ${color === 'red' 
              ? 'bg-gradient-to-br from-red-600 to-red-800 text-red-200 shadow-red-900/30' 
              : 'bg-gradient-to-br from-gray-600 to-gray-800 text-gray-200 shadow-gray-900/30'
            }
          `}
        >
          {suitSymbol}
        </div>

        {/* Cards for this suit */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          {ranks.map(rank => {
            const selected = isSelected(rank);
            return (
              <button
                key={rank}
                onClick={() => onRankToggle(rank)}
                className={`suit-btn ${selected ? 'selected' : ''} ${color === 'red' && selected ? 'red' : ''}`}
              >
                {rank}
              </button>
            );
          })}
        </div>

        {/* Count Badge */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          text-sm font-bold
          ${count > 0
            ? color === 'red'
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
              : 'bg-gray-500 text-white shadow-lg shadow-gray-500/30'
            : 'bg-gray-700/50 text-gray-500'
          }
        `}>
          {count}
        </div>
      </div>
    </div>
  );
};