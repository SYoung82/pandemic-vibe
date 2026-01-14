# Pandemic Vibe - React Frontend

A real-time multiplayer pandemic board game built with React, TypeScript, and Phoenix Channels WebSocket.

## Tech Stack

- **React 19.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite 7.2.4** - Build tool
- **React Router DOM** - Client-side routing
- **TanStack React Query** - Server state management
- **Axios** - HTTP client
- **Zustand** - Client state management
- **Tailwind CSS v3** - Styling
- **Phoenix WebSocket Client** - Real-time communication

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── api.ts              # HTTP API client with JWT auth
│   │   ├── useGameChannel.ts   # Phoenix Channel WebSocket hook
│   │   └── AuthContext.tsx     # Authentication context provider
│   ├── pages/
│   │   ├── Login.tsx           # Login page
│   │   ├── Register.tsx        # Registration page
│   │   ├── GameLobby.tsx       # Game list and creation
│   │   └── GameBoard.tsx       # Main game UI with WebSocket
│   ├── components/
│   │   └── ProtectedRoute.tsx  # Route authentication wrapper
│   ├── App.tsx                 # Main app with router
│   └── main.tsx               # Entry point
```

## Features

### Authentication
- User registration and login
- JWT token-based authentication
- Protected routes
- Persistent login (localStorage)

### Game Lobby
- List all available games
- Create new games with custom settings (players, difficulty)
- Join existing games
- Real-time game status updates

### Game Board
- Real-time WebSocket connection via Phoenix Channels
- Live game state updates
- Turn-based gameplay
- Player actions: Move, Treat Disease, Build Station, Discover Cure
- In-game chat
- Connection status indicator
- Game statistics (outbreaks, infection rate, cures)

## Running the Frontend

### Development Mode
```bash
npm install
npm run dev
```
Server runs at http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

## Environment Configuration

The frontend expects the backend API to be available at:
- **HTTP API**: `http://localhost:4000/api`
- **WebSocket**: `ws://localhost:4000/socket`

## WebSocket Integration

Real-time game updates via Phoenix Channels:

```typescript
const {
  gameState,      // Current game state
  messages,       // Chat messages
  lobbyGame,      // Lobby state updates
  isConnected,    // Connection status
  error,          // Error message
  sendAction,     // Send player action
  endTurn,        // End current turn
  sendMessage,    // Send chat message
  getState,       // Request latest state
  getValidMoves   // Get valid move destinations
} = useGameChannel(gameId, token);
```

## Code Quality

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Testing

Frontend tests are not yet implemented. See root README for current testing approach.
