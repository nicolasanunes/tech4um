# Tech4um

Monorepo com frontend em Vue 3 (Vite), backend em NestJS e banco PostgreSQL.

## Estrutura

- `tech4um-frontend`: aplicação web (porta `5173`)
- `tech4um-backend`: API NestJS (porta `3000`)
- `tech4um-db`: PostgreSQL (porta `5432`)

## Pre-requisitos

- Docker e Docker Compose
- Opcional para rodar sem Docker:
	- Node.js 24+
	- npm
	- PostgreSQL 17+

## Configuração inicial

1. Na raiz do projeto, crie o arquivo `.env` com base no exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Ajuste os valores do banco no `.env` se necessário:

- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`

## Como executar (recomendado: Docker)

Na raiz do projeto:

```bash
docker compose up --build
```

Serviços disponíveis:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

Para parar:

```bash
docker compose down
```

Para parar e remover volumes (apaga dados do banco):

```bash
docker compose down -v
```

## Como executar sem Docker

### 1) Banco de dados

Suba um PostgreSQL local e configure o `.env` com os dados corretos. Se o backend rodar fora do Docker, normalmente o host do banco deve ser `localhost`.

### 2) Backend

```bash
cd tech4um-backend
npm install
npm run start:dev
```

API em: http://localhost:3000

### 3) Frontend

Em outro terminal:

```bash
cd tech4um-frontend
npm install
npm run dev -- --host
```

App em: http://localhost:5173

## Comandos úteis

Backend:

```bash
cd tech4um-backend
npm run test
npm run test:e2e
npm run lint
```

Frontend:

```bash
cd tech4um-frontend
npm run lint
npm run build
```
