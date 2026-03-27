# GalleryPack — developer commands
# Usage: make <target>

COMPOSE      = docker compose -f docker-compose.dev.yml
COMPOSE_TEST = docker compose -f docker-compose.test.yml

.PHONY: help dev rebuild logs reset ps test build-api build-worker build-web

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start local development stack (api, worker, proxy, db)
	$(COMPOSE) up

rebuild: ## Rebuild images without cache and start
	$(COMPOSE) build --no-cache
	$(COMPOSE) up

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

ps: ## Show running services
	$(COMPOSE) ps

reset: ## Full reset — stop all containers, remove volumes, rebuild from scratch
	$(COMPOSE) down -v
	$(MAKE) dev

test: ## Run integration test stack (exits on completion)
	$(COMPOSE_TEST) up --abort-on-container-exit --exit-code-from api

build-api: ## Build the API image
	docker build -f Dockerfile.api -t gallerypack-api:dev .

build-worker: ## Build the worker image
	docker build -f Dockerfile.worker -t gallerypack-worker:dev .

build-web: ## Build the web admin SPA image
	docker build -f Dockerfile.web -t gallerypack-web:dev .
