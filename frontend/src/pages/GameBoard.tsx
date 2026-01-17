import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useGameChannel } from '../lib/useGameChannel';
import type { Card } from '../lib/useGameChannel';
import { gameAPI } from '../lib/api';
import GalaxyMap from '../components/GalaxyMap';
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
        setValidMoves(response.planets || []);
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
                <div className={`rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 border bg-slate-900`}>
                  <div className="text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 capitalize">
                          {isCurrentPlayer ? '🚀 Your Turn!' : `${currentPlayer.role.replace('_', ' ')}'s Turn`}
                        </h3>
                        <p className="text-slate-300 text-sm lg:text-base">
                          Turn #{gameState?.turn_number || 0} • {currentPlayer.actions_remaining} actions remaining
                        </p>
                      </div>
                      {currentPlayer.role && (
                        <div className={`${isCurrentPlayer ? 'bg-emerald-800/50 border border-emerald-500/50' : 'bg-slate-700/50 border border-slate-500/30'} rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 self-start sm:self-auto`}>
                          <span className={`${isCurrentPlayer ? 'text-emerald-400' : 'text-slate-400'} text-sm lg:text-base font-semibold capitalize`}>{currentPlayer.role.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Galaxy Map */}
              {gameState && (
                <GalaxyMap
                  cities={[
                    // Orion Sector (Blue) - 12 planets
                    { name: 'Kepler Prime', color: 'blue', x: 10, y: 35,
                      hasResearchStation: gameState.state.command_bases?.includes('Kepler Prime'),
                      infections: gameState.state.planet_infestations?.['Kepler Prime'] },
                    { name: 'Zenith Station', color: 'blue', x: 15, y: 30,
                      hasResearchStation: gameState.state.command_bases?.includes('Zenith Station'),
                      infections: gameState.state.planet_infestations?.['Zenith Station'] },
                    { name: 'Cryos', color: 'blue', x: 20, y: 28,
                      hasResearchStation: gameState.state.command_bases?.includes('Cryos'),
                      infections: gameState.state.planet_infestations?.['Cryos'] },
                    { name: 'Titan City', color: 'blue', x: 24, y: 33,
                      hasResearchStation: gameState.state.command_bases?.includes('Titan City'),
                      infections: gameState.state.planet_infestations?.['Titan City'] },
                    { name: 'Command Central', color: 'blue', x: 22, y: 38,
                      hasResearchStation: gameState.state.command_bases?.includes('Command Central'),
                      infections: gameState.state.planet_infestations?.['Command Central'] },
                    { name: 'Nova Haven', color: 'blue', x: 18, y: 40,
                      hasResearchStation: gameState.state.command_bases?.includes('Nova Haven'),
                      infections: gameState.state.planet_infestations?.['Nova Haven'] },
                    { name: 'Avalon', color: 'blue', x: 42, y: 28,
                      hasResearchStation: gameState.state.command_bases?.includes('Avalon'),
                      infections: gameState.state.planet_infestations?.['Avalon'] },
                    { name: 'Solara', color: 'blue', x: 45, y: 32,
                      hasResearchStation: gameState.state.command_bases?.includes('Solara'),
                      infections: gameState.state.planet_infestations?.['Solara'] },
                    { name: 'Lumina', color: 'blue', x: 48, y: 30,
                      hasResearchStation: gameState.state.command_bases?.includes('Lumina'),
                      infections: gameState.state.planet_infestations?.['Lumina'] },
                    { name: 'Forge World', color: 'blue', x: 50, y: 27,
                      hasResearchStation: gameState.state.command_bases?.includes('Forge World'),
                      infections: gameState.state.planet_infestations?.['Forge World'] },
                    { name: 'Crystallis', color: 'blue', x: 52, y: 33,
                      hasResearchStation: gameState.state.command_bases?.includes('Crystallis'),
                      infections: gameState.state.planet_infestations?.['Crystallis'] },
                    { name: 'Polaris', color: 'blue', x: 55, y: 26,
                      hasResearchStation: gameState.state.command_bases?.includes('Polaris'),
                      infections: gameState.state.planet_infestations?.['Polaris'] },

                    // Hydra Sector (Yellow) - 12 planets
                    { name: 'Star Harbor', color: 'yellow', x: 12, y: 45,
                      hasResearchStation: gameState.state.command_bases?.includes('Star Harbor'),
                      infections: gameState.state.planet_infestations?.['Star Harbor'] },
                    { name: 'Azteca Prime', color: 'yellow', x: 16, y: 50,
                      hasResearchStation: gameState.state.command_bases?.includes('Azteca Prime'),
                      infections: gameState.state.planet_infestations?.['Azteca Prime'] },
                    { name: 'Coral Station', color: 'yellow', x: 20, y: 48,
                      hasResearchStation: gameState.state.command_bases?.includes('Coral Station'),
                      infections: gameState.state.planet_infestations?.['Coral Station'] },
                    { name: 'Emerald Ridge', color: 'yellow', x: 22, y: 55,
                      hasResearchStation: gameState.state.command_bases?.includes('Emerald Ridge'),
                      infections: gameState.state.planet_infestations?.['Emerald Ridge'] },
                    { name: 'Condor Peak', color: 'yellow', x: 18, y: 58,
                      hasResearchStation: gameState.state.command_bases?.includes('Condor Peak'),
                      infections: gameState.state.planet_infestations?.['Condor Peak'] },
                    { name: 'Sierra Nova', color: 'yellow', x: 22, y: 62,
                      hasResearchStation: gameState.state.command_bases?.includes('Sierra Nova'),
                      infections: gameState.state.planet_infestations?.['Sierra Nova'] },
                    { name: 'Pampas Prime', color: 'yellow', x: 26, y: 65,
                      hasResearchStation: gameState.state.command_bases?.includes('Pampas Prime'),
                      infections: gameState.state.planet_infestations?.['Pampas Prime'] },
                    { name: 'Amazon Station', color: 'yellow', x: 28, y: 60,
                      hasResearchStation: gameState.state.command_bases?.includes('Amazon Station'),
                      infections: gameState.state.planet_infestations?.['Amazon Station'] },
                    { name: 'Savanna Prime', color: 'yellow', x: 45, y: 50,
                      hasResearchStation: gameState.state.command_bases?.includes('Savanna Prime'),
                      infections: gameState.state.planet_infestations?.['Savanna Prime'] },
                    { name: 'Oasis Station', color: 'yellow', x: 50, y: 48,
                      hasResearchStation: gameState.state.command_bases?.includes('Oasis Station'),
                      infections: gameState.state.planet_infestations?.['Oasis Station'] },
                    { name: 'Congo Nexus', color: 'yellow', x: 48, y: 56,
                      hasResearchStation: gameState.state.command_bases?.includes('Congo Nexus'),
                      infections: gameState.state.planet_infestations?.['Congo Nexus'] },
                    { name: 'Diamond World', color: 'yellow', x: 52, y: 60,
                      hasResearchStation: gameState.state.command_bases?.includes('Diamond World'),
                      infections: gameState.state.planet_infestations?.['Diamond World'] },

                    // Nebula Sector (Black) - 12 planets
                    { name: 'Atlas Base', color: 'black', x: 47, y: 40,
                      hasResearchStation: gameState.state.command_bases?.includes('Atlas Base'),
                      infections: gameState.state.planet_infestations?.['Atlas Base'] },
                    { name: 'Pyramid Station', color: 'black', x: 52, y: 42,
                      hasResearchStation: gameState.state.command_bases?.includes('Pyramid Station'),
                      infections: gameState.state.planet_infestations?.['Pyramid Station'] },
                    { name: 'Crossroads Prime', color: 'black', x: 55, y: 38,
                      hasResearchStation: gameState.state.command_bases?.includes('Crossroads Prime'),
                      infections: gameState.state.planet_infestations?.['Crossroads Prime'] },
                    { name: 'Crimson Reach', color: 'black', x: 58, y: 40,
                      hasResearchStation: gameState.state.command_bases?.includes('Crimson Reach'),
                      infections: gameState.state.planet_infestations?.['Crimson Reach'] },
                    { name: 'Persia Nova', color: 'black', x: 60, y: 42,
                      hasResearchStation: gameState.state.command_bases?.includes('Persia Nova'),
                      infections: gameState.state.planet_infestations?.['Persia Nova'] },
                    { name: 'Babylon Station', color: 'black', x: 58, y: 45,
                      hasResearchStation: gameState.state.command_bases?.includes('Babylon Station'),
                      infections: gameState.state.planet_infestations?.['Babylon Station'] },
                    { name: 'Dune World', color: 'black', x: 62, y: 48,
                      hasResearchStation: gameState.state.command_bases?.includes('Dune World'),
                      infections: gameState.state.planet_infestations?.['Dune World'] },
                    { name: 'Indus Prime', color: 'black', x: 64, y: 44,
                      hasResearchStation: gameState.state.command_bases?.includes('Indus Prime'),
                      infections: gameState.state.planet_infestations?.['Indus Prime'] },
                    { name: 'Monsoon Station', color: 'black', x: 66, y: 46,
                      hasResearchStation: gameState.state.command_bases?.includes('Monsoon Station'),
                      infections: gameState.state.planet_infestations?.['Monsoon Station'] },
                    { name: 'Ganges Nexus', color: 'black', x: 68, y: 48,
                      hasResearchStation: gameState.state.command_bases?.includes('Ganges Nexus'),
                      infections: gameState.state.planet_infestations?.['Ganges Nexus'] },
                    { name: 'Spice World', color: 'black', x: 70, y: 50,
                      hasResearchStation: gameState.state.command_bases?.includes('Spice World'),
                      infections: gameState.state.planet_infestations?.['Spice World'] },
                    { name: 'Bengal Station', color: 'black', x: 67, y: 52,
                      hasResearchStation: gameState.state.command_bases?.includes('Bengal Station'),
                      infections: gameState.state.planet_infestations?.['Bengal Station'] },

                    // Phoenix Sector (Red) - 12 planets
                    { name: 'Dragon\'s Reach', color: 'red', x: 72, y: 36,
                      hasResearchStation: gameState.state.command_bases?.includes('Dragon\'s Reach'),
                      infections: gameState.state.planet_infestations?.['Dragon\'s Reach'] },
                    { name: 'Techno Prime', color: 'red', x: 76, y: 38,
                      hasResearchStation: gameState.state.command_bases?.includes('Techno Prime'),
                      infections: gameState.state.planet_infestations?.['Techno Prime'] },
                    { name: 'Pearl Harbor', color: 'red', x: 74, y: 42,
                      hasResearchStation: gameState.state.command_bases?.includes('Pearl Harbor'),
                      infections: gameState.state.planet_infestations?.['Pearl Harbor'] },
                    { name: 'Sakura Station', color: 'red', x: 78, y: 40,
                      hasResearchStation: gameState.state.command_bases?.includes('Sakura Station'),
                      infections: gameState.state.planet_infestations?.['Sakura Station'] },
                    { name: 'Neon City', color: 'red', x: 80, y: 38,
                      hasResearchStation: gameState.state.command_bases?.includes('Neon City'),
                      infections: gameState.state.planet_infestations?.['Neon City'] },
                    { name: 'Jade World', color: 'red', x: 75, y: 45,
                      hasResearchStation: gameState.state.command_bases?.includes('Jade World'),
                      infections: gameState.state.planet_infestations?.['Jade World'] },
                    { name: 'Harbor Prime', color: 'red', x: 73, y: 48,
                      hasResearchStation: gameState.state.command_bases?.includes('Harbor Prime'),
                      infections: gameState.state.planet_infestations?.['Harbor Prime'] },
                    { name: 'Temple Station', color: 'red', x: 71, y: 52,
                      hasResearchStation: gameState.state.command_bases?.includes('Temple Station'),
                      infections: gameState.state.planet_infestations?.['Temple Station'] },
                    { name: 'Mekong Nexus', color: 'red', x: 74, y: 54,
                      hasResearchStation: gameState.state.command_bases?.includes('Mekong Nexus'),
                      infections: gameState.state.planet_infestations?.['Mekong Nexus'] },
                    { name: 'Archipelago Prime', color: 'red', x: 77, y: 50,
                      hasResearchStation: gameState.state.command_bases?.includes('Archipelago Prime'),
                      infections: gameState.state.planet_infestations?.['Archipelago Prime'] },
                    { name: 'Equator Station', color: 'red', x: 79, y: 56,
                      hasResearchStation: gameState.state.command_bases?.includes('Equator Station'),
                      infections: gameState.state.planet_infestations?.['Equator Station'] },
                    { name: 'Southern Cross', color: 'red', x: 82, y: 65,
                      hasResearchStation: gameState.state.command_bases?.includes('Southern Cross'),
                      infections: gameState.state.planet_infestations?.['Southern Cross'] },
                  ]}
                  players={gameState.players}
                  currentPlayerId={gameState.current_player_id}
                  onCityClick={(planetName) => {
                    if (isCurrentPlayer) {
                      setActionParams({ target: planetName });
                    }
                  }}
                />
              )}

              {/* Player Actions */}
              {isCurrentPlayer && (
                <div className="bg-slate-900 rounded-lg shadow-lg border border-slate-700 p-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">Your Actions</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => handleSelectAction('move')}
                        className="bg-cyan-800 hover:bg-cyan-700 text-cyan-100 py-2 rounded border border-cyan-600/50 transition-colors"
                      >
                        Move
                      </button>
                      <button
                        onClick={() => handleSelectAction('treat_disease')}
                        className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 py-2 rounded border border-emerald-600/50 transition-colors"
                      >
                        Treat Infestation
                      </button>
                      <button
                        onClick={() => handleSelectAction('build_station')}
                        className="bg-violet-800 hover:bg-violet-700 text-violet-100 py-2 rounded border border-violet-600/50 transition-colors"
                      >
                        Build Command Base
                      </button>
                      <button
                        onClick={() => handleSelectAction('discover_cure')}
                        className="bg-amber-800 hover:bg-amber-700 text-amber-100 py-2 rounded border border-amber-600/50 transition-colors"
                      >
                        Achieve Containment
                      </button>
                    </div>

                    {selectedAction && (
                      <div className="bg-slate-800 border border-slate-600 rounded p-4 mb-4">
                        <h4 className="font-semibold mb-2 capitalize text-slate-100">Action: {selectedAction}</h4>

                        {selectedAction === 'move' && validMoves && validMoves.length > 0 ? (
                          <select
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded mb-2 text-slate-100"
                            onChange={(e) => setActionParams({ target: e.target.value })}
                            defaultValue=""
                          >
                            <option value="" disabled>Select destination planet</option>
                            {validMoves.map((city) => (
                              <option key={city.name} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        ) : selectedAction === 'move' ? (
                          <div className="text-sm text-slate-400 mb-2">Loading available destinations...</div>
                        ) : selectedAction === 'treat_disease' ? (
                          <div className="space-y-2 mb-2">
                            <label className="block text-sm text-slate-300">Select infestation color to treat:</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded text-slate-100"
                              onChange={(e) => setActionParams({ color: e.target.value })}
                              defaultValue=""
                            >
                              <option value="" disabled>Select infestation color</option>
                              <option value="blue">Blue</option>
                              <option value="yellow">Yellow</option>
                              <option value="black">Black</option>
                              <option value="red">Red</option>
                            </select>
                          </div>
                        ) : selectedAction === 'discover_cure' && gameState ? (
                          <div className="space-y-2 mb-2">
                            <label className="block text-sm text-slate-300">Select infestation to contain:</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded mb-2 text-slate-100"
                              onChange={(e) => setActionParams({ color: e.target.value })}
                              defaultValue=""
                            >
                              <option value="" disabled>Select infestation color</option>
                              {Object.entries(gameState.state?.containment_markers || {})
                                .filter(([, status]) => status === 'not_discovered')
                                .map(([color]) => (
                                  <option key={color} value={color} className="capitalize">
                                    {color.charAt(0).toUpperCase() + color.slice(1)}
                                  </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400">
                              You need {myPlayer?.role === 'xenobiologist' ? '4' : '5'} cards of the selected color{myPlayer?.role === 'xenobiologist' ? ' (Xenobiologist bonus!)' : ''}. Select the cards from your hand below:
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {myPlayer?.cards
                                ?.filter((card) => card.planet_color === actionParams.color)
                                .map((card) => (
                                  <label key={card.id} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer text-slate-200">
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
                                      className="rounded bg-slate-600 border-slate-500"
                                    />
                                    <span className="text-sm">{card.planet_name}</span>
                                  </label>
                                ))}
                            </div>
                            {actionParams.color && myPlayer?.cards?.filter((card) => card.planet_color === actionParams.color).length === 0 ? (
                              <p className="text-xs text-red-400">You don&apos;t have any {String(actionParams.color)} cards in your hand.</p>
                            ) : null}
                          </div>
                        ) : selectedAction === 'build_station' ? (
                          <p className="text-sm text-slate-300 mb-2">
                            Build a command base at your current location.
                            {myPlayer?.current_planet_id && ` (${myPlayer.current_planet_id})`}
                          </p>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter parameters (e.g., planet name)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded mb-2 text-slate-100 placeholder-slate-400"
                            onChange={(e) => setActionParams({ target: e.target.value })}
                          />
                        )}

                        <button
                          onClick={handleSendAction}
                          className="bg-cyan-700 hover:bg-cyan-600 text-cyan-100 px-4 py-2 rounded border border-cyan-500/50 transition-colors"
                        >
                          Execute Action
                        </button>
                      </div>
                    )}

                  <button
                    onClick={handleEndTurn}
                    className="w-full bg-rose-900 hover:bg-rose-800 text-rose-100 py-2 rounded-lg border border-rose-700/50 font-semibold transition-colors"
                  >
                    End Turn
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar - Chat and Game Stats */}
            <div className="xl:col-span-1 flex flex-col gap-4 h-full">
              {/* Chat - Flexible height */}
              <div className="bg-slate-900 rounded-lg shadow p-3 sm:p-4 flex-1 flex flex-col min-h-0">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Chat</h3>
                <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-2 min-h-0">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="text-xs sm:text-sm">
                      <span className="font-semibold text-white">{msg.player_name}:</span>{' '}
                      <span className="text-white">{msg.message}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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

              {/* Game Status Cards - Compact */}
              {gameState && (
                <div className="bg-slate-900 rounded-lg shadow p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Outbreak Counter */}
                    <div>
                      <div className="text-s text-white mb-1">Outbreaks</div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-xl font-bold text-red-600">{gameState.game.outbreak_count}</span>
                        <span className="text-xs text-white">/ 8</span>
                      </div>
                      <div className="bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red-500 h-full transition-all"
                          style={{ width: `${(gameState.game.outbreak_count / 8) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Infestation Rate */}
                    <div>
                      <div className="text-s text-white mb-1">Infestation Rate</div>
                      <div className="text-xl font-bold text-orange-600">{gameState.state?.infestation_rate || 2}</div>
                      <div className="text-xs text-white">cards/turn</div>
                    </div>

                    {/* Command Bases */}
                    <div>
                      <div className="text-s text-white mb-1">Command Bases</div>
                      <div className="text-xl font-bold text-purple-600">
                        {gameState.state.command_bases?.length || 0}
                      </div>
                      <div className="text-xs text-white">built</div>
                    </div>

                    {/* Infestation Markers - Compact */}
                    <div>
                      <div className="text-s text-white mb-1">Markers Left</div>
                      <div className="grid grid-cols-2 gap-x-2 text-xs">
                        {Object.entries(gameState.state.infestation_markers || {}).map(([color, count]) => (
                          <div key={color} className="flex justify-normal gap-2">
                            <span className="capitalize text-white">{color.charAt(0)}:</span>
                            <span className="font-semibold text-white">{String(count)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Containment Status - Compact */}
              {gameState && (
                <div className="bg-slate-900 rounded-lg shadow p-3 sm:p-4">
                  <h3 className="text-sm font-bold text-white mb-2">Containment Progress</h3>
                  <div className="flex gap-2 justify-between">
                    {Object.entries(gameState.state.containment_markers || {}).map(([color, status]) => {
                      const colorClasses = {
                        blue: 'from-blue-500 to-blue-600',
                        yellow: 'from-yellow-400 to-yellow-500',
                        black: 'from-gray-600 to-gray-700',
                        red: 'from-red-500 to-red-600'
                      };
                      const textColors = {
                        blue: 'text-blue-100',
                        yellow: 'text-yellow-900',
                        black: 'text-white',
                        red: 'text-red-100'
                      };
                      const isDiscovered = status === 'discovered' || status === 'eradicated';

                      return (
                        <div
                          key={color}
                          className={`flex-1 rounded-lg p-2 text-center bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || 'from-gray-500 to-gray-600'} ${textColors[color as keyof typeof textColors] || 'text-white'} ${
                            !isDiscovered ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="text-xs font-semibold capitalize mb-1">{color}</div>
                          <div className="text-xl">
                            {isDiscovered ? '✓' : '○'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Players */}
              {gameState && (
                <div className="bg-slate-900 rounded-lg shadow p-3 sm:p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Players</h3>
                  <div className="space-y-2">
                    {gameState.players.map((player) => {
                      const isActive = player.id === gameState.current_player_id;
                      return (
                        <div
                          key={player.id}
                          className={`rounded-lg p-3 border-2 ${
                            isActive
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                isActive ? 'bg-green-500' : 'bg-blue-500'
                              }`}>
                                {player.turn_order + 1}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold capitalize text-gray-800">{player.role.replace('_', ' ') || 'Player'}</h4>
                                <p className="text-xs text-gray-600">
                                  {player.current_planet_id || 'Unknown location'}
                                </p>
                              </div>
                            </div>
                            {isActive && (
                              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Actions:</span> {player.actions_remaining}/4
                            </div>
                            <div>
                              <span className="font-medium">Cards:</span> {player.cards?.length || 0}
                            </div>
                          </div>

                          {/* Player's hand - only show for the current user */}
                          {String(player.user_id) === String(user?.id) && player.cards && player.cards.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-semibold mb-1 text-gray-700">Your Hand:</p>
                              <div className="flex flex-wrap gap-1">
                                {player.cards.map((card) => (
                                  <div
                                    key={card.id}
                                    className={`px-2 py-1 rounded text-xs font-medium shadow-sm border ${
                                      card.card_type === 'epidemic'
                                        ? 'bg-red-100 border-red-300 text-red-800'
                                        : card.planet_color === 'blue'
                                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                                        : card.planet_color === 'yellow'
                                        ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                        : card.planet_color === 'black'
                                        ? 'bg-gray-100 border-gray-300 text-gray-800'
                                        : card.planet_color === 'red'
                                        ? 'bg-red-100 border-red-300 text-red-800'
                                        : 'bg-gray-100 border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    {card.card_type === 'epidemic' ? '⚠️ SPREAD' : card.planet_name || 'Unknown'}
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
              )}
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
                        card.planet_color === 'blue'
                          ? 'text-blue-700'
                          : card.planet_color === 'yellow'
                          ? 'text-yellow-700'
                          : card.planet_color === 'black'
                          ? 'text-gray-700'
                          : card.planet_color === 'red'
                          ? 'text-red-700'
                          : 'text-gray-700'
                      }`}>
                        {card.card_type === 'epidemic' ? '⚠️ INFESTATION SPREAD' : card.planet_name}
                      </div>
                      {card.planet_color && card.card_type !== 'epidemic' && (
                        <div className="text-xs text-gray-500 capitalize mt-1">
                          {card.planet_color}
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
            containmentsAchieved: Object.values(gameState.state?.containment_markers || {}).filter(
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
