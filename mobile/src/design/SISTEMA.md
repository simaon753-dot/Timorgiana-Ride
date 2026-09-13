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

### Imagens de veículos
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

---

## 5. Lógica da conta (registo)

```
Pasajeiru:  Dadus Pessoal → Reviza Dadus → Konfirma
Motorista:  Dadus Pessoal → Dadus Veíkulu → Konfirma
```

Um passageiro nunca vê perguntas de veículo, e o pedido de registo dele nunca
leva o bloco `vehicle` — mesmo que tenha começado como motorista e mudado de
ideias. Os termos e a privacidade aceitam-se em duas caixas separadas, marcadas
à mão, na última etapa; nada se presume "ao continuar".
