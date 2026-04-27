# 🃏 Tarneeb Bot

An AI-powered assistant for the popular Middle Eastern card game Tarneeb. This bot helps you make strategic decisions during gameplay by analyzing your hand, tracking played cards, and providing real-time recommendations.

## Features

### 🎴 Quick Card Input
- **One-click card selection** for setting up your hand
- **Intuitive suit-organized layout** for fast input during gameplay
- **Visual card display** with proper suit symbols and colors

### 🤖 AI Recommendations
- **Smart card suggestions** based on game state analysis
- **Confidence indicators** (High/Medium/Low) for each recommendation
- **Alternative plays** shown when relevant
- **Strategic considerations**:
  - Card counting and probability analysis
  - Partner signal interpretation
  - Bid progress tracking
  - Trump management

### 📊 Game Tracking
- **Automatic card counting** - tracks all played cards
- **Trick history** - see what's been played
- **Score tracking** - monitor both teams' progress
- **Visual card counter** - quick reference for remaining cards

### ⚡ Real-time Updates
- **Instant feedback** when cards are played
- **Dynamic recommendations** that update with game state
- **WebSocket support** for multiplayer synchronization

### ⌨️ Keyboard Shortcuts
- `Ctrl+N` - New Game
- `Ctrl+U` - Undo last action
- `Esc` - Toggle help

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS v4** for styling
- **Zustand** for state management
- **Socket.io Client** for real-time communication
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **Socket.io** for WebSocket communication
- **TypeScript** for type safety

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tarneeb-bot
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm install  # only needed once
npm run dev
```
Server will start on `http://localhost:3001`

2. In a new terminal, start the frontend:
```bash
cd frontend
npm install  # only needed once
npm run dev
```
App will open at `http://localhost:5173`

> **Note**: Keep both terminals running while using the application.

## How to Use

### 1. Set Up Your Hand
- Click on cards in the suit rows to select your 13 cards
- Cards are organized by suit (Spades, Hearts, Diamonds, Clubs)
- Progress bar shows how many cards you've selected

### 2. Set Your Bid
- Choose the number of tricks you expect to win (1-13)
- Select your trump suit by clicking the suit symbol

### 3. Start Playing
- Click "Start Game" to begin
- Your hand will be displayed grouped by suit
- Trump cards are highlighted in amber

### 4. During Gameplay
- **Play a card**: Click on any card in your hand
- **View recommendation**: The AI highlights the best card with a green dot
- **Record opponent cards**: Click "Record Card" button to log what others play
- **Award tricks**: When all 4 cards are played, select who won the trick
- **Track progress**: Use the card counter at the bottom

### 5. Understanding Recommendations
- **High Confidence**: Strong recommendation, clear best play
- **Medium Confidence**: Good option, but alternatives exist
- **Low Confidence**: Multiple viable options, use your judgment

## Game Rules (Tarneeb)

Tarneeb is a 4-player trick-taking game with these key rules:

1. **Teams**: 2 teams of 2 players (South+North vs West+East)
2. **Deck**: Standard 52-card deck (no jokers)
3. **Card Ranking**: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
4. **Bidding**: Players bid for number of tricks and declare trump suit
5. **Gameplay**: 
   - Must follow suit if possible
   - Trump beats all non-trump cards
   - Highest card of led suit wins (unless trumped)
6. **Scoring**: Teams score points for meeting/exceeding their bid

## Project Structure

```
tarneeb-bot/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Card.tsx
│   │   │   ├── GameTable.tsx
│   │   │   ├── HandSetup.tsx
│   │   │   └── OpponentCardModal.tsx
│   │   ├── store/         # Zustand store
│   │   │   └── gameStore.ts
│   │   ├── utils/         # Utility functions
│   │   │   └── recommendationEngine.ts
│   │   ├── types.ts       # TypeScript types
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   └── package.json
│
├── backend/               # Node.js backend
│   ├── src/
│   │   └── server.ts      # Express + Socket.io server
│   └── package.json
│
└── README.md
```

## AI Strategy

The recommendation engine considers:

1. **Trick State**: Whether you're leading, following, or partner is winning
2. **Card Strength**: High cards vs low cards in context
3. **Trump Management**: When to use trumps, when to save them
4. **Card Counting**: Which cards have been played, which remain
5. **Bid Progress**: Whether you need tricks or can conserve cards
6. **Partner Signals**: Interpreting partner's plays

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues or have suggestions, please open an issue in the repository.