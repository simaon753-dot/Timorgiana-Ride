# Sistema de design TGA

Referência de desenvolvimento da TimorgianaRide. Compilado a 13/09/2026 a partir
das três referências do Simão (`desenho/imagens/Visualização …`): o registo do
passageiro, o registo do motorista e o ecrã inicial.

**Regra de ouro:** nenhum ecrã escolhe cores, tamanhos ou raios por conta
própria. Tudo sai daqui — dos tokens em `theme.js` e `tipografia.js`, e dos
componentes em `design/` e `components/`. Um ecrã que escreve `#0E5C54` à mão
deixa de mudar com o tema e deixa de ser o mesmo produto.

---

## 1. Tokens

### Cor — `theme.js` (`PALETAS.claro` e `PALETAS.escuro`)

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `teal` | marca, foco, seleccionado | `#0E5C54` | `#2E9E7E` |
| `coral` / `coralDark` | acção e destaque (texto escuro por cima) | `#FF6B4A` / `#E85531` | `#FF8552` / `#FF6B2C` |
| `paper` | fundo do ecrã | `#F7F4EF` | `#000000` |
| `white` | **superfícies** (cartões, campos) — não é "branco" | `#FFFFFF` | `#1C1C1E` |
| `text` / `textMuted` | texto principal / secundário | `#1C2421` / `#68726C` | `#FFFFFF` / `#8E8E93` |
| `border` | contornos | `#E2DDD4` | `#38383A` |
| `danger` / `onDanger` | erro, perigo, e o texto sobre ele | `#C0392B` / `#FFFFFF` | `#FF5252` / `#22100A` |
| `tintaTeal` / `tintaCoral` / `tintaPerigo` | painéis de fundo suave | | |
| `tintaMota` / `tintaCarro` / `tintaCarry` | fundo do cartão de cada veículo | verde / pêssego / azul claros | versões escuras |
| `acentoMota` / `acentoCarro` / `acentoCarry` | círculo do ícone do veículo | `#1A8F74` / `#E85531` / `#2B7FD1` | `#2E9E7E` / `#E85531` / `#3B8FD9` |
| `onAcento` | ícone sobre o acento | `#FFFFFF` | `#FFFFFF` |
| `degradeDe` → `degradePara` / `onDegrade` | botão principal "Kontinua" | `#12806B`→`#0A463F` / branco | `#3DBA96`→`#2E9E7E` / `#04120E` |

**Contraste, medido e não a olho:** texto ≥ 4,5:1; ícones e texto grande
≥ 3:1. Nunca texto branco sobre o coral (2,8:1) — texto escuro (6,5:1).

**As cores de cada veículo vivem na tabela `VEICULOS`** (`dados/tiposDeVeiculo.js`),
como nomes de token (`tinta: 'tintaCarry'`). Um quarto veículo é uma entrada
nessa tabela, não uma caça a cores em cinco ecrãs.

### Tipografia — `design/tipografia.js` (Plus Jakarta Sans)

| Estilo | Tamanho / linha | Uso |
|---|---|---|
| `display` | 34 / 40 | "Kria konta", "Olá," + nome |
| `displayPequeno` | 27 / 33 | títulos de ecrã secundários |
| `titulo` | 21 / 27 | nome do veículo no cartão |
| `subtitulo` | 17 / 23 | título de secção ("1. DADUS PESSOAL") |
| `corpoForte` / `corpo` | 15 / 22 | rótulos de campo / texto |
| `pequeno` | 13,5 / 19 | descrições, notas |
| `legenda` | 12 / 16 | dicas por baixo dos campos |
| `botao`, `etiqueta`, `numero` | | botões, etiquetas em maiúsculas, algarismos tabulares |

**Nunca `fontWeight` sem família.** Pedir negrito a uma família que não o tem
faz o Android cair numa letra de substituição (foi a letra "manuscrita" do
"Motorizada"). Usa-se o estilo que já traz a família certa (`corpoForte`).

### Espaçamento — `spacing`
`xxs 2 · xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`. Margem lateral dos ecrãs: `lg`.

