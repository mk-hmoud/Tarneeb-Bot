import type { Card, Suit, PlayerPosition, Bid } from '../types';
import { SUITS, RANK_VALUES } from '../types';

export interface BiddingRecommendation {
  suggestedTricks: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedTrump: Suit;
  isKapCandidate: boolean;
  alternativeBids: { tricks: number; reason: string }[];
}

// ─── Hand analysis ────────────────────────────────────────────────────────────

interface HandAnalysis {
  suitCounts: Record<Suit, number>;
  suitStrengths: Record<Suit, number>;
  aces: number;
  kings: number;
  queens: number;
  jacks: number;
  tens: number;
  highCards: number;
  voids: number;
  singletons: number;
}

function analyzeHand(hand: Card[]): HandAnalysis {
  const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  const suitStrengths: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  let aces = 0, kings = 0, queens = 0, jacks = 0, tens = 0, highCards = 0;

  for (const card of hand) {
    suitCounts[card.suit]++;
    const v = RANK_VALUES[card.rank];
    if (v >= 10) { highCards++; suitStrengths[card.suit] += v; }
    if (card.rank === 'A') aces++;
    else if (card.rank === 'K') kings++;
    else if (card.rank === 'Q') queens++;
    else if (card.rank === 'J') jacks++;
    else if (card.rank === '10') tens++;
  }

  let voids = 0, singletons = 0;
  for (const suit of SUITS) {
    if (suitCounts[suit] === 0) voids++;
    else if (suitCounts[suit] === 1) singletons++;
  }

  return { suitCounts, suitStrengths, aces, kings, queens, jacks, tens, highCards, voids, singletons };
}

// ─── Best trump selection ─────────────────────────────────────────────────────

/**
 * Score each suit as potential trump, optionally penalising suits opponents bid heavily in.
 */
