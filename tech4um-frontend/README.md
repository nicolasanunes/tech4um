# Tech4UM Frontend

Aplicação frontend da plataforma Tech4UM, responsável pela interface de autenticação, navegação entre fóruns, chat em tempo real e interações do usuário.

## O que este frontend faz

- Realiza login e sessão do usuário com cookies httpOnly no backend.
- Lista, pesquisa e organiza fóruns com interface responsiva.
- Exibe tela de conversa com mensagens em tempo real via Socket.IO.
- Permite envio de mensagens públicas e privadas no contexto do fórum.
- Exibe participantes online e funcionalidades de interação no chat.
- Gerencia estado global de autenticação com Pinia.

## Tecnologias principais

- Vue 3 + TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS 4
- Socket.IO Client
- Reka UI + utilitários de estilo (CVA, clsx, tailwind-merge)
- ESLint + Oxlint + Prettier

## Estrutura principal

- src/views: telas principais (lista de fóruns e chat).
- src/components: componentes reutilizáveis da interface.
- src/stores: estado global (autenticação e modais).
- src/lib: integração HTTP com renovação automática de sessão.
- src/router: configuração de rotas da aplicação.

## Pré-requisitos

- Node.js 20+
- npm 10+
- Backend Tech4UM em execução

## Variáveis de ambiente

Crie um arquivo .env na raiz de tech4um-frontend:

```env
VITE_API_URL=http://localhost:3000
```

Observação:
- Em rede local (LAN), use o IP do backend, por exemplo: VITE_API_URL=http://192.168.1.20:3000

## Como rodar localmente

### 1) Instale as dependências

```bash
npm install
```

### 2) Configure o ambiente

Crie o arquivo .env com VITE_API_URL apontando para o backend.

### 3) Inicie em modo desenvolvimento

```bash
npm run dev
```

Servidor padrão: http://localhost:5173

## Scripts úteis

```bash
# desenvolvimento
npm run dev

# build de produção (type-check + bundle)
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

# formatação
npm run format
```

## Integração com backend

- O frontend envia requisições com credentials include para suportar cookies de sessão.
- O backend deve estar com CORS habilitado para o host do frontend.
- Para acesso via IP da rede local, ajuste VITE_API_URL para o endereço correto do backend.
