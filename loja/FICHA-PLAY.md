# Ficha da Google Play — TimorgianaRide

Materiais e textos para a submissão. Os gráficos geram-se com
`python3 loja/gerar.py`; as capturas de ecrã tira-as o Simão do telemóvel e
prepara-as `python3 loja/capturas.py`.

---

## Dois mundos que não se podem tocar (21/09/2026)

O que está no telemóvel do Simão e o que vai estar na loja são **duas
audiências diferentes**, e a app sabe distinguir-se por uma coisa só: o
**canal** com que foi compilada. Cada canal aponta para um **ramo**, e é do
ramo que vêm as actualizações pelo ar.

| Compilar com | Canal | Ramo | Publicar com |
|---|---|---|---|
| `npm run compilar` | `preview` | `preview` | `npm run publicar` |
| `npm run compilar-loja` | `production` | `production` | `npm run publicar-loja` |

**A armadilha, e porque é que isto está escrito.** O canal `production`
estava declarado no `eas.json` desde sempre, mas **não existia** — um canal
só nasce quando uma compilação com esse perfil corre, e nunca correu
nenhuma. Criado à mão a 21/09/2026, já ligado ao ramo `production`.

Se a app tivesse ido para a loja sem isto, acontecia uma de duas coisas, as
duas más: ou o canal nascia sem ramo e **esse APK nunca mais recebia
actualização nenhuma** — nem correcções, e cada defeito passava a exigir uma
versão nova aprovada pela Google —, ou caía no ramo `preview` e **cada ensaio
nosso ia parar aos telemóveis do público no minuto seguinte**, sem revisão.

**Nunca submeter o que sai de `npm run compilar`.** Esse é um APK do canal
`preview`, para testar. O da loja é `npm run compilar-loja`, que sai em
app-bundle, como a Google exige.

Depois de publicada, uma correcção à loja faz-se assim: commit, e
`npm run publicar-loja`. Uma actualização descarregada num arranque só corre
no seguinte — é do desenho do Expo, não é avaria.

---

## Ficheiros

| O que | Ficheiro | Medida |
|---|---|---|
| Ícone da loja | `loja/icone-512.png` | 512 × 512 ✓ |
| Gráfico de destaque | `loja/destaque-1024x500.png` | 1024 × 500 ✓ |
| Capturas de ecrã | `loja/capturas/` | mín. 2, entre 320 e 3840 px |

**A regra que apanha toda a gente:** o lado maior não pode ter mais do dobro
do lado menor. Um telemóvel normal fotografa a 1080x2400 — proporção 2,22:1,
e a loja recusa. Não corrigir isso à mão: pôr as fotografias do telemóvel em
`loja/capturas-originais/`, com nomes que ordenem pela ordem que se quer na
loja, e correr `python3 loja/capturas.py`. Alarga a tela em vez de cortar a
imagem, e sai em `loja/capturas/` pronto a enviar.

**As capturas que valem a pena**, por esta ordem — a primeira é a que quase
toda a gente vê e a única que muitos vêem:

1. O mapa com uma viagem traçada e o preço à vista
2. O ecrã de escolher veículo, com os dois preços
3. A viagem a decorrer, com o motorista e a matrícula
4. O ecrã do motorista, com um pedido a chegar

As duas primeiras fazem-se sozinho. As duas últimas precisam de duas contas
ligadas ao mesmo tempo, ou seja de dois telemóveis; se não houver, publica-se
com as duas primeiras e acrescentam-se depois — a ficha altera-se a qualquer
momento.

O que fica nas capturas fica público para sempre: uma matrícula, um nome, um
número de telemóvel. Só dados nossos, e só os que não nos importa ver na loja.

A faixa "Aplicação em fase de teste" aparece nas duas capturas do ecrã
inicial, e **fica**. A Google exige que as capturas mostrem a app como ela é;
e quem instalar depois de a ver não se sente enganado.

---

## Nome (máx. 30 caracteres)

