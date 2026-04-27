import type { Card, Suit, Rank, PlayerPosition, PlayedCard, Recommendation } from '../types';
import { 
  SUITS, RANKS, SUIT_SYMBOLS, RANK_VALUES, 
  cardsEqual, groupCardsBySuit, getRemainingCards 
} from '../types';

interface RecommendationContext {
  playerHand: Card[];
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  playedCards: Card[];
  trickLeader: PlayerPosition | null;
  currentPlayer: PlayerPosition | null;
  teamTricks: { team1: number; team2: number };
  playerBid: number | null;
}

interface CardScore {
  card: Card;
  score: number;
  reason: string;
}

/**
 * Main recommendation function
 */
export function getRecommendation(context: RecommendationContext): Recommendation | null {
  const { playerHand, trumpSuit, currentTrick, playedCards, teamTricks, playerBid } = context;
  
  if (playerHand.length === 0) return null;
  
  // Determine what suit was led (if any)
  const ledSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  
  // Get valid cards to play (must follow suit if possible)
  const validCards = getValidCards(playerHand, ledSuit);
  
  if (validCards.length === 0) return null;
  
  // Score each valid card
  const scoredCards = validCards.map(card => 
    scoreCard(card, {
      ...context,
      ledSuit,
      validCards,
    })
  );
  
  // Sort by score (higher is better)
  scoredCards.sort((a, b) => b.score - a.score);
  
  const bestCard = scoredCards[0];
  const confidence = getConfidence(scoredCards);
  
  return {
    card: bestCard.card,
    confidence,
    reason: bestCard.reason,
    alternativeCards: scoredCards.slice(1, 3).map(sc => sc.card),
  };
}

interface ScoringContext extends RecommendationContext {
  ledSuit: Suit | null;
  validCards: Card[];
}

