import React, { useState, useEffect } from 'react';
import type { Bid, Suit, PlayerPosition } from '../types';
import { SUITS, SUIT_SYMBOLS, SUIT_COLORS } from '../types';
import { getBiddingRecommendation } from '../utils/biddingEngine';
import { Trophy, User, Users, Brain, ChevronRight } from 'lucide-react';

interface BiddingPhaseProps {
  playerHand: import('../types').Card[];
  bids: Bid[];
  onPlaceBid: (bid: Bid) => void;
  onStartPlaying: (tricks: number, trump: Suit) => void;
  currentBidder: PlayerPosition;
}

const PLAYER_NAMES: Record<PlayerPosition, string> = {
  south: 'You',
  west: 'West',
  north: 'Partner',
  east: 'East',
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
  const [biddingComplete, setBiddingComplete] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<Suit>('spades');
  const [passedPlayers, setPassedPlayers] = useState<Set<PlayerPosition>>(new Set());
  const [recommendation, setRecommendation] = useState<ReturnType<typeof getBiddingRecommendation>>(null);

  const highestBid = bids.reduce<number>((max, b) => (b.tricks > max ? b.tricks : max), 6);

  // Get current winner (last player to bid the highest number)
  const winnerBid = [...bids].reverse().find(b => b.tricks === highestBid && b.tricks > 0) ?? null;

  // Recalculate recommendation when it's the player's turn
  useEffect(() => {
    if (currentInputPlayer === 'south' && playerHand.length === 13) {
      setRecommendation(getBiddingRecommendation(playerHand, bids, 'south', true));
    } else {
      setRecommendation(null);
    }
  }, [currentInputPlayer, playerHand, bids]);

  const advanceToNextBidder = (from: PlayerPosition, newPassed: Set<PlayerPosition>) => {
    let next = getNextPlayer(from);
    let attempts = 0;
    while (newPassed.has(next) && attempts < 4) {
      next = getNextPlayer(next);
      attempts++;
    }
    // Count active players
    const active = 4 - newPassed.size;
    if (active <= 1) {
      setBiddingComplete(true);
    } else {
      setCurrentInputPlayer(next);
      setInputTricks(Math.max(highestBid + 1, 7));
    }
  };

  const handleStartBidding = (player: PlayerPosition) => {
    setStarter(player);
    setCurrentInputPlayer(player);
    setInputTricks(7);
  };

  const handleBid = () => {
    if (!currentInputPlayer) return;
    onPlaceBid({ player: currentInputPlayer, tricks: inputTricks, trump: 'spades', isWinning: false });
    advanceToNextBidder(currentInputPlayer, passedPlayers);
  };

  const handlePass = () => {
    if (!currentInputPlayer) return;
    onPlaceBid({ player: currentInputPlayer, tricks: 0, trump: 'spades', isWinning: false });
    const newPassed = new Set([...passedPlayers, currentInputPlayer]);
    setPassedPlayers(newPassed);
    advanceToNextBidder(currentInputPlayer, newPassed);
  };

  const handleStartPlaying = () => {
    if (!winnerBid) return;
    onPlaceBid({ ...winnerBid, trump: trumpSuit, isWinning: true });
    onStartPlaying(winnerBid.tricks, trumpSuit);
  };

  const minBid = Math.max(highestBid + 1, 7);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 shadow-xl border border-gray-700 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Bidding Phase</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {starter ? `${PLAYER_NAMES[starter]} started` : 'Who starts the bidding?'}
          </p>
        </div>
      </div>

      {/* Step 1: Choose starter */}
      {!starter && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 shadow-xl border border-gray-700">
          <p className="text-sm text-gray-400 mb-4">Tap the player who bids first:</p>
          <div className="grid grid-cols-4 gap-2">
            {(['west', 'north', 'east', 'south'] as PlayerPosition[]).map(pos => (
              <button
                key={pos}
                onClick={() => handleStartBidding(pos)}
                className="py-3 rounded-xl flex flex-col items-center gap-2 transition-all bg-gray-700/50 hover:bg-gray-700 border border-gray-600/30 hover:border-gray-500/50"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${pos === 'south' || pos === 'north' ? 'bg-emerald-600' : 'bg-rose-700'}`}>
                  {pos === 'south' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
                <span className="text-white text-xs font-semibold">{PLAYER_NAMES[pos]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bid history */}
      {bids.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 shadow-xl border border-gray-700">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Bids So Far</h3>
          <div className="flex flex-wrap gap-2">
            {bids.map((bid, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                  bid.player === 'south' || bid.player === 'north'
                    ? 'bg-emerald-900/40 border border-emerald-700/40 text-emerald-300'
                    : 'bg-rose-900/30 border border-rose-700/30 text-rose-300'
                }`}
              >
                <span className="text-white/50 text-xs">{PLAYER_NAMES[bid.player]}:</span>
                <span>{bid.tricks === 0 ? 'Pass' : bid.tricks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current turn input */}
      {starter && !biddingComplete && currentInputPlayer && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 shadow-xl border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${currentInputPlayer === 'south' || currentInputPlayer === 'north' ? 'bg-emerald-600' : 'bg-rose-700'}`}>
                {currentInputPlayer[0].toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white">
                {currentInputPlayer === 'south' ? 'Your Bid' : `${PLAYER_NAMES[currentInputPlayer]}'s Bid`}
              </h3>
            </div>
            {highestBid > 6 && (
              <span className="text-sm text-amber-400 font-bold">Current: {highestBid}</span>
            )}
          </div>

          {/* AI Recommendation */}
          {currentInputPlayer === 'south' && recommendation && (
            <div className="bg-blue-900/20 rounded-xl p-4 mb-4 border border-blue-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-semibold text-sm">AI Recommendation</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  recommendation.confidence === 'high' ? 'bg-emerald-600 text-white' :
                  recommendation.confidence === 'medium' ? 'bg-amber-600 text-white' :
                  'bg-orange-600 text-white'
                }`}>
                  {recommendation.confidence.toUpperCase()}
                </span>
              </div>
              <p className="text-2xl font-black text-white">
                {recommendation.suggestedTricks === 0 ? 'Pass' : `Bid ${recommendation.suggestedTricks}`}
              </p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{recommendation.reasoning}</p>
            </div>
          )}

          {/* Bid number grid */}
          <div className="grid grid-cols-8 gap-1.5 mb-4">
            <button
              onClick={() => setInputTricks(0)}
              className={`col-span-1 h-11 rounded-xl text-sm font-black transition-all ${
                inputTricks === 0
                  ? 'bg-gray-500 text-white scale-105 shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              P
            </button>
            {[7, 8, 9, 10, 11, 12, 13].map(n => {
              const disabled = n < minBid;
              return (
                <button
                  key={n}
                  onClick={() => !disabled && setInputTricks(n)}
                  disabled={disabled}
                  className={`h-11 rounded-xl text-sm font-black transition-all ${
                    inputTricks === n
                      ? 'bg-amber-500 text-white scale-105 shadow-lg shadow-amber-500/30'
                      : disabled
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePass}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
            >
              Pass
            </button>
            <button
              onClick={handleBid}
              disabled={inputTricks === 0}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg"
            >
              Bid {inputTricks || '—'}
            </button>
          </div>
        </div>
      )}

      {/* Bidding complete — choose trump */}
      {biddingComplete && winnerBid && (
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/10 rounded-2xl p-5 shadow-xl border border-green-700/30">
          <div className="mb-4 p-3 bg-gray-800/50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Winner</p>
              <p className="text-white font-bold">
                {PLAYER_NAMES[winnerBid.player]} — {winnerBid.tricks} tricks
              </p>
            </div>
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>

          <p className="text-sm text-gray-400 mb-3">Choose the Trump (Tarneeb) suit:</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {SUITS.map(suit => (
              <button
                key={suit}
                onClick={() => setTrumpSuit(suit)}
                className={`py-4 rounded-2xl text-3xl font-bold transition-all ${
                  trumpSuit === suit
                    ? 'bg-amber-500 text-white shadow-lg scale-105 ring-2 ring-amber-400'
                    : SUIT_COLORS[suit] === 'red'
                      ? 'bg-rose-600/10 text-rose-400 hover:bg-rose-600/20'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {SUIT_SYMBOLS[suit]}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartPlaying}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-5 h-5" />
            Start Playing
          </button>
        </div>
      )}
    </div>
  );
};