function findBestTrump(
  hand: Card[],
  analysis: HandAnalysis,
  opponentBidSuit?: Suit,
): { suit: Suit; score: number } {
  const { suitCounts, suitStrengths } = analysis;

  const scores = SUITS.map(suit => {
    const count = suitCounts[suit];
    const strength = suitStrengths[suit];
    let score = count * 3 + strength * 0.4;

    if (count >= 6) score += 14;
    else if (count >= 5) score += 9;
    else if (count >= 4) score += 5;
    else if (count === 1) score -= 4;
    else if (count === 0) score -= 10;

    // Check for high trump cards
    const suitCards = hand.filter(c => c.suit === suit);
    const hasAce = suitCards.some(c => c.rank === 'A');
    const hasKing = suitCards.some(c => c.rank === 'K');
    const hasQueen = suitCards.some(c => c.rank === 'Q');
    if (hasAce) score += 4;
    if (hasKing) score += 2;
    if (hasQueen) score += 1;

    // Penalty if opponent already bid this suit aggressively (they have more of it)
    if (opponentBidSuit && suit === opponentBidSuit) score -= 8;

    return { suit, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

// ─── Trick estimation ─────────────────────────────────────────────────────────

function estimateTricks(hand: Card[], analysis: HandAnalysis, trump: Suit): number {
  const { suitCounts, aces, kings, queens, jacks, tens, voids, singletons } = analysis;
  let est = 0;

  const count = (suit: Suit, rank: string) =>
    hand.filter(c => c.suit === suit && c.rank === rank).length;

  // High cards in trump (near-guaranteed tricks)
  est += count(trump, 'A') * 1.2;
  est += count(trump, 'K') * 1.0;
  est += count(trump, 'Q') * 0.8;
  est += count(trump, 'J') * 0.6;
  est += count(trump, '10') * 0.4;

  // High cards in side suits (less reliable — can be trumped)
  const nonTrumpAces  = aces  - count(trump, 'A');
  const nonTrumpKings = kings - count(trump, 'K');
  const nonTrumpQueens = queens - count(trump, 'Q');
  const nonTrumpJacks = jacks - count(trump, 'J');
  const nonTrumpTens  = tens  - count(trump, '10');

  est += nonTrumpAces  * 0.95;
  est += nonTrumpKings * 0.65;
  est += nonTrumpQueens * 0.35;
  est += nonTrumpJacks * 0.15;
  est += nonTrumpTens  * 0.08;

  // Long-suit length tricks
  for (const suit of SUITS) {
    const n = suitCounts[suit];
    const isTrump = suit === trump;
    if (n >= 6) est += isTrump ? 4.0 : 1.5;
    else if (n >= 5) est += isTrump ? 2.5 : 1.0;
    else if (n >= 4) est += isTrump ? 1.5 : 0.5;
    else if (n >= 3) est += isTrump ? 0.8 : 0.2;
  }

  // Ruffing potential from voids/singletons
  est += voids * 1.0;
  est += singletons * 0.5;

  // Sequence bonuses
  for (const suit of SUITS) {
    const sc = hand.filter(c => c.suit === suit);
    const has = (r: string) => sc.some(c => c.rank === r);
    const isTrump = suit === trump;
    let bonus = 0;
    if (has('A') && has('K') && has('Q')) bonus += 2.5;
    else if (has('A') && has('K')) bonus += 1.2;
    else if (has('K') && has('Q')) bonus += 0.8;
    else if (has('A') && has('Q')) bonus += 0.7;
    if (isTrump) bonus *= 1.4;
    est += bonus;
  }

  return est;
}

// ─── Bidding position helpers ─────────────────────────────────────────────────

type BidPosition = 'first' | 'second' | 'third' | 'fourth';

function getBidPosition(
  myPosition: PlayerPosition,
  starterPosition: PlayerPosition,
): BidPosition {
  const CCW: PlayerPosition[] = ['west', 'south', 'east', 'north'];
  const startIdx = CCW.indexOf(starterPosition);
  const myIdx = CCW.indexOf(myPosition);
  const order = ((myIdx - startIdx + 4) % 4) + 1;
  if (order === 1) return 'first';
  if (order === 2) return 'second';
  if (order === 3) return 'third';
  return 'fourth';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBiddingRecommendation(
  hand: Card[],
  previousBids: Bid[],
  myPosition: PlayerPosition,
  _isPlayerTurn: boolean,
): BiddingRecommendation | null {
  if (hand.length === 0) return null;

  const analysis = analyzeHand(hand);
  const { aces, kings, highCards, suitCounts } = analysis;

  // ── Determine bidding context ────────────────────────────────────────────────

  const realBids = previousBids.filter(b => b.tricks > 0);
  const currentHighest = realBids.length > 0 ? Math.max(...realBids.map(b => b.tricks)) : 6;
  const minRequired = Math.max(currentHighest + 1, 7);

  const partnerBid = realBids.find(b => b.player === 'north');
  const opponentBids = realBids.filter(b => b.player === 'west' || b.player === 'east');
  const opponentHighest = opponentBids.length > 0 ? Math.max(...opponentBids.map(b => b.tricks)) : 0;

  // Infer likely opponent trump suit from their highest bid (they bid it first)
  const opponentBidSuit: Suit | undefined = opponentBids.length > 0
    ? (opponentBids.find(b => b.tricks === opponentHighest)?.trump ?? undefined)
    : undefined;

  // ── Find best trump ──────────────────────────────────────────────────────────

  const bestTrump = findBestTrump(hand, analysis, opponentBidSuit);

  // ── Estimate my solo tricks ──────────────────────────────────────────────────

  let myEst = estimateTricks(hand, analysis, bestTrump.suit);

  // ── Position adjustment ──────────────────────────────────────────────────────

  const starterPos = previousBids[0]?.player ?? 'west';
  const position = getBidPosition(myPosition, starterPos);

  // Bidding last has more info — slight confidence boost; no estimate adjustment needed
  // Bidding first with a marginal hand: be more conservative
  if (position === 'first' && myEst < 8) {
    myEst -= 0.5; // Conservative opening: opponent after you might have more
  }
  if (position === 'fourth' && myEst >= 7) {
    myEst += 0.3; // Bidding last: you've heard everyone, slight upward nudge
  }

  // ── Partner inference ────────────────────────────────────────────────────────

  let partnerContribution = 0;
  if (partnerBid) {
    // Partner has already bid: their bid indicates their hand strength.
    // Rough rule: bid = 7 → ~2 tricks; 8 → ~3; 9 → ~4; etc.
    partnerContribution = partnerBid.tricks - 5; // approx tricks partner controls
    // Don't double-count: reduce my estimate since partner's tricks are theirs
    myEst -= partnerContribution * 0.4;
  }

  // ── Kap detection ────────────────────────────────────────────────────────────

  // Kap = bidding all 13 tricks.  Requires near-total hand control.
  const trumpCards = hand.filter(c => c.suit === bestTrump.suit);
  const controlledTrumps = trumpCards.filter(c =>
    c.rank === 'A' || c.rank === 'K' || c.rank === 'Q'
  ).length;
  const sideAces = hand.filter(c => c.suit !== bestTrump.suit && c.rank === 'A').length;
  const kapSignal =
    myEst >= 10.5 ||
    (controlledTrumps >= 3 && sideAces >= 2 && highCards >= 8) ||
    (suitCounts[bestTrump.suit] >= 6 && aces >= 3);
  const isKapCandidate = kapSignal;

  // ── Final bid recommendation ─────────────────────────────────────────────────

  const roundedEst = Math.round(myEst);

  // Don't overbid partner unless hand is very strong
  const partnerIsHighBidder = partnerBid && partnerBid.tricks === currentHighest;
  if (partnerIsHighBidder && roundedEst < 10) {
    return {
      suggestedTricks: 0, // Pass
      confidence: 'high',
      suggestedTrump: bestTrump.suit,
      isKapCandidate: false,
      reasoning: buildPassReason(partnerBid.tricks, roundedEst),
      alternativeBids: roundedEst >= minRequired
        ? [{ tricks: minRequired, reason: 'Only if partner is weak in trump' }]
        : [],
    };
  }

  // Below minimum required → pass
  if (roundedEst < minRequired - 1 && !isKapCandidate) {
    return {
      suggestedTricks: 0,
      confidence: roundedEst < minRequired - 2 ? 'high' : 'medium',
      suggestedTrump: bestTrump.suit,
      isKapCandidate: false,
      reasoning: `Hand worth ~${roundedEst} tricks; current bid is ${currentHighest}. Not strong enough to bid ${minRequired}.`,
      alternativeBids: [
        { tricks: minRequired, reason: 'Aggressive — if opponents look weak' },
      ],
    };
  }

  const suggestedTricks = isKapCandidate ? 13 : Math.max(roundedEst, minRequired);
  const capped = Math.min(suggestedTricks, 13);

  const confidence: 'high' | 'medium' | 'low' =
    (aces >= 3 && highCards >= 6) ? 'high' :
    (aces >= 2 && highCards >= 4) ? 'medium' : 'low';

  const reasoning = buildBidReason(hand, analysis, bestTrump.suit, capped, position, partnerBid);

  const alternativeBids: { tricks: number; reason: string }[] = [];
  if (capped > 7) alternativeBids.push({ tricks: capped - 1, reason: 'Safe — if opponents look strong' });
  if (capped < 13 && !isKapCandidate) alternativeBids.push({ tricks: capped + 1, reason: 'Aggressive — if hand feels strong' });
  if (isKapCandidate && capped < 13) alternativeBids.push({ tricks: 13, reason: 'Kap — only if hand is iron-clad' });

  return {
    suggestedTricks: capped,
    confidence,
    suggestedTrump: bestTrump.suit,
    isKapCandidate,
    reasoning,
    alternativeBids,
  };
}

// ─── Reasoning text builders ──────────────────────────────────────────────────

function buildPassReason(partnerBid: number, myEst: number): string {
  return `Partner bid ${partnerBid} — let them lead. Your hand adds ~${myEst} tricks but not enough to justify overbidding.`;
}

function buildBidReason(
  hand: Card[],
  analysis: HandAnalysis,
  trump: Suit,
  suggestedTricks: number,
  position: BidPosition,
  partnerBid: Bid | undefined,
): string {
  const { aces, kings, highCards, suitCounts } = analysis;
  const parts: string[] = [];

  parts.push(`${highCards} high cards (${aces}A ${kings}K)`);

  const trumpCount = suitCounts[trump];
  const trumpSymbols: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
  parts.push(`${trumpCount} ${trumpSymbols[trump]} trumps`);

  if (partnerBid) {
    parts.push(`partner bid ${partnerBid.tricks}`);
  }

  if (position === 'fourth') parts.push('bidding last (more info)');
  if (position === 'first') parts.push('opening bid');

  if (suggestedTricks === 13) parts.push('Kap potential!');

  return parts.join(' · ') + ` → bid ${suggestedTricks}.`;
}

export function getBidDescription(tricks: number): string {
  if (tricks === 0) return 'Pass';
  if (tricks === 13) return 'Kap!';
  if (tricks >= 10) return 'Aggressive bid';
  if (tricks === 9) return 'Strong bid';
  if (tricks === 8) return 'Moderate bid';
  return 'Minimum bid';
}
