# Auditoria pré-lançamento — TimorgianaRide

**Data:** 07/09/2026 · **Contra:** o código tal como está, não a memória dele.
**Método:** cada ponto foi verificado no ficheiro e na linha. O que não consegui
provar está marcado como não verificado, não como resolvido.

---

## Antes de tudo: três coisas que mudam metade da lista

A lista que serviu de base é uma lista genérica de ride-hailing. Três decisões
já tomadas no TimorgianaRide fazem com que uma parte dela não se aplique — e é
importante perceber porquê, senão perde-se tempo a resolver problemas que não
existem aqui.

**1. Não há pagamento electrónico.** O passageiro paga em dinheiro ao motorista.
A app não toca no dinheiro. Isso apaga os pontos 29, 30 e a parte de pagamentos
do 53. O único dinheiro que o sistema conhece é a taxa de acesso do motorista, e
essa é carregada à mão por um administrador depois de o motorista pagar no
banco — com registo em `carregamentos` e dentro de uma transacção
(`assinatura.js:163`). Está bem feito.

**2. O preço é fixado ANTES da viagem, a partir da rota planeada.** Não é
cronometrado nem medido pelo GPS durante o percurso (`routes/rides.js:161-169`).
Isto apaga os pontos 15 e 16 quase por inteiro: manipular o GPS não aumenta a
tarifa, porque a tarifa já foi calculada e guardada antes de o carro arrancar.
É uma decisão arquitectónica forte e vale a pena mantê-la.

**3. Há um código de recolha de quatro algarismos.** O motorista não o vê;
pergunta-o em voz alta e escreve o que ouvir (`rides.js:345`). Isto resolve os
pontos 10, 24 e 25 de uma só vez, e resolve-os melhor do que "mostrar a
matrícula": mostrar prova ao passageiro que o carro é o certo, mas não prova ao
motorista que a pessoa é a certa. O código prova as duas coisas.

---

## Já resolvido (verificado)

| Nº | Ponto | Onde está |
|---|---|---|
| 5 | Dois motoristas aceitam a mesma viagem | `rides.js:329` — a condição vai DENTRO do `UPDATE` |
| 10 | Motorista começa sem o passageiro | `rides.js:345` — código de 4 algarismos |
| 12 | Passageiro termina a viagem | `routes/rides.js:307` — só motorista, e só o dela |
| 13 | Preço mal calculado | `routing.js:66` — motor determinístico, cêntimos restritos |
| 14 | Preço muda depois de aceitar | Fixado na criação; ver ressalva no P0-2 |
| 20 | Motorista não verificado a trabalhar | `auth.js:52` `requireApprovedDriver` |
| 21 | Documentos caducados | `documents.js:145` `podeTrabalhar` — suspensão calculada, não escrita |
| 23 | Conta de motorista usada por outra pessoa | `turnos.js` — fotografia de turno diária, obrigatória para entrar ao serviço |
| 24, 25 | Motorista/veículo errado | Matrícula, modelo, cor + código de recolha |
| 26 | Dados a mais | `rides.js:87` — o telefone só sai depois de haver motorista |
| 31 | Servidor cai a meio | Estado vive na base de dados, não em memória |
| 32-35 | App fecha / rede cai | `RideContext.js:85` — ao religar, reafirma e volta a pedir a lista |
| 37 | Motorista aceita e desaparece | `drivers.js:33` — varrimento de minuto a minuto |
| 39 | Geofencing | Salas por município (`server.js:262`) |
| 41, 42 | Pedidos a mais / recusas | Sala por município + filtro de lugares |
| 45 | Duplo toque em "aceitar" | Atómico |
| 46 | Duplo toque em "cancelar" | `routes/rides.js:503` |
| 47 | Decimais do preço | `routing.js` — cêntimos restritos, sempre para baixo |
| 50 | Destino inválido | `cobertura.js` `podeIr`, verificado no servidor |
| 55 | Máquina de estados | Cada transição valida o estado de partida |
| 71, 72 | Documento caducado / motorista suspenso | Verificado a cada pedido (`findUserById` corre sempre) |
| 80 | Suporte reconstruir a viagem | **Não.** Ver P1-4 |

