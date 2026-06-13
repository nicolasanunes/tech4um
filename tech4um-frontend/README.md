# Tech4UM Frontend

Aplicacao frontend da plataforma Tech4UM, responsavel pela interface de autenticacao, navegacao entre foruns, chat em tempo real e interacoes do usuario.

## O que este frontend faz

- Realiza login e sessao do usuario com cookies httpOnly no backend.
- Lista, pesquisa e organiza foruns com interface responsiva.
- Exibe tela de conversa com mensagens em tempo real via Socket.IO.
- Permite envio de mensagens publicas e privadas no contexto do forum.
- Exibe participantes online e funcionalidades de interacao no chat.
- Gerencia estado global de autenticacao com Pinia.

## Tecnologias principais

- Vue 3 + TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS 4
- Socket.IO Client
- Reka UI + utilitarios de estilo (CVA, clsx, tailwind-merge)
- ESLint + Oxlint + Prettier

## Estrutura principal

- src/views: telas principais (lista de foruns e chat).
- src/components: componentes reutilizaveis da interface.
- src/stores: estado global (autenticacao e modais).
- src/lib: integracao HTTP com renovacao automatica de sessao.
- src/router: configuracao de rotas da aplicacao.

## Pre-requisitos

- Node.js 20+
- npm 10+
- Backend Tech4UM em execucao

## Variaveis de ambiente

Crie um arquivo .env na raiz de tech4um-frontend:

```env
VITE_API_URL=http://localhost:3000
```

Observacao:
- Em rede local (LAN), use o IP do backend, por exemplo: VITE_API_URL=http://192.168.1.20:3000

## Como rodar localmente

### 1) Instale as dependencias

```bash
npm install
```

### 2) Configure o ambiente

Crie o arquivo .env com VITE_API_URL apontando para o backend.

### 3) Inicie em modo desenvolvimento

```bash
npm run dev
```

Servidor padrao: http://localhost:5173

## Scripts uteis

```bash
# desenvolvimento
npm run dev

# build de producao (type-check + bundle)
npm run build

# apenas build
npm run build-only

# preview do build
npm run preview

# type-check
npm run type-check

# lint completo
npm run lint

# lint com oxlint
npm run lint:oxlint

# lint com eslint
npm run lint:eslint

# formatacao
npm run format
```

## Integracao com backend

- O frontend envia requisicoes com credentials include para suportar cookies de sessao.
- O backend deve estar com CORS habilitado para o host do frontend.
- Para acesso via IP da rede local, ajuste VITE_API_URL para o endereco correto do backend.
