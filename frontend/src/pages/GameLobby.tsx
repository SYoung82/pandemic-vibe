import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { gameAPI } from '../lib/api';

interface Game {
  id: number;
  status: string;
  difficulty: string;
  created_by_id: number;
  players: any[];
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

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const response = await gameAPI.listGames();
      setGames(response.data.data);
    } catch (err) {
      console.error('Failed to load games:', err);
    }
  };

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create game');
      setIsLoading(false);
    }
  };

  const handleJoinGame = (gameId: number) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-800">Pandemic Vibe</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Game Lobby</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Game
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <div key={game.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Game #{game.id}</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Players: {game.players?.length || 0}/4</p>
                <p>Difficulty: <span className="capitalize">{game.difficulty}</span></p>
                <p>Status: <span className="capitalize">{game.status}</span></p>
              </div>
              <button
                onClick={() => handleJoinGame(game.id)}
                disabled={(game.players?.length || 0) >= 4}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {game.status === 'lobby' ? 'Join Game' : 'View Game'}
              </button>
            </div>
          ))}

          {games.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No games available. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Create New Game</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game Name
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter game name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Players
                </label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGame}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
