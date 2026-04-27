import React, { useState, useEffect } from 'react';
import type { Bid, Suit, PlayerPosition } from '../types';
import { SUITS, SUIT_SYMBOLS, SUIT_COLORS } from '../types';
import { getBiddingRecommendation } from '../utils/biddingEngine';
import { Trophy, User, Users, Brain, ChevronRight } from 'lucide-react';

interface BiddingPhaseProps {
  playerHand: import('../types').Card[];
  bids: Bid[];
  onPlaceBid: (bid: Bid) => void;
  onStartPlaying: () => void;
  currentBidder: PlayerPosition;
}

const PLAYER_NAMES: Record<PlayerPosition, string> = {
  south: 'You',
  west: 'West',
  north: 'North',
  east: 'East'
};

// Counter-clockwise: west → south → east → north → west
const CCW_ORDER: PlayerPosition[] = ['west', 'south', 'east', 'north'];

function getNextPlayer(current: PlayerPosition): PlayerPosition {
  const idx = CCW_ORDER.indexOf(current);
  return CCW_ORDER[(idx + 1) % 4];
}

export const BiddingPhase: React.FC<BiddingPhaseProps> = ({
  playerHand,
  bids,
  onPlaceBid,
  onStartPlaying,
}) => {
  const [starter, setStarter] = useState<PlayerPosition | null>(null);
  const [currentInputPlayer, setCurrentInputPlayer] = useState<PlayerPosition | null>(null);
  const [inputTricks, setInputTricks] = useState(7);
  const [showTrumpSelection, setShowTrumpSelection] = useState(false);
  const [winningBidTricks, setWinningBidTricks] = useState(7);
  const [winningBidTrump, setWinningBidTrump] = useState<Suit>('spades');
  const [winningBidPlayer, setWinningBidPlayer] = useState<PlayerPosition>('south');
  const [recommendation, setRecommendation] = useState<ReturnType<typeof getBiddingRecommendation>>(null);
  const [passedPlayers, setPassedPlayers] = useState<Set<PlayerPosition>>(new Set());

  // Calculate whose turn it is next (skip passed players)
  const getNextBidder = (): PlayerPosition | null => {
    if (!starter) return null;
    if (bids.length === 0) return starter;
    
    const lastBid = bids[bids.length - 1];
    let next = getNextPlayer(lastBid.player);
    
    // Find next player who hasn't passed
    let attempts = 0;
    while (passedPlayers.has(next) && attempts < 4) {
      next = getNextPlayer(next);
      attempts++;
    }
    
    return passedPlayers.has(next) ? null : next;
  };

  const nextBidder = getNextBidder();

  // Get current highest bid
  const getHighestBid = () => {
    const validBids = bids.filter(b => b.tricks > 0);
    if (validBids.length === 0) return null;
    return Math.max(...validBids.map(b => b.tricks));
  };
  const highestBid = getHighestBid();

  // Get recommendation when it's player's turn
  useEffect(() => {
    if (nextBidder === 'south' && playerHand.length === 13) {
      const rec = getBiddingRecommendation(playerHand, bids, 'south', true);
      setRecommendation(rec);
    } else {
      setRecommendation(null);
    }
  }, [nextBidder, playerHand, bids]);

  const handleStartBidding = (player: PlayerPosition) => {
    setStarter(player);
    setCurrentInputPlayer(player);
  };

  const handleSubmitBid = () => {
    if (!currentInputPlayer) return;

    const bid: Bid = {
      player: currentInputPlayer,
      tricks: inputTricks,
      trump: 'spades', // placeholder, real trump chosen at end
      isWinning: false,
    };
    onPlaceBid(bid);

    // Next player must bid one higher than this bid
    const nextMinimumBid = inputTricks + 1;

    // Skip to next player who hasn't passed
    let next = getNextPlayer(currentInputPlayer);
    let attempts = 0;
    while (passedPlayers.has(next) && attempts < 4) {
      next = getNextPlayer(next);
      attempts++;
    }
    
    if (!passedPlayers.has(next)) {
      setCurrentInputPlayer(next);
      setInputTricks(nextMinimumBid);
    } else {
      // Only 1 player remains, show trump selection
      setShowTrumpSelection(true);
    }
  };

  const handlePass = () => {
    if (!currentInputPlayer) return;

    const bid: Bid = {
      player: currentInputPlayer,
      tricks: 0,
      trump: 'spades',
      isWinning: false,
    };
    onPlaceBid(bid);
    
    // Mark player as passed
    setPassedPlayers(prev => new Set([...prev, currentInputPlayer]));

    // Skip to next player who hasn't passed
    let next = getNextPlayer(currentInputPlayer);
    let attempts = 0;
    while (passedPlayers.has(next) && attempts < 4) {
      next = getNextPlayer(next);
      attempts++;
    }
    
    if (!passedPlayers.has(next)) {
      setCurrentInputPlayer(next);
    } else {
      // Only 1 player remains, show trump selection
      setShowTrumpSelection(true);
    }
  };

  // Find winner automatically from bids
  const getWinner = () => {
    const validBids = bids.filter(b => b.tricks > 0);
    if (validBids.length === 0) return null;
    
    const maxTricks = Math.max(...validBids.map(b => b.tricks));
    // Last player who bid max tricks is the winner
    const winnerBid = [...validBids].reverse().find(b => b.tricks === maxTricks);
    return winnerBid;
  };

  const winnerBid = getWinner();

  const handleSetWinningBid = () => {
    if (!winnerBid) return;

    const bid: Bid = {
      ...winnerBid,
      trump: winningBidTrump,
      isWinning: true,
    };
    onPlaceBid(bid);
    onStartPlaying();
  };

  // Count active players (not passed)
  const activePlayersCount = 4 - passedPlayers.size;
  
  // Bidding continues until only 1 player remains active
  const biddingComplete = activePlayersCount <= 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Bidding Phase</h2>
            <p className="text-gray-400 text-sm mt-1">
              {starter ? `Started by ${PLAYER_NAMES[starter]}` : 'Choose who starts'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Choose Starter */}
      {!starter && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Who starts the bidding?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['west', 'north', 'east', 'south'] as PlayerPosition[]).map(pos => (
              <button
                key={pos}
                onClick={() => handleStartBidding(pos)}
                className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all bg-gray-700/50 hover:bg-gray-700 border border-gray-600/30 hover:border-gray-500/50"
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                  ${pos === 'south' || pos === 'north' ? 'bg-green-600' : 'bg-red-600'}
                `}>
                  {pos === 'south' ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <span className="text-white font-medium">{PLAYER_NAMES[pos]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bidding History */}
      {bids.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Bids So Far</h3>
          <div className="space-y-2">
            {bids.map((bid, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  bid.player === 'south' ? 'bg-blue-900/30 border border-blue-700/30' : 'bg-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                    ${bid.player === 'south' || bid.player === 'north' ? 'bg-green-600' : 'bg-red-600'}
                  `}>
                    {bid.player[0].toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{PLAYER_NAMES[bid.player]}</span>
                </div>
                <span className={`
                  px-3 py-1 rounded-lg font-bold
                  ${bid.tricks === 0 ? 'bg-gray-600 text-gray-400' : 'bg-amber-900/50 text-amber-400'}
                `}>
                  {bid.tricks === 0 ? 'Pass' : `${bid.tricks} tricks`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Turn - Input Bid */}
      {starter && !biddingComplete && currentInputPlayer && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {currentInputPlayer === 'south' ? 'Your Turn' : `${PLAYER_NAMES[currentInputPlayer]}'s Turn`}
            </h3>
            <span className="text-sm text-gray-400">
              Bid {bids.length + 1} of 4
            </span>
          </div>

          {/* AI Recommendation (only for player) */}
          {currentInputPlayer === 'south' && recommendation && (
            <div className="bg-blue-900/20 rounded-xl p-4 mb-4 border border-blue-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-semibold">AI Recommendation</span>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${recommendation.confidence === 'high' ? 'bg-green-600 text-white' :
                    recommendation.confidence === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-orange-600 text-white'}
                `}>
                  {recommendation.confidence.toUpperCase()}
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {recommendation.suggestedTricks === 0 ? 'Pass' : `Bid ${recommendation.suggestedTricks}`}
              </p>
              <p className="text-gray-400 text-sm">{recommendation.reasoning}</p>
            </div>
          )}

          {/* Bid Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Number of Tricks
                {highestBid && <span className="ml-2 text-amber-400">Current: {highestBid}</span>}
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }, (_, i) => i).map(n => {
                  const minBid = highestBid ? highestBid + 1 : 7;
                  const isDisabled = n > 0 && n < minBid;
                  
                  return (
                    <button
                      key={n}
                      onClick={() => !isDisabled && setInputTricks(n)}
                      disabled={isDisabled}
                      className={`
                        h-12 rounded-xl text-sm font-bold transition-all
                        ${inputTricks === n
                          ? 'bg-amber-500 text-white shadow-lg scale-110'
                          : isDisabled
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                    >
                      {n === 0 ? 'P' : n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePass}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
              >
                Pass
              </button>
              <button
                onClick={handleSubmitBid}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                {inputTricks === 0 ? 'Pass' : `Bid ${inputTricks}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Choose Tarneeb */}
      {biddingComplete && winnerBid && (
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/10 rounded-2xl p-6 shadow-xl border border-green-700/30">
          <h3 className="text-lg font-semibold text-white mb-4">Choose Tarneeb Suit</h3>
          
          <div className="mb-4 p-4 bg-gray-800/50 rounded-xl">
            <p className="text-gray-400 text-sm mb-1">Winner</p>
            <p className="text-white font-bold text-lg">
              {PLAYER_NAMES[winnerBid.player]} bid {winnerBid.tricks} tricks
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tarneeb (Trump) Suit</label>
              <div className="flex gap-3">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => setWinningBidTrump(suit)}
                    className={`
                      flex-1 h-16 rounded-2xl text-3xl font-bold transition-all
                      ${winningBidTrump === suit
                        ? 'bg-amber-500 text-white shadow-lg scale-110 ring-2 ring-amber-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    {SUIT_SYMBOLS[suit]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSetWinningBid}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-6 h-6" />
              Start Playing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