### Raios — `radius`
`xs 6 · sm 10 · md 12 · lg 14 · xl 20 · pill 999`. Campos e cartões pequenos `lg`;
cartões de secção e de veículo `xl`; faixas e pastilhas `pill`.

### Sombra — `elevacao`
`plana` (cartões pousados) · `flutuante` (cartões de secção) · `painel` (barra de
baixo, folhas). Três e não mais. Não existe `elevacao.cartao`.

---

## 2. Componentes

| Componente | Ficheiro | Notas |
|---|---|---|
| **Botão** | `components/Button.js` | `primary` (coral), `secondary` (teal), `outline`, `ghost`, `perigo`, **`marca`** (teal em degradé — o "Kontinua →"). `tamanho="grande"`, `loading`, `disabled`, `icone`, `iconeDireita`. O degradé usa `design/Degrade.js` (react-native-svg), **não** o expo-linear-gradient, que é nativo e obrigaria a APK. |
| **Campo de texto** | `components/TextField.js` | `icone` (bloco à esquerda), `obrigatorio` (asterisco), `hint`, `error`, `sucesso`, `secureTextEntry` (olho desenhado). |
| **Telefone** | `components/CampoTelefone.js` | 🇹🇱 +670 \| dígitos. `telefoneValido()`: Timor-Leste = 8 dígitos a começar por 7; estrangeiro = 8 a 15 com indicativo. O erro só aparece depois de sair do campo. |
| **Tipo de conta** | `design/SeletorConta.js` | Pasajeiru / Motorista em cartões com visto. |
| **Etapas** | `design/Etapas.js` | Recebe a lista de etapas; não sabe nada de contas. |
| **Cartão de secção** | `design/CartaoSeccao.js` | distintivo teal + "1. DADUS PESSOAL" + "Obrigatóriu *". |
| **Tipo de veículo** | `design/EscolherTipoVeiculo.js` | As ilustrações em cartões; a cor do escolhido vem da tabela (o Carry fica azul). |
| **Marka / Modelu** | `design/EscolherMarcaModelo.js` | Dois campos com listas e "Seluk" com escrita livre; sai uma frase ("Toyota Avanza"). |
| **Cor / lugares** | `components/EscolherCor.js`, `EscolherLugares.js` | cores com nome em tétum; lugares em bolas que quebram linha. |
| **Cabeçalho do registo** | `design/CabecalhoRegisto.js` | voltar redondo · logótipo · língua; título e frase; ilustração de Díli opcional por trás. |
| **Cartão de veículo do início** | `screens/PassengerHomeScreen.js` | tinta do veículo, ilustração num quadrado arredondado, círculo do acento com o ícone, seta num círculo. |
| **Faixa de teste** | `components/AvisoTeste.js` | pastilha rosada com "!" — atenção, não erro. |
| **Barra de baixo** | `navigation/Tabuladores.js` | branca, sem traço, sombra `painel`. **Altura não fixa** (a biblioteca soma a margem do indicador de início). |
| **Barra do topo** | `components/BarraTopo.js` | logótipo + círculo do perfil; com `motoristaOnline` mostra a pastilha "Motorista · Online" com o ponto verde. |
| **Ligar/desligar** | `components/BotaoPower.js` | volante num anel com halo (120 px, alvo que se acerta sem olhar). A cor está no **anel**, não no preenchimento. |
| **Etapas da viagem** | `design/EtapasViagem.js` | 4 etapas com a hora de cada. As horas vêm **do servidor** (`createdAt`, `acceptedAt`, `startedAt`, conclusão), nunca do relógio do telemóvel; `--:--` onde não há. |
| **Três números** | `design/NumerosViagem.js` | Distánsia · Tempu · Folin. **Um só componente nos dois lados**, para o motorista e o passageiro nunca verem o preço arredondado de maneiras diferentes. `semPreco` para "a combinar". |
| **Percurso** | `design/PercursoPontos.js` | partida → paragens → destino, pinos ligados por traço **contínuo** (o Android não desenha tracejado num só lado). |
| **Viagem do passageiro** | `components/ViagemPassageiro.js` | título por estado → etapas → mapa → percurso → motorista → veículo → números → aviso → Partilhar · SOS · Kansela. |
| **Cartão do pedido** | `screens/DriverHomeScreen.js` (`RequestCard`) | quem pede + média → percurso → mapa → números → carga → Recusa (`perigoSuave`) e Simu (`secondary`) lado a lado. |
| **Cabeçalho de ecrã** | `design/CabecalhoEcra.js` | "← Fila" + título + subtítulo + lugar à direita (sino, roda dentada). `centrado` (painel) ou título grande à esquerda (definições). |
| **Título de secção** | `design/SeccaoTitulo.js` | ícone sozinho + ETIQUETA + nota discreta **ou** acção ("Haree hotu ›"). |
| **Cartão** | `design/Cartao.js` | branco, raio 20, fio. Com `titulo` leva cabeçalho com ícone; com `lista` o corpo vai de ponta a ponta. |
| **Linhas** | `design/LinhaMenu.js` | `LinhaMenu` (ícone, título, frase, seta — leva a outro sítio) e `LinhaInfo` (rótulo discreto, valor forte — mostra). 56 px. `ultimo` tira o traço de baixo. |
| **Pastilhas de filtro** | `design/Chip.js` | `Chip` com ícone e contagem (só quando o servidor a dá) e `FilaChips`. |
| **Busca** | `design/CampoBusca.js` | lupa + texto + ✕ para limpar. |
| **Escolha entre poucas** | `design/SeletorSegmentado.js` | língua, tema. Todas à vista, a escolhida cheia. |
| **Estado vazio** | `design/EstadoVazio.js` | ilustração (ou ícone grande) + o que falta + porquê + acção opcional. O antigo `design/Vazio.js` (com emoji) fica para os ecrãs que ainda o usam; os novos usam este. |
| **Avatar** | `design/Avatar.js` | fotografia protegida ou iniciais em tinta teal; ponto verde só quando o servidor diz `online`. |
| **Grelha de acções** | `design/BotaoAccao.js` | `cheio` (acção de trabalho), `contorno`, `perigoContorno` (Kansela). 56 px. |
| **Veículo** | `design/CartaoVeiculo.js` | ilustração do tipo + matrícula em caixa + tipo/modelo/cor/lugares. O mesmo na viagem, no perfil e no painel. |
| **KPI e tarifa** | `design/painel.js` | `CartaoKPI` (ícone, número, rótulo, faixa de contexto na tinta do estado) e `CartaoTarifa` (a conta: passageiro → comissão **$0.00** → motorista). |
| **Rodapé** | `design/RodapeMarca.js` | Díli ténue por trás do logótipo e de "DÍLI · TIMOR-LESTE". Sem lema. |

