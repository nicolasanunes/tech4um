# Tech4UM

Monorepo da plataforma Tech4UM com frontend Vue, backend NestJS e banco PostgreSQL.

## Arquitetura

- tech4um-frontend: aplicação Vue 3 + Vite
- tech4um-backend: API NestJS + Socket.IO + TypeORM
- tech4um-db: PostgreSQL 17

Arquivos principais na raiz:

- tech4um-frontend/
- tech4um-backend/
- docker-compose.yaml
- .env (local)

## Estado atual do projeto

- Docker em modo produção no compose principal
- Frontend servido por Nginx (build estático)
- Nginx com fallback SPA (`try_files ... /index.html`) para rotas do Vue Router
- Backend compilado em dist com NODE_ENV=production
- Backend com bind automatico por ambiente:
	- producao: `0.0.0.0`
	- desenvolvimento: `127.0.0.1`
- TypeORM com synchronize desativado
- Banco gerenciado por migrations manuais

## Pré-requisitos

- Docker + Docker Compose v2
- Node.js 20+ e npm 10+ (se for rodar sem Docker)

## Variáveis de ambiente (raiz)

Exemplo mínimo:

```env
# Backend
PORT=3000
NODE_ENV=production
JWT_SECRET=change-this-secret
FRONTEND_URL=http://localhost:5173

# Banco
DB_HOST=tech4um-db
DB_PORT=5432
DB_DATABASE=tech4um
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSL=false

# TypeORM
TYPEORM_LOGGING=false

# Frontend build/runtime
VITE_API_URL=http://localhost:3000
```

Observacao importante sobre envs no Docker Compose:

- `tech4um-backend` carrega **dois arquivos**:
	- `.env` (raiz)
	- `tech4um-backend/.env` (segredos/vars especificas do backend, ex.: AWS)
- `tech4um-frontend` recebe `VITE_API_URL` no build via `build.args`.

## Subir com Docker (produção-like)

Na raiz:

```bash
docker compose up -d --build
```

Serviços:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

Comandos úteis:

```bash
# logs
docker compose logs -f

# parar sem apagar dados
docker compose down

# parar e resetar banco (remove volume postgres_data)
docker compose down -v
```

## Migrations do backend

As migrations do TypeORM **nao rodam automaticamente** na subida do container.

Isso e intencional: assim voce fica livre para executar somente as migrations que fizer sentido em cada ambiente, no momento que decidir.

Para aplicar manualmente:

```bash
docker compose exec tech4um-backend npm run migration:run
```

Para reverter a ultima migration:

```bash
docker compose exec tech4um-backend npm run migration:revert
```

## Rodar em desenvolvimento (sem Docker completo)

Opção recomendada para dev:

1. Subir apenas o banco com Docker:

```bash
docker compose up -d tech4um-db
```

2. Backend local:

```bash
cd tech4um-backend
npm install
npm run migration:run
npm run start:dev
```

Observacao:

- Em dev local, o backend carrega `.env` da raiz e `tech4um-backend/.env`.

3. Frontend local:

```bash
cd tech4um-frontend
npm install
npm run dev -- --host
```

## Testes e build

Backend:

```bash
cd tech4um-backend
npm run lint
npm run test
npm run test:e2e
npm run build
```

Frontend:

```bash
cd tech4um-frontend
npm run lint
npm run type-check
npm run build
```

## Documentação por módulo

- Backend: tech4um-backend/README.md
- Frontend: tech4um-frontend/README.md
