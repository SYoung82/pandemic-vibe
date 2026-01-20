import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { gameAPI } from '../lib/api';

interface Player {
  id: number;
  user_id: number;
  [key: string]: unknown;
}

interface Game {
  id: number;
  name?: string;
  status: string;
  difficulty: string;
  created_by_id: number;
  players: Player[];
}

export default function GameLobby() {
  const [games, setGames] = useState<Game[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadGames = async () => {
    try {
      const response = await gameAPI.listGames();
      setGames(response.data.data);
    } catch (err) {
      console.error('Failed to load games:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGames();
  }, []);

  const handleCreateGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await gameAPI.createGame({
        name: gameName,
        max_players: maxPlayers,
        difficulty: difficulty
      });
      const gameId = response.data.data.id;
      navigate(`/game/${gameId}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(errorMessage || 'Failed to create game');
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (gameId: number, isPlayerInGame: boolean) => {
    // If player is already in the game, just navigate directly
    if (isPlayerInGame) {
      navigate(`/game/${gameId}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await gameAPI.joinGame(String(gameId));
      navigate(`/game/${gameId}`);
    } catch (err: unknown) {
      const errorResponse = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;

      // Map backend error messages to user-friendly messages
      let errorMessage = 'Failed to join game';
      if (errorResponse) {
        if (errorResponse.includes('already_started') || errorResponse.includes('started')) {
          errorMessage = 'This game has already started';
        } else if (errorResponse.includes('full')) {
          errorMessage = 'This game is full (4 players max)';
        } else if (errorResponse.includes('already_joined')) {
          errorMessage = 'You have already joined this game';
        } else {
          errorMessage = errorResponse;
        }
      }

      setError(errorMessage);
      setIsLoading(false);
      // Reload games list to get updated state
      await loadGames();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-cyan-400">Infestation</h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-300">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Game Lobby</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 text-white px-6 py-2 rounded-md hover:bg-cyan-700 transition-colors"
          >
            Create New Game
          </button>
        </div>

        {error && (
          <div className="bg-rose-900/50 border border-rose-700 text-rose-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => {
            const isPlayerInGame = game.players?.some(p => p.user_id === user?.id);
            const isFull = (game.players?.length || 0) >= 4;
            const isStarted = game.status !== 'lobby';

            return (
              <div key={game.id} className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {game.name || `Game #${game.id}`}
                </h3>
                <div className="space-y-2 text-sm text-slate-300 mb-4">
                  <p>Players: {game.players?.length || 0}/4</p>
                  <p>Difficulty: <span className="capitalize">{game.difficulty}</span></p>
                  <p>Status: <span className="capitalize">{game.status}</span></p>
                </div>
                <button
                  onClick={() => handleJoinGame(game.id, isPlayerInGame)}
                  disabled={isLoading || (isFull && !isPlayerInGame) || (isStarted && !isPlayerInGame)}
                  className="w-full bg-emerald-600 text-white py-2 rounded-md hover:bg-emerald-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Joining...' :
                   isPlayerInGame ? 'View Game' :
                   isStarted ? 'In Progress' :
                   isFull ? 'Full' :
                   'Join Game'}
                </button>
              </div>
            );
          })}

          {games.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No games available. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Create New Game</h3>

            {error && (
              <div className="bg-rose-900/50 border border-rose-700 text-rose-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Game Name
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter game name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Max Players
                </label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGame}
                  disabled={isLoading}
                  className="flex-1 bg-cyan-600 text-white py-2 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
