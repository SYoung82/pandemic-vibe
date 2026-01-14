import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useGameChannel } from '../lib/useGameChannel';
import type { Card } from '../lib/useGameChannel';
import { gameAPI } from '../lib/api';
import WorldMap from '../components/WorldMap';
import GameOverModal from '../components/GameOverModal';

interface Player {
  id: string;
  user_id: string;
  role?: string;
  turn_order: number;
  username?: string;
  cards?: Card[];
}

interface GameInfo {
  id: string;
  status: string;
  difficulty: string;
  players: Player[];
  created_by_id: string;
  creator_id?: string;
  max_players?: number;
  username?: string;
  name?: string;
}

interface ActionParams {
  [key: string]: unknown;
}

export default function GameBoard() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionParams, setActionParams] = useState<ActionParams>({});
  const [validMoves, setValidMoves] = useState<Array<{ name: string; color: string }>>([]);

  const token = localStorage.getItem('token');

  const {
    gameState,
    messages,
    lobbyGame,
    isConnected,
    error,
    sendAction,
    endTurn,
    sendMessage,
    discardCards,
    getValidMoves
  } = useGameChannel(gameId!, token);

  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [selectedCardsToDiscard, setSelectedCardsToDiscard] = useState<string[]>([]);
  const [requiredDiscardCount, setRequiredDiscardCount] = useState(0);

  const loadGameInfo = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await gameAPI.getGame(gameId);
      setGameInfo(response.data.data);
    } catch (err) {
      console.error('Failed to load game:', err);
      navigate('/games');
    }
  }, [gameId, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGameInfo();
  }, [loadGameInfo]);

  // Merge gameInfo with lobbyGame updates (prefer lobbyGame for status and players if available)
  const currentGameInfo = lobbyGame && gameInfo
    ? {
        ...gameInfo,
        status: lobbyGame.status,
        players: lobbyGame.players.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          role: p.role || undefined,
          turn_order: p.turn_order || 0,
        })),
      }
    : gameInfo;

  const handleStartGame = async () => {
    try {
      await gameAPI.startGame(gameId!);
      await loadGameInfo();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      alert(errorMessage || 'Failed to start game');
    }
  };

  const handleSelectAction = async (action: string) => {
    setSelectedAction(action);
    setActionParams({});

    // Load valid moves when move action is selected
    if (action === 'move') {
      try {
        const response = await getValidMoves();
        setValidMoves(response.cities);
      } catch (err) {
        console.error('Failed to load valid moves:', err);
        setValidMoves([]);
      }
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction) return;

    console.log('Sending action:', selectedAction, 'with params:', actionParams);

    try {
      const result = await sendAction(selectedAction, actionParams);
      console.log('Action result:', result);
      alert('Action successful!');
      setSelectedAction('');
      setActionParams({});
      setValidMoves([]);
    } catch (err) {
      console.error('Action failed - full error:', err);
      console.error('Action failed - error type:', typeof err);
      console.error('Action failed - error keys:', err && typeof err === 'object' ? Object.keys(err) : 'not an object');

      let errorMessage = 'Action failed';
      if (err && typeof err === 'object') {
        if ('reason' in err) {
          errorMessage = String(err.reason);
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      alert(`Action failed: ${errorMessage}`);
    }
  };

  const handleEndTurn = async () => {
    try {
      await endTurn();
    } catch (err: unknown) {
      // Check if error is due to hand limit
      const error = err as { reason?: string; hand_size?: number };
      if (error?.reason === 'must_discard' && error?.hand_size) {
        const cardsOverLimit = error.hand_size - 7;
        setRequiredDiscardCount(cardsOverLimit);
        setShowDiscardModal(true);
      } else {
        console.error('End turn failed:', err);
      }
    }
  };

  const handleDiscardCards = async () => {
    if (selectedCardsToDiscard.length !== requiredDiscardCount) {
      alert(`Please select exactly ${requiredDiscardCount} card(s) to discard`);
      return;
    }

    try {
      await discardCards(selectedCardsToDiscard);
      setShowDiscardModal(false);
      setSelectedCardsToDiscard([]);
      setRequiredDiscardCount(0);
    } catch (err) {
      console.error('Discard failed:', err);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardsToDiscard(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  // Find the current user's player record
  const myPlayer = gameState?.players.find((p) => String(p.user_id) === String(user?.id));
  // Find the player whose turn it is
  const currentPlayer = gameState?.players.find((p) => p.id === gameState.current_player_id);
  // Check if it's the current user's turn
  const isCurrentPlayer = myPlayer && currentPlayer ? String(currentPlayer.user_id) === String(myPlayer.user_id) : false;

  // Debug logging
  console.log('Debug - myPlayer:', myPlayer);
  console.log('Debug - currentPlayer:', currentPlayer);
  console.log('Debug - isCurrentPlayer:', isCurrentPlayer);

  // Derive game status for modal display
  const gameStatus = gameState?.game?.status;

  if (!currentGameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{currentGameInfo.name}</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className={`text-xs sm:text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </span>
              <button
                onClick={() => navigate('/games')}
                className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </nav>

      {error && (
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {currentGameInfo.status === 'lobby' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Lobby</h2>
                <p className="text-gray-600">Waiting for players to join...</p>
              </div>

              {/* Game Settings */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Game Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="ml-2 font-medium text-gray-800 capitalize">{currentGameInfo.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Players:</span>
                    <span className="ml-2 font-medium text-gray-800">{currentGameInfo.players.length}/4</span>
                  </div>
                </div>
              </div>

              {/* Player List */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Players ({currentGameInfo.players.length})</h3>
                <div className="space-y-2">
                  {currentGameInfo.players.map((player: Player, index: number) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {String(player.username || player.user_id).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {String(player.username || player.user_id)}
                          </div>
                          {index === 0 && (
                            <span className="text-xs text-blue-600 font-medium">Host</span>
                          )}
                        </div>
                      </div>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from({ length: 4 - currentGameInfo.players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 border-dashed rounded-lg p-3"
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500">
                        ?
                      </div>
                      <span className="text-gray-500 italic">Waiting for player...</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Game Button */}
              {String(currentGameInfo.created_by_id) === String(user?.id) ? (
                <div className="space-y-3">
                  {currentGameInfo.players.length < 2 ? (
                    <div className="text-center py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Need at least 2 players to start the game
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartGame}
                      className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                    >
                      Start Game ({currentGameInfo.players.length} players ready)
                    </button>
                  )}
                  <p className="text-xs text-center text-gray-500">
                    You are the host. Click Start Game when everyone is ready.
                  </p>
                </div>
              ) : (
                <div className="text-center py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Waiting for host to start the game...
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
            {/* Game Board */}
            <div className="xl:col-span-3 space-y-4">
              {/* Current Turn Indicator */}
              {currentPlayer && (
                <div className={`rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 ${isCurrentPlayer ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                  <div className="text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
                          {isCurrentPlayer ? '🎮 Your Turn!' : `${currentPlayer.role}'s Turn`}
                        </h3>
                        <p className="text-blue-100 text-sm lg:text-base">
                          Turn #{gameState?.turn_number || 0} • {currentPlayer.actions_remaining} actions remaining
                        </p>
                      </div>
                      {currentPlayer.role && (
                        <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 self-start sm:self-auto">
                          <span className="text-white text-sm lg:text-base font-semibold capitalize">{currentPlayer.role}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* World Map */}
              {gameState && (
                <WorldMap
                  cities={[
                    // Blue cities (North America and Europe)
                    { name: 'San Francisco', color: 'blue', x: 5, y: 40,
                      hasResearchStation: gameState.state.research_stations?.includes('San Francisco'),
                      infections: gameState.state.city_infections?.['San Francisco'] },
                    { name: 'Chicago', color: 'blue', x: 18, y: 35,
                      hasResearchStation: gameState.state.research_stations?.includes('Chicago'),
                      infections: gameState.state.city_infections?.['Chicago'] },
                    { name: 'Montreal', color: 'blue', x: 24, y: 30,
                      hasResearchStation: gameState.state.research_stations?.includes('Montreal'),
                      infections: gameState.state.city_infections?.['Montreal'] },
                    { name: 'New York', color: 'blue', x: 26, y: 35,
                      hasResearchStation: gameState.state.research_stations?.includes('New York'),
                      infections: gameState.state.city_infections?.['New York'] },
                    { name: 'Washington', color: 'blue', x: 24, y: 39,
                      hasResearchStation: gameState.state.research_stations?.includes('Washington'),
                      infections: gameState.state.city_infections?.['Washington'] },
                    { name: 'Atlanta', color: 'blue', x: 20, y: 42,
                      hasResearchStation: gameState.state.research_stations?.includes('Atlanta'),
                      infections: gameState.state.city_infections?.['Atlanta'] },
                    { name: 'London', color: 'blue', x: 45, y: 28,
                      hasResearchStation: gameState.state.research_stations?.includes('London'),
                      infections: gameState.state.city_infections?.['London'] },
                    { name: 'Madrid', color: 'blue', x: 42, y: 38,
                      hasResearchStation: gameState.state.research_stations?.includes('Madrid'),
                      infections: gameState.state.city_infections?.['Madrid'] },
                    { name: 'Paris', color: 'blue', x: 48, y: 33,
                      hasResearchStation: gameState.state.research_stations?.includes('Paris'),
                      infections: gameState.state.city_infections?.['Paris'] },
                    { name: 'Essen', color: 'blue', x: 50, y: 28,
                      hasResearchStation: gameState.state.research_stations?.includes('Essen'),
                      infections: gameState.state.city_infections?.['Essen'] },
                    { name: 'Milan', color: 'blue', x: 52, y: 35,
                      hasResearchStation: gameState.state.research_stations?.includes('Milan'),
                      infections: gameState.state.city_infections?.['Milan'] },
                    { name: 'St. Petersburg', color: 'blue', x: 58, y: 22,
                      hasResearchStation: gameState.state.research_stations?.includes('St. Petersburg'),
                      infections: gameState.state.city_infections?.['St. Petersburg'] },

                    // Yellow cities (South America and Africa)
                    { name: 'Los Angeles', color: 'yellow', x: 8, y: 45,
                      hasResearchStation: gameState.state.research_stations?.includes('Los Angeles'),
                      infections: gameState.state.city_infections?.['Los Angeles'] },
                    { name: 'Mexico City', color: 'yellow', x: 14, y: 52,
                      hasResearchStation: gameState.state.research_stations?.includes('Mexico City'),
                      infections: gameState.state.city_infections?.['Mexico City'] },
                    { name: 'Miami', color: 'yellow', x: 22, y: 50,
                      hasResearchStation: gameState.state.research_stations?.includes('Miami'),
                      infections: gameState.state.city_infections?.['Miami'] },
                    { name: 'Bogota', color: 'yellow', x: 22, y: 62,
                      hasResearchStation: gameState.state.research_stations?.includes('Bogota'),
                      infections: gameState.state.city_infections?.['Bogota'] },
                    { name: 'Lima', color: 'yellow', x: 20, y: 70,
                      hasResearchStation: gameState.state.research_stations?.includes('Lima'),
                      infections: gameState.state.city_infections?.['Lima'] },
                    { name: 'Santiago', color: 'yellow', x: 24, y: 80,
                      hasResearchStation: gameState.state.research_stations?.includes('Santiago'),
                      infections: gameState.state.city_infections?.['Santiago'] },
                    { name: 'Buenos Aires', color: 'yellow', x: 28, y: 78,
                      hasResearchStation: gameState.state.research_stations?.includes('Buenos Aires'),
                      infections: gameState.state.city_infections?.['Buenos Aires'] },
                    { name: 'Sao Paulo', color: 'yellow', x: 32, y: 72,
                      hasResearchStation: gameState.state.research_stations?.includes('Sao Paulo'),
                      infections: gameState.state.city_infections?.['Sao Paulo'] },
                    { name: 'Lagos', color: 'yellow', x: 48, y: 60,
                      hasResearchStation: gameState.state.research_stations?.includes('Lagos'),
                      infections: gameState.state.city_infections?.['Lagos'] },
                    { name: 'Khartoum', color: 'yellow', x: 56, y: 56,
                      hasResearchStation: gameState.state.research_stations?.includes('Khartoum'),
                      infections: gameState.state.city_infections?.['Khartoum'] },
                    { name: 'Kinshasa', color: 'yellow', x: 52, y: 66,
                      hasResearchStation: gameState.state.research_stations?.includes('Kinshasa'),
                      infections: gameState.state.city_infections?.['Kinshasa'] },
                    { name: 'Johannesburg', color: 'yellow', x: 54, y: 75,
                      hasResearchStation: gameState.state.research_stations?.includes('Johannesburg'),
                      infections: gameState.state.city_infections?.['Johannesburg'] },

                    // Black cities (Asia and Middle East)
                    { name: 'Algiers', color: 'black', x: 48, y: 43,
                      hasResearchStation: gameState.state.research_stations?.includes('Algiers'),
                      infections: gameState.state.city_infections?.['Algiers'] },
                    { name: 'Cairo', color: 'black', x: 54, y: 46,
                      hasResearchStation: gameState.state.research_stations?.includes('Cairo'),
                      infections: gameState.state.city_infections?.['Cairo'] },
                    { name: 'Istanbul', color: 'black', x: 56, y: 38,
                      hasResearchStation: gameState.state.research_stations?.includes('Istanbul'),
                      infections: gameState.state.city_infections?.['Istanbul'] },
                    { name: 'Moscow', color: 'black', x: 62, y: 26,
                      hasResearchStation: gameState.state.research_stations?.includes('Moscow'),
                      infections: gameState.state.city_infections?.['Moscow'] },
                    { name: 'Tehran', color: 'black', x: 66, y: 40,
                      hasResearchStation: gameState.state.research_stations?.includes('Tehran'),
                      infections: gameState.state.city_infections?.['Tehran'] },
                    { name: 'Baghdad', color: 'black', x: 62, y: 44,
                      hasResearchStation: gameState.state.research_stations?.includes('Baghdad'),
                      infections: gameState.state.city_infections?.['Baghdad'] },
                    { name: 'Riyadh', color: 'black', x: 62, y: 52,
                      hasResearchStation: gameState.state.research_stations?.includes('Riyadh'),
                      infections: gameState.state.city_infections?.['Riyadh'] },
                    { name: 'Karachi', color: 'black', x: 70, y: 48,
                      hasResearchStation: gameState.state.research_stations?.includes('Karachi'),
                      infections: gameState.state.city_infections?.['Karachi'] },
                    { name: 'Mumbai', color: 'black', x: 72, y: 54,
                      hasResearchStation: gameState.state.research_stations?.includes('Mumbai'),
                      infections: gameState.state.city_infections?.['Mumbai'] },
                    { name: 'Delhi', color: 'black', x: 74, y: 46,
                      hasResearchStation: gameState.state.research_stations?.includes('Delhi'),
                      infections: gameState.state.city_infections?.['Delhi'] },
                    { name: 'Chennai', color: 'black', x: 76, y: 58,
                      hasResearchStation: gameState.state.research_stations?.includes('Chennai'),
                      infections: gameState.state.city_infections?.['Chennai'] },
                    { name: 'Kolkata', color: 'black', x: 78, y: 50,
                      hasResearchStation: gameState.state.research_stations?.includes('Kolkata'),
                      infections: gameState.state.city_infections?.['Kolkata'] },

                    // Red cities (East Asia and Oceania)
                    { name: 'Beijing', color: 'red', x: 82, y: 38,
                      hasResearchStation: gameState.state.research_stations?.includes('Beijing'),
                      infections: gameState.state.city_infections?.['Beijing'] },
                    { name: 'Seoul', color: 'red', x: 86, y: 36,
                      hasResearchStation: gameState.state.research_stations?.includes('Seoul'),
                      infections: gameState.state.city_infections?.['Seoul'] },
                    { name: 'Shanghai', color: 'red', x: 84, y: 44,
                      hasResearchStation: gameState.state.research_stations?.includes('Shanghai'),
                      infections: gameState.state.city_infections?.['Shanghai'] },
                    { name: 'Tokyo', color: 'red', x: 90, y: 38,
                      hasResearchStation: gameState.state.research_stations?.includes('Tokyo'),
                      infections: gameState.state.city_infections?.['Tokyo'] },
                    { name: 'Osaka', color: 'red', x: 88, y: 42,
                      hasResearchStation: gameState.state.research_stations?.includes('Osaka'),
                      infections: gameState.state.city_infections?.['Osaka'] },
                    { name: 'Taipei', color: 'red', x: 84, y: 50,
                      hasResearchStation: gameState.state.research_stations?.includes('Taipei'),
                      infections: gameState.state.city_infections?.['Taipei'] },
                    { name: 'Hong Kong', color: 'red', x: 82, y: 52,
                      hasResearchStation: gameState.state.research_stations?.includes('Hong Kong'),
                      infections: gameState.state.city_infections?.['Hong Kong'] },
                    { name: 'Bangkok', color: 'red', x: 78, y: 58,
                      hasResearchStation: gameState.state.research_stations?.includes('Bangkok'),
                      infections: gameState.state.city_infections?.['Bangkok'] },
                    { name: 'Ho Chi Minh City', color: 'red', x: 80, y: 62,
                      hasResearchStation: gameState.state.research_stations?.includes('Ho Chi Minh City'),
                      infections: gameState.state.city_infections?.['Ho Chi Minh City'] },
                    { name: 'Manila', color: 'red', x: 84, y: 60,
                      hasResearchStation: gameState.state.research_stations?.includes('Manila'),
                      infections: gameState.state.city_infections?.['Manila'] },
                    { name: 'Jakarta', color: 'red', x: 80, y: 68,
                      hasResearchStation: gameState.state.research_stations?.includes('Jakarta'),
                      infections: gameState.state.city_infections?.['Jakarta'] },
                    { name: 'Sydney', color: 'red', x: 88, y: 78,
                      hasResearchStation: gameState.state.research_stations?.includes('Sydney'),
                      infections: gameState.state.city_infections?.['Sydney'] },
                  ]}
                  players={gameState.players}
                  currentPlayerId={gameState.current_player_id}
                  onCityClick={(cityName) => {
                    if (isCurrentPlayer) {
                      setActionParams({ target: cityName });
                    }
                  }}
                />
              )}

              {/* Game Status Cards */}
              {gameState && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                  {/* Outbreak Counter */}
                  <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-4">
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Outbreaks</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">{gameState.game.outbreak_count}</span>
                      <span className="text-xs sm:text-sm text-gray-500">/ 8</span>
                    </div>
                    <div className="mt-1 sm:mt-2 bg-red-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${(gameState.game.outbreak_count / 8) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Infection Rate */}
                  <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-4">
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Infection Rate</div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{gameState.state?.infection_rate || 2}</div>
                    <div className="text-xs text-gray-500 mt-1">cards per turn</div>
                  </div>

                  {/* Disease Cubes */}
                  <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-4">
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Disease Cubes</div>
                    <div className="space-y-1">
                      {Object.entries(gameState.state.disease_cubes || {}).slice(0, 2).map(([color, count]) => (
                        <div key={color} className="flex justify-between text-xs">
                          <span className="capitalize">{color}:</span>
                          <span className="font-semibold">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Research Stations */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600 mb-1">Research Stations</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {gameState.state.research_stations?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">built</div>
                  </div>
                </div>
              )}

              {/* Cure Status */}
              {gameState && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Cure Progress</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(gameState.state.cure_markers || {}).map(([color, status]) => {
                      const colorClasses = {
                        blue: 'from-blue-500 to-blue-600',
                        yellow: 'from-yellow-400 to-yellow-500',
                        black: 'from-gray-700 to-gray-800',
                        red: 'from-red-500 to-red-600'
                      };
                      const isDiscovered = status === 'discovered' || status === 'eradicated';

                      return (
                        <div
                          key={color}
                          className={`rounded-lg p-4 text-center ${
                            isDiscovered
                              ? `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || 'from-gray-500 to-gray-600'} text-white`
                              : 'bg-gray-100 border-2 border-dashed border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-semibold capitalize mb-2">{color}</div>
                          <div className="text-2xl">
                            {isDiscovered ? '✓' : '○'}
                          </div>
                          <div className="text-xs mt-1">
                            {String(status).replace(/_/g, ' ').split(' ').map(word =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Player Actions */}
              {isCurrentPlayer && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Your Actions</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => handleSelectAction('move')}
                        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                      >
                        Move
                      </button>
                      <button
                        onClick={() => handleSelectAction('treat_disease')}
                        className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      >
                        Treat Disease
                      </button>
                      <button
                        onClick={() => handleSelectAction('build_station')}
                        className="bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                      >
                        Build Station
                      </button>
                      <button
                        onClick={() => handleSelectAction('discover_cure')}
                        className="bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
                      >
                        Discover Cure
                      </button>
                    </div>

                    {selectedAction && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                        <h4 className="font-semibold mb-2 capitalize">Action: {selectedAction}</h4>

                        {selectedAction === 'move' && validMoves.length > 0 ? (
                          <select
                            className="w-full px-3 py-2 border rounded mb-2"
                            onChange={(e) => setActionParams({ target: e.target.value })}
                            defaultValue=""
                          >
                            <option value="" disabled>Select destination city</option>
                            {validMoves.map((city) => (
                              <option key={city.name} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        ) : selectedAction === 'move' ? (
                          <div className="text-sm text-gray-600 mb-2">Loading available destinations...</div>
                        ) : selectedAction === 'treat_disease' ? (
                          <div className="space-y-2 mb-2">
                            <label className="block text-sm text-gray-600">Select disease color to treat:</label>
                            <select
                              className="w-full px-3 py-2 border rounded"
                              onChange={(e) => setActionParams({ color: e.target.value })}
                              defaultValue=""
                            >
                              <option value="" disabled>Select disease color</option>
                              <option value="blue">Blue</option>
                              <option value="yellow">Yellow</option>
                              <option value="black">Black</option>
                              <option value="red">Red</option>
                            </select>
                          </div>
                        ) : selectedAction === 'discover_cure' && gameState ? (
                          <div className="space-y-2 mb-2">
                            <label className="block text-sm text-gray-600">Select disease to cure:</label>
                            <select
                              className="w-full px-3 py-2 border rounded mb-2"
                              onChange={(e) => setActionParams({ color: e.target.value })}
                              defaultValue=""
                            >
                              <option value="" disabled>Select disease color</option>
                              {Object.entries(gameState.state?.cure_markers || {})
                                .filter(([, status]) => status === 'not_discovered')
                                .map(([color]) => (
                                  <option key={color} value={color} className="capitalize">
                                    {color.charAt(0).toUpperCase() + color.slice(1)}
                                  </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">
                              You need 5 cards of the selected color. Select the cards from your hand below:
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {myPlayer?.cards
                                ?.filter((card) => card.city_color === actionParams.color)
                                .map((card) => (
                                  <label key={card.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      onChange={(e) => {
                                        const cardIds = actionParams.card_ids as string[] || [];
                                        if (e.target.checked) {
                                          setActionParams({ ...actionParams, card_ids: [...cardIds, card.id] });
                                        } else {
                                          setActionParams({ ...actionParams, card_ids: cardIds.filter(id => id !== card.id) });
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{card.city_name}</span>
                                  </label>
                                ))}
                            </div>
                            {actionParams.color && myPlayer?.cards?.filter((card) => card.city_color === actionParams.color).length === 0 ? (
                              <p className="text-xs text-red-600">You don&apos;t have any {String(actionParams.color)} cards in your hand.</p>
                            ) : null}
                          </div>
                        ) : selectedAction === 'build_station' ? (
                          <p className="text-sm text-gray-600 mb-2">
                            Build a research station at your current location.
                            {myPlayer?.current_city_id && ` (${myPlayer.current_city_id})`}
                          </p>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter parameters (e.g., city name)"
                            className="w-full px-3 py-2 border rounded mb-2"
                            onChange={(e) => setActionParams({ target: e.target.value })}
                          />
                        )}

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
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                  >
                    End Turn
                  </button>
                </div>
              )}

              {/* Players */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Players</h3>
                <div className="space-y-3">
                  {gameState?.players.map((player) => {
                    const isActive = player.id === gameState.current_player_id;
                    return (
                      <div
                        key={player.id}
                        className={`rounded-lg p-4 border-2 ${
                          isActive
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              isActive ? 'bg-green-500' : 'bg-blue-500'
                            }`}>
                              {player.turn_order + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 capitalize">{player.role || 'Player'}</h4>
                              <p className="text-xs text-gray-500">
                                {player.current_city_id || 'Unknown location'}
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600 mt-2">
                          <div>
                            <span className="font-medium">Actions:</span> {player.actions_remaining}/4
                          </div>
                          <div>
                            <span className="font-medium">Cards:</span> {player.cards?.length || 0}
                          </div>
                        </div>

                        {/* Player's hand - only show for the current user */}
                        {String(player.user_id) === String(user?.id) && player.cards && player.cards.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Your Hand:</p>
                            <div className="flex flex-wrap gap-2">
                              {player.cards.map((card) => (
                                <div
                                  key={card.id}
                                  className={`px-3 py-2 rounded-lg text-xs font-medium shadow-sm border-2 ${
                                    card.card_type === 'epidemic'
                                      ? 'bg-red-100 border-red-300 text-red-800'
                                      : card.city_color === 'blue'
                                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                                      : card.city_color === 'yellow'
                                      ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                      : card.city_color === 'black'
                                      ? 'bg-gray-100 border-gray-300 text-gray-800'
                                      : card.city_color === 'red'
                                      ? 'bg-red-100 border-red-300 text-red-800'
                                      : 'bg-gray-100 border-gray-300 text-gray-600'
                                  }`}
                                >
                                  {card.card_type === 'epidemic' ? '⚠️ EPIDEMIC' : card.city_name || 'Unknown'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Chat</h3>
                <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-2">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="text-xs sm:text-sm">
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
                    className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discard Modal */}
      {showDiscardModal && myPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Hand Limit Exceeded
            </h2>
            <p className="text-gray-600 mb-6">
              You have {myPlayer.cards?.length || 0} cards. Please select{' '}
              <span className="font-bold text-red-600">{requiredDiscardCount}</span> card(s) to discard.
              (Maximum hand size is 7 cards)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {myPlayer.cards?.map((card) => (
                <button
                  key={card.id}
                  onClick={() => toggleCardSelection(card.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCardsToDiscard.includes(card.id)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  } ${
                    card.card_type === 'epidemic'
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  disabled={card.card_type === 'epidemic'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${
                        card.city_color === 'blue'
                          ? 'text-blue-700'
                          : card.city_color === 'yellow'
                          ? 'text-yellow-700'
                          : card.city_color === 'black'
                          ? 'text-gray-700'
                          : card.city_color === 'red'
                          ? 'text-red-700'
                          : 'text-gray-600'
                      }`}>
                        {card.card_type === 'epidemic' ? '⚠️ EPIDEMIC' : card.city_name}
                      </div>
                      {card.city_color && card.card_type !== 'epidemic' && (
                        <div className="text-xs text-gray-500 capitalize mt-1">
                          {card.city_color}
                        </div>
                      )}
                    </div>
                    {selectedCardsToDiscard.includes(card.id) && (
                      <div className="text-red-600 text-xl">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDiscardCards}
                disabled={selectedCardsToDiscard.length !== requiredDiscardCount}
                className={`flex-1 py-3 rounded-lg font-semibold ${
                  selectedCardsToDiscard.length === requiredDiscardCount
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Discard {selectedCardsToDiscard.length}/{requiredDiscardCount} Selected
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Selected: {selectedCardsToDiscard.length} | Required: {requiredDiscardCount}
            </p>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {(gameStatus === 'won' || gameStatus === 'lost') && gameState?.game && (
        <GameOverModal
          status={gameState.game.status as 'won' | 'lost'}
          loseReason={undefined} // TODO: Backend needs to send lose reason
          gameStats={{
            turnNumber: gameState.turn_number || 0,
            outbreakCount: gameState.game.outbreak_count || 0,
            curesDiscovered: Object.values(gameState.state?.cure_markers || {}).filter(
              (status) => status === 'discovered' || status === 'eradicated'
            ).length,
            difficulty: gameState.game.difficulty || 'normal'
          }}
          onClose={() => {/* Modal stays open until user navigates away */}}
        />
      )}
    </div>
  );
}
