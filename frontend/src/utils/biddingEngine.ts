import type { Card, Suit, PlayerPosition, Bid } from '../types';
import { SUITS, RANKS, RANK_VALUES } from '../types';

export interface BiddingRecommendation {
  suggestedTricks: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  alternativeBids?: { tricks: number; reason: string }[];
}

// Calculate hand strength for bidding
function analyzeHand(hand: Card[]): {
  highCards: number; // A, K, Q, J, 10
  aces: number;
  kings: number;
  queens: number;
  jacks: number;
  tens: number;
  suitCounts: Record<Suit, number>;
  suitStrengths: Record<Suit, number>;
  voids: number;
  singletons: number;
} {
  const suitCounts: Record<Suit, number> = {
    spades: 0, hearts: 0, diamonds: 0, clubs: 0
  };
  const suitStrengths: Record<Suit, number> = {
    spades: 0, hearts: 0, diamonds: 0, clubs: 0
  };
  let highCards = 0;
  let aces = 0;
  let kings = 0;
  let queens = 0;
  let jacks = 0;
  let tens = 0;
  let voids = 0;
  let singletons = 0;

  for (const card of hand) {
    suitCounts[card.suit]++;
    
    const value = RANK_VALUES[card.rank];
    if (value >= 10) { // 10, J, Q, K, A
      highCards++;
      suitStrengths[card.suit] += value;
    }
    if (card.rank === 'A') aces++;
    if (card.rank === 'K') kings++;
    if (card.rank === 'Q') queens++;
    if (card.rank === 'J') jacks++;
    if (card.rank === '10') tens++;
  }
  
  // Count voids and singletons
  for (const suit of SUITS) {
    if (suitCounts[suit] === 0) voids++;
    else if (suitCounts[suit] === 1) singletons++;
  }

  return { highCards, aces, kings, queens, jacks, tens, suitCounts, suitStrengths, voids, singletons };
}