```
TimorgianaRide
```

## Descrição curta (máx. 80)

**Português**
```
Viagens em Díli. Paga em dinheiro. Sem comissão para o motorista.
```

**English**
```
Rides in Dili. Pay in cash. No commission taken from drivers.
```

**Tétum**
```
Viajen iha Dili. Selu ho osan. Motorista la selu komisaun.
```

---

## Descrição completa

**Português**

```
A TimorgianaRide liga passageiros a motoristas em Díli.

Peça uma viagem de carro ou de motorizada, veja o preço antes de entrar, e
pague em dinheiro ao motorista no fim.

O QUE A DISTINGUE

· Sem comissão. O motorista recebe o que combinou, por inteiro.
· Preço firme. Sabe quanto custa antes de pedir, e não muda a meio.
· Em três línguas: português, tétum e inglês.
· Feita em Díli, para Díli.

PARA QUEM PEDE VIAGEM

Escolha o destino no mapa ou pelo nome. A app mostra o preço do carro e da
motorizada, e quanto tempo falta até chegar um.

Ao entrar, diga ao motorista o código de quatro algarismos que aparece no
ecrã. Sem esse código a viagem não começa — é o que garante que entrou no
carro certo, e que o carro certo o levou a si.

Durante a viagem pode falar com o motorista, ver por onde vai, e pedir ajuda
a qualquer momento.

Pode também pedir uma viagem para outra pessoa — um familiar, alguém do
trabalho — indicando o nome e o contacto de quem vai viajar.

PARA QUEM CONDUZ

Envie os documentos pela app e espere pela aprovação. Depois disso recebe os
pedidos do seu município, escolhe os que quiser, e recebe em dinheiro.

Sem taxa de acesso até 2027 ou até novo aviso oficial.

SEGURANÇA

Todos os motoristas são aprovados à mão, com carta de condução, documentos do
veículo e cartão de inspecção verificados — e a conta suspende-se sozinha se
algum caducar. Todos os dias, antes de entrar ao serviço, o motorista envia
uma fotografia de quem está ao volante.

O botão de emergência liga aos números da polícia, da ambulância e da
protecção civil, e avisa a administração com a sua localização.

PRIVACIDADE

O número de telemóvel do passageiro só é mostrado ao motorista depois de a
viagem ser aceite, e deixa de o ser quando ela termina.

Aviso de privacidade: https://timorgiana-ride.onrender.com/privacidade
Termos de utilização: https://timorgiana-ride.onrender.com/termos

TimorgianaRide é um serviço da Timorgiana, Lda · Díli, Timor-Leste
```

---

## Segurança de dados — o que declarar

O inventário completo está em `juridico/DADOS-DE-QUEM-VIAJA.md`. Em resumo:

| Categoria | Recolhido | Partilhado | Porquê |
|---|---|---|---|
| Nome | Sim | Com a outra parte da viagem | Identificar quem se encontra |
| Telemóvel | Sim | Com a outra parte, só durante a viagem | Ligar a quem se vai buscar |
| Email | Sim | Não | Recuperar a conta |
| Localização aproximada e exacta | Sim | Com a outra parte, durante a viagem | Encontrar e conduzir |
| Fotografias e documentos | Sim | Não | Aprovar o motorista |
| Mensagens da app | Sim | Entre as duas partes | Combinar a recolha |

**Encriptado em trânsito:** sim, tudo.
**Pode pedir para apagar:** sim, contactando a administração.
**Não recolhemos:** contactos, ficheiros, histórico de navegação, dados de
saúde, nada de publicidade.

---

## Classificação de conteúdo

App utilitária, sem conteúdo violento, sexual ou de jogo. Tem comunicação
entre utilizadores (a conversa da viagem) e partilha de localização — as duas
coisas têm de ser declaradas no questionário.

---

## Categoria

**Mapas e navegação**, ou **Viagens e local**. A segunda descreve melhor.