function scoreCard(card: Card, context: ScoringContext): CardScore {
  const { 
    trumpSuit, currentTrick, playedCards, 
    ledSuit, teamTricks, playerBid, validCards 
  } = context;
  
  let score = 0;
  let reasons: string[] = [];
  
  const isTrump = trumpSuit !== null && card.suit === trumpSuit;
  const isLedSuit = ledSuit !== null && card.suit === ledSuit;
  const cardValue = RANK_VALUES[card.rank];
  
  // Check if we must follow suit
  const groupedHand = groupCardsBySuit(context.playerHand);
  const hasLedSuit = ledSuit ? groupedHand[ledSuit].length > 0 : false;
  
  // Current trick analysis
  const currentWinningCard = getCurrentWinningCard(currentTrick, trumpSuit);
  const partnerCard = getPartnerCard(currentTrick);
  const opponentCards = getOpponentCards(currentTrick);
  
  // === OFFENSIVE SCORING (trying to win trick) ===
  
  if (currentTrick.length === 0) {
    // We're leading - different strategy
    score += scoreLeadingCard(card, context);
    reasons.push('Leading trick');
  } else if (currentWinningCard && isPartnerWinning(currentTrick, trumpSuit)) {
    // Partner is winning - don't waste high cards
    score += scoreWhenPartnerWinning(card, context, currentWinningCard);
    reasons.push('Partner winning');
  } else {
    // We need to win or opponent is winning
    score += scoreWhenNeedToWin(card, context, currentWinningCard);
    reasons.push('Contesting trick');
  }
  
  // === TRUMP SCORING ===
  
  if (isTrump && trumpSuit) {
    const remainingTrumps = getRemainingCards(playedCards)
      .filter(c => c.suit === trumpSuit);
    const trumpCount = remainingTrumps.length;
    
    // Higher trump is generally better
    score += cardValue * 2;
    
    // Having many trumps is powerful
    if (trumpCount <= 3 && cardValue >= 12) {
      score += 15; // High trump when few remain
      reasons.push('High trump, few remaining');
    }
    
    // Don't waste high trumps early unless necessary
    if (trumpCount > 6 && cardValue >= 13) {
      score -= 5;
    }
  }
  
  // === CARD COUNTING ===
  
  const remainingInSuit = getRemainingCards(playedCards)
    .filter(c => c.suit === card.suit);
  
  // If high cards in suit are gone, our card is stronger
  const higherCardsInSuit = remainingInSuit.filter(c => RANK_VALUES[c.rank] > cardValue);
  if (higherCardsInSuit.length === 0 && isLedSuit) {
    score += 10;
    reasons.push('Highest remaining in suit');
  }
  
  // === BID PROGRESS ===
  
  const totalTricks = teamTricks.team1 + teamTricks.team2 + currentTrick.length;
  const tricksNeeded = playerBid ? playerBid - teamTricks.team1 : 0;
  const tricksRemaining = 13 - totalTricks;
  
  if (playerBid && tricksNeeded > 0) {
    // Need to win tricks
    if (isLedSuit && cardValue >= 12) {
      score += 5;
      reasons.push('Need tricks for bid');
    }
  } else if (playerBid && teamTricks.team1 >= playerBid) {
    // Already made bid - play safely
    if (cardValue >= 10) {
      score -= 8; // Don't waste high cards
      reasons.push('Bid secured, conserve cards');
    }
  }
  
  // === VOID/B SingleTON STRATEGY ===
  
  if (ledSuit && !isLedSuit && !isTrump) {
    // Playing off-suit (could be void)
    if (groupedHand[ledSuit!].length === 0) {
      // We're void - trump if possible, otherwise discard low
      if (!isTrump) {
        score += cardValue < 5 ? 5 : -5; // Discard low cards
        reasons.push('Void, discarding');
      }
    }
  }
  
  // === PARTNER SIGNALS ===
  
  if (partnerCard) {
    // Partner played a high card - they want to win
    if (RANK_VALUES[partnerCard.rank] >= 12) {
      if (isLedSuit && cardValue < 10) {
        score += 3; // Play low, let partner win
        reasons.push('Partner strong, play low');
      }
    }
    // Partner played low - they might be weak
    else if (RANK_VALUES[partnerCard.rank] <= 6) {
      if (isLedSuit && cardValue >= 10) {
        score += 4; // Try to win for partner
        reasons.push('Partner weak, take trick');
      }
    }
  }
  
  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score + 50));
  
  return {
    card,
    score: Math.round(score * 10) / 10,
    reason: reasons.join('. ') || 'Balanced play',
  };
}

function scoreLeadingCard(card: Card, context: ScoringContext): number {
  let score = 0;
  const { trumpSuit, playedCards, playerHand } = context;
  const isTrump = trumpSuit && card.suit === trumpSuit;
  const cardValue = RANK_VALUES[card.rank];
  const groupedHand = groupCardsBySuit(playerHand);
  const suitLength = groupedHand[card.suit].length;
  
  // Leading from long suit is good
  if (suitLength >= 4) {
    score += 5;
  }
  
  // Leading high cards from short suits
  if (suitLength <= 2 && cardValue >= 13) {
    score += 8;
  }
  
  // Leading trumps can be good to draw opponent trumps
  if (isTrump && cardValue >= 10) {
    score += 3;
  }
  
  // Don't lead low cards from weak suits
  if (cardValue <= 6 && suitLength <= 2) {
    score -= 5;
  }
  
  // Leading Ace or King is generally safe
  if (cardValue >= 14) score += 5;
  if (cardValue >= 13) score += 3;
  
  return score;
}

function scoreWhenPartnerWinning(
  card: Card, 
  context: ScoringContext, 
  winningCard: Card
): number {
  let score = 0;
  const { trumpSuit, ledSuit } = context;
  const cardValue = RANK_VALUES[card.rank];
  const isTrump = trumpSuit && card.suit === trumpSuit;
  
  if (ledSuit && card.suit === ledSuit) {
    // Following suit when partner is winning
    if (cardValue <= 8) {
      score += 10; // Play low, let partner win
    } else {
      score -= 5; // Don't waste high cards
    }
  } else if (isTrump) {
    // Trumping partner's winning card is usually bad
    score -= 15;
  } else {
    // Off-suit - discard low card
    score += cardValue < 5 ? 5 : -3;
  }
  
  return score;
}

