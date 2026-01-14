# Pandemic Vibe - Phoenix Backend

Elixir/Phoenix backend API with real-time game state management via Phoenix Channels.

## Tech Stack

- **Phoenix 1.8.3** - Web framework
- **Elixir 1.19.4** - Programming language
- **PostgreSQL 15** - Database
- **Guardian** - JWT authentication
- **Phoenix Channels** - WebSocket real-time communication
- **Ecto** - Database ORM

## Setup

### Install Dependencies

```bash
mix deps.get
```

### Database Setup

```bash
# Create database
mix ecto.create

# Run migrations
mix ecto.migrate

# Seed cities and connections
mix run priv/repo/seeds.exs
mix run priv/repo/seeds_city_connections.exs
```

### Start the Server

```bash
# Development mode
mix phx.server

# Interactive mode (with IEx shell)
iex -S mix phx.server
```

Server runs at http://localhost:4000

## Testing

```bash
# Run all tests
mix test

# Run specific test file
mix test test/pandemic_vibe_server/game_engine/game_engine_test.exs

# Run with coverage
mix test --cover
```

## Code Quality

```bash
# Format code
mix format

# Check formatting
mix format --check-formatted

# Compile with warnings as errors
mix compile --warnings-as-errors
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Games
- `GET /api/games` - List all games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/start` - Start game (host only)
- `GET /api/games/:id/state` - Get current game state

### WebSocket Channel
- `game:GAME_ID` - Real-time game updates, chat, and player actions

## Project Structure

```
server/
├── lib/
│   ├── pandemic_vibe_server/
│   │   ├── accounts/           # User authentication
│   │   ├── games/              # Game data models
│   │   ├── game_engine/        # Core game logic
│   │   │   ├── game_engine.ex       # Game initialization and state
│   │   │   ├── action_handler.ex    # Player actions
│   │   │   ├── infection_engine.ex  # Disease spreading
│   │   │   └── deck_manager.ex      # Card management
│   │   └── invitations/        # Game invitations
│   └── pandemic_vibe_server_web/
│       ├── channels/           # WebSocket channels
│       ├── controllers/        # HTTP controllers
│       └── views/              # JSON views
├── priv/
│   └── repo/
│       ├── migrations/         # Database migrations
│       ├── seeds.exs          # City data seeding
│       └── seeds_city_connections.exs  # City connections
└── test/                      # Test suite
```

## Game Engine

The game engine consists of several modules:

- **GameEngine** - Initializes games, manages turns, checks win/lose conditions
- **ActionHandler** - Handles player actions (move, treat, build, cure)
- **InfectionEngine** - Manages disease spread and epidemics
- **DeckManager** - Manages player and infection decks

## Environment Variables

Required for production:

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY_BASE` - Phoenix secret key (generate with `mix phx.gen.secret`)
- `PHX_HOST` - Application hostname
- `PORT` - Server port (default: 4000)

## Learn More

- Official Phoenix website: https://www.phoenixframework.org/
- Phoenix guides: https://hexdocs.pm/phoenix/overview.html
- Phoenix docs: https://hexdocs.pm/phoenix
- Elixir forum: https://elixirforum.com/c/phoenix-forum
