import { create } from 'zustand';
import type { Card, GameState, PlayerPosition, Suit, PlayedCard, Recommendation, Bid } from '../types';
import { cardsEqual, cardId } from '../types';

interface GameStore extends GameState {
  // Hand setup
  setPlayerHand: (cards: Card[]) => void;
  addCardToHand: (card: Card) => void;
  removeCardFromHand: (card: Card) => void;
  clearPlayerHand: () => void;
  
  // Bidding
  setPlayerBid: (tricks: number, trump: Suit) => void;
  addBid: (bid: Bid) => void;
  setWinningBid: (bid: Bid) => void;
  setTrumpSuit: (suit: Suit) => void;
  startPlayingPhase: () => void;
  
  // Trick management
  setCurrentPlayer: (player: PlayerPosition) => void;
  setTrickLeader: (player: PlayerPosition) => void;
  playCard: (player: PlayerPosition, card: Card) => void;
  clearCurrentTrick: () => void;
  awardTrick: (winner: PlayerPosition) => void;
  
  // Card tracking
  addPlayedCard: (card: Card) => void;
  addPlayedCards: (cards: Card[]) => void;
  
  // Recommendation
  setRecommendation: (rec: Recommendation | null) => void;
  
  // Reset
  resetGame: () => void;
  resetAll: () => void;
}

const initialGameState: GameState = {
  phase: 'bidding',
  playerHand: [],
  bids: [],
  winningBid: null,
  currentBidder: null,
  trumpSuit: null,
  playerBid: null,
  currentTrick: [],
  trickLeader: null,
  currentPlayer: null,
  teamTricks: { team1: 0, team2: 0 },
  playedCards: [],
  tricks: [],
  scores: { team1: 0, team2: 0 },
  recommendation: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,

  // Hand management
  setPlayerHand: (cards: Card[]) => {
    set({ playerHand: cards });
  },

  addCardToHand: (card: Card) => {
    const state = get();
    if (!state.playerHand.some(c => cardsEqual(c, card))) {
      set({ playerHand: [...state.playerHand, card] });
    }
  },

  removeCardFromHand: (card: Card) => {
    set({
      playerHand: get().playerHand.filter(c => !cardsEqual(c, card))
    });
  },

  clearPlayerHand: () => {
    set({ playerHand: [] });
  },

  // Bidding
  setPlayerBid: (tricks: number, trump: Suit) => {
    set({ 
      playerBid: tricks,
      trumpSuit: trump,
    });
  },

  addBid: (bid: Bid) => {
    set({ bids: [...get().bids, bid] });
  },

  setWinningBid: (bid: Bid) => {
    set({ 
      winningBid: bid,
      trumpSuit: bid.trump,
    });
  },

  setTrumpSuit: (suit: Suit) => {
    set({ trumpSuit: suit });
  },

  startPlayingPhase: () => {
    set({ 
      phase: 'playing',
      teamTricks: { team1: 0, team2: 0 },
      currentTrick: [],
      playedCards: [],
      tricks: [],
    });
  },

  // Trick management
  setCurrentPlayer: (player: PlayerPosition) => {
    set({ currentPlayer: player });
  },

  setTrickLeader: (player: PlayerPosition) => {
    set({ trickLeader: player });
  },

  playCard: (player: PlayerPosition, card: Card) => {
    const state = get();
    
    // Remove card from hand if it's the player's card
    if (player === 'south') {
      set({
        playerHand: state.playerHand.filter(c => !cardsEqual(c, card))
      });
    }
    
    // Add to current trick
    set({
      currentTrick: [...state.currentTrick, { player, card }]
    });
    
    // Track played card
    if (!state.playedCards.some(pc => cardsEqual(pc, card))) {
      set({
        playedCards: [...state.playedCards, card]
      });
    }
  },

  clearCurrentTrick: () => {
    set({ currentTrick: [] });
  },

  awardTrick: (winner: PlayerPosition) => {
    const state = get();
    const isTeam1 = winner === 'south' || winner === 'north';
    
    set({
      teamTricks: {
        ...state.teamTricks,
        team1: isTeam1 ? state.teamTricks.team1 + 1 : state.teamTricks.team1,
        team2: !isTeam1 ? state.teamTricks.team2 + 1 : state.teamTricks.team2,
      },
      trickLeader: winner,
      currentTrick: [],
    });
    
    // Save trick to history
    const currentTrick = state.currentTrick;
    if (currentTrick.length > 0) {
      set({
        tricks: [...state.tricks, { cards: currentTrick, winner }]
      });
    }
  },

  // Card tracking
  addPlayedCard: (card: Card) => {
    const state = get();
    if (!state.playedCards.some(pc => cardsEqual(pc, card))) {
      set({
        playedCards: [...state.playedCards, card]
      });
    }
  },

  addPlayedCards: (cards: Card[]) => {
    const state = get();
    const newPlayedCards = cards.filter(
      c => !state.playedCards.some(pc => cardsEqual(pc, c))
    );
    set({
      playedCards: [...state.playedCards, ...newPlayedCards]
    });
  },

  // Recommendation
  setRecommendation: (rec: Recommendation | null) => {
    set({ recommendation: rec });
  },

  // Reset
  resetGame: () => {
    set({
      ...initialGameState,
    });
  },

  resetAll: () => {
    set(initialGameState);
  },
}));