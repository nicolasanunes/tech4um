# Tech4UM Backend

API backend da plataforma Tech4UM, responsável por autenticação, gestão de usuários, fóruns, mensagens e comunicação em tempo real.

## O que este backend faz

- Cria e autentica usuários com JWT em cookies httpOnly.
- Expõe endpoints para criação e leitura de fóruns.
- Permite atualização de avatar do usuário autenticado.
- Gerencia mensagens públicas e privadas dentro dos fóruns.
- Entrega chat em tempo real com Socket.IO (namespace chat).
- Retorna respostas padronizadas (success/error) com interceptor e filter globais.
- Aplica validação global de payloads com ValidationPipe.
- Aplica proteção de taxa (throttling) para endpoints sensíveis.

## Tecnologias principais

- Node.js + TypeScript
- NestJS
- TypeORM
- PostgreSQL
- Socket.IO
- JWT
- class-validator + class-transformer
- cookie-parser
- Helmet
- Jest (testes)

## Estrutura de módulos

- auth: login, logout, refresh e sessão atual.
- users: cadastro e atualização de avatar.
- forums: criação/listagem de fóruns e gateway de chat.
- messages: módulo de mensagens (suporte às entidades/fluxo de chat).
- common: interceptor de resposta e filtro de exceções HTTP.

## Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL em execução

## Banco de dados

O backend utiliza PostgreSQL com TypeORM.

### Configuração esperada

As variáveis de conexão são:

- DB_HOST
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_DATABASE
- DB_SSL

Em ambiente local, o projeto está preparado para usar DB_SSL=false.

### Como subir o banco localmente

Opção 1: usando PostgreSQL já instalado na máquina.

1. Crie o banco:

	createdb tech4um

2. Garanta que o usuário e senha configurados no .env tenham acesso ao banco.

Opção 2: usando Docker.

1. Suba um container PostgreSQL:

	docker run --name tech4um-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=tech4um -p 5432:5432 -d postgres:16

2. Mantenha o .env alinhado com os mesmos valores.

### Sincronização do schema

- TYPEORM_SYNCHRONIZE=true: recomendado apenas para desenvolvimento local.
- TYPEORM_SYNCHRONIZE=false: recomendado para produção.

Quando TYPEORM_SYNCHRONIZE=true, o TypeORM cria/ajusta tabelas automaticamente com base nas entidades.

## Como rodar localmente

### 1) Instale as dependências

```bash
npm install
```

### 2) Configure as variáveis de ambiente

Crie um arquivo .env na raiz de tech4um-backend com os valores abaixo:

```env
NODE_ENV=development
PORT=3000

# Frontend permitido no CORS (opcional)
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=change-this-secret

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tech4um

# TypeORM
TYPEORM_SYNCHRONIZE=true
TYPEORM_LOGGING=false
DB_SSL=false
```

Observação: em produção, use TYPEORM_SYNCHRONIZE=false.

### 3) Inicie em modo desenvolvimento

```bash
npm run start:dev
```

Servidor padrão: http://localhost:3000

## Scripts úteis

```bash
# build
npm run build

# start normal
npm run start

# start produção
npm run start:prod

# lint
npm run lint

# testes unitários
npm run test

# testes e2e
npm run test:e2e

# cobertura
npm run test:cov
```

## Testes

Para rodar testes de forma sequencial (útil para debug):

```bash
npm test -- --runInBand
```

## Integração com frontend

- O frontend usa cookies com credenciais.
- Certifique-se de manter withCredentials no cliente HTTP/Socket.
- Se estiver acessando por IP da rede local, ajuste FRONTEND_URL conforme necessário.
