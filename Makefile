# Repair Café — точки входу для відтворення перевірок. Деталі: standards/checks.md
SHELL := /bin/bash
SHA   := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
PORT  ?= 3000

.PHONY: help install check lint format test deps build run version hook-demo clean \
        db-up db-down migrate seed scenarios scenarios-db race n1-report chaos

help:      ## список цілей
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

install:   ## залежності + git hooks (husky)
	npm ci

check:     ## ВСІ перевірки, як у hooks: формат, лінт, типи, архітектура, smoke, збірка
	npm run check

lint:      ## ESLint + Prettier --check
	npm run format:check && npm run lint

format:    ## автоформат
	npm run format

deps:      ## архітектурні правила (dependency-cruiser)
	npm run deps:check

test:      ## smoke-тести
	npm run test:smoke

build:     ## збірка TypeScript -> dist/
	npm run build

run: build ## запуск сервера; STORAGE=postgres make run — на БД
	GIT_SHA=$(SHA) PORT=$(PORT) node dist/server.js

version:   ## запитати /version у запущеного сервера
	@curl -s localhost:$(PORT)/version; echo

hook-demo: ## довести, що pre-commit блокує брудний коміт
	./scripts/hook-demo.sh

# ---------- Лаба 2: дані ----------
export DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/repair_cafe

db-up:     ## PostgreSQL 16 у docker
	docker compose up -d --wait db

db-down:   ## зупинити БД (дані лишаються у volume)
	docker compose down

migrate:   ## застосувати migrations/*.sql
	npm run db:migrate

seed:      ## залити статичні дані прототипу в БД (ідемпотентно)
	npm run db:seed

scenarios: ## сценарії на статичних даних (STORAGE=memory)
	STORAGE=memory npm run test:scenarios

scenarios-db: ## ті самі сценарії + збої + бюджет запитів на PostgreSQL
	STORAGE=postgres npm run test:db

race:      ## конкурентні сценарії 20 разів поспіль (гонки недетерміновані)
	./scripts/race.sh

n1-report: ## к-сть SQL-запитів на дошку сесії при 1/10/50 речах
	npx tsx scripts/n1-report.ts

chaos:     ## живий збій: зупинити/підняти БД під запущеним сервером
	./scripts/chaos.sh

clean:
	rm -rf dist coverage
