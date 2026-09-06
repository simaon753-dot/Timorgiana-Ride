# Um mapa próprio, como o do Grab

O Simão viu o mapa do Grab, reparou que ele diz "© OpenMapTiles · OpenStreetMap
contributors", e perguntou se dava para fazer o mesmo. Dá — e isto é o que se
fez em 07/09/2026 para lho mostrar.

**O que aqui está são os passos 1 a 3.** O passo 4 (pôr online) e o 5 (trocar
na app) não foram feitos: primeiro olha-se, depois decide-se.

## O que se descobriu

**Timor-Leste inteiro cabe em 33 MB** — cada rua, cada beco, cada nome, do
país todo até ao nível da rua. Menos do que um álbum de fotografias.

E o mapa mostra os nomes que as pessoas usam: Faularan, Bebunuk, Beto Leste,
Markoni, Fomento, Aimutin, Bairro Pite. Ao nível da rua aparecem os becos —
Beco Lakateu, Beco Nu Tahan, Beco Tahu Isin, Beco Ai-Tahan Matak. É esse o
nível de detalhe que Díli precisa.

## O que faz este mapa ser nosso

Não são os dados: são os mesmos que o Google usa. É o que se decide mostrar.

**Não tem pontos de interesse.** Nem um restaurante, nem um hotel, nem uma
loja. E é a decisão mais importante do estilo.

Foi exactamente o problema de 06/09/2026: os nossos lugares apareciam por cima
dos rótulos do Google e o Simão chamou-lhe, com razão, desarrumação. Tive de
perguntar ao Google o que ele já sabia, para não repetir.

**Num mapa nosso, essa pergunta desaparece.** O espaço está vazio porque nós o
deixámos vazio — e é lá que os lugares que os passageiros baptizam ficam a
viver, sem competir com ninguém.

## Como se refaz

1. **Ferramenta** — `pmtiles`, um único ficheiro de
   https://github.com/protomaps/go-pmtiles/releases (nada a instalar).

2. **Extrair o país** do planeta que a Protomaps constrói todos os dias:

       ./pmtiles extract https://build.protomaps.com/AAAAMMDD.pmtiles \
         timor-leste.pmtiles --bbox=123.85,-9.60,127.40,-8.05 --maxzoom=15

   A caixa inclui **Oecusse e Ataúro** de propósito: não se pode lá ir de
   carro a partir de Díli, mas têm de aparecer no mapa.

3. **Servir e ver:**

       ./pmtiles serve . --port 8099 --cors="*"
       python3 -m http.server 8098

   E abrir `index.html`. O `estilo.json` é o mapa; muda-se e recarrega-se.

## O que falta, se um dia se avançar

**Passo 4** — pôr o `.pmtiles` num alojamento de ficheiros. O formato serve-se
de qualquer sítio estático, sem programa nenhum a correr.

**Passo 5** — trocar o `react-native-maps` pelo `maplibre` na app. É o único
passo que exige APK novo, e faz-se uma vez: depois disso, mudar o estilo é
substituir um ficheiro e o mapa muda no telemóvel de toda a gente.

## A obrigação legal

Os dados são ODbL e a licença **exige atribuição visível** — não é cortesia.
É por isso que o Grab mostra aquela janela. A página aqui já a tem, ao canto.

E há um ponto que o projecto já acertou: os nomes que os passageiros baptizam
vivem numa base SEPARADA, não misturados com os do OpenStreetMap. Isso
mantém-nos fora da partilha obrigatória do ODbL — são nossos. Se algum dia
forem fundidos na mesma base, deixam de ser.