`Button` tem também **`perigoSuave`** (fundo `tintaPerigo`, texto `danger`): recusar sem gritar ao lado de um botão cheio.

### Imagens de veículos
Desde 14/09/2026 são as ilustrações do Simão com a marca TimorgianaRide (as anteriores
vinham da Internet — direito de autor). Entram viradas na horizontal: os originais
tinham o texto em espelho. 624 px de largura.
`assets/veiculos/{mota,carro,carry}-{claro,escuro}.jpg` — fundo branco puro de
dia, preto puro de noite. Ficam sempre num quadrado da **cor do fundo delas**
(branco/preto), que de dia desaparece e de noite se lê como moldura. Nunca se
lhes tira o fundo automaticamente.

### Ilustração de Díli
`assets/entrada/dili.webp` — recortada da referência do Simão, WebP com
transparência (43 KB). No escuro vai a 50 % de opacidade.

---

## 3. Estados

| Estado | Como se mostra |
|---|---|
| **A carregar** | `ActivityIndicator` teal; no botão, `loading` (o botão fica inactivo e não se carrega duas vezes). |
| **Vazio** | texto `textMuted` centrado, a dizer o que falta (ex.: `chatEmpty`). Nunca um ecrã em branco. |
| **Erro** | contorno `danger` + mensagem por baixo do campo (nunca no lugar do rótulo); erros gerais no `design/Aviso.js`, junto ao botão. |
| **Sucesso** | contorno teal + visto no campo. |
| **Desligado** | opacidade 0,5 e sem toque (`disabled`). |
| **Seleccionado** | contorno 2 px na cor da marca (ou do acento do veículo), fundo em tinta, visto no canto. |

