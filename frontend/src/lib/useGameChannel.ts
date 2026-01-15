import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket, Channel } from 'phoenix';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket';

export interface Card {
  id: string;
  card_type: string;
  city_name: string | null;
  city_color: string | null;
}

export interface GameState {
  game: {
    id: string;
    status: string;
    difficulty: string;
    outbreak_count: number;
    infection_rate_index: number;
  };
  players: Array<{
    id: string;
    user_id: string;
    role: string;
    turn_order: number;
    actions_remaining: number;
    current_city_id: string | null;
    cards: Card[];
  }>;
  state: {
    infection_rate: number;
    outbreak_count: number;
    research_stations: string[];
    cure_markers: {
      blue: string;
      yellow: string;
      black: string;
      red: string;
    };
    disease_cubes: {
      blue: number;
      yellow: number;
      black: number;
      red: number;
    };
    city_infections: Record<string, Record<string, number>>;
  };
  current_player_id: string;
  turn_number: number;
}

export interface ChatMessage {
  player_id: string;
  player_name: string;
  message: string;
  timestamp: string;
}

interface ChannelError {
  reason?: string;
}

interface ActionParams {
  [key: string]: unknown;
}

export interface LobbyGame {
  id: string;
  status: string;
  difficulty: string;
  created_by_id: string;
  players: Array<{
    id: string;
    user_id: string;
    role: string | null;
    turn_order: number | null;
  }>;
}

export function useGameChannel(gameId: string | null, token: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lobbyGame, setLobbyGame] = useState<LobbyGame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid recreating callbacks
  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!gameId || !token) {
      return;
    }

    // Create socket connection
    const newSocket = new Socket(WS_URL, {
      params: { token },
    });

    newSocket.onError(() => {
      setError('WebSocket connection error');
      setIsConnected(false);
    });

    newSocket.onClose(() => {
      setIsConnected(false);
    });

    newSocket.connect();
    socketRef.current = newSocket;

    // Join game channel
    const gameChannel = newSocket.channel(`game:${gameId}`, {});

    gameChannel.on('game_state', (state: unknown) => {
      setGameState(state as GameState);
    });

    gameChannel.on('chat_message', (message: unknown) => {
      setMessages((prev) => [...prev, message as ChatMessage]);
    });

    // Listen for lobby updates (when players join)
    gameChannel.on('lobby_updated', (payload: unknown) => {
      const data = payload as { game: LobbyGame };
      setLobbyGame(data.game);
    });

    // Listen for game start event
    gameChannel.on('game_started', (payload: unknown) => {
      const data = payload as { game: LobbyGame };
      setLobbyGame(data.game);
      // Trigger a reload by setting game state to trigger re-fetch
      window.location.reload();
    });

    gameChannel
      .join()
      .receive('ok', (response: unknown) => {
        console.log('Joined game channel', response);
        setIsConnected(true);
        setError(null);
      })
      .receive('error', (err: unknown) => {
        const error = err as ChannelError;
        console.error('Failed to join channel:', error);
        setError(error.reason || 'Failed to join game');
        setIsConnected(false);
      });

    channelRef.current = gameChannel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.leave();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [gameId, token]);

  const sendAction = useCallback(
    (action: string, params: ActionParams) => {
      return new Promise((resolve, reject) => {
        if (!channelRef.current) {
          reject(new Error('Channel not connected'));
          return;
        }

        channelRef.current
          .push('player_action', { action, params }, 10000)
          .receive('ok', (response: unknown) => {
            console.log('Received ok response:', response);
            resolve(response);
          })
          .receive('error', (err: unknown) => {
            console.log('Received error response:', err);
            reject(err as ChannelError);
          })
          .receive('timeout', () => {
            console.log('Request timed out');
            reject(new Error('Request timed out'));
          });
      });
    },
    []
  );

  const endTurn = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('end_turn', {})
        .receive('ok', (response) => resolve(response))
        .receive('error', (err) => reject(err));
    });
  }, []);

  const sendMessage = useCallback((message: string) => {
    return new Promise((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('chat_message', { message })
        .receive('ok', (response) => resolve(response))
        .receive('error', (err) => reject(err));
    });
  }, []);

  const discardCards = useCallback((card_ids: string[]) => {
    return new Promise((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('discard_cards', { card_ids })
        .receive('ok', (response) => resolve(response))
        .receive('error', (err) => reject(err));
    });
  }, []);

  const getState = useCallback(() => {
    return new Promise<GameState>((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('get_state', {})
        .receive('ok', (state: unknown) => resolve(state as GameState))
        .receive('error', (err: unknown) => reject(err as ChannelError));
    });
  }, []);

  const getValidMoves = useCallback(() => {
    return new Promise<{ cities: Array<{ name: string; color: string }> }>((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('get_valid_moves', {})
        .receive('ok', (response: unknown) => resolve(response as { cities: Array<{ name: string; color: string }> }))
        .receive('error', (err: unknown) => reject(err as ChannelError));
    });
  }, []);

  return {
    gameState,
    messages,
    lobbyGame,
    isConnected,
    error,
    sendAction,
    endTurn,
    sendMessage,
    discardCards,
    getState,
    getValidMoves,
  };
}
