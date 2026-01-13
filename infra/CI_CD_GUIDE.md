# CI/CD Guide

This guide covers the continuous integration and deployment pipeline for Pandemic Vibe.

## Table of Contents

- [Workflow Architecture](#workflow-architecture)
- [Backend CI](#backend-ci)
- [Frontend CI](#frontend-ci)
- [Local Testing](#local-testing)
- [Debugging Failed Builds](#debugging-failed-builds)
- [Adding New Tests](#adding-new-tests)
- [Branch Protection](#branch-protection)

## Workflow Architecture

The CI/CD pipeline consists of three GitHub Actions workflows:

```
ci.yml (Orchestrator)
├── backend-ci.yml (Backend Pipeline)
│   ├── test (Run ExUnit tests)
│   ├── lint (Format check + compile)
│   └── build (Production build validation)
│
└── frontend-ci.yml (Frontend Pipeline)
    ├── lint (ESLint)
    ├── type-check (TypeScript)
    ├── build (Production build)
    └── test (Vitest - when configured)
```

### Workflow Triggers

All workflows trigger on:
- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop`
- **Path filtering**: Only run when relevant files change

## Backend CI

**File:** `.github/workflows/backend-ci.yml`

### Jobs

#### 1. Test Job

Runs the ExUnit test suite with PostgreSQL.

**Configuration:**
- Elixir: 1.19.4
- OTP: 28.1
- PostgreSQL: 15
- Environment: `test`

**Services:**
```yaml
postgres:
  image: postgres:15
  env:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: pandemic_vibe_test
  ports:
    - 5432:5432
```

**Steps:**
1. Checkout code
2. Set up Elixir/OTP
3. Restore dependency cache
4. Install dependencies
5. Compile dependencies
6. Run tests with `mix test`

**Environment:**
- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/pandemic_vibe_test`

#### 2. Lint Job

Checks code quality and formatting.

**Steps:**
1. Check formatting with `mix format --check-formatted`
2. Compile with `--warnings-as-errors` flag

#### 3. Build Job

Validates production build.

**Steps:**
1. Install production dependencies
2. Compile for `MIX_ENV=prod`

### Caching Strategy

Dependencies are cached based on `mix.lock` hash:

```yaml
key: ${{ runner.os }}-mix-${{ hashFiles('**/mix.lock') }}
restore-keys: ${{ runner.os }}-mix-
```

This speeds up subsequent runs by ~2-3 minutes.

## Frontend CI

**File:** `.github/workflows/frontend-ci.yml`

### Jobs

#### 1. Lint Job

Runs ESLint to check code quality.

**Steps:**
1. Checkout code
2. Set up Node.js 24
3. Install dependencies with `npm ci`
4. Run `npm run lint`

#### 2. Type Check Job

Validates TypeScript types.

**Steps:**
1. Run `npx tsc --noEmit`

#### 3. Build Job

Creates production build and verifies output.

**Steps:**
1. Run `npm run build`
2. Verify `dist/` directory exists
3. List build artifacts

#### 4. Test Job

Runs Vitest tests (when configured).

**Current behavior:**
- Checks if `test` script exists
- Runs tests if available
- Exits gracefully if not configured

### Caching Strategy

npm dependencies are cached:

```yaml
cache: 'npm'
cache-dependency-path: frontend/package-lock.json
```

## Local Testing

### Running CI Checks Locally

#### Backend

```bash
cd server

# 1. Run tests (requires PostgreSQL running)
mix test

# 2. Check formatting
mix format --check-formatted

# 3. Compile with warnings as errors
mix compile --warnings-as-errors

# 4. Test production build
MIX_ENV=prod mix deps.get --only prod
MIX_ENV=prod mix compile
```

**Database setup for tests:**
```bash
# Using Docker
docker run -d \
  --name pandemic-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pandemic_vibe_test \
  -p 5432:5432 \
  postgres:15

# Or use docker-compose
docker-compose up -d db
```

#### Frontend

```bash
cd frontend

# 1. Run linter
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Build
npm run build

# 4. Run tests (when configured)
npm test
```

### Local CI Script

Create a script to run all checks:

**`infra/scripts/test-ci-local.sh`:**
```bash
#!/bin/bash
set -e

echo "=== Running Backend CI ==="
cd server

echo "→ Running tests..."
mix test

echo "→ Checking formatting..."
mix format --check-formatted

echo "→ Compiling with warnings as errors..."
mix compile --warnings-as-errors

cd ..

echo ""
echo "=== Running Frontend CI ==="
cd frontend

echo "→ Running linter..."
npm run lint

echo "→ Type checking..."
npx tsc --noEmit

echo "→ Building..."
npm run build

echo ""
echo "✅ All CI checks passed!"
```

Make it executable:
```bash
chmod +x infra/scripts/test-ci-local.sh
```

Run it:
```bash
./infra/scripts/test-ci-local.sh
```

## Debugging Failed Builds

### Backend Failures

#### Test Failures

**Symptom:** `mix test` exits with non-zero code

**Debug steps:**
1. Check which tests failed in CI logs
2. Run the specific test locally:
   ```bash
   mix test test/path/to/failing_test.exs:42
   ```
3. Check database state:
   ```bash
   MIX_ENV=test mix ecto.reset
   ```
4. Verify database connection:
   ```bash
   # Test DATABASE_URL
   psql $DATABASE_URL
   ```

**Common issues:**
- Database service not healthy (check health checks in workflow)
- Missing migrations in test environment
- Flaky tests due to timing or randomization

#### Formatting Failures

**Symptom:** `mix format --check-formatted` fails

**Fix:**
```bash
mix format
git add .
git commit -m "Fix formatting"
```

#### Compilation Warnings

**Symptom:** `mix compile --warnings-as-errors` fails

**Common warnings:**
- Unused variables (prefix with `_`)
- Unused imports (remove them)
- Undefined functions (typos or missing deps)

**Debug:**
```bash
# See all warnings
mix compile --force --warnings-as-errors
```

### Frontend Failures

#### Lint Failures

**Symptom:** ESLint errors

**Fix:**
```bash
# Auto-fix what's possible
npm run lint -- --fix

# Check remaining issues
npm run lint
```

**Common issues:**
- Unused variables
- Missing dependencies in useEffect
- Type errors caught by ESLint rules

#### Type Check Failures

**Symptom:** TypeScript compilation errors

**Debug:**
```bash
# See detailed errors
npx tsc --noEmit --pretty

# Check specific file
npx tsc --noEmit src/path/to/file.tsx
```

**Common issues:**
- Missing type definitions
- Incorrect prop types
- Untyped API responses

#### Build Failures

**Symptom:** `npm run build` fails

**Common issues:**
- Environment variables not set
- TypeScript errors (fix with type-check first)
- Import path issues

**Debug:**
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

## Adding New Tests

### Backend Tests

1. **Create test file:**
   ```bash
   touch server/test/pandemic_vibe_server/your_module_test.exs
   ```

2. **Use appropriate test case:**
   ```elixir
   defmodule PandemicVibeServer.YourModuleTest do
     use PandemicVibeServer.DataCase  # For database tests
     # or
     use PandemicVibeServer.ConnCase  # For controller tests
     # or
     use PandemicVibeServer.ChannelCase  # For channel tests
   ```

3. **Use test fixtures:**
   ```elixir
   import PandemicVibeServer.GamesFixtures

   test "your test" do
     game = game_fixture_with_players(2)
     # ... test logic
   end
   ```

4. **Run new tests:**
   ```bash
   mix test test/pandemic_vibe_server/your_module_test.exs
   ```

### Frontend Tests (when Vitest is configured)

1. **Create test file:**
   ```bash
   mkdir -p frontend/src/components/__tests__
   touch frontend/src/components/__tests__/YourComponent.test.tsx
   ```

2. **Write test:**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import { YourComponent } from '../YourComponent';

   describe('YourComponent', () => {
     it('renders correctly', () => {
       render(<YourComponent />);
       expect(screen.getByText('Expected Text')).toBeInTheDocument();
     });
   });
   ```

3. **Run new tests:**
   ```bash
   npm test -- YourComponent.test.tsx
   ```

## Branch Protection

### Recommended Settings

Enable branch protection for `main` and `develop`:

1. Go to **Settings** → **Branches** → **Add rule**

2. **Branch name pattern:** `main` (repeat for `develop`)

3. **Enable protections:**
   - ✅ Require a pull request before merging
     - Require approvals: 1
   - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - **Required checks:**
       - `Backend CI / test`
       - `Backend CI / lint`
       - `Backend CI / build`
       - `Frontend CI / lint`
       - `Frontend CI / type-check`
       - `Frontend CI / build`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

### Status Check Configuration

The `ci.yml` workflow provides a single status check that depends on both backend and frontend:

```yaml
needs: [backend, frontend]
```

This ensures:
- All backend checks pass
- All frontend checks pass
- Single "CI Status" check in GitHub UI

## Performance Optimization

### Cache Hit Rates

Monitor cache effectiveness:
- **Good:** >80% cache hit rate
- **Poor:** <50% cache hit rate

**Improve cache hits:**
- Don't change `mix.lock` or `package-lock.json` unnecessarily
- Group dependency updates in single PRs

### Workflow Duration

**Target times:**
- Backend CI: <5 minutes
- Frontend CI: <3 minutes
- Total CI: <8 minutes

**Optimize:**
- Use caching effectively
- Run jobs in parallel
- Use path filters to skip unnecessary runs

## Troubleshooting Common Issues

### PostgreSQL Health Check Fails

**Symptom:** Tests can't connect to database

**Solution:** Increase health check intervals
```yaml
options: >-
  --health-cmd pg_isready
  --health-interval 10s
  --health-timeout 5s
  --health-retries 10  # Increased from 5
```

### Cache Corruption

**Symptom:** Random build failures, "corrupted cache" errors

**Solution:** Clear cache and re-run
1. Go to Actions → select failed run
2. Click "Re-run jobs" → "Re-run all jobs"
3. If persists, update cache key in workflow file

### Flaky Tests

**Symptom:** Tests pass locally but fail randomly in CI

**Common causes:**
- Timing issues (add delays or proper synchronization)
- Randomized test order (use `--seed` to reproduce)
- Database state leaking between tests (check test isolation)

**Debug:**
```bash
# Run tests multiple times to catch flakiness
for i in {1..10}; do mix test; done
```

## Monitoring and Metrics

### GitHub Actions Dashboard

View workflow runs:
- Repository → Actions tab
- Filter by workflow, branch, or event
- Check run duration trends

### Badge in README

Add status badge to README.md:

```markdown
[![CI](https://github.com/yourusername/pandemic-vibe/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/pandemic-vibe/actions/workflows/ci.yml)
```

## Future Enhancements

1. **Code Coverage Reporting**
   - Add ExCoveralls for backend
   - Add Vitest coverage for frontend
   - Report to Codecov or Coveralls

2. **Continuous Deployment**
   - Add deployment workflow
   - Deploy to Fly.io on successful CI
   - Separate staging and production

3. **E2E Testing**
   - Add Playwright or Cypress
   - Test critical user flows
   - Run against staging environment

4. **Security Scanning**
   - Dependabot for dependency updates
   - CodeQL for security vulnerabilities
   - Trivy for Docker image scanning

5. **Performance Testing**
   - Add load testing step
   - Monitor response times
   - Alert on regressions
