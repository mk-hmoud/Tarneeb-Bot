import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { HandSetup } from './components/HandSetup';
import { BiddingPhase } from './components/BiddingPhase';
import { GameTable } from './components/GameTable';
import { TrickLogger } from './components/TrickLogger';
import { HandReview } from './components/HandReview';
import { getRecommendation } from './utils/recommendationEngine';
import type { MCTSInput, MCTSOutput } from './utils/ismcts';
import type { Card, Suit, PlayerPosition, Bid } from './types';
import { cardsEqual } from './types';
import { Settings, RotateCcw, HelpCircle, Brain, Sparkles } from 'lucide-react';

function App() {
  const {
    appPhase,
    setAppPhase,
    playerHand,
    bids,
    trumpSuit,
    currentTrick,
    trickLeader,
    teamTricks,
    playerBid,
    playedCards,
    tricks,
    winningBid,
    recommendation,
    phase,
    addCardToHand,
    removeCardFromHand,
    clearPlayerHand,
    addBid,
    startPlayingPhase,
    playCard,
    awardTrick,
    setRecommendation,
    resetGame,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mctsComputing, setMctsComputing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/mctsWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<MCTSOutput>) => {
      const { rankings, requestId } = e.data;
      // Discard stale results
      if (requestId !== requestIdRef.current) return;

      setMctsComputing(false);
      if (!rankings.length) return;

      const best = rankings[0];
      const winPct = Math.round(best.winRate * 100);
      const confidence =
        best.winRate >= 0.68 ? 'high' :
        best.winRate >= 0.50 ? 'medium' : 'low';

      setRecommendation({
        card: best.card,
        confidence,
        reason: `${winPct}% win rate across ${best.simulations} simulated deals`,
        alternativeCards: rankings.slice(1, 3).map(r => r.card),
        winRate: best.winRate,
        simulations: best.simulations,
      });
    };

    worker.onerror = () => setMctsComputing(false);

    return () => worker.terminate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recommendation pipeline: heuristic immediately, then MCTS upgrade
  useEffect(() => {
    const active = phase === 'playing' && playerHand.length > 0 && currentTrick.length < 4;
    const southAlreadyPlayed = currentTrick.some(p => p.player === 'south');

    if (!active) {
      setRecommendation(null);
      setMctsComputing(false);
      return;
    }

    // 1. Immediate heuristic recommendation (synchronous, <1ms)
    const heuristicRec = getRecommendation({
      playerHand, trumpSuit, currentTrick, playedCards,
      trickLeader, currentPlayer: 'south', teamTricks, playerBid, tricks,
    });
    setRecommendation(heuristicRec);

    // 2. Kick off MCTS in the Web Worker (only when south hasn't played yet)
    if (!southAlreadyPlayed && workerRef.current) {
      const requestId = ++requestIdRef.current;
      setMctsComputing(true);

      const msg: MCTSInput = {
        playerHand, trumpSuit, currentTrick, playedCards,
        tricks, teamTricks, playerBid,
        trickLeader: trickLeader ?? 'west',
        winningBidder: winningBid?.player ?? null,
        numSimulations: 100,
        requestId,
      };
      workerRef.current.postMessage(msg);
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    playerHand, trumpSuit, currentTrick, playedCards,
    teamTricks, playerBid, tricks, trickLeader, winningBid, phase,
  ]);

  const handleCardToggle = useCallback((card: Card) => {
    const exists = playerHand.some(c => cardsEqual(c, card));
    if (exists) removeCardFromHand(card);
    else addCardToHand(card);
  }, [playerHand, addCardToHand, removeCardFromHand]);

  const handlePlayCard = useCallback((card: Card) => {
    playCard('south', card);
  }, [playCard]);

  const handleAwardTrick = useCallback((winner: PlayerPosition) => {
    awardTrick(winner);
  }, [awardTrick]);

  const handleRecordOpponent = useCallback((player: PlayerPosition, card: Card) => {
    playCard(player, card);
  }, [playCard]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  // Auto-transition to review when all 13 tricks are played
  useEffect(() => {
    if (tricks.length === 13 && appPhase === 'playing') {
      setAppPhase('review');
    }
  }, [tricks.length, appPhase, setAppPhase]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelp(prev => !prev);
      if (e.key === 'n' && e.ctrlKey) { e.preventDefault(); handleNewGame(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNewGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative glass-panel border-b border-white/5 px-8 py-5 sticky top-0 z-40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500 ring-4 ring-blue-500/10 border border-white/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white">
                TARNEEB<span className="text-blue-500">.</span>BOT
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
                  AI-Powered Strategy Engine
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 px-4 py-2 bg-white/5 rounded-xl border border-white/5 mr-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">IS-MCTS Engine</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 group" title="Help (Esc)">
              <HelpCircle className="w-5 h-5 text-white/40 group-hover:text-white" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 group">
              <Settings className="w-5 h-5 text-white/40 group-hover:text-white" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <button onClick={handleNewGame} className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 py-6">
        {appPhase === 'setup' && (
          <HandSetup
            selectedCards={playerHand}
            onCardToggle={handleCardToggle}
            onClear={clearPlayerHand}
            onStartGame={() => setAppPhase('bidding')}
          />
        )}

        {appPhase === 'bidding' && (
          <BiddingPhase
            playerHand={playerHand}
            bids={bids}
            onPlaceBid={(bid: Bid) => addBid(bid)}
            onStartPlaying={(trickCount: number, trump: Suit) => {
              startPlayingPhase(trickCount, trump);
              setAppPhase('playing');
            }}
            currentBidder="south"
          />
        )}

        {appPhase === 'review' && (
          <HandReview
            tricks={tricks}
            playerBid={playerBid}
            teamTricks={teamTricks}
            trumpSuit={trumpSuit}
            winningBid={winningBid}
            onNewGame={handleNewGame}
          />
        )}

        {appPhase === 'playing' && (
          <div className="space-y-4">
            <GameTable
              playerHand={playerHand}
              trumpSuit={trumpSuit}
              currentTrick={currentTrick}
              teamTricks={teamTricks}
              playerBid={playerBid}
              playedCards={playedCards}
              recommendation={recommendation}
              mctsComputing={mctsComputing}
              onPlayCard={handlePlayCard}
              onAwardTrick={handleAwardTrick}
              onUndoLastPlay={handleNewGame}
            />
            <TrickLogger
              currentTrick={currentTrick}
              playedCards={playedCards}
              trumpSuit={trumpSuit}
              onRecord={handleRecordOpponent}
            />
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" />Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Show Card Counter</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Auto-Recommendations</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-500" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all text-sm font-medium shadow-lg shadow-blue-500/30">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" />How to Use Tarneeb Bot</h2>
            <div className="space-y-4 text-sm text-gray-300">
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2">Setup</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap your 13 cards in the hand setup screen</li>
                  <li>Enter each player's bid in order</li>
                  <li>The winning bidder picks the trump suit</li>
                </ol>
              </section>
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2">During Play</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Log opponent cards in the W / N / E strip — tap position then rank</li>
                  <li>Tap a card in your hand to record your play</li>
                  <li>After all 4 cards, tap who won the trick</li>
                  <li>AI shows heuristic recommendation instantly, then upgrades to deep MCTS analysis</li>
                </ol>
              </section>
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2">Reading the Recommendation</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-blue-400">Pulsing dot</span> = MCTS is computing (100 simulated deals)</li>
                  <li><span className="text-white">Win %</span> = how often that card leads to making the bid</li>
                  <li>Confidence updates from heuristic → MCTS when analysis finishes</li>
                </ul>
              </section>
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2">Shortcuts</h3>
                <div className="flex gap-4">
                  <kbd className="px-2 py-1 bg-gray-700 rounded font-mono text-xs">Ctrl+N</kbd><span>New game</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded font-mono text-xs">Esc</kbd><span>Toggle help</span>
                </div>
              </section>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all text-sm font-medium">Got it!</button>
            </div>
          </div>
        </div>
      )}

      <footer className="relative mt-20 pb-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5">
            <Brain className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
              IS-MCTS · Tarneeb Protocol
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
