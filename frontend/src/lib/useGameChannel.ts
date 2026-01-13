import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket, Channel } from 'phoenix';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket';

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

export function useGameChannel(gameId: string | null, token: string | null) {
  const [, setChannel] = useState<Channel | null>(null);
  const [, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    setSocket(newSocket);

    // Join game channel
    const gameChannel = newSocket.channel(`game:${gameId}`, {});

    gameChannel.on('game_state', (state: GameState) => {
      setGameState(state);
    });

    gameChannel.on('chat_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    gameChannel
      .join()
      .receive('ok', (response: any) => {
        console.log('Joined game channel', response);
        setIsConnected(true);
        setError(null);
      })
      .receive('error', (err: any) => {
        console.error('Failed to join channel:', err);
        setError(err.reason || 'Failed to join game');
        setIsConnected(false);
      });

    channelRef.current = gameChannel;
    setChannel(gameChannel);

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
    (action: string, params: any) => {
      return new Promise((resolve, reject) => {
        if (!channelRef.current) {
          reject(new Error('Channel not connected'));
          return;
        }

        channelRef.current
          .push('player_action', { action, params })
          .receive('ok', (response: any) => resolve(response))
          .receive('error', (err: any) => reject(err));
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

  const getState = useCallback(() => {
    return new Promise<GameState>((resolve, reject) => {
      if (!channelRef.current) {
        reject(new Error('Channel not connected'));
        return;
      }

      channelRef.current
        .push('get_state', {})
        .receive('ok', (state: any) => resolve(state))
        .receive('error', (err: any) => reject(err));
    });
  }, []);

  return {
    gameState,
    messages,
    isConnected,
    error,
    sendAction,
    endTurn,
    sendMessage,
    getState,
  };
}