// Determine best trump suit based on hand
function findBestTrump(
  suitCounts: Record<Suit, number>,
  suitStrengths: Record<Suit, number>,
  aces: number,
  kings: number
): { suit: Suit; strength: number } {
  const suitScores: { suit: Suit; score: number }[] = [];

  for (const suit of SUITS) {
    let score = 0;
    const count = suitCounts[suit];
    const strength = suitStrengths[suit];

    // Number of cards in suit
    score += count * 2;
    
    // Strength of cards
    score += strength * 0.5;
    
    // Having Ace is valuable
    // (We can't check directly, but high strength usually indicates it)
    
    // Long suits are good for trump (exponential points for more cards)
    if (count >= 6) score += 12;
    else if (count >= 5) score += 8;
    else if (count >= 4) score += 5;
    else if (count >= 3) score += 2;
    else if (count <= 1) score -= 3;

    suitScores.push({ suit, score });
  }

  suitScores.sort((a, b) => b.score - a.score);
  return { suit: suitScores[0].suit, strength: suitScores[0].score };
}

  // Estimate tricks based on hand analysis
  function estimateTricks(
    hand: Card[],
    suitCounts: Record<Suit, number>,
    highCards: number,
    aces: number,
    kings: number,
    queens: number,
    jacks: number,
    tens: number,
    voids: number,
    singletons: number,
    bestTrump: Suit
  ): number {
    let estimatedTricks = 0;

    // Count high cards in trump suit separately - they are more valuable
    const trumpAces = hand.filter(c => c.suit === bestTrump && c.rank === 'A').length;
    const trumpKings = hand.filter(c => c.suit === bestTrump && c.rank === 'K').length;
    const trumpQueens = hand.filter(c => c.suit === bestTrump && c.rank === 'Q').length;
    const trumpJacks = hand.filter(c => c.suit === bestTrump && c.rank === 'J').length;
    const trumpTens = hand.filter(c => c.suit === bestTrump && c.rank === '10').length;

    // Trump suit high cards are almost guaranteed winners
    estimatedTricks += trumpAces * 1.2;
    estimatedTricks += trumpKings * 1.0;
    estimatedTricks += trumpQueens * 0.8;
    estimatedTricks += trumpJacks * 0.6;
    estimatedTricks += trumpTens * 0.4;

    // Non-trump high cards are less valuable
    estimatedTricks += (aces - trumpAces) * 1.0;
    estimatedTricks += (kings - trumpKings) * 0.7;
    estimatedTricks += (queens - trumpQueens) * 0.4;
    estimatedTricks += (jacks - trumpJacks) * 0.2;
    estimatedTricks += (tens - trumpTens) * 0.1;

    // Long suits give huge advantage, especially in trump
    for (const suit of SUITS) {
      const count = suitCounts[suit];
      const isTrump = suit === bestTrump;
      
      if (count >= 6) {
        estimatedTricks += isTrump ? 4.0 : 1.5; // 6 card trump is massive advantage
      } else if (count >= 5) {
        estimatedTricks += isTrump ? 2.5 : 1.5;
      } else if (count >= 4) {
        estimatedTricks += isTrump ? 1.5 : 0.8;
      } else if (count >= 3) {
        estimatedTricks += isTrump ? 0.8 : 0.3;
      }
    }

    // Voids and singletons are great for trumping
    estimatedTricks += voids * 1.0;
    estimatedTricks += singletons * 0.5;

    // Assume teammate (North) will contribute at least 1 guaranteed trick
    estimatedTricks += 1.0;

    // Bonus for sequential high cards (AKQ sequences)
    // These guarantee taking multiple tricks and drawing opponent trumps
    for (const suit of SUITS) {
      const suitCards = hand.filter(c => c.suit === suit);
      const cardRanks = suitCards.map(c => RANK_VALUES[c.rank]);
      const isTrump = suit === bestTrump;
      
      // Check for sequences
      const hasAce = cardRanks.includes(14);
      const hasKing = cardRanks.includes(13);
      const hasQueen = cardRanks.includes(12);
      const hasJack = cardRanks.includes(11);
      
      let sequenceBonus = 0;
      if (hasAce && hasKing && hasQueen) sequenceBonus += 3.0; // AKQ sequence
      else if (hasAce && hasKing) sequenceBonus += 1.5; // AK sequence
      else if (hasKing && hasQueen) sequenceBonus += 1.0; // KQ sequence
      else if (hasAce && hasQueen) sequenceBonus += 0.8; // AQ sequence

      // Sequences are MUCH more powerful in trump suit
      if (isTrump) {
        sequenceBonus *= 1.5;
      }
      
      estimatedTricks += sequenceBonus;
    }

  // Base estimate: average hand should bid around 7-8
  
  // Round to nearest integer
  const rounded = Math.round(estimatedTricks);
  
  // Most hands should bid at least 7 (weak hands pass)
  // Only pass if truly weak (< 3.5 estimated tricks)
  if (rounded < 4) {
    return 0; // Pass - very weak hand
  }
  
  // For borderline hands (4-6 tricks), suggest minimum bid
  // The user can always choose to pass
  if (rounded >= 4 && rounded < 7) {
    return 7; // Minimum bid
  }
  
  // Cap at 13
  return Math.min(rounded, 13);
}

