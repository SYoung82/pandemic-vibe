# Pandemic Vibe

Multiplayer web-based clone of the Pandemic board game with real-time gameplay.

## Project Structure

- `server/` - Phoenix (Elixir) backend API
- `frontend/` - React + TypeScript frontend (Vite)
- `infra/` - CI/CD and deployment configurations
- `docker-compose.yml` - Local development environment

## Prerequisites

- **Docker & Docker Compose** (recommended for development)
- **OR** Node.js 24+, Elixir 1.19.4+, PostgreSQL 15+
- npm (frontend package manager)

## Quickstart (Docker)

Start all services with Docker Compose:

```bash
docker-compose up --build
```

- Backend: http://localhost:4000
- Frontend dev server (separate terminal):
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- Frontend: http://localhost:5173

## Quickstart (Local)

**Install git hooks:**

```bash
./scripts/install-hooks.sh
```

This installs a pre-push hook that runs CI checks before pushing.

**Backend:**

```bash
cd server
mix deps.get
mix ecto.create
mix ecto.migrate
mix phx.server
```

Backend runs at http://localhost:4000

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Testing

**Backend:**

```bash
cd server
mix test
```

**Frontend:**

```bash
cd frontend
npm test
```

**Run all CI checks locally:**

```bash
./infra/scripts/test-ci-local.sh
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **Backend CI**: Tests, linting, and production build validation
- **Frontend CI**: Tests, ESLint, TypeScript checking, and production build

See [infra/CI_CD_GUIDE.md](infra/CI_CD_GUIDE.md) for detailed documentation.

### Status Checks

All pull requests must pass:
- Backend tests (ExUnit with PostgreSQL)
- Backend formatting and compilation checks
- Frontend linting and TypeScript validation
- Production build validation

## Authentication & Realtime

- **Authentication:** Guardian JWT-based authentication
- **Real-time:** Phoenix Channels for game state synchronization
- **WebSocket:** Live gameplay updates and chat

## Game Features

- 2-4 player cooperative gameplay
- 7 unique player roles (Medic, Scientist, Researcher, etc.)
- Three difficulty levels (Easy, Normal, Hard)
- Real-time game state synchronization
- In-game chat
- Complete Pandemic ruleset implementation

## Architecture

**Backend:**
- Phoenix 1.8.3 (Elixir 1.19.4)
- PostgreSQL 15 database
- Guardian for JWT authentication
- Phoenix Channels for WebSocket communication

**Frontend:**
- React 19 with TypeScript
- Vite 7 for build tooling
- Tailwind CSS v4 for styling
- Phoenix Socket client for real-time updates

## Deployment

See [infra/README.md](infra/README.md) for deployment documentation:
- Production Docker builds
- Fly.io deployment guide
- Environment configuration
- Database migrations

## Development

**Backend development:**

```bash
cd server

# Run tests
mix test

# Check formatting
mix format --check-formatted

# Start interactive shell
iex -S mix phx.server
```

**Frontend development:**

```bash
cd frontend

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Git Hooks

The repository includes a pre-push hook that runs CI checks locally before pushing:

**Install the hooks:**
```bash
./scripts/install-hooks.sh
```

**What it checks:**
- Backend: formatting, compilation, tests
- Frontend: linting, type checking, build

**Bypass the hook (not recommended):**
```bash
git push --no-verify
```

## Contributing

1. Create a feature branch from `develop`
2. Install git hooks: `./scripts/install-hooks.sh`
3. Make your changes with tests
4. Ensure all CI checks pass locally (hooks will verify)
5. Submit a pull request

All pull requests require:
- Passing CI checks
- Code review approval
- Up-to-date with target branch

## License

MIT
