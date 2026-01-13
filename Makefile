.PHONY: up down frontend-init server-init

up:
	docker compose up -d

down:
	docker compose down

frontend-init:
	# Run from repo root to scaffold the frontend
	npm create vite@latest frontend -- --template react-ts

server-init:
	# Run from repo root to scaffold the Phoenix server
	mix phx.new server --no-html --no-assets --binary-id
.PHONY: frontend-build up down dev

# Build frontend into docker named volume (one-shot)
frontend-build:
	docker-compose run --rm frontend_builder

# Start services
up:
	docker-compose up --build

# Stop services
down:
	docker-compose down

# Build frontend then start dev environment
dev: frontend-build up
