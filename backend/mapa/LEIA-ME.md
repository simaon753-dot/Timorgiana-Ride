# O mapa da Timorgiana

Tudo o que é o NOSSO mapa de Timor-Leste está nesta pasta: os mosaicos, a
rede de estradas, as rotas sem Google e a página de navegação. Separou-se do
resto do servidor a 29/09/2026, a pedido do Simão («Só separar o código»):
mesma casa, mesmo servidor, sem custos novos. Assim cresce sem se misturar
com as viagens, e um dia pode sair para um projecto seu sem se desfazer nada.

## A fronteira

**Aqui só há mapa.** Nenhum ficheiro desta pasta fala com a base de dados,
nem sabe o que é uma viagem, um motorista ou uma tarifa. Recebe pontos e
devolve mosaicos, estradas e rotas.

**Uma porta só: `index.js`.** O resto do servidor importa daí e de mais
lado nenhum:

| O quê | Para quê | Quem usa |
|---|---|---|
| `mapaRouter` | os endereços `/mapa/…` e `/navegar/…` | `src/server.js` |
| `estaNaAgua(lat, lng)` | um ponto caiu no mar? | `src/cobertura.js` |
| `estradaMaisPerto(lat, lng)` | encostar um ponto à estrada | `src/routes/quote.js` |
| `rotaNossa(a, b)` | só a distância e o tempo | comparação com o Google |
| `sobreARede()` | a rede existe e está carregada? | `/api/health` |

Os mosaicos e as rotas com paragens não passam por aqui: só o `servidor.js`
os usa, e chegam ao mundo pelos endereços.

O que precisa do mapa **e** da base de dados fica fora, do lado de lá da
porta: a comparação com o Google (`src/comparacaoRotas.js`) e o
`scripts/comparar-rotas.mjs`.

## O que está onde

    mapa/
      index.js          a porta
      servidor.js       os endereços públicos
      mosaicos.js       lê o timor-leste.pmtiles
      estradas.js       encosta um ponto à estrada
      rotas.js          as rotas (A*, sobre rede/estradas-tl.bin)
      publico/          o que se serve: o mapa (33 MB), o estilo, a página /navegar
      rede/             a rede de estradas, construída a partir do OpenStreetMap
      scripts/          construir-rede.mjs
      receita/          como o mapa foi feito a 07/09/2026 (não se serve)

## Os endereços não mudaram

`/mapa/timor-leste.pmtiles`, `/mapa/estilo.json`, `/mapa/Z/X/Y.mvt`,
`/navegar`, `/navegar/rota`: os mesmos de antes da mudança. A app e o painel
não precisaram de saber que o código mudou de sítio.

## Atualizar os dados (uma vez por mês)

O desenho e a rede são fotografias do OpenStreetMap: uma rua corrigida lá só
chega aqui quando se atualizam. Um comando faz tudo (desde 06/10/2026), em
`backend/`:

    npm run atualizar-mapa

Descarrega o planeta da Protomaps e o recorte da Geofabrik mais recentes,
constrói a rede, **confere os tamanhos antes de trocar** (se algo encolher de
mais, pára sem tocar no que funciona) e guarda os anteriores em
`receita/anterior/`. No fim mostra os três comandos git para publicar.

Cada atualização junta ~35 MB ao histórico do git. Se o repositório crescer
demais, o desenho passa para o Cloudflare R2 (ver a página de custos).

Os passos à mão, se o comando um dia falhar: `rede/LEIA-ME.md` e
`receita/LEIA-ME.md` (passo 2, `pmtiles extract`).

## Licenças

- Dados **© colaboradores do OpenStreetMap**, sob a
  [ODbL](https://opendatacommons.org/licenses/odbl/). A atribuição tem de
  ficar visível no mapa — é obrigação da licença, não cortesia.
- O motor do mapa na página é o **MapLibre GL JS 6.10.0**, licença BSD-3, em
  `publico/navegar/vendor/` ao lado da licença.
