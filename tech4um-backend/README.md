# Tech4UM Backend

API NestJS da plataforma Tech4UM.

## Responsabilidades

- Autenticacao via JWT (cookies httpOnly)
- Cadastro e leitura de usuarios
- Criacao/listagem de foruns
- Chat em tempo real (Socket.IO)
- Mensagens publicas e privadas
- Upload de imagem para chat

## Stack

- NestJS
- TypeORM
- PostgreSQL
- Socket.IO
- class-validator / class-transformer
- Jest

## Estrutura de modulos

- auth
- users
- forums
- messages
- common (interceptor/filter/decorators)

## Banco de dados e migrations

Estado atual:

- synchronize: false (sempre)
- schema controlado por migrations manuais
- migration inicial ja criada em src/database/migrations

Comandos:

```bash
# usar CLI TypeORM com datasource local
npm run typeorm

# criar migration vazia
npm run migration:create

# gerar migration por diff de entidades
npm run migration:generate

# aplicar migrations pendentes
npm run migration:run

# reverter ultima migration
npm run migration:revert
```

Observacao:

- As migrations do TypeORM nao rodam automaticamente no startup do container em producao.
- Isso e intencional para que voce tenha liberdade de decidir quando e quais migrations executar em cada ambiente.

Execucao manual recomendada:

```bash
# local
npm run migration:run

# docker compose (na raiz do monorepo)
docker compose exec tech4um-backend npm run migration:run
```

## Variaveis de ambiente

Exemplo minimo:

```env
NODE_ENV=development
PORT=3000

JWT_SECRET=change-this-secret
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tech4um
DB_SSL=false

TYPEORM_LOGGING=false

# AWS (obrigatorio para fluxo de upload)
AWS_REGION=sa-east-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret
```

Observacoes:

- A API carrega env via `ConfigModule.forRoot` com:
	- `../.env` (raiz)
	- `.env` (tech4um-backend/.env)
- Em producao (container), o backend escuta em `0.0.0.0`.
- Em desenvolvimento local, escuta em `127.0.0.1`.

## Rodar localmente

```bash
npm install
npm run migration:run
npm run start:dev
```

API em:

- http://localhost:3000

## Rodar com Docker (via raiz)

O compose da raiz sobe backend em modo producao (codigo compilado em dist).

Na raiz do monorepo:

```bash
docker compose up -d --build tech4um-backend tech4um-db
```

O servico `tech4um-backend` no compose carrega:

- `.env` (raiz)
- `tech4um-backend/.env`

## Scripts principais

```bash
npm run build
npm run start
npm run start:dev
npm run start:prod

npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## Boas praticas implementadas

- Erros de gateway do chat mapeados para mensagens seguras ao cliente
- Logs internos preservam detalhes tecnicos
- Nenhum synchronize automatico em banco compartilhado

## Troubleshooting

- Falha de conexao com DB:
	- validar DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE
	- em Docker Compose usar DB_HOST=tech4um-db
- Erro `AWS_REGION is required` no container:
	- validar `tech4um-backend/.env`
	- validar `docker-compose.yaml` com `env_file` incluindo `./tech4um-backend/.env`
- Erro de token/JWT:
	- validar JWT_SECRET no .env
- Banco vazio apos reset:
	- executar npm run migration:run antes de subir a API
