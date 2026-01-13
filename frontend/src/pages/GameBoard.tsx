import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useGameChannel } from '../lib/useGameChannel';
import { gameAPI } from '../lib/api';

// Player interface from GameState - see useGameChannel.ts for full definition

export default function GameBoard() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionParams, setActionParams] = useState<any>({});

  const token = localStorage.getItem('token');

  const {
    gameState,
    messages,
    isConnected,
    error,
    sendAction,
    endTurn,
    sendMessage
  } = useGameChannel(gameId!, token);

  useEffect(() => {
    if (gameId) {
      loadGameInfo();
    }
  }, [gameId]);

  const loadGameInfo = async () => {
    try {
      const response = await gameAPI.getGame(gameId!);
      setGameInfo(response.data.data);
    } catch (err) {
      console.error('Failed to load game:', err);
      navigate('/games');
    }
  };

  const handleStartGame = async () => {
    try {
      await gameAPI.startGame(gameId!);
      await loadGameInfo();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start game');
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction) return;

    try {
      await sendAction(selectedAction, actionParams);
      setSelectedAction('');
      setActionParams({});
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleEndTurn = async () => {
    try {
      await endTurn();
    } catch (err) {
      console.error('End turn failed:', err);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  const isCurrentPlayer = gameState?.current_player_id === String(user?.id);
  const currentPlayer = gameState?.players.find((p) => p.id === gameState.current_player_id);

  if (!gameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-800">{gameInfo.name}</h1>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </span>
              <button
                onClick={() => navigate('/games')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </nav>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {gameInfo.status === 'lobby' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Waiting for Players</h2>
            <div className="space-y-2 mb-6">
              {gameInfo.players.map((player: any) => (
                <div key={player.id} className="flex items-center gap-2 text-gray-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {player.username}
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4">
              Players: {gameInfo.players.length}/{gameInfo.max_players}
            </p>
            {gameInfo.creator_id === user?.id && gameInfo.players.length >= 2 && (
              <button
                onClick={handleStartGame}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Start Game
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Board */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Game Board</h2>
                  <div className="text-sm text-gray-600">
                    Turn: {gameState?.turn_number || 0}
                  </div>
                </div>

                {currentPlayer && (
                  <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
                    <p className="text-blue-800">
                      Current Player: <strong>Player {currentPlayer.turn_order + 1}</strong> ({currentPlayer.role})
                      {isCurrentPlayer && ' - Your turn!'}
                    </p>
                  </div>
                )}

                {gameState && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Outbreak Counter</h3>
                      <div className="bg-red-100 rounded p-2 text-red-800">
                        {gameState.state.outbreak_count} / 8
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Infection Rate</h3>
                      <div className="bg-orange-100 rounded p-2 text-orange-800">
                        {gameState.state.infection_rate}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Cures Discovered</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(gameState.state.cure_markers || {}).map(([color, status]) => (
                          <div
                            key={color}
                            className={`rounded p-2 text-center ${
                              status === 'cured' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {color}: {status === 'cured' ? '✓' : '✗'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isCurrentPlayer && (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Your Actions</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => setSelectedAction('move')}
                        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                      >
                        Move
                      </button>
                      <button
                        onClick={() => setSelectedAction('treat')}
                        className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      >
                        Treat Disease
                      </button>
                      <button
                        onClick={() => setSelectedAction('build')}
                        className="bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                      >
                        Build Station
                      </button>
                      <button
                        onClick={() => setSelectedAction('cure')}
                        className="bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
                      >
                        Discover Cure
                      </button>
                    </div>

                    {selectedAction && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                        <h4 className="font-semibold mb-2">Action: {selectedAction}</h4>
                        <input
                          type="text"
                          placeholder="Enter parameters (e.g., city name)"
                          className="w-full px-3 py-2 border rounded mb-2"
                          onChange={(e) => setActionParams({ target: e.target.value })}
                        />
                        <button
                          onClick={handleSendAction}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Execute Action
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleEndTurn}
                      className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
                    >
                      End Turn
                    </button>
                  </div>
                )}
              </div>

              {/* Players */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Players</h3>
                <div className="space-y-3">
                  {gameState?.players.map((player) => (
                    <div key={player.id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">Player {player.turn_order + 1}</h4>
                          <p className="text-sm text-gray-600">{player.role}</p>
                        </div>
                        <span className="text-sm text-gray-500">@ {player.current_city_id || 'N/A'}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Actions: {player.actions_remaining}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 h-[600px] flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Chat</h3>
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold text-gray-800">{msg.player_name}:</span>{' '}
                      <span className="text-gray-600">{msg.message}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
