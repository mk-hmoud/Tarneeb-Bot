import type { Card, Suit, PlayerPosition, PlayedCard } from '../types';
import { RANK_VALUES, cardsEqual } from '../types';
import type { OpponentHands } from './dealGenerator';

type AllHands = Record<PlayerPosition, Card[]>;

// ─── Trick helpers ────────────────────────────────────────────────────────────

function getValidCards(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const hasSuit = hand.some(c => c.suit === ledSuit);
  return hasSuit ? hand.filter(c => c.suit === ledSuit) : hand;
}

function trickWinner(trick: PlayedCard[], trump: Suit | null): PlayerPosition {
  let best = trick[0];
  for (const played of trick.slice(1)) {
    const { card } = played;
    if (trump) {
      if (card.suit === trump && best.card.suit !== trump) { best = played; continue; }
      if (card.suit === trump && best.card.suit === trump &&
          RANK_VALUES[card.rank] > RANK_VALUES[best.card.rank]) { best = played; continue; }
    }
    if (card.suit === best.card.suit && RANK_VALUES[card.rank] > RANK_VALUES[best.card.rank]) {
      best = played;
    }
  }
  return best.player;
}

function getPartner(pos: PlayerPosition): PlayerPosition {
  return pos === 'south' ? 'north' : pos === 'north' ? 'south'
       : pos === 'west'  ? 'east'  : 'west';
}

function minCard(cards: Card[]): Card {
  return cards.reduce((m, c) => RANK_VALUES[c.rank] < RANK_VALUES[m.rank] ? c : m);
}

function maxCard(cards: Card[]): Card {
  return cards.reduce((m, c) => RANK_VALUES[c.rank] > RANK_VALUES[m.rank] ? c : m);
}

// ─── Per-player simulation heuristic ─────────────────────────────────────────

function pickCard(
  player: PlayerPosition,
  hand: Card[],
  trick: PlayedCard[],
  trump: Suit | null,
): Card {
  const ledSuit: Suit | null = trick.length > 0 ? trick[0].card.suit : null;
  const valid = getValidCards(hand, ledSuit);
  if (valid.length === 1) return valid[0];

  // Support a winning partner
  if (trick.length > 0 && trickWinner(trick, trump) === getPartner(player)) {
    return minCard(valid);
  }

  // Leading: play top Ace if available, else highest card
  if (trick.length === 0) {
    const aces = valid.filter(c => c.rank === 'A');
    return aces.length > 0 ? aces[0] : maxCard(valid);
  }

  // Find current winning card
  const currentWinnerPos = trickWinner(trick, trump);
  const winnerCard = trick.find(p => p.player === currentWinnerPos)!.card;
  const winnerIsTrump = trump !== null && winnerCard.suit === trump;

  // Try to beat in led suit (cheapest winning card)
  if (ledSuit) {
    const inSuit = valid.filter(c => c.suit === ledSuit);
    if (inSuit.length > 0) {
      const beaters = inSuit.filter(c =>
        !winnerIsTrump && RANK_VALUES[c.rank] > RANK_VALUES[winnerCard.rank]
      );
      if (beaters.length > 0) return minCard(beaters);
      return minCard(inSuit); // can't beat, play low
    }
  }

  // Void in led suit — try to ruff
  if (trump) {
    const trumpCards = valid.filter(c => c.suit === trump);
    if (trumpCards.length > 0) {
      if (winnerIsTrump) {
        const overtrumps = trumpCards.filter(c => RANK_VALUES[c.rank] > RANK_VALUES[winnerCard.rank]);
        if (overtrumps.length > 0) return minCard(overtrumps);
      } else {
        return minCard(trumpCards); // cheapest ruff
      }
    }
  }

  // Discard lowest
  return minCard(valid);
}

// ─── Remove a card from a hand (mutates) ─────────────────────────────────────

function removeCard(hand: Card[], card: Card): void {
  const idx = hand.findIndex(c => cardsEqual(c, card));
  if (idx >= 0) hand.splice(idx, 1);
}

// ─── Full game simulation ─────────────────────────────────────────────────────

const CCW: PlayerPosition[] = ['west', 'south', 'east', 'north'];

function playOrder(leader: PlayerPosition): PlayerPosition[] {
  const start = CCW.indexOf(leader);
  return [0, 1, 2, 3].map(i => CCW[(start + i) % 4]);
}

/**
 * Simulate remaining tricks starting from the current (partial) trick state.
 * South plays `candidateCard`; all other moves are determined by the simulation heuristic.
 *
 * Returns team1 (South+North) tricks won from this point onwards.
 */
export function simulateGame(
  opponentHands: OpponentHands,
  myHand: Card[],
  currentTrick: PlayedCard[],
  trickLeader: PlayerPosition,
  trumpSuit: Suit | null,
  candidateCard: Card,
): number {
  // Clone all hands (simulation mutates them)
  const hands: AllHands = {
    south: myHand.filter(c => !cardsEqual(c, candidateCard)),
    west:  [...opponentHands.west],
    north: [...opponentHands.north],
    east:  [...opponentHands.east],
  };

  // Remove already-played cards from simulated opponent hands
  for (const { player, card } of currentTrick) {
    if (player !== 'south') removeCard(hands[player], card);
  }

  // Seed the current trick with the candidate card for south
  let trick: PlayedCard[] = [
    ...currentTrick,
    { player: 'south', card: candidateCard },
  ];

  let leader = trickLeader;
  let team1Tricks = 0;

  // One iteration = complete one trick
  while (true) {
    // Fill remaining slots in the current trick
    const played = new Set(trick.map(p => p.player));
    for (const pos of playOrder(leader)) {
      if (played.has(pos) || hands[pos].length === 0) continue;
      const card = pickCard(pos, hands[pos], trick, trumpSuit);
      trick.push({ player: pos, card });
      removeCard(hands[pos], card);
      played.add(pos);
    }

    if (trick.length === 0) break;

    // Award trick
    const winner = trickWinner(trick, trumpSuit);
    if (winner === 'south' || winner === 'north') team1Tricks++;

    // Check if any cards remain
    const remaining = (hands.south.length + hands.west.length + hands.north.length + hands.east.length);
    if (remaining === 0) break;

    // Start next trick — winner leads
    leader = winner;
    const leaderCard = pickCard(leader, hands[leader], [], trumpSuit);
    removeCard(hands[leader], leaderCard);
    trick = [{ player: leader, card: leaderCard }];
  }

  return team1Tricks;
}
