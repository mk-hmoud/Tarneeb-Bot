// Card suit and rank types
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player positions
export type PlayerPosition = 'south' | 'west' | 'north' | 'east';

// Game phase
export type GamePhase = 'bidding' | 'playing' | 'finished';

// Bid information
export interface Bid {
  player: PlayerPosition;
  tricks: number;
  trump: Suit;
  isWinning: boolean;
}

// Trick information
export interface PlayedCard {
  player: PlayerPosition;
  card: Card;
}

export interface Trick {
  cards: PlayedCard[];
  winner: PlayerPosition | null;
  engineRec?: { card: Card; winRate?: number } | null;
}

// Game state
export interface GameState {
  phase: GamePhase;
  
  // Player's hand
  playerHand: Card[];
  
  // Bidding
  bids: Bid[];
  winningBid: Bid | null;
  currentBidder: PlayerPosition | null;
  
  // Trump suit (from winning bid)
  trumpSuit: Suit | null;
  
  // Player's bid
  playerBid: number | null;
  
  // Current trick
  currentTrick: PlayedCard[];
  trickLeader: PlayerPosition | null;
  currentPlayer: PlayerPosition | null;
  
  // Tricks won by each team
  teamTricks: {
    team1: number; // South + North
    team2: number; // West + East
  };
  
  // Played cards history (for card counting)
  playedCards: Card[];
  
  // All tricks (for history)
  tricks: Trick[];
  
  // Scores
  scores: {
    team1: number;
    team2: number;
  };
  
  // Recommendation
  recommendation: Recommendation | null;
}

export interface Recommendation {
  card: Card;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  alternativeCards?: Card[];
  /** Win rate from IS-MCTS (0–1). Present only when deep analysis is complete. */
  winRate?: number;
  /** How many simulations were run. */
  simulations?: number;
}

// Card selection for setup
export interface CardSelection {
  suit: Suit;
  ranks: Rank[];
}

// Helper functions
export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣'
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  spades: 'black',
  clubs: 'black',
  hearts: 'red',
  diamonds: 'red'
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export function cardId(card: Card): string {
  return `${card.suit}_${card.rank}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function isCardPlayed(card: Card, playedCards: Card[]): boolean {
  return playedCards.some(pc => cardsEqual(pc, card));
}

export function getRemainingCards(playedCards: Card[]): Card[] {
  const allCards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      allCards.push({ suit, rank });
    }
  }
  return allCards.filter(c => !isCardPlayed(c, playedCards));
}

export function sortCards(cards: Card[]): Card[] {
  return cards.sort((a, b) => {
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });
}

export function groupCardsBySuit(cards: Card[]): Record<Suit, Card[]> {
  const grouped: Record<Suit, Card[]> = {
    spades: [],
    hearts: [],
    diamonds: [],
    clubs: []
  };
  for (const card of cards) {
    grouped[card.suit].push(card);
  }
  return grouped;
}