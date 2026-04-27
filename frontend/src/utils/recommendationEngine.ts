import type { Card, Suit, PlayerPosition, PlayedCard, Recommendation, Trick } from '../types';
import {
  SUITS, RANKS, SUIT_SYMBOLS, RANK_VALUES,
  cardsEqual, groupCardsBySuit, getRemainingCards,
} from '../types';
import {
  computeInference, opponentKnownVoid, partnerKnownVoid,
  totalOpponentTrumpsPlayed,
  type GameInference,
} from './inferenceEngine';

export interface RecommendationContext {
  playerHand: Card[];
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  playedCards: Card[];
  trickLeader: PlayerPosition | null;
  currentPlayer: PlayerPosition | null;
  teamTricks: { team1: number; team2: number };
  playerBid: number | null;
  tricks: Trick[];
}

interface CardScore {
  card: Card;
  score: number;
  reason: string;
}

interface ScoringContext extends RecommendationContext {
  ledSuit: Suit | null;
  validCards: Card[];
  inference: GameInference;
  /** Position south plays in this trick: 1=lead, 2=second, 3=third, 4=fourth */
  playPosition: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getRecommendation(context: RecommendationContext): Recommendation | null {
  const { playerHand, trumpSuit, currentTrick, playedCards, tricks } = context;

  if (playerHand.length === 0) return null;

  const ledSuit: Suit | null = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  const validCards = getValidCards(playerHand, ledSuit);
  if (validCards.length === 0) return null;

  const inference = computeInference(tricks, currentTrick, trumpSuit);
  // Position: how many cards have already been played this trick (including any already-played south card)
  const playPosition = currentTrick.length + 1;

  const ctx: ScoringContext = { ...context, ledSuit, validCards, inference, playPosition };

  const scored = validCards
    .map(card => scoreCard(card, ctx))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  return {
    card: best.card,
    confidence: getConfidence(scored),
    reason: best.reason,
    alternativeCards: scored.slice(1, 3).map(s => s.card),
  };
}

// ─── Card scoring ─────────────────────────────────────────────────────────────

function scoreCard(card: Card, ctx: ScoringContext): CardScore {
  const {
    trumpSuit, currentTrick, playedCards,
    ledSuit, teamTricks, playerBid, validCards,
    inference, playPosition,
  } = ctx;

  let score = 50; // base
  const reasons: string[] = [];

  const isTrump = !!trumpSuit && card.suit === trumpSuit;
  const isLedSuit = !!ledSuit && card.suit === ledSuit;
  const cardValue = RANK_VALUES[card.rank];

  const currentWinner = getCurrentWinningCard(currentTrick, trumpSuit);
  const partnerWinning = isPartnerWinning(currentTrick, trumpSuit);

  // ── Positional / trick-state logic ──────────────────────────────────────────

  if (currentTrick.length === 0) {
    const delta = scoreLeadingCard(card, ctx);
    score += delta;
    if (delta >= 5) reasons.push('Strong lead');
    else if (delta >= 0) reasons.push('Lead');
    else reasons.push('Weak lead');
  } else if (partnerWinning) {
    const delta = scoreWhenPartnerWinning(card, ctx, currentWinner!);
    score += delta;
    reasons.push(delta >= 3 ? 'Support partner' : 'Let partner win');
  } else {
    const delta = scoreWhenContesting(card, ctx, currentWinner);
    score += delta;
    reasons.push(delta >= 10 ? 'Win trick' : delta >= 0 ? 'Contest' : 'Discard');
  }

  // ── Trump value adjustment ───────────────────────────────────────────────────

  if (isTrump) {
    const remainingTrumps = getRemainingCards(playedCards).filter(c => c.suit === trumpSuit).length;
    // High trumps are more valuable when few remain
    score += cardValue * 1.5;
    if (remainingTrumps <= 3 && cardValue >= 12) {
      score += 12;
      reasons.push('Dominant trump');
    }
    // Don't burn high trumps when many are still out and we're not winning anything big
    if (remainingTrumps > 7 && cardValue >= 13 && currentTrick.length === 0) {
      score -= 6;
    }
  }

  // ── Card-count: highest remaining in suit ────────────────────────────────────

  const higherOutstanding = getRemainingCards(playedCards)
    .filter(c => c.suit === card.suit && RANK_VALUES[c.rank] > cardValue && !cardsEqual(c, card));
  if (higherOutstanding.length === 0 && isLedSuit) {
    score += 8;
    reasons.push('Top of suit');
  }

  // ── Bid progress ─────────────────────────────────────────────────────────────

  const tricksWon = teamTricks.team1;
  const tricksNeeded = playerBid ? Math.max(0, playerBid - tricksWon) : 0;
  const tricksPlayed = teamTricks.team1 + teamTricks.team2;
  const tricksLeft = 13 - tricksPlayed;

  if (playerBid) {
    if (tricksWon >= playerBid) {
      // Bid already made — conserve; don't burn high cards
      if (cardValue >= 12 && !isTrump) {
        score -= 10;
        reasons.push('Bid safe, conserve');
      }
    } else if (tricksNeeded >= tricksLeft && cardValue >= 11) {
      // Desperate situation — score high cards higher
      score += 6;
      reasons.push('Must take tricks');
    }
  }

  // ── Void discard: playing off-suit when can't follow ────────────────────────

  if (ledSuit && !isLedSuit && !isTrump) {
    // We're void in led suit — discard the least useful card
    const handBySuit = groupCardsBySuit(ctx.playerHand);
    // Prefer discarding from short, weak side suits
    const suitLength = handBySuit[card.suit].length;
    if (suitLength <= 2 && cardValue <= 9) score += 8; // ideal discard
    else if (cardValue <= 6) score += 5;
    else score -= 4; // don't throw away high cards
    reasons.push('Discard');
  }

  // ── Partner signal reading ───────────────────────────────────────────────────

  const partnerCard = currentTrick.find(p => p.player === 'north')?.card;
  if (partnerCard) {
    const partnerValue = RANK_VALUES[partnerCard.rank];
    if (partnerValue >= 12 && isLedSuit && cardValue <= 8) {
      score += 4;
      reasons.push('Back partner');
    }
    if (partnerValue <= 5 && isLedSuit && cardValue >= 10) {
      score += 3;
      reasons.push('Cover weak partner');
    }
  }

  // ── 3rd-hand-high heuristic ──────────────────────────────────────────────────
  // 3rd to play and partner hasn't played yet: play high to try to win for partner

  if (playPosition === 3 && !partnerCard && isLedSuit && cardValue >= 11) {
    score += 7;
    reasons.push('3rd hand high');
  }

  // ── 4th-hand economy: play just enough to win ────────────────────────────────

  if (playPosition === 4 && currentWinner && isLedSuit) {
    const winnerValue = RANK_VALUES[currentWinner.rank];
    const winnerIsTrump = !!trumpSuit && currentWinner.suit === trumpSuit;
    if (!winnerIsTrump && cardValue > winnerValue) {
      // Can win — reward smallest winning card
      const margin = cardValue - winnerValue;
      score += Math.max(0, 15 - margin * 2); // closer to just-enough = higher score
      reasons.push('4th hand economy');
    }
  }

  return {
    card,
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
    reason: buildReason(card, reasons, trumpSuit),
  };
}

// ─── Leading strategy ─────────────────────────────────────────────────────────

function scoreLeadingCard(card: Card, ctx: ScoringContext): number {
  const { trumpSuit, playedCards, playerHand, inference, teamTricks, playerBid } = ctx;
  const isTrump = !!trumpSuit && card.suit === trumpSuit;
  const cardValue = RANK_VALUES[card.rank];
  const handBySuit = groupCardsBySuit(playerHand);
  const suitLength = handBySuit[card.suit].length;
  let score = 0;

  // ── Opponent-void penalty (they will ruff our lead) ──────────────────────────
  if (opponentKnownVoid(card.suit, inference)) {
    score -= 14;
  }
  if (partnerKnownVoid(card.suit, inference)) {
    score -= 4;
  }

  // ── Long-suit establishment ───────────────────────────────────────────────────
  if (suitLength >= 5 && !isTrump) {
    score += 8; // establish long suit
  } else if (suitLength >= 4) {
    score += 4;
  }

  // ── High card from short suit (quick trick) ───────────────────────────────────
  if (suitLength <= 2 && cardValue >= 13) {
    score += 7;
  }

  // ── Leading Ace or King is generally safe ─────────────────────────────────────
  if (cardValue === 14) score += 6; // Ace: always wins
  else if (cardValue === 13) {
    const aceOut = getRemainingCards(playedCards).some(c => c.suit === card.suit && c.rank === 'A');
    score += aceOut ? 2 : 5; // King is safe if ace is gone
  }

  // ── Trump lead: pull opponents' trumps ────────────────────────────────────────
  if (isTrump) {
    const opponentTrumpsGone = totalOpponentTrumpsPlayed(inference);
    const remainingTrumps = getRemainingCards(playedCards).filter(c => c.suit === trumpSuit!).length;
    const weHaveMostTrumps = handBySuit[trumpSuit!].length >= 3 && remainingTrumps <= 6;
    if (weHaveMostTrumps && cardValue >= 10) {
      score += 8; // good time to pull trump
    } else if (cardValue >= 14) {
      score += 5; // Trump ace always good
    } else {
      score += 2;
    }
    void opponentTrumpsGone; // suppress unused
  }

  // ── Don't lead low from weak suits ────────────────────────────────────────────
  if (!isTrump && cardValue <= 6 && suitLength <= 2) {
    score -= 6;
  }

  return score;
}

// ─── Following when partner is winning ───────────────────────────────────────

function scoreWhenPartnerWinning(
  card: Card,
  ctx: ScoringContext,
  _winningCard: Card,
): number {
  const { trumpSuit, ledSuit } = ctx;
  const cardValue = RANK_VALUES[card.rank];
  const isTrump = !!trumpSuit && card.suit === trumpSuit;
  let score = 0;

  if (ledSuit && card.suit === ledSuit) {
    score += cardValue <= 9 ? 10 : -6; // play low, let partner win
  } else if (isTrump) {
    score -= 18; // never trump partner's winner
  } else {
    // Off-suit discard — dump lowest from shortest weak suit
    score += cardValue <= 5 ? 6 : -2;
  }

  return score;
}

// ─── Contesting (opponent winning or unknown) ────────────────────────────────

function scoreWhenContesting(
  card: Card,
  ctx: ScoringContext,
  winningCard: Card | null,
): number {
  const { trumpSuit, ledSuit, playedCards } = ctx;
  const cardValue = RANK_VALUES[card.rank];
  const isTrump = !!trumpSuit && card.suit === trumpSuit;
  let score = 0;

  if (!winningCard) return score;

  const winnerValue = RANK_VALUES[winningCard.rank];
  const winnerIsTrump = !!trumpSuit && winningCard.suit === trumpSuit;

  if (ledSuit && card.suit === ledSuit) {
    if (!winnerIsTrump && cardValue > winnerValue) {
      // Cheapest winning card preferred (economy)
      const excess = cardValue - winnerValue;
      score += Math.max(8, 20 - excess * 2);
    } else if (cardValue >= 12) {
      score += 3; // high card for future
    } else {
      score -= 2;
    }
  } else if (isTrump) {
    if (winnerIsTrump) {
      if (cardValue > winnerValue) score += 18; // over-trump
      else score -= 8; // under-trump is wasteful
    } else {
      // Trump a non-trump lead — check if worth it
      const ownTrumps = getRemainingCards(playedCards).filter(c => c.suit === trumpSuit!).length;
      score += ownTrumps >= 2 ? 12 : 6; // better if we have more trumps
    }
  } else {
    // Must discard (can't follow, not trumping)
    score += cardValue <= 5 ? 4 : -4;
  }

  return score;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getValidCards(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const hasSuit = hand.some(c => c.suit === ledSuit);
  return hasSuit ? hand.filter(c => c.suit === ledSuit) : hand;
}

function getCurrentWinningCard(trick: PlayedCard[], trumpSuit: Suit | null): Card | null {
  if (trick.length === 0) return null;
  let winning = trick[0].card;
  for (const { card } of trick) {
    if (trumpSuit) {
      if (card.suit === trumpSuit && winning.suit !== trumpSuit) {
        winning = card;
      } else if (card.suit === trumpSuit && winning.suit === trumpSuit) {
        if (RANK_VALUES[card.rank] > RANK_VALUES[winning.rank]) winning = card;
      } else if (card.suit === winning.suit && RANK_VALUES[card.rank] > RANK_VALUES[winning.rank]) {
        winning = card;
      }
    } else {
      if (card.suit === winning.suit && RANK_VALUES[card.rank] > RANK_VALUES[winning.rank]) {
        winning = card;
      }
    }
  }
  return winning;
}

function getWinningPlayer(trick: PlayedCard[], trumpSuit: Suit | null): PlayerPosition | null {
  if (trick.length === 0) return null;
  const winCard = getCurrentWinningCard(trick, trumpSuit);
  if (!winCard) return null;
  return trick.find(p => cardsEqual(p.card, winCard))?.player ?? null;
}

function isPartnerWinning(trick: PlayedCard[], trumpSuit: Suit | null): boolean {
  return getWinningPlayer(trick, trumpSuit) === 'north';
}

function getConfidence(scored: CardScore[]): 'high' | 'medium' | 'low' {
  if (scored.length < 2) return 'high';
  const gap = scored[0].score - scored[1].score;
  if (gap >= 15) return 'high';
  if (gap >= 5) return 'medium';
  return 'low';
}

function buildReason(card: Card, reasons: string[], trumpSuit: Suit | null): string {
  const isTrump = !!trumpSuit && card.suit === trumpSuit;
  const prefix = `${SUIT_SYMBOLS[card.suit]}${card.rank}${isTrump ? ' (trump)' : ''}`;
  const tail = reasons.filter(Boolean).join(' · ');
  return tail ? `${prefix} — ${tail}` : prefix;
}

// Kept for external use (e.g. card counter display)
export { getRemainingCards };

// Suppress unused import warnings for SUITS/RANKS used in getRemainingCards via types
void SUITS; void RANKS;
