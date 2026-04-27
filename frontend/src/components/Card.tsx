import React from 'react';
import type { Card as CardType } from '../types';
import { SUIT_SYMBOLS, SUIT_COLORS, cardId } from '../types';

interface CardProps {
  card: CardType;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showSuit?: boolean;
  isTrump?: boolean;
  isRecommended?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
  showSuit = true,
  isTrump = false,
  isRecommended = false,
}) => {
  const color = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  
  const classNames = [
    'playing-card',
    color === 'red' ? 'red' : 'black',
    isTrump ? 'trump' : '',
    isRecommended ? 'recommended' : '',
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');
  
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };
  
  return (
    <div
      className={classNames}
      onClick={handleClick}
      data-card-id={cardId(card)}
      role="button"
      aria-label={`${card.rank} of ${card.suit}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Top-left corner */}
      <div className="card-corner-tl">
        <span>{card.rank}</span>
        {showSuit && <span style={{ fontSize: '8px' }}>{suitSymbol}</span>}
      </div>
      
      {/* Center */}
      <div className="card-center">
        {showSuit ? suitSymbol : card.rank}
      </div>
      
      {/* Bottom-right corner (inverted) */}
      <div className="card-corner-br">
        <span>{card.rank}</span>
        {showSuit && <span style={{ fontSize: '8px' }}>{suitSymbol}</span>}
      </div>
      
      {/* Trump badge */}
      {isTrump && !disabled && (
        <div className="trump-badge">★</div>
      )}
      
      {/* Recommended badge */}
      {isRecommended && !disabled && (
        <div className="recommended-badge">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Mini card for trick display
export const MiniCard: React.FC<{ card: CardType; isTrump?: boolean }> = ({ card, isTrump = false }) => {
  const color = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  
  return (
    <div
      className={`
        w-14 h-20 rounded-xl 
        flex flex-col items-center justify-center
        shadow-2xl border relative
        transition-all duration-300 hover:scale-110 hover:z-10
        ${isTrump 
          ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 shadow-amber-500/10' 
          : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }
        ${color === 'red' ? 'text-rose-600' : 'text-slate-900'}
      `}
    >
      <div className="absolute inset-1 border border-black/5 rounded-lg pointer-events-none"></div>
      <span className="absolute top-1.5 left-1.5 text-[10px] font-black tracking-tighter leading-none">{card.rank}</span>
      <span className="text-2xl font-bold drop-shadow-sm">{suitSymbol}</span>
      <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black tracking-tighter leading-none rotate-180">{card.rank}</span>
    </div>
  );
};

// Card back for hidden cards
export const CardBack: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-28',
  };
  
  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-xl
        bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900
        flex items-center justify-center
        shadow-lg
        border-2 border-blue-400
        relative overflow-hidden
      `}
    >
      <div className="absolute inset-1 border border-blue-400/30 rounded-lg"></div>
      <div className="absolute inset-2 border border-blue-400/20 rounded-md"></div>
      <span className="text-white/40 text-2xl relative z-10">✦</span>
    </div>
  );
};
