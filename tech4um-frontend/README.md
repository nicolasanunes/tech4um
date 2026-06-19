# Tech4UM Frontend

Aplicacao Vue da plataforma Tech4UM.

## Funcionalidades

- Login/sessao baseada em cookies do backend
- Listagem de foruns com:
	- pesquisa com debounce enquanto digita
	- ordenacao por data/popularidade/participantes
	- cards responsivos por regra de mensagens
- Chat de forum com:
	- mensagens publicas/privadas
	- participantes online
	- indicativo de digitacao
	- paginacao reversa de historico
	- virtualizacao de mensagens

## Stack

- Vue 3 + TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS 4
- Socket.IO Client

## Variaveis de ambiente

Arquivo .env no frontend (execucao local):

```env
VITE_API_URL=http://localhost:3000
```

No Docker de producao (compose da raiz), `VITE_API_URL` e injetada no build via build arg usando o `.env` da raiz.

## Rodar localmente (desenvolvimento)

```bash
npm install
npm run dev -- --host
```

Frontend em:

- http://localhost:5173

## Rodar com Docker (producao-like)

O frontend e buildado e servido por Nginx (estatico).

O Nginx esta configurado para SPA com fallback de rota:

- `try_files $uri $uri/ /index.html`

Isso evita 404 ao abrir rotas como `/forums` diretamente no browser.

Na raiz do monorepo:

```bash
docker compose up -d --build tech4um-frontend
```

Acesso:

- http://localhost:5173

## Scripts

```bash
npm run dev
npm run build
npm run build-only
npm run preview

npm run type-check
npm run lint
npm run lint:oxlint
npm run lint:eslint
npm run format
```

## Integracao com backend

- Requests usam credentials include
- Socket.IO usa withCredentials
- Backend deve aceitar CORS do host frontend

## Notas de UI implementadas recentemente

- Pesquisa de foruns corrige debounce para disparar durante digitacao
- Grid de foruns em 4 colunas no desktop:
	- < 10 mensagens: 1/4
	- > 10 mensagens: 2/4
- Chat com alinhamento de mensagem propria a direita e largura fixa de 80%

## Troubleshooting

- Frontend sem falar com backend:
	- validar VITE_API_URL
	- validar backend em execucao
- Em Docker, valor de VITE_API_URL errado no bundle:
	- rebuildar imagem frontend com no-cache
	- comando sugerido: `docker compose build --no-cache tech4um-frontend`
- Rota `/forums` retornando 404 no Nginx:
	- validar se `nginx/default.conf` foi copiado na imagem
	- rebuildar frontend e subir novamente
