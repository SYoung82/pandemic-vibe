#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Running Backend CI ===${NC}"
cd server

echo -e "\n${BLUE}→ Running tests...${NC}"
mix test

echo -e "\n${BLUE}→ Checking formatting...${NC}"
mix format --check-formatted

echo -e "\n${BLUE}→ Compiling with warnings as errors...${NC}"
mix compile --warnings-as-errors

cd ..

echo -e "\n${BLUE}=== Running Frontend CI ===${NC}"
cd frontend

echo -e "\n${BLUE}→ Running linter...${NC}"
npm run lint

echo -e "\n${BLUE}→ Type checking...${NC}"
npx tsc --noEmit

echo -e "\n${BLUE}→ Building...${NC}"
npm run build

echo -e "\n${GREEN}✅ All CI checks passed!${NC}"
