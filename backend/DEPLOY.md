# Pôr o servidor online

Guia da Fase 1: o backend deixa de viver no Mac e passa a estar acessível
de qualquer ponto de Díli, com endereço fixo e ligação encriptada.

## O que vamos usar e quanto custa

| Peça | Serviço | Custo |
|---|---|---|
| Base de dados | **Neon** (PostgreSQL) | Grátis, permanente |
| Aplicação | **Render** | Grátis (ver abaixo) ou ~7 USD/mês |

### O plano gratuito serve para o piloto

O Render adormece um serviço gratuito ao fim de **15 minutos sem tráfego**, e
demora cerca de um minuto a acordar. Para a maioria das apps isso é mau. Para
esta, muito menos — e a razão está nas docs do Render:

> O contador de inactividade inclui "pedidos HTTP **e mensagens WebSocket de
> ligações existentes**".

A TimorgianaRide mantém uma ligação permanente aberta com cada motorista
online — é assim que os pedidos chegam em tempo real. **Enquanto houver um
motorista com a app aberta, o servidor não adormece.** E se não houver
nenhum motorista online, também não há viagem possível.

O custo real: **a primeira pessoa a abrir a app de manhã espera ~1 minuto.**

A app está preparada para isso: repete os pedidos que falham (até ~80 s) e
mostra uma faixa "a acordar o servidor" em vez de dizer que não há ligação.

Limite: 750 horas de serviço activo por mês (um mês tem ~730), suficiente
para um serviço, sobretudo se adormecer de noite.

**Passar a pago mais tarde é um clique**, sem mexer no código.

## Passo 1 — Base de dados (grátis, sem cartão)

1. Criar conta em <https://neon.tech>
2. Criar um projeto — região mais próxima de Timor-Leste (Singapura)
3. Copiar a **connection string**, com o aspeto:
   `postgresql://utilizador:senha@ep-xxx.aws.neon.tech/neondb?sslmode=require`

Para testar localmente, colar em `backend/.env`:

```
DATABASE_URL=postgresql://...
JWT_SECRET=<gerar com: openssl rand -hex 32>
```

Depois `npm run dev` — o esquema é criado sozinho no arranque.

## Passo 2 — Aplicação

1. Criar conta em <https://render.com>
2. **New → Web Service**, ligando ao repositório (ou upload)
3. Configuração:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free para o piloto (ou Starter ~7 USD/mês quando houver uso a sério)
4. Variáveis de ambiente:
   - `DATABASE_URL` — a do Neon
   - `JWT_SECRET` — o mesmo valor longo e aleatório

O Render fornece HTTPS automaticamente, com um endereço do tipo
`https://timorgiana-ride.onrender.com`.

## Passo 3 — Apontar a app para lá

Duas hipóteses:

- **Já feito:** abrir o ⚙️ na app e escrever o endereço — funciona no APK atual
- **Melhor:** gerar um APK novo com o endereço embutido, editando `eas.json`:
  `"EXPO_PUBLIC_API_URL": "https://timorgiana-ride.onrender.com"`

Com HTTPS, o remendo `usesCleartextTraffic` deixa de ser necessário e deve
voltar a `false` — os dados dos utilizadores passam a viajar encriptados.

## Passo 4 — Ligar a busca do Google (opcional)

A busca de lugares tem duas camadas. A primeira, o OpenStreetMap, funciona
sempre e é gratuita. A segunda, o Google Places, conhece os negócios e os
edifícios de Díli que o OpenStreetMap ainda não tem — e é o que as pessoas
escrevem quando pedem uma viagem.

A segunda camada está escrita e adormecida. Sem chave, `noGoogle()` devolve
lista vazia e tudo se comporta como se não existisse. Ligar é pôr a chave;
desligar é apagá-la. Não é preciso publicar app nenhuma.

Na consola do Google Cloud:

1. Activar a **Places API (New)**
2. Criar uma chave de API e **restringi-la** só a essa API
3. Em **Quotas** → *Places API (New)*, a lista tem 21 linhas. Só uma nos
   diz respeito: **`SearchTextRequest per day`**, porque `noGoogle()` chama
   `places:searchText` e mais nada. Vem de fábrica a 75.000; baixar para
   **160**, que dá 4.800 por mês e nunca sai do escalão gratuito (5.000 no
   escalão Pro, que é onde esta chamada cai por pedir nome, morada e
   coordenadas).
4. Ainda nas quotas, pôr a **0** as outras linhas *per day* —
   `AutocompletePlacesRequest`, `GetPhotoMediaRequest`, `GetPlaceRequest`,
   `SearchNearbyRequest`, `SearchMediaRequest`, `SearchReviewPostsRequest`.
   Não usamos nenhuma. Isto não é zelo a mais: se a chave fugir, o prejuízo
   possível deixa de ser a soma de sete serviços e passa a ser a nossa cota.

As cotas reiniciam à meia-noite **hora do Pacífico** — meio da tarde em
Díli, por volta das 16h/17h. Uma busca que morre de manhã volta sozinha a
meio da tarde; não vale a pena esperar pela meia-noite local.

No Render, em **Environment**:

- `GOOGLE_MAPS_KEY` — a chave

A chave é uma senha de facturação: vive no servidor e nunca dentro da app.
Quem descarregue o APK consegue ler tudo o que lá esteja.

## Verificar

```bash
curl https://SEU-ENDERECO/api/health
```

Deve responder `{"ok":true,"service":"TimorgianaRide",...}`.

O campo `busca` diz o estado da segunda camada:

- `"google": false` — sem chave, só OpenStreetMap
- `"google": true` e `"ultimoErroGoogle": null` — a funcionar
- `"ultimoErroGoogle"` com conteúdo — o Google recusou, e o campo `diz`
  traz a razão exacta: chave inválida, API por activar, facturação fechada
  ou quota diária esgotada

Este último campo existe porque uma vez a facturação fechou-se e a busca
degradou-se em silêncio. Uma dependência externa tem de conseguir dizer o
que lhe aconteceu.

## Notas

- O esquema é criado no arranque (`initSchema`) — não é preciso migrar à mão
- O Neon faz **cópias de segurança automáticas**; um disco simples não faria
- As contas de teste antigas ficaram no SQLite do Mac e **não** transitam:
  a base nova começa vazia. É o momento certo para isso, antes de haver
  utilizadores reais
