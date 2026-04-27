import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store/gameStore';
import { HandSetup } from './components/HandSetup';
import { BiddingPhase } from './components/BiddingPhase';
import { GameTable } from './components/GameTable';
import { OpponentCardModal } from './components/OpponentCardModal';
import { getRecommendation } from './utils/recommendationEngine';
import type { Card, Suit, PlayerPosition, Bid } from './types';
import { SUITS, SUIT_SYMBOLS, cardsEqual } from './types';
import { Settings, RotateCcw, HelpCircle, UserPlus, Brain, Trophy, Sparkles } from 'lucide-react';

function App() {
  const {
    playerHand,
    trumpSuit,
    currentTrick,
    teamTricks,
    playerBid,
    playedCards,
    recommendation,
    phase,
    addCardToHand,
    removeCardFromHand,
    clearPlayerHand,
    setPlayerBid: setBid,
    startPlayingPhase,
    playCard,
    awardTrick,
    setRecommendation,
    resetGame,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [bidTricks, setBidTricks] = useState(7);
  const [bidTrump, setBidTrump] = useState<Suit>('spades');
  const [showHelp, setShowHelp] = useState(false);
  const [showOpponentModal, setShowOpponentModal] = useState(false);
  const [gamePhase, setGamePhase] = useState<'setup' | 'bidding' | 'playing'>('setup');
  const [bids, setBids] = useState<Bid[]>([]);

  // Calculate recommendation whenever game state changes
  useEffect(() => {
    if (phase === 'playing' && playerHand.length > 0 && currentTrick.length < 4) {
      const rec = getRecommendation({
        playerHand,
        trumpSuit,
        currentTrick,
        playedCards,
        trickLeader: null,
        currentPlayer: 'south',
        teamTricks,
        playerBid,
      });
      setRecommendation(rec);
    } else {
      setRecommendation(null);
    }
  }, [playerHand, trumpSuit, currentTrick, playedCards, teamTricks, playerBid, phase, setRecommendation]);

  const handleCardToggle = useCallback((card: Card) => {
    const exists = playerHand.some(c => cardsEqual(c, card));
    if (exists) {
      removeCardFromHand(card);
    } else {
      addCardToHand(card);
    }
  }, [playerHand, addCardToHand, removeCardFromHand]);

  const handleStartGame = useCallback(() => {
    setBid(bidTricks, bidTrump);
    startPlayingPhase();
  }, [bidTricks, bidTrump, setBid, startPlayingPhase]);

  const handlePlayCard = useCallback((card: Card) => {
    playCard('south', card);
  }, [playCard]);

  const handleAwardTrick = useCallback((winner: PlayerPosition) => {
    awardTrick(winner);
  }, [awardTrick]);

  const handleRecordOpponentCard = useCallback((player: PlayerPosition, card: Card) => {
    playCard(player, card);
  }, [playCard]);

  const handleUndo = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(prev => !prev);
      }
      
      if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        handleNewGame();
      }
      
      if (e.key === 'u' && e.ctrlKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewGame, handleUndo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Animated background */}
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
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">v1.0.4 Premium</span>
            </div>

            <button
              onClick={() => setShowHelp(true)}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
              title="Help (Esc)"
            >
              <HelpCircle className="w-5 h-5 text-white/40 group-hover:text-white" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-white/40 group-hover:text-white" />
            </button>
            
            <div className="h-8 w-px bg-white/10 mx-2"></div>

            {phase === 'playing' && (
              <button
                onClick={() => setShowOpponentModal(true)}
                className="flex items-center gap-3 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl transition-all shadow-xl shadow-violet-500/20 font-black uppercase tracking-widest text-[10px] border border-violet-400/50"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Record Card</span>
              </button>
            )}
            <button
              onClick={handleNewGame}
              className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 py-6">
        {gamePhase === 'setup' && (
          <HandSetup
            selectedCards={playerHand}
            onCardToggle={handleCardToggle}
            onClear={clearPlayerHand}
            onStartGame={() => setGamePhase('bidding')}
          />
        )}

        {gamePhase === 'bidding' && (
          <BiddingPhase
            playerHand={playerHand}
            bids={bids}
            onPlaceBid={(bid) => {
              setBids(prev => [...prev, bid]);
            }}
            onStartPlaying={() => {
              setBid(bidTricks, bidTrump);
              startPlayingPhase();
              setGamePhase('playing');
            }}
            currentBidder="south"
          />
        )}

        {gamePhase === 'playing' && (
          <>
            <GameTable
              playerHand={playerHand}
              trumpSuit={trumpSuit}
              currentTrick={currentTrick}
              teamTricks={teamTricks}
              playerBid={playerBid}
              playedCards={playedCards}
              recommendation={recommendation}
              onPlayCard={handlePlayCard}
              onRecordOpponentCard={() => setShowOpponentModal(true)}
              onAwardTrick={handleAwardTrick}
              onUndoLastPlay={handleUndo}
            />

            <OpponentCardModal
              isOpen={showOpponentModal}
              onClose={() => setShowOpponentModal(false)}
              onSubmit={handleRecordOpponentCard}
              playedCards={playedCards}
            />
          </>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Card Display Size
                </label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                  <option>Medium</option>
                  <option>Large</option>
                  <option>Small</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Show Card Counter</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Sound Effects</span>
                <input type="checkbox" className="w-5 h-5 rounded accent-blue-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Auto-Recommendations</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-500" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all text-sm font-medium shadow-lg shadow-blue-500/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              How to Use Tarneeb Bot
            </h2>
            <div className="space-y-6 text-sm text-gray-300">
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🎴</span>
                  Setting Up
                </h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Click on cards in the suit rows to select your 13 cards</li>
                  <li>Set your bid (number of tricks) and trump suit</li>
                  <li>Click "Start Game" to begin</li>
                </ol>
              </section>
              
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🎮</span>
                  Playing
                </h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Click on a card in your hand to play it</li>
                  <li>The AI will recommend the best card (highlighted with green checkmark)</li>
                  <li>After all 4 players play, select who won the trick</li>
                  <li>The game tracks all played cards automatically</li>
                </ol>
              </section>
              
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">⌨️</span>
                  Keyboard Shortcuts
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <kbd className="px-3 py-1 bg-gray-700 rounded-lg font-mono text-xs">Ctrl+N</kbd>
                    <span>New Game</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <kbd className="px-3 py-1 bg-gray-700 rounded-lg font-mono text-xs">Ctrl+U</kbd>
                    <span>Undo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <kbd className="px-3 py-1 bg-gray-700 rounded-lg font-mono text-xs">Esc</kbd>
                    <span>Toggle Help</span>
                  </li>
                </ul>
              </section>
              
              <section className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  Tips
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>The recommendation shows confidence level (High/Medium/Low)</li>
                  <li>Use the card counter to track which cards have been played</li>
                  <li>The AI considers your bid progress when making recommendations</li>
                  <li>Trump cards are highlighted in amber with a star</li>
                </ul>
              </section>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all text-sm font-medium shadow-lg shadow-blue-500/30"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative mt-20 pb-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/10 mb-2"></div>
          <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5 shadow-2xl">
            <Brain className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
              Tarneeb Protocol <span className="text-white/20">v1.0.4</span>
            </span>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            Neural Card Assistant • 2024
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;