Além disto, há coisas na app que a lista nem pede e que já existem: botão SOS
com três números de emergência, avaliação nos dois sentidos, motivos de
cancelamento em lista fechada (contáveis), registo de acessos do administrador
(`admin_acessos`), e versão dos termos aceites gravada por utilizador.

---

## O que falta — e o que já ficou corrigido hoje

Seis dos oito pontos abaixo foram corrigidos nesta sessão. Ficam escritos com o
problema à frente, e não só com a solução: daqui a três meses o que interessa
saber é o que é que aquela linha estava a defender.

### ✅ P0-1 — Qualquer pessoa podia adivinhar palavras-passe sem limite

`routes/auth.js:95`. **Não existe limitador de pedidos em lado nenhum do
backend** — verifiquei o `package.json` e todo o `src/`. Nem `express-rate-limit`,
nem `helmet`, nada.

O que isto significa em concreto: com um telemóvel conhecido, um atacante pode
tentar palavras-passe a milhares por minuto contra `/api/auth/login` até
acertar. As palavras-passe têm um mínimo de 6 caracteres. Não há bloqueio, não
há atraso, não há aviso.

É o ponto mais grave da lista inteira e é o mais barato de fechar.

**Corrigido** — `limitador.js`, duas camadas.

Por conta, na base de dados: as quatro primeiras falhas não custam nada (quem
escreve mal a senha escreve-a mal duas ou três vezes), e da quinta em diante a
espera cresce — 30s, 1min, 2min, 5min, tecto nos 15 minutos. Fica na base de
dados e não em memória porque o Render reinicia a toda a hora: um contador em
memória apagava-se no reinício, e bastava esperar por ele.

A espera **cresce em vez de bloquear**, e isso foi escolha. Um bloqueio
permanente deixava qualquer pessoa trancar a conta de outra de propósito, só por
errar a senha dela vinte vezes. Com o tecto nos 15 minutos, o prejuízo máximo de
um ataque desses são 15 minutos — e para quem tenta adivinhar, 15 minutos por
cada quatro tentativas torna a coisa inútil.

### ✅ P0-2 — O motorista podia escrever a tarifa que quisesse

`routes/rides.js:379`. O `POST /api/rides/:id/fare` aceita qualquer valor `>= 0`
e escreve-o na viagem. Não valida contra o preço calculado. A app não usa este
endpoint (o `updateFare` existe no cliente e nenhum ecrã lhe chama) — mas o
endpoint está vivo, e um telemóvel modificado escreve $50 numa viagem de $2.

O mesmo buraco está no `accept`: `rides.js:331` faz
`fare_usd = COALESCE($2, fare_usd)` com o valor que o motorista enviar.

Isto contradiz directamente o princípio que o resto do sistema respeita — e que
a própria lista sublinha: **a app é cliente, não é autoridade.**

**Corrigido.** A regra passou a ser: **onde há preço calculado da rota real, o
preço é firme e não se escreve por cima.** Onde não há — destino escrito à mão,
sem coordenadas, sem rota — o preço volta a ser combinado entre as duas pessoas,
que já era a intenção do código original.

A condição vai dentro do `UPDATE` e não numa verificação antes: assim não há um
instante entre verificar e escrever em que outra coisa possa acontecer. Vale
para os dois caminhos — o `/fare` e o valor enviado no `accept`.

### ✅ P0-3 — Um motorista podia ficar com duas viagens ao mesmo tempo

`rides.js:324` `acceptRide`. O `UPDATE` verifica que a VIAGEM está livre. Não
verifica que o MOTORISTA está livre.

