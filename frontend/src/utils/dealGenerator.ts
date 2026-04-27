import type { Card, Suit, PlayerPosition, PlayedCard } from '../types';
import { SUITS, RANKS, cardsEqual } from '../types';
import type { Trick } from '../types';
import { computeInference } from './inferenceEngine';

export type OpponentHands = Record<'west' | 'north' | 'east', Card[]>;

const OPPONENTS = ['west', 'north', 'east'] as const;

/** How many cards each opponent still holds, derived from trick history. */
function computeHandSizes(
  tricks: Trick[],
  currentTrick: PlayedCard[],
): Record<'west' | 'north' | 'east', number> {
  const played: Record<'west' | 'north' | 'east', number> = { west: 0, north: 0, east: 0 };
  for (const trick of tricks) {
    for (const { player } of trick.cards) {
      if (player !== 'south' && player in played) played[player as 'west' | 'north' | 'east']++;
    }
  }
  for (const { player } of currentTrick) {
    if (player !== 'south' && player in played) played[player as 'west' | 'north' | 'east']++;
  }
  return {
    west: Math.max(0, 13 - played.west),
    north: Math.max(0, 13 - played.north),
    east: Math.max(0, 13 - played.east),
  };
}

/** Fisher-Yates shuffle (in-place). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate one plausible deal for the three opponents, consistent with:
 *   - Cards already played (excluded from pool)
 *   - South's known hand (excluded from pool)
 *   - Each opponent's known void suits (from inference)
 *   - Each opponent's remaining hand size
 *
 * Returns null if constraints can't be satisfied (rare; caller should skip and retry).
 */
export function generateDeal(
  myHand: Card[],
  playedCards: Card[],
  tricks: Trick[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
): OpponentHands | null {
  // Build remaining pool: all 52 cards minus my hand and already-played cards
  const pool: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const c: Card = { suit, rank };
      if (!myHand.some(h => cardsEqual(h, c)) && !playedCards.some(p => cardsEqual(p, c))) {
        pool.push(c);
      }
    }
  }

  shuffle(pool);

  const handSizes = computeHandSizes(tricks, currentTrick);
  const inference = computeInference(tricks, currentTrick, trumpSuit);

  // Convert void Sets to arrays for fast lookup
  const voids: Record<'west' | 'north' | 'east', Set<Suit>> = {
    west: inference.west.voidSuits,
    north: inference.north.voidSuits,
    east: inference.east.voidSuits,
  };

  const hands: OpponentHands = { west: [], north: [], east: [] };

  // Process most-constrained opponent first (fewest eligible cards)
  const order = [...OPPONENTS].sort((a, b) => {
    const eligibleA = pool.filter(c => !voids[a].has(c.suit)).length;
    const eligibleB = pool.filter(c => !voids[b].has(c.suit)).length;
    return eligibleA - eligibleB;
  });

  const used = new Set<string>();

  for (const player of order) {
    const needed = handSizes[player];
    if (needed === 0) continue;

    const eligible = pool.filter(c => {
      const id = `${c.suit}_${c.rank}`;
      return !voids[player].has(c.suit) && !used.has(id);
    });

    if (eligible.length < needed) return null; // constraint violation

    // Take the first `needed` cards from the shuffled eligible set
    const selected = eligible.slice(0, needed);
    hands[player] = selected;
    for (const c of selected) used.add(`${c.suit}_${c.rank}`);
  }

  return hands;
}