---

## 4. Regras que já custaram caro

- **Toque mínimo 44 px.** Ícones pequenos ganham `hitSlop`.
- **Safe Area:** `SafeAreaView edges={['top', 'bottom']}` em todos os ecrãs.
- **Nada de comentários `{/* */}` dentro de um ramo de ternário no JSX** — ficam fora.
- **Nada de ternários de duas vias sobre o tipo de veículo** — pergunta-se à tabela `VEICULOS`.
- **Uma cor escrita à mão não muda com o tema.** Se tem de ser fixa (a cor do fundo de um ficheiro), diz-se porquê num comentário.
- **Ícones decorativos sem disco por trás** (o escudo do aviso, o ícone de um cartão). O círculo fica só onde é o próprio botão (Ligar, Mensajen) ou uma marca (as etapas, o avatar).
- **Estrelas: só a média**, sem o número de avaliações. Quem ainda não foi avaliado não mostra estrelas — o servidor manda `null`, e um "0.0" diria "péssimo".
- **Antes de aceitar, o motorista não vê o telefone de quem pede** nem tem botão de mensagem: a lista de pedidos vai para todos os motoristas do município.
- **As chaves da tabela `VEICULOS` são `motorbike`, `car`, `carry`** — não "mota". Um `VEICULOS.mota` não dá erro no verificador, dá `undefined` no telemóvel.
- **O painel não inventa números.** As referências geradas por IA traziam uma comissão de 15%, "Sistema normal" fixo e dados de exemplo. Cada número do painel vem do servidor (`/admin/resumo`, `/admin/estatisticas`, `/admin/drivers`); a comissão é $0.00 porque a plataforma não cobra comissão. Uma taxa vai sempre com a conta ao lado ("2 husi 3 pedidu").

---

## 5. Fluxo do Carry (14/09/2026)

```
Início → Carry → "O que pretende transportar?" (EscolherCarryScreen)
   ├─ Transportar bens    → Para onde vai? → Confirmar: recolha/destino → tipo(s) de carga
   │                        → tamanho → ajuda → paragens (até 2) → indicações → fotografias
   │                        (câmara ou galeria, até 3) → declaração (+ bens proibidos)
   │                        → RESUMO → "Pedir Carry · $X"
   └─ Transportar pessoas → Para onde vai? → Confirmar: recolha/destino → quantas pessoas
                            → preço → pedir. Nenhuma pergunta de carga.
```

- O primeiro passo vem da tabela `VEICULOS` (`primeiroPasso: 'EscolherCarry'`), não de um
  ternário no ecrã inicial. O texto do botão também (`chaveBotaoPedir`).
- Com `modoCarry` vindo do primeiro passo, o selector bens/pessoas desaparece do ecrã de
  confirmar: o fluxo está fechado.
- Vários tipos de carga: o primeiro escolhido é o principal (`carga_tipo`), os outros vão em
  `carga_extra`; a saída pública tem `carga.tipos`.
- Sem motoristas por perto, o botão diz "Procurar motorista · $X" e um aviso diz o preço
  estimado e que o pedido fica aberto 10 minutos — nunca "Pedir por $X" como se já houvesse
  quem aceitasse.

## 6. Lógica da conta (registo)

```
Pasajeiru:  Dadus Pessoal → Reviza Dadus → Konfirma
Motorista:  Dadus Pessoal → Dadus Veíkulu → Konfirma
```

Um passageiro nunca vê perguntas de veículo, e o pedido de registo dele nunca
leva o bloco `vehicle` — mesmo que tenha começado como motorista e mudado de
ideias. Os termos e a privacidade aceitam-se em duas caixas separadas, marcadas
à mão, na última etapa; nada se presume "ao continuar".