Basta uma corrida entre dois toques, ou um cliente modificado, para o mesmo
motorista aceitar duas viagens. O segundo passageiro fica à espera de um carro
que já vai a caminho de outro sítio — que é exactamente o fantasma que já lhe
custou uma tarde a caçar, mas por outra via.

**Corrigido.** Um `NOT EXISTS` dentro do mesmo `UPDATE`, a olhar para as viagens
activas daquele motorista. E a recusa passou a distinguir as duas causas: quem
já tem viagem lê *"termina-a antes de aceitar outra"* em vez de *"já não está
disponível"*, que o mandava procurar o problema no sítio errado.

### ✅ P1-4 — Não havia registo de eventos da viagem

A lista chama a isto "o mais importante", e tem razão.

Hoje a linha da viagem é reescrita por cima: `status` muda, `updated_at` guarda
só a última alteração. Não existe tabela de eventos. Quando chegar a primeira
queixa a sério — "ele disse que eu cancelei e não cancelei", "a viagem custou o
dobro", "o motorista nunca apareceu" — **não há como reconstruir o que
aconteceu**. Só se vê o estado final.

Para um jurista isto devia ser o ponto que mais dói: é a diferença entre ter
prova e ter a palavra de um contra a do outro.

**Corrigido.** Tabela `ride_events`, **apenas de escrita** — nada no código faz
`UPDATE` ou `DELETE` nela, e é de propósito: um registo que se pode alterar não
prova nada. Se um evento estiver errado, escreve-se outro a corrigi-lo, não se
apaga o primeiro.

Regista-se: pedida, aceite, a caminho, começou, **código errado**, terminou,
cancelada, tarifa alterada, SOS. Cada um com hora, quem, coordenadas, preço e
detalhe — o motivo do cancelamento e de que lado veio, os metros a que do
destino a viagem foi fechada, quantas vezes o código foi dito errado.

Nunca rebenta: uma falha a registar escreve na consola e segue em frente.
Perder o registo de uma viagem é mau; não deixar a viagem acontecer é pior.

Vê-se em `GET /api/admin/viagens/:id`, no campo `eventos`.

### ✅ P1-5 — Um pedido que ninguém aceitasse nunca morria

`rides.js:10` — `requested` conta como viagem activa. `routes/rides.js:143`
recusa um pedido novo enquanto houver uma activa. E nada expira os pedidos: o
painel conta os que passam de 5 minutos (`routes/admin.js:229`) mas não lhes
faz nada.

Resultado: às onze da noite, sem motoristas ao serviço, o passageiro pede, nada
acontece, e fica bloqueado de pedir outra vez até perceber sozinho que tem de
cancelar à mão. Ponto 40 da lista.

**Corrigido.** Ao fim de 10 minutos sem resposta o pedido fecha-se sozinho, com
o motivo `sem_motorista`, e o passageiro é avisado por socket — sem o aviso o
ecrã ficava a dizer "à procura de motorista" sobre uma viagem que já não existe.

Vai à boleia do varrimento de minuto a minuto que já existia, pela mesma razão
que ele existe: um temporizador próprio não corre quando o servidor adormece.
Os 10 minutos mudam-se por ambiente (`RIDE_TIMEOUT_MIN`), sem recompilar nada.

### ✅ P1-6 — O motorista ficava com o telefone do passageiro para sempre

`routes/rides.js:228` chama `toPublicRide(r)` sem argumentos no histórico. Como
a viagem terminada tem `driver_id`, a condição do `rides.js:90` deixa passar o
número do passageiro.

O motorista tem portanto, no histórico dele, a lista de todos os passageiros que
levou, com número de telemóvel e coordenadas exactas de onde os foi buscar. Para
quem é apanhado à porta de casa todos os dias, isso é a morada.

Pontos 27 e 28. E abrange também o nome e o telefone do terceiro, no caso do
"pedir para outra pessoa" — incluindo menores.

