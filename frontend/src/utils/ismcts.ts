import type { Card, Suit, PlayerPosition, PlayedCard } from '../types';
import type { Trick } from '../types';
import { RANK_VALUES, SUIT_SYMBOLS } from '../types';
import { generateDeal } from './dealGenerator';
import { simulateGame } from './gameSimulator';

export interface MCTSInput {
  playerHand: Card[];
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  playedCards: Card[];
  tricks: Trick[];
  teamTricks: { team1: number; team2: number };
  playerBid: number | null;
  trickLeader: PlayerPosition | null;
  /** Player who won the bid (determines which team is bidding). */
  winningBidder: PlayerPosition | null;
  numSimulations: number;
  requestId: number;
}

export interface CardRanking {
  card: Card;
  winRate: number;
  simulations: number;
}

export interface MCTSOutput {
  rankings: CardRanking[];
  requestId: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getValidCards(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const hasSuit = hand.some(c => c.suit === ledSuit);
  return hasSuit ? hand.filter(c => c.suit === ledSuit) : hand;
}

/** Did team1 (south+north) achieve a successful outcome? */
function isSuccess(
  team1TricksGained: number,
  currentTeam1: number,
  totalTricksLeft: number,
  playerBid: number | null,
  team1Bid: boolean,
): boolean {
  const finalTeam1 = currentTeam1 + team1TricksGained;
  const finalTeam2 = 13 - finalTeam1;

  if (!playerBid) return finalTeam1 > finalTeam2; // no bid: majority wins

  if (team1Bid) return finalTeam1 >= playerBid;   // team1 makes bid
  else return finalTeam2 < playerBid;              // team2 fails bid

  void totalTricksLeft;
}

// ─── Main IS-MCTS entry point ─────────────────────────────────────────────────

/**
 * For each legal card south can play in the current trick, run N simulations
 * over sampled opponent deals and return cards ranked by success rate.
 */
export function rankCards(input: MCTSInput): MCTSOutput {
  const {
    playerHand, trumpSuit, currentTrick, playedCards,
    tricks, teamTricks, playerBid, trickLeader,
    winningBidder, numSimulations, requestId,
  } = input;

  const ledSuit: Suit | null = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  const validCards = getValidCards(playerHand, ledSuit);
  if (validCards.length === 0) return { rankings: [], requestId };

  const team1Bid = winningBidder === 'south' || winningBidder === 'north';
  const tricksPlayedSoFar = teamTricks.team1 + teamTricks.team2;
  const tricksLeft = 13 - tricksPlayedSoFar;

  // Tally wins and attempts per candidate card
  const wins = new Map<string, number>(validCards.map(c => [cardKey(c), 0]));
  const attempts = new Map<string, number>(validCards.map(c => [cardKey(c), 0]));

  const leader = trickLeader ?? (currentTrick.length > 0 ? currentTrick[0].player : 'west');

  for (let sim = 0; sim < numSimulations; sim++) {
    const deal = generateDeal(playerHand, playedCards, tricks, currentTrick, trumpSuit);
    if (!deal) continue; // constraints couldn't be satisfied — skip

    for (const card of validCards) {
      const key = cardKey(card);
      attempts.set(key, (attempts.get(key) ?? 0) + 1);

      const gained = simulateGame(deal, playerHand, currentTrick, leader, trumpSuit, card);
      if (isSuccess(gained, teamTricks.team1, tricksLeft, playerBid, team1Bid)) {
        wins.set(key, (wins.get(key) ?? 0) + 1);
      }
    }
  }

  // Build rankings
  const rankings: CardRanking[] = validCards
    .map(card => {
      const key = cardKey(card);
      const n = attempts.get(key) ?? 0;
      const w = wins.get(key) ?? 0;
      return { card, winRate: n > 0 ? w / n : 0, simulations: n };
    })
    .sort((a, b) => b.winRate - a.winRate);

  return { rankings, requestId };
}

function cardKey(card: Card): string {
  return `${card.suit}_${card.rank}`;
}

// Re-export for convenience
export { RANK_VALUES, SUIT_SYMBOLS };
