# Tech4UM

Monorepo da plataforma Tech4UM com frontend, backend e banco de dados PostgreSQL.

Este projeto foi desenvolvido com Docker como fluxo principal de desenvolvimento local e replicação de ambiente.

## Visão geral da arquitetura

- tech4um-frontend: aplicação Vue 3 + Vite (porta 5173)
- tech4um-backend: API NestJS (porta 3000)
- tech4um-db: PostgreSQL 17 (porta 5432)

Estrutura da raiz:

- tech4um-frontend/
- tech4um-backend/
- docker-compose.yaml
- .env.example

## Pré-requisitos

Fluxo recomendado (Docker):

- Docker Desktop (ou Docker Engine)
- Docker Compose v2

Fluxo alternativo (sem Docker):

- Node.js 20+ (preferencialmente 24 para alinhamento com as imagens Docker)
- npm 10+
- PostgreSQL 17+

## Configuração do ambiente

1. Na raiz do projeto, crie o arquivo .env a partir do exemplo.

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Edite o .env com os valores do seu ambiente.

Variáveis mínimas:

```env
# App / Backend
HOST=0.0.0.0
PORT=3000
NODE_ENV=development

# Banco
DB_HOST=tech4um-db
DB_PORT=5432
DB_DATABASE=tech4um
DB_USERNAME=postgres
DB_PASSWORD=postgres

# TypeORM
TYPEORM_SYNCHRONIZE=true
TYPEORM_LOGGING=true

# Segurança (obrigatória)
JWT_SECRET=change-this-secret

# Opcional
DB_SSL=false
FRONTEND_URL=http://localhost:5173
```

Importante:

- JWT_SECRET é obrigatório para o backend iniciar.
- Com Docker Compose, mantenha DB_HOST=tech4um-db.
- Sem Docker (backend local), normalmente use DB_HOST=localhost.

## Como replicar localmente (Docker - recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

Serviços disponíveis:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

Comandos úteis Docker:

```bash
# subir em background
docker compose up -d --build

# ver logs
docker compose logs -f

# parar mantendo dados
docker compose down

# parar e remover volume do banco (reset total do banco)
docker compose down -v
```

## Como rodar sem Docker (opcional)

### 1) Suba o PostgreSQL local

- Garanta uma instância PostgreSQL em execução.
- Ajuste .env da raiz para DB_HOST=localhost e credenciais corretas.

### 2) Inicie o backend

```bash
cd tech4um-backend
npm install
npm run start:dev
```

Backend em http://localhost:3000

### 3) Inicie o frontend

Em outro terminal:

```bash
cd tech4um-frontend
npm install
npm run dev -- --host
```

Frontend em http://localhost:5173

## Validação rápida do ambiente

1. Acesse http://localhost:5173
2. Verifique se o frontend comunica com o backend em http://localhost:3000
3. Confirme que o backend conectou ao PostgreSQL sem erro de autenticação.

## Solução de problemas comuns

- Erro de conexão com banco no backend:
	- confira DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD e DB_DATABASE.
	- em Docker Compose, use DB_HOST=tech4um-db

- Erro de JWT_SECRET ausente:
	- adicione JWT_SECRET no .env da raiz

- Frontend sem comunicar com backend em rede local:
	- use o IP da máquina no frontend, por exemplo VITE_API_URL=http://192.168.x.x:3000.
	- confirme se o backend está acessível nessa mesma origem/porta.

## Comandos úteis por módulo

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

- Backend detalhado: tech4um-backend/README.md
- Frontend detalhado: tech4um-frontend/README.md