export function getBiddingRecommendation(
  hand: Card[],
  previousBids: Bid[],
  currentBidder: PlayerPosition,
  isPlayerTurn: boolean
): BiddingRecommendation | null {
  if (hand.length === 0) return null;

  const analysis = analyzeHand(hand);
  const { highCards, aces, kings, queens, jacks, tens, suitCounts, suitStrengths, voids, singletons } = analysis;
  
  // Find best trump
  const bestTrump = findBestTrump(suitCounts, suitStrengths, aces, kings);
  
  // Estimate tricks
  const estimatedTricks = estimateTricks(hand, suitCounts, highCards, aces, kings, queens, jacks, tens, voids, singletons, bestTrump.suit);
  
  // Get current highest bid
  const validBids = previousBids.filter(b => b.tricks > 0);
  const highestPreviousBid = validBids.length > 0
    ? Math.max(...validBids.map(b => b.tricks))
    : 6; // Below minimum bid

  // Get last bidder to see if it's teammate
  const lastBid = validBids.length > 0 ? validBids[validBids.length - 1] : null;
  const lastBidByTeammate = lastBid?.player === 'north';

  let suggestedTricks = estimatedTricks;
  
  // Enforce minimum bid of 7
  if (suggestedTricks > 0 && suggestedTricks < 7) {
    suggestedTricks = 7;
  }
  
  // If we have a very strong hand, we can bid more aggressively
  if (highCards >= 6 && aces >= 3) {
    suggestedTricks = Math.max(suggestedTricks, 9);
  }
  
  // Must bid 1 higher than current highest
  const minimumRequiredBid = Math.max(highestPreviousBid + 1, 7);
  
  // TEAM STRATEGY: Don't bid over teammate unless absolutely necessary
  if (lastBidByTeammate) {
    if (suggestedTricks < 10) {
      // Hand not strong enough to bid over teammate - pass
      return {
        suggestedTricks: 0, // Pass
        confidence: 'high',
        reasoning: `Current bid of ${highestPreviousBid} is by your teammate. Your hand is worth ${estimatedTricks} tricks. Only bid over if you have a very strong hand.`,
        alternativeBids: lastBidByTeammate && suggestedTricks >= 10
          ? [{ tricks: minimumRequiredBid, reason: 'Bid over teammate with strong hand' }]
          : []
      };
    }
  }
  
  // If our estimate is below minimum required bid, pass
  if (estimatedTricks < minimumRequiredBid - 1) {
    return {
      suggestedTricks: 0, // Pass
      confidence: 'medium',
      reasoning: `Your hand is worth about ${estimatedTricks} tricks. Current bid is ${highestPreviousBid}, you would need to bid ${minimumRequiredBid}. Consider passing.`,
      alternativeBids: [
        { tricks: minimumRequiredBid, reason: 'Aggressive bid if you think opponents are weak' }
      ]
    };
  }
  
  // Suggest minimum required bid or higher
  suggestedTricks = Math.max(suggestedTricks, minimumRequiredBid);
  
  // Cap at 13
  suggestedTricks = Math.min(suggestedTricks, 13);

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (aces >= 3 && highCards >= 6) confidence = 'high';
  else if (aces >= 2 && highCards >= 4) confidence = 'medium';
  else confidence = 'low';

  // Generate reasoning
  const reasoningParts: string[] = [];
  reasoningParts.push(`You have ${highCards} high cards (A, K, Q)`);
  reasoningParts.push(`${aces} Ace${aces !== 1 ? 's' : ''}, ${kings} King${kings !== 1 ? 's' : ''}`);
  reasoningParts.push(`Strongest suit is ${bestTrump.suit} with ${suitCounts[bestTrump.suit]} cards`);
  
  if (estimatedTricks >= 10) {
    reasoningParts.push('Very strong hand - consider bidding high');
  } else if (estimatedTricks >= 8) {
    reasoningParts.push('Good hand with solid trick potential');
  } else {
    reasoningParts.push('Moderate hand - bid cautiously');
  }

  const alternativeBids: { tricks: number; reason: string }[] = [];
  
  // Suggest alternative bids
  if (suggestedTricks > 7) {
    alternativeBids.push({
      tricks: suggestedTricks - 1,
      reason: 'Safer bid if opponents seem strong'
    });
  }
  if (suggestedTricks < 13) {
    alternativeBids.push({
      tricks: suggestedTricks + 1,
      reason: 'Aggressive bid to pressure opponents'
    });
  }

  return {
    suggestedTricks,
    confidence,
    reasoning: reasoningParts.join('. ') + '.',
    alternativeBids: alternativeBids.slice(0, 3)
  };
}

// Get bid description
export function getBidDescription(tricks: number): string {
  if (tricks === 0) return 'Pass';
  if (tricks === 7) return 'Minimum bid';
  if (tricks === 8) return 'Moderate bid';
  if (tricks === 9) return 'Strong bid';
  if (tricks >= 10) return 'Aggressive bid';
  return `${tricks} tricks`;
}
