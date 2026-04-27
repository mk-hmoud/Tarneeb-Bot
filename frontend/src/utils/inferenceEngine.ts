import type { Suit, PlayerPosition, PlayedCard } from '../types';
import type { Trick } from '../types';
import { SUITS } from '../types';

export interface PlayerInference {
  /** Suits this player is known to be void in */
  voidSuits: Set<Suit>;
  /** How many trump cards this player has played */
  trumpsPlayed: number;
  /** How many tricks this player has played (cards seen) */
  cardsPlayed: number;
}

export interface GameInference {
  west: PlayerInference;
  north: PlayerInference;
  east: PlayerInference;
}

function emptyPlayerInference(): PlayerInference {
  return { voidSuits: new Set<Suit>(), trumpsPlayed: 0, cardsPlayed: 0 };
}

/**
 * Derives what we know about opponent and partner hands from observed plays.
 *
 * Core rule: suit following is mandatory in Tarneeb.
 * If a player plays suit X when suit Y was led (X ≠ Y), they are void in Y.
 * This applies even when Y = trump (void in trump means playing non-trump off trump lead).
 *
 * Led suit per trick = first card recorded in the trick (cards[0]).
 */
export function computeInference(
  completedTricks: Trick[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
): GameInference {
  const inference: GameInference = {
    west: emptyPlayerInference(),
    north: emptyPlayerInference(),
    east: emptyPlayerInference(),
  };

  const opponents: PlayerPosition[] = ['west', 'north', 'east'];

  const processTrick = (cards: PlayedCard[]) => {
    if (cards.length === 0) return;
    const ledSuit = cards[0].card.suit;

    for (const { player, card } of cards) {
      if (!opponents.includes(player)) continue;
      const inf = inference[player as 'west' | 'north' | 'east'];

      inf.cardsPlayed++;

      // Void detection: played off-suit when they could have followed
      if (card.suit !== ledSuit) {
        inf.voidSuits.add(ledSuit);
      }

      // Trump usage tracking
      if (trumpSuit && card.suit === trumpSuit) {
        inf.trumpsPlayed++;
      }
    }
  };

  for (const trick of completedTricks) {
    processTrick(trick.cards);
  }
  processTrick(currentTrick);

  return inference;
}

/**
 * Estimate how many trumps an opponent likely has remaining.
 * Uses their trump plays as a lower bound on depletion.
 * Without hand-composition data, we assume a baseline of 3 trumps/hand.
 */
export function estimateRemainingTrumps(
  player: 'west' | 'north' | 'east',
  inference: GameInference,
  globalTrumpsPlayed: number,
  totalTrumpsInDeck: number,
): number {
  const played = inference[player].trumpsPlayed;
  // Rough starting estimate: each player has (totalTrumpsInDeck / 4) trumps
  const startingEstimate = totalTrumpsInDeck / 4;
  return Math.max(0, startingEstimate - played);
}

/**
 * Returns true if ANY opponent (west or east) is known void in the given suit.
 * Partner (north) void is returned separately.
 */
export function opponentKnownVoid(suit: Suit, inference: GameInference): boolean {
  return inference.west.voidSuits.has(suit) || inference.east.voidSuits.has(suit);
}

export function partnerKnownVoid(suit: Suit, inference: GameInference): boolean {
  return inference.north.voidSuits.has(suit);
}

/**
 * Suits that no opponent is known void in (safer to lead).
 */
export function safeLeadSuits(inference: GameInference): Suit[] {
  return SUITS.filter(s => !opponentKnownVoid(s, inference));
}

/**
 * Total trump cards used by opponents (both opponents combined).
 * Useful for deciding when to pull trump.
 */
export function totalOpponentTrumpsPlayed(inference: GameInference): number {
  return inference.west.trumpsPlayed + inference.east.trumpsPlayed;
}
