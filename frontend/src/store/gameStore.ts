import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, GameState, PlayerPosition, Suit, PlayedCard, Recommendation, Bid } from '../types';
import { cardsEqual } from '../types';

export type AppPhase = 'setup' | 'bidding' | 'playing' | 'review';

interface GameStore extends GameState {
  appPhase: AppPhase;
  setAppPhase: (phase: AppPhase) => void;

  // Transient: engine recommendation snapshotted when south plays, cleared after trick awarded
  southRecSnap: { card: Card; winRate?: number } | null;

  // Hand setup
  setPlayerHand: (cards: Card[]) => void;
  addCardToHand: (card: Card) => void;
  removeCardFromHand: (card: Card) => void;
  clearPlayerHand: () => void;

  // Bidding
  addBid: (bid: Bid) => void;
  setWinningBid: (bid: Bid) => void;
  setTrumpSuit: (suit: Suit) => void;
  startPlayingPhase: (bid: number, trump: Suit) => void;

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
}

const initialGameState: GameState & { appPhase: AppPhase; southRecSnap: { card: Card; winRate?: number } | null } = {
  appPhase: 'setup',
  southRecSnap: null,
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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,

      setAppPhase: (phase) => set({ appPhase: phase }),

      // Hand management
      setPlayerHand: (cards) => set({ playerHand: cards }),

      addCardToHand: (card) => {
        const state = get();
        if (!state.playerHand.some(c => cardsEqual(c, card))) {
          set({ playerHand: [...state.playerHand, card] });
        }
      },

      removeCardFromHand: (card) =>
        set({ playerHand: get().playerHand.filter(c => !cardsEqual(c, card)) }),

      clearPlayerHand: () => set({ playerHand: [] }),

      // Bidding
      addBid: (bid) => set({ bids: [...get().bids, bid] }),

      setWinningBid: (bid) => set({ winningBid: bid, trumpSuit: bid.trump }),

      setTrumpSuit: (suit) => set({ trumpSuit: suit }),

      startPlayingPhase: (bid, trump) =>
        set({
          phase: 'playing',
          playerBid: bid,
          trumpSuit: trump,
          teamTricks: { team1: 0, team2: 0 },
          currentTrick: [],
          playedCards: [],
          tricks: [],
        }),

      // Trick management
      setCurrentPlayer: (player) => set({ currentPlayer: player }),

      setTrickLeader: (player) => set({ trickLeader: player }),

      playCard: (player, card) => {
        const state = get();
        const newHand =
          player === 'south'
            ? state.playerHand.filter(c => !cardsEqual(c, card))
            : state.playerHand;
        const alreadyPlayed = state.playedCards.some(pc => cardsEqual(pc, card));
        const southRecSnap =
          player === 'south' && state.recommendation
            ? { card: state.recommendation.card, winRate: state.recommendation.winRate }
            : state.southRecSnap;
        set({
          playerHand: newHand,
          currentTrick: [...state.currentTrick, { player, card }],
          playedCards: alreadyPlayed ? state.playedCards : [...state.playedCards, card],
          southRecSnap,
        });
      },

      clearCurrentTrick: () => set({ currentTrick: [] }),

      awardTrick: (winner) => {
        const state = get();
        const isTeam1 = winner === 'south' || winner === 'north';
        const newTricks = [...state.tricks];
        if (state.currentTrick.length > 0) {
          newTricks.push({
            cards: state.currentTrick,
            winner,
            engineRec: state.southRecSnap ?? null,
          });
        }
        set({
          teamTricks: {
            team1: isTeam1 ? state.teamTricks.team1 + 1 : state.teamTricks.team1,
            team2: !isTeam1 ? state.teamTricks.team2 + 1 : state.teamTricks.team2,
          },
          trickLeader: winner,
          currentTrick: [],
          tricks: newTricks,
          southRecSnap: null,
        });
      },

      // Card tracking
      addPlayedCard: (card) => {
        const state = get();
        if (!state.playedCards.some(pc => cardsEqual(pc, card))) {
          set({ playedCards: [...state.playedCards, card] });
        }
      },

      addPlayedCards: (cards) => {
        const state = get();
        const newCards = cards.filter(c => !state.playedCards.some(pc => cardsEqual(pc, c)));
        set({ playedCards: [...state.playedCards, ...newCards] });
      },

      // Recommendation
      setRecommendation: (rec) => set({ recommendation: rec }),

      // Reset
      resetGame: () => set(initialGameState),
    }),
    {
      name: 'tarneeb-game',
      version: 1,
      partialize: (state) => {
        // Don't persist transient computed fields — they'll be recalculated
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { recommendation, southRecSnap, ...rest } = state;
        return rest;
      },
    }
  )
);