**Corrigido.** Acabada a viagem, acabam os telefones — dos dois lados e também o
do terceiro. O nome e o resto do histórico ficam; os números não. O ecrã do
histórico não os usava, por isso nada do que ele vê hoje muda.

Ficam de fora, de propósito, as **coordenadas de recolha**: são o registo
operacional da viagem e o painel precisa delas para responder a queixas. Se
quiser, escondem-se do motorista sem se perderem do sistema.

### 🟠 P1-7 — O telemóvel não é verificado (falta a sua decisão)

`routes/auth.js:22`. Regista-se com qualquer número. O código de confirmação vai
por email, e não bloqueia nada.

Há um efeito lateral que é pior do que a conta falsa: `phone` é `UNIQUE`. Quem
registar o número de outra pessoa **impede essa pessoa de alguma vez se
registar**. Em Timor-Leste, onde cada pessoa tem no máximo três números, isso é
grave.

Sei que SMS custa dinheiro e que essa foi a razão. Mas convém a decisão ser
tomada com o efeito à vista, não sem ele.

### 🟡 P1-8 — Terminar a viagem não verifica onde o carro está

`routes/rides.js:307`. O `completed` aceita-se em qualquer sítio. Ponto 11.

Menos grave do que parece, porque o preço já está fixo e não muda com o sítio
onde termina.

**Meio resolvido, e de propósito.** Continua a poder terminar em qualquer sítio —
recusar deixaria uma viagem aberta por causa de um GPS mau, e uma viagem que não
fecha impede o motorista de receber o passageiro seguinte. Mas agora **fica
registado onde foi**, em metros até ao destino. Quem se queixar de ter sido
deixado a meio deixa de precisar que acreditem nele.

---

## 🟢 P2 — depois do lançamento

- **Sem revogação de sessão.** Token de 30 dias (`config.js:8`), sem lista de
  dispositivos e sem "terminar sessão em todo o lado". Telemóvel roubado = 30
  dias de acesso. Ponto 52.
- **Sem raio máximo dentro do município.** O filtro é o município inteiro; em
  Díli chega, em Baucau um pedido pode aparecer a 40 km.
- **CORS aberto** (`server.js:27`, `origin: '*'`). Risco baixo com token em
  cabeçalho, mas não custa fechar.
- **Sem detecção de GPS falso.** Impacto baixo por causa do preço fixo — só
  serve para aparecer mais acima na lista de proximidade.
- **Sobretaxa de 6 lugares.** Eles cobram $1,00/km contra $0,85; nós temos o
  número de pessoas e não o usamos.

---

## O que não se aplica

| Nº | Porquê |
|---|---|
| 29, 30 | Não há pagamento electrónico. Dinheiro em mão. |
| 15, 16 | O preço não depende do trajecto percorrido. |
| 9 | Não existe estado "cheguei" que desbloqueie nada. O que conta é começar, e isso pede o código. |
| 48, 49 | Timor-Leste é pequeno e a cobertura já está travada no servidor. |
| 61-70 | A arquitectura já é esta: app cliente, servidor autoridade. |

---

## Critério de lançamento

**Os três P0 estão fechados**, e com eles três dos cinco P1. O que falta para
publicar não é código — é uma decisão sua:

1. **O telemóvel verifica-se ou não?** (P1-7) É a única coisa da lista que custa
   dinheiro, e a única em que eu não devo decidir por si.
2. **Sobretaxa de 6 lugares?** Eles cobram $1,00/km contra $0,85, e nós temos o
   número de pessoas no pedido sem o usar.

O resto — revogação de sessão, raio máximo, CORS, GPS falso — sai depois do
lançamento sem risco para ninguém.

**Uma nota sobre o registo de eventos.** Só regista o que acontecer a partir do
momento em que for publicado. As viagens que já fez ficam sem história, e isso
não tem remédio — não se pode reconstruir o que não foi escrito. É a razão para
publicar isto antes dos primeiros passageiros a sério, e não depois.