function scoreWhenNeedToWin(
  card: Card,
  context: ScoringContext,
  winningCard: Card | null
): number {
  let score = 0;
  const { trumpSuit, ledSuit, playedCards } = context;
  const cardValue = RANK_VALUES[card.rank];
  const isTrump = trumpSuit && card.suit === trumpSuit;
  
  if (!winningCard) return score;
  
  const winningValue = RANK_VALUES[winningCard.rank];
  const winningIsTrump = trumpSuit && winningCard.suit === trumpSuit;
  
  if (ledSuit && card.suit === ledSuit) {
    // Can we beat the current winner?
    if (!winningIsTrump && cardValue > winningValue) {
      score += 15; // Can win the trick
    } else if (cardValue >= 12) {
      score += 5; // High card, might be good later
    }
  } else if (isTrump) {
    // Trumping
    if (winningIsTrump && cardValue > winningValue) {
      score += 20; // Can over-trump
    } else if (!winningIsTrump) {
      score += 10; // Trump will likely win
    } else {
      score -= 5; // Can't beat their trump
    }
  } else {
    // Can't follow suit and no trump - must discard
    score += cardValue < 5 ? 3 : -5; // Discard low, save high
  }
  
  return score;
}

// Helper functions
function getValidCards(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  
  const hasSuit = hand.some(c => c.suit === ledSuit);
  return hasSuit ? hand.filter(c => c.suit === ledSuit) : hand;
}

function getCurrentWinningCard(trick: PlayedCard[], trumpSuit: Suit | null): Card | null {
  if (trick.length === 0) return null;
  
  let winningCard = trick[0].card;
  
  for (const played of trick) {
    const card = played.card;
    
    if (trumpSuit) {
      // Trump beats non-trump
      if (card.suit === trumpSuit && winningCard.suit !== trumpSuit) {
        winningCard = card;
      } else if (card.suit === trumpSuit && winningCard.suit === trumpSuit) {
        if (RANK_VALUES[card.rank] > RANK_VALUES[winningCard.rank]) {
          winningCard = card;
        }
      } else if (card.suit === winningCard.suit && RANK_VALUES[card.rank] > RANK_VALUES[winningCard.rank]) {
        winningCard = card;
      }
    } else {
      if (card.suit === winningCard.suit && RANK_VALUES[card.rank] > RANK_VALUES[winningCard.rank]) {
        winningCard = card;
      }
    }
  }
  
  return winningCard;
}

function getWinningPlayer(trick: PlayedCard[], trumpSuit: Suit | null): PlayerPosition | null {
  if (trick.length === 0) return null;
  
  const winningCard = getCurrentWinningCard(trick, trumpSuit);
  if (!winningCard) return null;
  
  const played = trick.find(p => cardsEqual(p.card, winningCard));
  return played?.player || null;
}

function isPartnerWinning(trick: PlayedCard[], trumpSuit: Suit | null): boolean {
  const winner = getWinningPlayer(trick, trumpSuit);
  if (!winner) return false;
  // South's partners are North (team1)
  return winner === 'north';
}

function getPartnerCard(trick: PlayedCard[]): Card | null {
  const partnerPlay = trick.find(p => p.player === 'north');
  return partnerPlay?.card || null;
}

function getOpponentCards(trick: PlayedCard[]): Card[] {
  return trick
    .filter(p => p.player === 'west' || p.player === 'east')
    .map(p => p.card);
}

function getConfidence(scoredCards: CardScore[]): 'high' | 'medium' | 'low' {
  if (scoredCards.length < 2) return 'high';
  
  const best = scoredCards[0].score;
  const second = scoredCards[1].score;
  const diff = best - second;
  
  if (diff >= 15) return 'high';
  if (diff >= 5) return 'medium';
  return 'low';
}

