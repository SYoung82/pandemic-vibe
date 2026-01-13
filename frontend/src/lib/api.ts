import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    api.post('/register', { user: { name: username, email, password } }),
  
  login: (username: string, password: string) =>
    api.post('/login', { email: username, password }),
};

// Game API
export const gameAPI = {
  createGame: (data: { name: string; max_players: number; difficulty: string }) =>
    api.post('/games', { game: data }),
  
  listGames: () =>
    api.get('/games'),
  
  getGame: (gameId: string) =>
    api.get(`/games/${gameId}`),
  
  joinGame: (gameId: string) =>
    api.post(`/games/${gameId}/join`),
  
  startGame: (gameId: string) =>
    api.post(`/games/${gameId}/start`),
  
  getGameState: (gameId: string) =>
    api.get(`/games/${gameId}/state`),
};

// Invitation API
export const invitationAPI = {
  createInvitation: (gameId: string, email: string) =>
    api.post('/invitations', { game_id: gameId, email }),
  
  acceptInvitation: (token: string) =>
    api.post('/invitations/accept', { token }),
};

export default api;
