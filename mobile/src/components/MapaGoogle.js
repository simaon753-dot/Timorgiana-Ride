import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image, Linking } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle as Bola, Line } from 'react-native-svg';
import { colors, radius, spacing, registarEstilos, elevacao } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { metrosEntre } from '../lib/filtroPosicao.js';
import { abrirNoMapa } from '../lib/mapaLink.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// O mapa, desenhado pelo Google Maps nativo.
//
// SUBSTITUI o OSMMap.js, que é Leaflet dentro de um WebView. O OSMMap NÃO SE
// APAGA: fica no repositório como saída de emergência. Se a chave do Google
// morrer — facturação fechada, restrição mal posta, conta suspensa — este
// mapa fica cinzento e a app deixa de servir para nada. Nesse caso troca-se
// o import nos dois sítios que o usam (RequestRideScreen e MapaExpandivel) e
// corre-se `npm run publicar`: chega aos telemóveis em minutos, sem APK novo,
// porque o react-native-webview continua dentro do binário.
//
// Uma dependência externa só se põe debaixo de tudo se houver um caminho de
// fuga que não dependa dela.
//
// A INTERFACE É A MESMA do OSMMap, propriedade por propriedade. Foi de
// propósito: assim a troca é uma linha, nos dois sentidos.

const DILI = { lat: -8.5569, lng: 125.5603 };

// A forma do pino, igual à do OSMMap — mesmo caminho SVG, mesmas cores.
//
// Copiado e não partilhado num ficheiro comum, e isso é deliberado: o
// OSMMap desenha dentro de uma página HTML e este desenha em componentes
// React. Não há forma de os dois lerem o mesmo código sem inventar uma
// camada que traduza um no outro. Se um dia a forma mudar, mudam-se os
// O DESENHO DO PINO SAIU DAQUI (22/09/2026).
//
// Havia um caminho SVG (`GOTA`), as cores e o tamanho do furo branco escritos
// neste ficheiro, para a MIRA, enquanto o marcador do mapa já era uma imagem.
// Dois desenhos para a mesma coisa, e um deles ficou para trás quando os
// pinos passaram a ser as ilustrações do Simão. Agora há um só: a imagem, em
// `assets/mapa/pino-*.png`, gerada por `scripts/recortar-novos-icones.py`.

// AS CORES DOS BOTÕES DO MAPA (16/09/2026), medidas dos desenhos do Simão
// (desenho/imagens/novo 1..4.jpeg): um anel de cor à volta do branco, e o
// desenho na mesma família. Teal no que diz ONDE ESTOU (mira, seguir), coral
// no que diz PARA ONDE ESTÁ VIRADO e no que troca a vista (bússola,
// satélite). O anel é mais claro do que o traço, como nos ficheiros.
const TINTA = { teal: '#007E78', tealAnel: '#009490', coral: '#FC5430' };

// O pino tem 30x45 no ecrã. O ponto que marca o sítio está em y=50 de 54 no
// sistema do desenho, o que dá 42 dos 45 — é essa fracção que diz ao mapa
// onde assentar o marcador.
// O TAMANHO DA IMAGEM DO PINO, em pontos. 54x76 é o que o
// `scripts/recortar-novos-icones.py` produz — e é aqui que tem de bater
// certo, porque a MIRA desenha a mesma imagem numa vista com estas medidas.
const PINO_L = 46;
const PINO_A = 59;
const CARTAO_L = 150;

// O PINO DENTRO DO MAPA É UMA IMAGEM, e não o componente <Pino>.
//
// Três tentativas a corrigir a vista React dentro do marcador falharam, e
// todas por boas razões — tamanho por declarar, achatamento do Android,
// momento da fotografia. Todas eram defeitos reais e todas continuam
// corrigidas. Nenhuma era ESTA.
//
// O que deu a pista foi a mira: é o MESMO <Pino>, desenhado por cima do
// mapa como vista normal, e sempre apareceu perfeito. Dentro de um
// marcador, o mapa nativo não mostra a vista — tira-lhe uma fotografia. É
// essa fotografia que sai mal neste telemóvel.
//
// Uma imagem não passa por fotografia nenhuma: o mapa desenha-a
// directamente. Perde-se flexibilidade — a cor deixa de ser uma variável e
// passa a ser um ficheiro — mas para dois pinos fixos vale a troca.
//
// As imagens são geradas do MESMO caminho SVG, em scripts/desenhar-pinos.py.
// Se a forma mudar, correr o script outra vez; mudar só o <Pino> deixa o
// mapa com o desenho velho e o resto da app com o novo.
// AS FERRAMENTAS SÃO AS DO GOOGLE (21/09/2026, decisão do Simão).
//
// Estava ao contrário: as do Google desligadas e as nossas por cima. A razão
// era boa — duas bússolas no mesmo ecrã fazem a pessoa perguntar qual é a
// verdadeira, e foi o que aconteceu quando liguei a rotação. Ele pediu agora
// para experimentar as do Google: bússola, botão da localização, barra de
// ferramentas e trânsito.
//
// UM INTERRUPTOR, E NADA APAGADO. As nossas continuam escritas por inteiro
// aqui em baixo e voltam com esta linha em `false`. Apagá-las obrigava a
// reescrevê-las, e ninguém reescreve igual o que levou semanas a afinar — a
// agulha que aponta ao norte com o mapa direito, o modo de seguir aceso a
// teal, o botão que não colide com o de expandir.
//
// O QUE NÃO MUDA, e é o essencial: o PINO, o VEÍCULO DO MOTORISTA e a LINHA
// do percurso continuam a ser desenhados por nós. O Google não tem
// equivalente para nenhum dos três — e foi por causa deles que este
// componente existe.
const FERRAMENTAS_DO_GOOGLE = false;

// O TRÂNSITO TEM INTERRUPTOR PRÓPRIO, e é a lição da experiência acima.
//
// Foi ligado com as outras ferramentas do Google e desligado com elas — mas
// não é da mesma família. As outras três são BOTÕES, e para cada uma havia
// uma nossa a fazer o mesmo trabalho; o trânsito é uma CAMADA DE INFORMAÇÃO,
// e para essa não temos nada. Desligá-lo por arrastamento era perder o que
// não estava em discussão.
//
// Fica desligado porque o Simão mandou desligar as do Google, e a instrução
// dele vale mais do que a minha opinião sobre o trânsito. Mas fica separado:
// no dia em que quiser só o trânsito, é esta linha e mais nenhuma.
const TRANSITO_DO_GOOGLE = false;

const IMAGEM = {
  origem: require('../../assets/mapa/pino-origem.png'),
  destino: require('../../assets/mapa/pino-destino.png'),
  paragem: require('../../assets/mapa/pino-paragem.png'),
};

// O VEÍCULO TAMBÉM É IMAGEM, e voltou a ser marcador por causa disso.
//
// Foi por cima do mapa durante meia hora, e o Simão apanhou-o: ao arrastar,
// a posição em pixéis não se recalcula, o carro fica colado ao ecrã e o mapa
// desliza por baixo. Parecia que o carro andava sozinho.
//
// Um marcador anda com o mapa sem ninguém calcular nada. O que faltava era
// uma forma de o desenhar que funcionasse — e é a mesma dos pinos.
// UM DISTINTIVO POR TIPO DE VEÍCULO (16/09/2026), dos desenhos do Simão:
// motorizada, carro e pickup. Antes era um carro para todos, e quem esperava
// uma mota via um carro a aproximar-se. Recortados por
// scripts/recortar-veiculos.py; as chaves são os tipos do TIPOS_VEICULO.
const VEICULO_IMAGEM = {
  motorbike: require('../../assets/mapa/veiculo-motorbike.png'),
  car: require('../../assets/mapa/veiculo-car.png'),
  carry: require('../../assets/mapa/veiculo-carry.png'),
};
// O ponto onde o carro encosta. IMAGEM e não vista por cima do mapa: uma
// vista tem de ser recolocada a cada movimento, e recolocar depois do
// movimento é vê-la a flutuar durante ele. Um marcador com imagem é
// desenhado pelo mapa, agarrado à coordenada, e nunca se descola.
// OS PINOS PEQUENOS DAS PARAGENS ALTERNATIVAS (22/09/2026).
//
// Era um círculo cinzento, igual para os dois lados. O Simão pediu um pino
// pequeno — e assim a alternativa fica da FAMÍLIA e da COR do ponto a que
// pertence: teal se é outra forma de ser recolhido, coral se é outra forma
// de ser largado. O círculo cinzento não dizia a qual dos dois se referia.
// A SETA DE VIRAR do botão de guiar (23/09/2026, desenho do Simão).
//
// Estava a usar a seta diagonal do botão de expandir — já existia e era uma
// seta. Mas dizia a coisa errada: duas pontas em diagonal são «aumentar»,
// não «seguir caminho». Esta sobe e vira à direita, que é o gesto de quem
// conduz.
//
// Desenhada e não imagem: são quatro linhas de caminho, ficam nítidas em
// qualquer densidade e pintam-se com a cor do tema sem gerar ficheiro nenhum.
function SetaGuiar() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {/* O traço enche a caixa de 24: o losango de 40 rodado deixa um
          quadrado inscrito de 28, e uma seta acanhada lá dentro lê-se como
          um algarismo em vez de uma direcção. */}
      <Path
        d="M7.4 20.4V13a4 4 0 0 1 4-4h2.6"
        stroke="#FFFFFF"
        strokeWidth={2.9}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M13.2 3.4 L20 9 L13.2 14.6 Z" fill="#FFFFFF" />
    </Svg>
  );
}

// A que distância da linha desenhada é que o motorista deixou de ir por ela
// e vale a pena perguntar outra vez. Trezentos metros: mais do que qualquer
// erro de GPS em Díli e menos do que o quarteirão seguinte.
const APROXIMACAO_DESVIO_M = 300;

const PEQUENO = {
  origem: require('../../assets/mapa/pino-origem-pequeno.png'),
  destino: require('../../assets/mapa/pino-destino-pequeno.png'),
};

// A PARTIR DE QUE DISTÂNCIA uma alternativa deixa de se mostrar.
//
// Uma paragem alternativa é «também podes ser apanhado aqui». A trezentos
// metros deixa de ser isso e passa a ser outra viagem — e um pino a
// trezentos metros do sítio apontado parece um erro da app, mesmo quando é
// uma paragem correctamente definida no painel com um raio largo.
//
// É uma rede de segurança do lado do DESENHO, não uma correcção: quem
// define os raios é o painel, e é lá que se arruma. Mas uma alternativa que
// ninguém vai a pé não tem nada a fazer no ecrã.
const ALTERNATIVA_PERTO_M = 300;
// ONDE, DENTRO DA IMAGEM DO PINO, ESTÁ O SÍTIO QUE ELE MARCA.
//
// Estava escrito `42 / PINO_A` — que dava o número certo por coincidência,
// porque o SVG do <Pino> e a imagem do mapa tinham por acaso a mesma
// proporção. São duas coisas diferentes: aquele é a mira que se arrasta,
// esta é o marcador que o mapa desenha. No dia em que uma mudasse de tamanho,
// a outra passava a apontar ao lado sem ninguém perceber porquê — e foi o que
// esteve quase a acontecer ao aumentar os pinos (22/09/2026).
//
// Agora é um número medido no PRÓPRIO ficheiro: o centro do ponto de baixo,
// que é o que assenta no chão. Medido com
// `scripts/recortar-novos-icones.py` a produzir 46x59, deu 0,9689.
// (Mudou com os pinos novos de 22/09: o desenho é menos alto e o ponto
// está mais em baixo — 0,941 apontaria acima do sítio.)
const ANCORA_Y = 0.9689;

// QUANTO A MIRA SOBE PARA A PONTA CAIR NO CENTRO DO ECRÃ.
//
// A vista está centrada no mapa; a ponta está a ANCORA_Y da altura da
// imagem. Subir por esta diferença põe uma em cima da outra.
//
// NUM SÍTIO SÓ, e é a lição de hoje. Esta conta estava escrita DUAS vezes —
// aqui e na versão "a mexer" —, as duas com a altura da arte antiga escrita
// à mão. Ao aumentar os pinos corrigi uma e esqueci a outra: parada a mira
// subia 33 pontos e a mexer subia 7. O Simão apontava com a ponta ao sítio
// certo, largava, e o pino saltava — e o ponto que ficava marcado estava
// dezenas de metros acima do que ele tinha apontado.
//
// Tirar um número mágico de um dos dois sítios é pior do que o deixar nos
// dois: passa a haver duas contas que discordam, e nada no ecrã o diz.
// O TAMANHO DA MIRA É PRÓPRIO, e não o do marcador (22/09/2026).
//
// Parecem a mesma coisa e não são desenhados pelo mesmo motor: a mira é uma
// vista do React com largura e altura escritas, exactas; o marcador é
// desenhado pelo MAPA NATIVO, que escolhe a imagem conforme a densidade do
// ecrã e a apresenta ao tamanho que essa conta lhe der. Declarar 54 nos dois
// não dá 54 nos dois — no telemóvel do Simão a mira saía visivelmente maior
// e tapava o mapa.
//
// Coupli-los era fingir uma relação que o Android não respeita. São dois
// números, e este é o que se afina a olho até os dois pinos se lerem como o
// mesmo pino.
// 36, e não 42 (22/09/2026). Acompanha a descida do marcador de 54 para 46,
// na mesma proporção.
//
// TEM DE SER MEXIDO À MÃO, e foi o que me escapou: ao separar este número do
// do marcador — porque os dois são desenhados por motores diferentes e
// declarar 54 nos dois não dava 54 nos dois —, perdi o «mexo num e o outro
// acompanha». Baixei o marcador e a mira ficou onde estava. São dois números
// de propósito; quem mexe num tem de olhar para o outro.
const MIRA_L = 36;
const MIRA_A = Math.round((MIRA_L * PINO_A) / PINO_L);

const SUBIR_MIRA = MIRA_A * (0.5 - ANCORA_Y);

// O ALÍVIO DE TRÊS PONTOS enquanto o mapa mexe é o que dá a sensação de que
// é o mapa a passar por baixo da mira, e não a mira a arrastar o mapa. Sai
// da mesma conta, de propósito: é a mesma mira, três pontos acima.
const SUBIR_MIRA_A_MEXER = SUBIR_MIRA - 3;

// O TAMANHO VAI DECLARADO NUMA VISTA À VOLTA, e não só nas propriedades do
// SVG.
//
// O mapa nativo do Android mede a vista do marcador antes de o React lhe
// ter dado forma. Sem largura e altura escritas, mede zero e desenha uma
// fotografia do tamanho que adivinhou — foi assim que os pinos saíram
// esmagados na primeira versão.
//
// No Leaflet isto não podia acontecer: o `iconSize` era obrigatório. Aqui é
// opcional, e o que é opcional foi o que faltou.
// A MIRA É A MESMA IMAGEM DO MARCADOR (22/09/2026).
//
// Era um SVG desenhado à mão aqui dentro, e ficou para trás quando os pinos
// passaram a ser as ilustrações do Simão: no mapa via-se o pino novo e, ao
// escolher um ponto, a mira ainda era o antigo. Dois desenhos para a mesma
// coisa é uma divergência à espera de acontecer — e aconteceu.
//
// `collapsable={false}` NÃO É DECORAÇÃO. O React Native ACHATA vistas que só
// têm propriedades de disposição, e sem isto a vista com as medidas
// desaparecia no caminho até ao Android; o mapa voltava a medir o conteúdo
// directamente e o pino saía esmagado — com a agravante de o resultado ser
// idêntico ao de antes da correcção, o que faz parecer que a actualização não
// chegou.
function Pino({ tipo: qual }) {
  return (
    <View style={{ width: MIRA_L, height: MIRA_A }} collapsable={false}>
      <Image
        source={IMAGEM[qual] || IMAGEM.origem}
        style={{ width: MIRA_L, height: MIRA_A }}
        resizeMode="contain"
      />
    </View>
  );
}

// O cartão com o nome, ao lado do pino.
//
// `agora` é o do veículo em movimento: fundo escuro, para não se confundir
// com os dois que estão parados quando lhes passa por cima.
function Cartao({ nome, detalhe, qual, agora = false }) {
  return (
    <View
      style={[styles.cartao, agora ? styles.cartaoAgora : styles['risco_' + qual]]}
      collapsable={false}
    >
      <Text style={[styles.cartaoNome, agora && styles.cartaoNomeAgora]} numberOfLines={1}>
        {nome}
      </Text>
      {detalhe ? (
        <Text style={[styles.cartaoDetalhe, agora && styles.cartaoDetalheAgora]} numberOfLines={1}>
          {detalhe}
        </Text>
      ) : null}
    </View>
  );
}

// A diferença entre dois rumos, pelo caminho mais curto.
//
// De 359 para 1 grau vão DOIS graus, não trezentos e cinquenta e oito. Sem
// isto, o travão dos três graus deixava passar todas as passagens pelo norte
// e o mapa dava um salto completo de cada vez que se apontasse para lá.
function diferencaAngular(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

// O BOTÃO DE VOLTAR À MINHA LOCALIZAÇÃO.
//
// Existe em todos os mapas que as pessoas usam, e quem arrasta o mapa para
// ver uma rua fica sem forma de voltar. Antes só se voltava fechando e
// reabrindo o ecrã, o que apagava o que já estivesse escolhido.
//
// A mira é desenhada e não é um emoji: os emojis mudam de forma conforme o
// telemóvel, e um alvo tem de se ler como um alvo em todos.
// OS QUATRO BOTÕES SÃO AGORA AS ILUSTRAÇÕES DO SIMÃO (22/09/2026).
//
// Eram desenhos em SVG escritos aqui. Passam a imagens geradas de
// `desenho/imagens/Novos ícones` por `scripts/recortar-novos-icones.py`,
// que lhes tira o preto — fundo e linhas — e as deixa com transparência, a
// assentar sobre qualquer fundo.
//
// A PRIMEIRA TENTATIVA FALHOU POR TAMANHO. Pus-os a 20 e 22 pontos, que era
// o tamanho dos SVG, e o Simão viu um borrão. Um traço fino aguenta ser
// pequeno; uma ilustração a cores, com partes, não. Dentro de um botão de 40
// havia espaço para 26 — e a 26 lêem-se.
//
// E A BÚSSOLA VAI SÓ COM A AGULHA, sem as letras N/O/E/S que o desenho
// trazia à volta: tinham outra escala e, a 26 pontos, eram cinco pixéis de
// ruído por cima da única parte que se lê. A agulha sozinha é que diz para
// onde é o norte.
const FIGURA = {
  mira: require('../../assets/icones/botao-mim.png'),
  agulha: require('../../assets/icones/botao-bussola.png'),
  camadas: require('../../assets/icones/botao-satelite.png'),
  seta: require('../../assets/icones/botao-seguir.png'),
};

function Figura({ qual }) {
  return <Image source={FIGURA[qual]} style={ESTILO_FIGURA} resizeMode="contain" />;
}

const ESTILO_FIGURA = { width: 26, height: 26 };

const Mira = () => <Figura qual="mira" />;
const Agulha = () => <Figura qual="agulha" />;
// O `activo` deixou de pintar a figura de branco: ela é a cores e não muda.
// Quem mostra o modo ligado é o BOTÃO, que acende — ver `botaoSeguirActivo`
// e `botaoSateliteActivo` mais abaixo.
const Camadas = () => <Figura qual="camadas" />;
const Seta = () => <Figura qual="seta" />;

// O CARRO DESLIZA, EM VEZ DE SE TELEPORTAR (22/09/2026).
//
// A posição do motorista chega de oito em oito segundos. Até hoje o marcador
// saltava de um ponto para o outro — e um salto de oitenta metros a cada oito
// segundos lê-se como "o mapa está avariado", mesmo quando o GPS está certo.
// Deslizar não torna a leitura mais precisa: torna-a CRÍVEL, que é o que quem
// espera na rua está a avaliar.
//
// PORQUE À MÃO E NÃO COM `AnimatedRegion`. É o caminho da própria biblioteca,
// mas depende de código nativo que a arquitectura nova do React Native
// (`newArchEnabled`) ainda trata mal. Isto são vinte linhas de JavaScript que
// funcionam em qualquer versão, e o custo é conhecido: dezasseis desenhos por
// segundo durante um segundo e meio, de UM marcador.
//
// DOIS CASOS NÃO DESLIZAM, de propósito: o primeiro ponto (não há de onde
// vir) e um salto acima de 300 metros. Nesse, deslizar seria desenhar o carro
// a atravessar quarteirões onde nunca esteve — mentira mais bonita, mas
// mentira. Aparece logo no sítio novo.
const DESLIZE_MS = 1500;
const SALTO_SEM_DESLIZE = 0.0027; // ~300 m em graus, que chega para decidir

function usarDeslize(alvo) {
  const [pos, setPos] = React.useState(alvo || null);
  const de = React.useRef(alvo || null);
  const relogio = React.useRef(null);

  React.useEffect(() => {
    if (relogio.current) clearTimeout(relogio.current);
    if (!alvo) {
      de.current = null;
      setPos(null);
      return undefined;
    }
    const anterior = de.current;
    const longe =
      !anterior ||
      Math.abs(alvo.lat - anterior.lat) > SALTO_SEM_DESLIZE ||
      Math.abs(alvo.lng - anterior.lng) > SALTO_SEM_DESLIZE;
    if (longe) {
      de.current = alvo;
      setPos(alvo);
      return undefined;
    }
    const inicio = Date.now();
    const passo = () => {
      const t = Math.min(1, (Date.now() - inicio) / DESLIZE_MS);
      // Travagem no fim: o carro chega e assenta, em vez de parar a seco.
      const e = t * (2 - t);
      setPos({
        lat: anterior.lat + (alvo.lat - anterior.lat) * e,
        lng: anterior.lng + (alvo.lng - anterior.lng) * e,
      });
      if (t < 1) relogio.current = setTimeout(passo, 60);
      else de.current = alvo;
    };
    passo();
    return () => {
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, [alvo?.lat, alvo?.lng]);

  return pos;
}

// A ETIQUETA DO LOCAL, de perto (22/09/2026).
//
// O Simão desenhou-a: uma pastilha com o nome do papel do ponto, um pé e um
// ponto em baixo que marca o sítio. Ao longe fica o pino; **de perto** fica
// isto, porque de perto há espaço e o que interessa deixa de ser «há aqui um
// ponto» e passa a ser «este ponto é a recolha».
//
// CONSTRUÍDA EM CÓDIGO E NÃO EM IMAGEM, e a razão é a app ter três línguas.
// Ele mandou-a desenhada com «Local de recolha» lá dentro — e uma imagem com
// texto português chegaria assim a quem tem a app em tétum. Em código, o
// texto vem do dicionário, fica nítido em qualquer ecrã, e mudá-lo um dia
// não obriga a gerar ficheiros nenhuns. Os desenhos dele são a
// ESPECIFICAÇÃO: a forma, as cores, o pé e o ponto.
//
// Não é um marcador: é uma vista por cima do mapa, posicionada pelo pixel da
// coordenada — o mesmo caminho dos cartões dos nossos lugares, e pela mesma
// razão. Um marcador com filhos é fotografado pelo mapa e no telemóvel dele
// não aparece de todo.
function RotuloLocal({ qual, texto }) {
  // Por INCLUSÃO e não por exclusão: `destino` é coral, tudo o resto é teal.
  // Escrito ao contrário — «origem é teal, o resto é coral» —, qualquer valor
  // novo passava a coral em silêncio, que foi o que aconteceu com 'centro'.
  const cor = qual === 'destino' ? TINTA.coral : TINTA.teal;
  return (
    <View style={styles.rotuloCaixa} pointerEvents="none">
      <View style={[styles.rotuloPastilha, { backgroundColor: cor }]}>
        <Text style={styles.rotuloTexto} numberOfLines={2}>
          {texto}
        </Text>
      </View>
      <View style={[styles.rotuloPe, { backgroundColor: cor }]} />
      <View style={[styles.rotuloPonto, { backgroundColor: cor }]} />
    </View>
  );
}

// A PARTIR DE QUE ZOOM se troca o pino pela etiqueta.
//
// `latitudeDelta` é a altura do mapa em graus: quanto MENOR, mais perto.
//
// 0,0015 graus são uns 165 metros de altura de ecrã — o zoom a que se vê um
// quintal. Comecei em 0,0035 (uns 390 m) e o Simão disse que a etiqueta deve
// aparecer «até ao limite»: é informação de detalhe, e detalhe a meia
// distância é sujidade em cima do mapa.
const PERTO = 0.0015;

// A caixa da etiqueta. A altura conta a pastilha, o pé e o ponto: é por ela
// que a etiqueta se levanta acima da coordenada, para o PONTO dela cair
// exactamente onde caía a ponta do pino.
const ROTULO_L = 150;
// A caixa é ANCORADA PELO FUNDO (`justifyContent: flex-end`), e a altura é
// generosa de propósito: cabe o texto em duas linhas. Sem isso, uma etiqueta
// de uma linha só ficava colada ao topo da caixa e o PONTO dela não
// encontrava a ponta do traço — o traço apontaria ao vazio.
const ROTULO_A = 78;

const ROTULO_CHAVE = {
  origem: 'mapaLocalRecolha',
  destino: 'mapaLocalDestino',
  paragem: 'mapaLocalParagem',
};

// O QUE O PONTO É, PARA EFEITOS DE DESENHO (22/09/2026).
//
// Enquanto se escolhe no mapa, o troço de previsão leva `qual: 'centro'`, e
// há uma boa razão para isso escrita onde ele é criado: para a LÓGICA aquele
// ponto ainda não é a recolha nem o destino — é o que qualquer deles vai ser
// se a pessoa confirmar.
//
// Para quem está a OLHAR, porém, ele já é aquilo que vai ser. E deixá-lo em
// 'centro' fazia o desenho cair em dois enganos ao mesmo tempo: a cor caía no
// ramo do coral (porque 'centro' não é 'origem') e o texto caía na chave de
// reserva, «Local de recolha». Dava uma recolha escrita a coral — errado a
// escolher destino E errado a escolher recolha.
//
// Quem sabe o que ele vai ser é o `modoEscolha`, e é a ele que se pergunta.
function qualDesenhado(qual, modoEscolha) {
  if (qual !== 'centro') return qual;
  return modoEscolha === 'destino' ? 'destino' : 'origem';
}

export default function MapaGoogle({
  pickable = false,
  arrastavel = false,
  onArrastar,
  modoEscolha = null,
  onCentro,
  markers = [],
  // OS TROÇOS A PÉ, agora uma LISTA e não um só.
  //
  // Era um, e só servia a recolha. O destino não tinha nenhum — quem pedia
  // para um sítio no meio de um quarteirão via o pino lá dentro e não fazia
  // ideia de onde é que o carro o ia largar.
  //
  // Cada troço é { de, para, qual }: `de` é onde a pessoa apontou, `para` é
  // onde o carro chega, e `qual` diz se é a recolha ou a largada.
  // AS FERRAMENTAS DO MAPA (mira, bússola, seguir, satélite) são OPCIONAIS
  // (23/09/2026, pedido do Simão).
  //
  // No mapa pequeno da viagem — 220 pontos de altura — eram quatro botões
  // numa coluna mais o de expandir: metade da lateral ocupada por comandos,
  // num mapa que serve para ver o carro a aproximar-se e mais nada.
  //
  // Quem quer mexer no mapa expande-o primeiro. Ali há espaço e as quatro
  // ferramentas fazem sentido; no pequeno, o único comando que interessa é
  // «mostra-me isto em grande».
  ferramentas = true,
  // PARA ONDE GUIAR, quando há para onde (23/09/2026, pedido do Simão).
  //
  // `{ lat, lng }` ou nada. Havendo, aparece um botão que abre o mapa NATIVO
  // do telemóvel com navegação até lá — o Google Maps no Android, o Apple
  // Maps no iPhone. Não se desenha navegação dentro da app: seria refazer um
  // produto inteiro que já está instalado em todos os telemóveis e que as
  // pessoas já sabem usar.
  //
  // Só no mapa GRANDE (ver `ferramentas`): no pequeno o único comando é
  // expandir, e sair da app a partir de um mapa de 220 pontos que a pessoa
  // nem sequer abriu seria uma saída acidental.
  navegarPara,
  trocosAPe = [],
  // AS OUTRAS PARAGENS do mesmo sítio, quando o Simão definiu mais do que
  // uma. Cada uma traz `qual` ('origem' ou 'destino'), porque as duas pontas
  // da viagem podem ter alternativas ao mesmo tempo e o toque tem de saber
  // qual delas está a mudar.
  paragens = [],
  onEscolherParagem,
  // A LINHA JÁ CALCULADA, quando quem chama a tem.
  //
  // O ecrã de pedir viagem já pede a cotação ao servidor, e a cotação já traz
  // a linha por onde o preço passou. Passando-a aqui, não se pede a mesma
  // rota duas vezes — e garante-se que a linha desenhada é EXACTAMENTE a
  // linha cobrada. Sem ela, este componente pede a sua.
  linhaDaRota = null,
  // O CAMINHO ATÉ À RECOLHA (23/09/2026, pedido do Simão).
  //
  // `{ lat, lng }` ou nada. Havendo, desenha-se uma segunda linha entre onde
  // o motorista está AGORA e este ponto. A linha da viagem liga a recolha ao
  // destino e não diz nada sobre a parte que ele está mesmo a conduzir: no
  // ecrã dele via-se o mota num sítio, o percurso noutro, e nada a ligá-los.
  //
  // É o troço de APROXIMAÇÃO, que existe só enquanto ele vai a caminho.
  aproximacaoAte = null,
  center,
  height = 240,
  onPick,
  onRoute,
  liveMarker,
  liveLabel,
  // O TIPO do veículo que se mexe, para o distintivo ser o certo. Sem ele,
  // fica o carro: é o que a conta devolve por omissão no servidor.
  veiculoVivo,
  fill = false,
  // QUANTO DESCER A COLUNA DE BOTÕES.
  //
  // Os três botões vivem no canto superior direito. Quem põe este mapa em
  // ecrã inteiro precisa de lá pôr também um botão de fechar, e esse botão
  // aterrava em cima do primeiro da coluna — o de voltar à minha
  // localização, que ficava invisível e intocável.
  //
  // Descer a coluna resolve sem inventar um segundo sítio para os botões: o
  // fechar passa a ser o primeiro da MESMA coluna, com o mesmo tamanho e o
  // mesmo intervalo, e lêem-se os quatro como um conjunto.
  topoDosBotoes = 0,
  // MARGENS DO PRÓPRIO MAPA (o `mapPadding` do Google). Empurram para dentro o
  // logótipo do Google e o centro do enquadramento, sem encolher o desenho.
  // Servem o mapa grande do iPhone, que vai de ponta a ponta por trás das
  // barras do sistema: sem elas, o logótipo ficava debaixo da barra de início,
  // e o Google exige-o à vista.
  margemDoMapa,
  // A COLUNA DE BOTÕES A MEIO DA ALTURA, na mesma lateral direita (pedido do
  // Simão, 16/09/2026). Com o mapa em ecrã inteiro, o topo é da pesquisa e das
  // sugestões, que tapavam a coluna; ao meio, não se tocam.
  botoesAoMeio = false,
  // O SATÉLITE FORA DO MODO DE APONTAR (16/09/2026, pedido do Simão): com a
  // recolha e o destino já postos, o passageiro liga a fotografia para
  // confirmar os dois sítios antes de carregar em "Pedir por…". O botão é o
  // mesmo e fica no mesmo sítio: o quarto da coluna, com os outros três.
  mostrarSatelite = false,
}) {
  // O carro do motorista, a deslizar entre as posições que vão chegando.
  // Ver `usarDeslize`, logo acima: o valor CRU continua a servir tudo o
  // resto (o enquadramento, o rótulo), e só o marcador usa o suavizado.
  const carroSuave = usarDeslize(liveMarker);
  const { t } = useI18n();
  const { token } = useAuth();
  const mapaRef = useRef(null);
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);
  // Comparada pelo COMPRIMENTO e pelas pontas, e não ponto a ponto: uma rota
  // tem centenas de pontos e serializá-la a cada desenho custa mais do que o
  // desenho.
  const linhaKey = linhaDaRota?.length
    ? `${linhaDaRota.length}:${linhaDaRota[0].lat},${linhaDaRota[0].lng}`
    : '';

  const [rota, setRota] = useState(null);
  // A aproximação como o servidor a deu, do princípio ao fim. O que se
  // DESENHA é uma fatia dela — ver `aproximacao`, mais abaixo.
  const [aproximacaoBruta, setAproximacaoBruta] = useState(null);
  const [refazerAproximacao, setRefazerAproximacao] = useState(0);
  const [aMexer, setAMexer] = useState(false);
  // A ALTURA DO MAPA EM GRAUS, para saber se estamos perto. Em estado e não
  // só no ref porque quem a lê é o desenho: um ref muda sem redesenhar nada.
  const [delta, setDelta] = useState(null);
  const [pinosNoEcra, setPinosNoEcra] = useState([]);
  const [mapaPronto, setMapaPronto] = useState(false);
  // Onde o cartão do nome tem de ser desenhado, em pixéis do ecrã.
  const [cartoes, setCartoes] = useState([]);
  const [largura, setLargura] = useState(0);
  const [altura, setAltura] = useState(0);
  const [veiculo, setVeiculo] = useState(null);
  // OS NOSSOS LUGARES DESENHADOS NO MAPA.
  //
  // É a última parte da ideia que o Simão teve no princípio — "podemos
  // construir o nosso mapa como o GrabMaps?". As outras três já viviam: um
  // lugar aceite aparecia na pesquisa, na lista de perto e no cartão ao lado
  // do pino. Faltava estar ESCRITO no mapa, como o Google escreve os dele.
  //
  // Ao fim de uns meses, os sítios que o Google não conhece passam a estar
  // lá — e a app mostra coisas que nenhum outro mapa de Díli mostra.
  const [nossos, setNossos] = useState([]);
  const [nossosNoEcra, setNossosNoEcra] = useState([]);
  const regiaoRef = useRef(null);
  // O centro actual, para decidir de que lado do pino fica o cartão.
  const centroRef = useRef({ lat: c.lat, lng: c.lng });

  // MARCADORES PARADOS. Só se redesenham quando mudam de verdade — o
  // `markersKey` compara o conteúdo e não a identidade do array, porque
  // quem nos chama constrói um array novo a cada desenho do ecrã.
  const pts = useMemo(
    () =>
      markers.map((m) => {
        const partes = String(m.label || '').split(',');
        return {
          lat: m.lat,
          lng: m.lng,
          nome: (partes[0] || '').trim(),
          detalhe: (partes[1] || '').trim(),
          // TABELA E NÃO TERNÁRIO.
          //
          // Era `m.tipo === 'destino' ? 'destino' : 'origem'`, e com dois
          // tipos estava certo. Ao aparecer a paragem passava a MENTIR: caía
          // no ramo `else` e desenhava o pino da RECOLHA no meio do percurso
          // — sem erro nenhum, como todos os ternários de duas vias que este
          // projecto já teve de substituir.
          qual: IMAGEM[m.tipo] ? m.tipo : 'origem',
          cartao: !!m.cartao,
          // ONDE SE DESENHA O PINO, quando não é onde o carro pára.
          //
          // `lat`/`lng` são a coordenada da ESTRADA e continuam a ser a
          // verdade do marcador: é com elas que se calcula a rota, se
          // enquadra o mapa e se pede o preço. O pino é que se desenha no
          // sítio que a pessoa apontou.
          //
          // Confundi as duas na versão anterior — pus o marcador inteiro no
          // ponto escolhido, e a rota passou a ser calculada de dentro de um
          // quarteirão para dentro de outro. O OSRM encostava cada ponta à
          // estrada que lhe apetecesse e a linha dava a volta ao mundo. O
          // Simão viu-o em Cristo Rei.
          pino: m.pino || null,
        };
      }),
    [markersKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const regiaoInicial = useMemo(
    () => ({
      latitude: c.lat,
      longitude: c.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }),
    [c.lat, c.lng]
  );

  // ── Enquadrar ──────────────────────────────────────────────────────
  //
  // Com dois pontos, mostrar os dois. Com um, aproximar. No modo de escolha
  // NÃO se mexe: quem está a apontar com o dedo não quer o mapa a saltar-lhe
  // debaixo da mira.
  //
  // Enquadra pela ROTA quando ela já existe, e só pelos dois pontos
  // enquanto não existe. A diferença não é cosmética: entre a Avenida
  // Nicolau Lobato e o Cristo Rei a estrada contorna a baía toda, e um
  // enquadramento feito só com as pontas deixa metade do caminho de fora.
  const enquadrar = useCallback(() => {
    if (modoEscolha || !mapaRef.current || !pts.length) return;
    const pontos = rota?.linha?.length
      ? rota.linha
      : pts.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    if (pontos.length > 1) {
      mapaRef.current.fitToCoordinates(pontos, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    } else {
      mapaRef.current.animateToRegion(
        {
          latitude: pts[0].lat,
          longitude: pts[0].lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        400
      );
    }
  }, [modoEscolha, pts, rota]);

  // TRÊS MOMENTOS, e faltava o terceiro.
  //
  // Os pontos mudam; o mapa fica pronto (a primeira tentativa acontecia
  // antes de ele existir e não fazia nada); e a rota verdadeira chega, que
  // é quando o enquadramento passa a ter mais do que duas pontas para
  // conter. Sem este último, a recolha ficava fora do ecrã à esquerda.
  useEffect(() => {
    if (!mapaPronto) return;
    enquadrar();
  }, [markersKey, mapaPronto, rota?.tracejada]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── A rota ─────────────────────────────────────────────────────────
  //
  // A linha recta aparece PRIMEIRO e a verdadeira substitui-a quando chegar.
  // Numa ligação lenta, ver uma ligação aproximada de imediato é melhor do
  // que ver a certa daqui a dez segundos — ou nunca, se o pedido falhar em
  // silêncio, que foi o que acontecia antes de haver prazo.
  useEffect(() => {
    if (pts.length < 2) {
      setRota(null);
      return;
    }
    const a = pts[0];
    const b = pts[pts.length - 1];
    let vivo = true;

    const recta = [
      { latitude: a.lat, longitude: a.lng },
      { latitude: b.lat, longitude: b.lng },
    ];
    setRota({ linha: recta, tracejada: true });
    // `/ 1000` À VISTA, e não escondido numa função (22/09/2026).
    //
    // Havia aqui um `metrosEntre` local que devolvia QUILÓMETROS — o `R` era
    // 6371, o raio da Terra em km. O nome mentia desde que foi escrito, e
    // funcionava porque este era o único sítio a usá-lo, e trata o resultado
    // como km. Ao pôr uma segunda regra a medir metros, o nome enganou-me: a
    // comparação teria sido «a menos de 300 km», verdadeira sempre, e a
    // regra nunca filtraria nada sem nada o dizer.
    //
    // Ficou uma conta só, a de `lib/filtroPosicao.js`, que devolve metros a
    // sério. Quem precisa de km divide aqui, onde se vê.
    if (onRoute) onRoute({ km: Math.round((metrosEntre(a, b) / 1000) * 10) / 10, approx: true });

    // Já veio de fora? Desenha-se e não se pergunta a ninguém.
    if (linhaDaRota?.length > 1) {
      setRota({
        linha: linhaDaRota.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        tracejada: false,
      });
      return undefined;
    }

    // PEDIDA AO NOSSO SERVIDOR, e não a um serviço de rotas directamente.
    //
    // Durante meses a app falou com o OSRM, que calcula sobre dados do
    // OpenStreetMap. O mapa é do Google. Em Timor-Leste as estradas do
    // OpenStreetMap foram traçadas de imagens antigas e ficam dezenas de
    // metros ao lado de onde o Google as desenha — a linha seguia uma estrada
    // a sério e assentava ao lado da estrada que a pessoa via.
    //
    // O servidor pergunta ao Google, com a chave que só ele tem e um tecto
    // diário de chamadas, e cai para o OSRM se faltar uma das duas coisas.
    api
      .linhaDaRota(token, {
        originLat: a.lat,
        originLng: a.lng,
        destLat: b.lat,
        destLng: b.lng,
      })
      .then((j) => {
        if (!vivo || !j?.linha?.length) return;
        setRota({
          linha: j.linha.map((p) => ({ latitude: p.lat, longitude: p.lng })),
          tracejada: false,
        });
        if (onRoute) onRoute({ km: j.km });
      })
      .catch(() => {
        /* fica a linha recta que já está desenhada */
      })
      .finally(() => {});

    return () => {
      vivo = false;
    };
  }, [markersKey, linhaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── O TROÇO DE APROXIMAÇÃO ─────────────────────────────────────────
  //
  // PEDIDO UMA VEZ, DEPOIS APARADO. A tentação é voltar a perguntar o
  // caminho a cada posição que chega do GPS — e seria uma chamada ao Google
  // de quinze em quinze segundos, por motorista, durante toda a aproximação.
  // Num dia com cem viagens isso são milhares de chamadas para desenhar uma
  // linha que não mudou: a estrada é a mesma e o motorista vai por ela.
  //
  // Por isso pergunta-se uma vez e, à medida que ele avança, corta-se o
  // princípio da linha — o que fica é exactamente o que lhe falta. Só se
  // pergunta outra vez se ele se AFASTAR dela mais do que `DESVIO`, que é o
  // que acontece quando vai por outro caminho. Uma ou duas chamadas por
  // viagem em vez de dezenas.
  const alvoKey = aproximacaoAte ? `${aproximacaoAte.lat},${aproximacaoAte.lng}` : '';
  // Em ref e não nas dependências: o pedido precisa de saber onde ele está
  // AGORA, mas não pode voltar a correr de cada vez que ele se mexe — que é
  // precisamente o que se está a evitar.
  const ondeEstou = useRef(liveMarker);
  ondeEstou.current = liveMarker;
  // MAS A EXISTÊNCIA DE POSIÇÃO TEM DE ESTAR NAS DEPENDÊNCIAS.
  //
  // Sem isto havia um defeito que só aparecia na primeira vez: ao abrir o
  // ecrã ainda não há leitura de GPS, o efeito corria, não encontrava de
  // onde partir, e nunca mais voltava a correr — porque o `ref` muda sem
  // avisar ninguém. A linha simplesmente não existia, sem erro nenhum.
  //
  // É um booleano e não a posição: muda uma vez, quando a primeira leitura
  // chega, e não a cada passo do motorista.
  const temPosicao = !!liveMarker;

  useEffect(() => {
    const de = ondeEstou.current;
    if (!alvoKey || !de) {
      setAproximacaoBruta(null);
      return undefined;
    }
    let vivo = true;
    // A recta primeiro, como na rota da viagem: numa ligação lenta é melhor
    // ver já uma ligação aproximada do que a certa daqui a dez segundos.
    setAproximacaoBruta([
      { latitude: de.lat, longitude: de.lng },
      { latitude: aproximacaoAte.lat, longitude: aproximacaoAte.lng },
    ]);
    api
      .linhaDaRota(token, {
        originLat: de.lat,
        originLng: de.lng,
        destLat: aproximacaoAte.lat,
        destLng: aproximacaoAte.lng,
      })
      .then((j) => {
        if (!vivo || !j?.linha?.length) return;
        setAproximacaoBruta(j.linha.map((p) => ({ latitude: p.lat, longitude: p.lng })));
      })
      .catch(() => {
        /* fica a recta, que já diz para que lado é */
      });
    return () => {
      vivo = false;
    };
  }, [alvoKey, refazerAproximacao, temPosicao]); // eslint-disable-line react-hooks/exhaustive-deps

  // O QUE FALTA DO CAMINHO. Procura-se o ponto da linha mais perto de onde
  // ele está e deita-se fora tudo o que vem antes; o primeiro ponto passa a
  // ser ele próprio, para a linha não começar ao lado do mota.
  const aproximacao = useMemo(() => {
    if (!aproximacaoBruta?.length || !liveMarker) return null;
    let melhor = 0;
    let perto = Infinity;
    for (let i = 0; i < aproximacaoBruta.length; i++) {
      const d = metrosEntre(liveMarker, {
        lat: aproximacaoBruta[i].latitude,
        lng: aproximacaoBruta[i].longitude,
      });
      if (d < perto) {
        perto = d;
        melhor = i;
      }
    }
    return {
      linha: [
        { latitude: liveMarker.lat, longitude: liveMarker.lng },
        ...aproximacaoBruta.slice(melhor + 1),
      ],
      // Longe da linha toda: foi por outro caminho, e o que está desenhado
      // já não é o dele.
      desviado: perto > APROXIMACAO_DESVIO_M,
    };
  }, [aproximacaoBruta, liveMarker]);

  // Pedir outra. Não entra em ciclo: a linha nova começa onde ele está, e aí
  // o desvio é zero. Se o pedido falhar, `desviado` fica como estava e este
  // efeito não volta a correr — melhor ficar com a linha velha à vista do
  // que insistir contra um servidor que não responde.
  const desviado = !!aproximacao?.desviado;
  useEffect(() => {
    if (desviado) setRefazerAproximacao((n) => n + 1);
  }, [desviado]);

  // O CARTÃO É DESENHADO POR CIMA DO MAPA, não dentro dele.
  //
  // Dentro de um marcador não funciona: o mapa fotografa a vista e a
  // fotografia sai a zero de largura — via-se só o risco de 3 pixéis da
  // borda. O pino resolveu-se com uma imagem; o cartão não pode, porque o
  // texto muda a cada sítio.
  //
  // A mira sempre funcionou porque é exactamente isto: uma vista normal por
  // cima do mapa. `pointForCoordinate` converte a coordenada em pixéis e
  // nós pomos o cartão lá.
  //
  // O preço é este: as posições só se sabem depois de o mapa parar. Por
  // isso os cartões escondem-se enquanto o dedo arrasta e voltam quando ele
  // levanta — melhor do que os ver a flutuar atrasados sobre o mapa.
  // Buscar os nossos lugares da zona visível.
  //
  // SÓ COM O MAPA APROXIMADO. Acima de três quilómetros de raio são nomes
  // demais para caberem sem se taparem, e o que se ganharia em informação
  // perdia-se em desordem. Quem está a ver Díli inteira não quer ler nomes
  // de portões.
  // O RELÓGIO DO TRAVÃO. Ver `buscarNossos`.
  const relogioNossos = useRef(null);
  useEffect(() => () => clearTimeout(relogioNossos.current), []);

  const buscarNossos = useCallback(
    async (regiao) => {
      if (!token || !regiao) return;
      const raioM = (regiao.latitudeDelta * 111320) / 2;
      if (raioM > 3000) {
        setNossos([]);
        return;
      }
      try {
        const r = await api.lugaresPerto(token, regiao.latitude, regiao.longitude, raioM);
        // SÓ O QUE O GOOGLE NÃO CONHECE. O servidor já respondeu a essa
        // pergunta quando o lugar foi aprovado; aqui é só filtrar.
        setNossos((r?.lugares || []).filter((l) => l.desenhar).slice(0, 12));
      } catch {
        // Sem rede não se desenha nada de novo. Os que já lá estavam ficam,
        // que é melhor do que os ver desaparecer a meio de um arrasto.
      }
    },
    [token]
  );

  const recalcularCartoes = useCallback(async () => {
    const comNome = pts.filter((p) => p.cartao && p.nome);
    if (!mapaRef.current || !comNome.length) {
      setCartoes([]);
      return;
    }
    try {
      const pontos = await Promise.all(
        comNome.map((p) =>
          mapaRef.current.pointForCoordinate({ latitude: p.lat, longitude: p.lng })
        )
      );
      setCartoes(comNome.map((p, i) => ({ ...p, x: pontos[i].x, y: pontos[i].y })));
    } catch {
      // Sem posições não se desenha nada. Um cartão no sítio errado é pior
      // do que nenhum: diz que aquele nome é daquele ponto, e não é.
      setCartoes([]);
    }
  }, [pts]);

  // As posições dos nossos no ecrã.
  //
  // `pointForCoordinate` e não uma conta de latitude para pixéis: desde que
  // o mapa roda, uma conta linear deixa de valer — teria de saber o rumo, a
  // projecção e o centro, e sairia errada de maneiras difíceis de ver. O
  // mapa sabe isso tudo e responde por nós.
  useEffect(() => {
    let vivo = true;
    if (!mapaPronto || !mapaRef.current || !nossos.length) {
      setNossosNoEcra([]);
      return undefined;
    }
    Promise.all(
      nossos.map((l) =>
        mapaRef.current.pointForCoordinate({ latitude: l.lat, longitude: l.lng }).catch(() => null)
      )
    )
      .then((pontos) => {
        if (!vivo) return;
        setNossosNoEcra(
          nossos
            .map((l, i) => (pontos[i] ? { ...l, x: pontos[i].x, y: pontos[i].y } : null))
            .filter(Boolean)
        );
      })
      .catch(() => vivo && setNossosNoEcra([]));
    return () => {
      vivo = false;
    };
  }, [nossos, mapaPronto, aMexer]);

  useEffect(() => {
    if (mapaPronto) {
      recalcularCartoes();
    }
  }, [mapaPronto, markersKey, recalcularCartoes]);

  // O VEÍCULO segue o mesmo caminho dos cartões: desenhado POR CIMA do mapa.
  //
  // Era um marcador com o carro e o rótulo lá dentro — o mesmo caminho que
  // fazia o cartão sair a zero de largura. Nunca o vimos partido porque só
  // aparece com um motorista a caminho; era um defeito à espera da primeira
  // viagem a sério.
  //
  // Ao contrário dos cartões, recalcula-se também quando o carro se mexe, e
  // não só quando o mapa pára.
  useEffect(() => {
    let vivo = true;
    if (!mapaPronto || !mapaRef.current || !liveMarker) {
      setVeiculo(null);
      return undefined;
    }
    mapaRef.current
      .pointForCoordinate({ latitude: liveMarker.lat, longitude: liveMarker.lng })
      .then((q) => vivo && setVeiculo(q))
      .catch(() => vivo && setVeiculo(null));
    return () => {
      vivo = false;
    };
  }, [mapaPronto, liveMarker?.lat, liveMarker?.lng, aMexer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pede a posição AO TOQUE e não guardada de antes: quem carrega neste
  // botão quer saber onde está agora, não onde estava quando abriu o ecrã.
  const [aLocalizar, setALocalizar] = useState(false);
  // O rumo do mapa, em graus. Zero é norte para cima.
  //
  // Lido com `getCamera` quando o mapa pára, porque a região não o traz — o
  // que a região diz é onde está e quanto se vê, não para onde está virado.
  const [rumo, setRumo] = useState(0);
  const [aSeguirBussola, setASeguirBussola] = useState(false);
  // O SATÉLITE COMEÇA DESLIGADO, e é uma decisão sobre o dinheiro de quem usa.
  //
  // O mapa normal são instruções de desenho: chegam uma vez e voltam a
  // desenhar-se em qualquer zoom. O satélite são fotografias, e cada nível de
  // aproximação é uma fotografia nova — aproximar três vezes são três
  // descargas. Num país onde os dados se compram ao megabyte, quem passa o dia
  // com o mapa aberto paga isso.
  //
  // Não custa nada ao Simão: a SDK do mapa é "Unlimited" na tabela do Google e
  // o modo de desenho não muda o SKU. Custa a quem conduz.
  const [satelite, setSatelite] = useState(false);
  // E DESLIGA-SE SOZINHO quando o botão sai do ecrã. Sem isto — e era o que
  // acontecia — quem ligasse o satélite para apontar ficava com a fotografia
  // ligada depois de sair do modo, sem botão nenhum para a desligar, a gastar
  // 1,44 MB por minuto. Encontrado a acrescentar o segundo sítio (16/09/2026).
  useEffect(() => {
    if (!modoEscolha && !mostrarSatelite) setSatelite(false);
  }, [modoEscolha, mostrarSatelite]);
  const irParaMim = useCallback(async () => {
    if (aLocalizar || !mapaRef.current) return;
    setALocalizar(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapaRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        500
      );
    } catch {
      // Sem GPS agora. Não se diz nada: o botão não prometeu nada, e um
      // aviso vermelho por não haver satélite seria assustar sem motivo.
    } finally {
      setALocalizar(false);
    }
  }, [aLocalizar]);

  // SEGUIR A BÚSSOLA: o mapa roda para o que está à frente no ecrã ser o que
  // está à frente na rua.
  //
  // É o OPOSTO do botão do norte, e por isso são dois. O do norte endireita o
  // mapa e pára; este abandona o norte de propósito, e serve para andar a pé
  // à procura do sítio onde esperar.
  useEffect(() => {
    if (!aSeguirBussola) return undefined;
    let vivo = true;
    let sub = null;
    // O rumo suavizado, e o último que chegou a mover o mapa. São dois
    // valores diferentes de propósito — ver a explicação em baixo.
    let suave = null;
    let aplicado = null;
    let ultimaOrdem = 0;

    // QUANTO A BÚSSOLA TEM DE MUDAR PARA O MAPA SE MEXER.
    //
    // Estavam três graus, e três graus é MENOS do que a bússola de um
    // telemóvel treme parada em cima da mesa. Perto de metal, dentro de um
    // carro ou ao pé de um telemóvel a carregar, o desvio é bem maior.
    //
    // O resultado era o que o Simão viu: ligava o botão, punha o telemóvel
    // quieto, e o mapa continuava a rodar sozinho.
    const GRAUS_PARA_MEXER = 8;
    // Uma ordem à câmara de cada vez que a anterior teve tempo de acabar. A
    // animação dura 250 ms; mandar outra a meio é começar por cima do que
    // ainda está a andar, e é isso que se vê como tremor.
    const MS_ENTRE_ORDENS = 400;
    // Quanto pesa cada leitura nova no valor suavizado. Um quinto: o rumo
    // segue uma volta a sério em menos de um segundo, e o ruído de uma
    // leitura solta dilui-se antes de chegar ao mapa.
    const PESO = 0.2;

    (async () => {
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (!vivo) return;
          // `trueHeading` é o norte geográfico e vem -1 quando o telemóvel
          // ainda não o sabe; nesse caso serve o magnético, que é o que a
          // agulha de uma bússola de mão também dá.
          const grau = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (!Number.isFinite(grau)) return;

          // PRIMEIRO SUAVIZAR, DEPOIS DECIDIR. Eram as duas coisas de que
          // isto precisava e faltavam as duas.
          //
          // A média corre pelo caminho mais curto (daí o `diferencaAngular`),
          // senão a passagem de 359 para 1 grau dava uma volta inteira ao
          // contrário.
          if (suave === null) suave = grau;
          else suave = (suave + PESO * diferencaAngular(grau, suave) + 360) % 360;

          // O TRAVÃO COMPARA COM O QUE ESTÁ NO MAPA, e não com a leitura
          // anterior. Comparado com a leitura anterior, um tremor de quatro
          // graus para a frente e para trás passava sempre — cada leitura
          // estava longe da outra, e o mapa andava sem nunca sair do sítio.
          if (aplicado !== null && Math.abs(diferencaAngular(suave, aplicado)) < GRAUS_PARA_MEXER) {
            return;
          }
          const agora = Date.now();
          if (agora - ultimaOrdem < MS_ENTRE_ORDENS) return;
          ultimaOrdem = agora;
          aplicado = suave;
          mapaRef.current?.animateCamera({ heading: suave }, { duration: 250 });
        });
      } catch {
        // Sem bússola no telemóvel não há nada a seguir.
        if (vivo) setASeguirBussola(false);
      }
    })();

    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, [aSeguirBussola]);

  // SAIR DO MODO APAGA O SATÉLITE.
  //
  // O botão só existe enquanto se escolhe um ponto. Sem esta linha, quem o
  // ligasse e saísse do modo ficava com a fotografia acesa e sem botão nenhum
  // para a desligar — a pagar 87 MB por hora sem forma de parar.
  //
  // Uma funcionalidade que se pode ligar e não se pode desligar é pior do que
  // não a ter.
  useEffect(() => {
    if (!modoEscolha) setSatelite(false);
  }, [modoEscolha]);

  const aoNorte = useCallback(() => {
    // Endireitar enquanto se segue a bússola era mandar duas ordens
    // contrárias ao mesmo mapa. Quem pede o norte quer o norte.
    setASeguirBussola(false);
    mapaRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
  }, []);

  // ONDE ESTÁ O PONTO DA ESTRADA NO ECRÃ, para lhe pôr a etiqueta em cima.
  //
  // NÃO É O PINO, e é a correcção que o Simão fez com um ✗ por cima da minha
  // primeira tentativa. A etiqueta explica «o carro pára AQUI, e não onde
  // puseste o pino» — pendurada no pino, estaria a rotular o sítio que já
  // tem pino. Pertence à ponta do traço aos pontinhos, que é onde o carro
  // encosta.
  //
  // Sem troço a pé não há etiqueta nenhuma, e está certo: quando o pino já
  // cai na estrada não há nada para explicar.
  //
  // Só se calcula quando estamos PERTO — longe não há etiqueta para pôr, e
  // cada cálculo destes é uma ida ao mapa nativo por cada ponto.
  //
  // EXPERIMENTÁMOS PENDURÁ-LA TAMBÉM NOS PINOS DA VIAGEM (23/09/2026) —
  // o Simão tinha reparado que ao zoom máximo, no ecrã do motorista e no do
  // passageiro, não aparecia etiqueta nenhuma. Viu o resultado e mandou
  // voltar atrás. Fica aqui a razão, para não se repetir a tentativa: a
  // etiqueta explica «o carro pára aqui, e não onde puseste o pino», e numa
  // viagem já aceite a coordenada guardada JÁ É o ponto da estrada. Não há
  // nada para explicar, e a etiqueta em cima do pino era texto a mais sobre
  // um mapa que já estava a dizer o que tinha a dizer.
  const aRotular = useMemo(
    () => trocosAPe.map((tr) => ({ qual: tr.qual, ...tr.para })),
    [trocosAPe]
  );

  // A CHAVE, e não a lista, é que entra nas dependências do efeito.
  //
  // Quem nos chama constrói `trocosAPe` a cada desenho — `const trocosAPe =
  // []` é um array NOVO de cada vez, mesmo com o mesmo conteúdo. Com a lista
  // nas dependências, o efeito voltava a correr a cada desenho, pedia as
  // coordenadas ao mapa nativo, escrevia estado novo, e esse estado novo
  // provocava outro desenho: uma roda que só parava ao afastar o zoom.
  //
  // Ia ficando assim porque a volta é lenta — uma ida ao mapa nativo de cada
  // vez — e por isso não trava nada à vista. Gastava bateria a desenhar
  // sempre a mesma etiqueta no mesmo sítio.
  //
  // Com a chave, o efeito só corre quando os PONTOS mudam de verdade. O que
  // continua a fazê-lo correr de propósito é o mapa mexer-se (`delta`,
  // `aMexer`), que é quando as coordenadas de ecrã mudam mesmo.
  const rotularKey = aRotular.map((r) => `${r.qual}:${r.lat},${r.lng}`).join('|');

  useEffect(() => {
    let vivo = true;
    const perto = delta != null && delta < PERTO;
    if (!mapaPronto || !mapaRef.current || !perto || !aRotular.length) {
      setPinosNoEcra([]);
      return undefined;
    }
    Promise.all(
      aRotular.map((r) =>
        mapaRef.current.pointForCoordinate({ latitude: r.lat, longitude: r.lng }).catch(() => null)
      )
    )
      .then((pontos) => {
        if (!vivo) return;
        setPinosNoEcra(
          aRotular
            .map((r, i) => (pontos[i] ? { ...r, x: pontos[i].x, y: pontos[i].y } : null))
            .filter(Boolean)
        );
      })
      .catch(() => vivo && setPinosNoEcra([]));
    return () => {
      vivo = false;
    };
  }, [rotularKey, mapaPronto, aMexer, delta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estamos perto? Decide quem marca o ponto: o pino ou a etiqueta.
  const perto = delta != null && delta < PERTO;

  const centroMudou = useCallback(
    (regiao) => {
      setAMexer(false);
      // O rumo não vem na região; pergunta-se à câmara.
      // Envolvido, e não encadeado directamente: se `getCamera` não existir
      // ou não devolver uma promessa, um `.then` sobre `undefined` rebentava
      // este handler INTEIRO — e com ele o modo de escolher no mapa, os
      // cartões dos nomes e a posição do veículo, que dependem todos dele.
      try {
        const camara = mapaRef.current?.getCamera?.();
        if (camara?.then) camara.then((c) => setRumo(Number(c?.heading) || 0)).catch(() => {});
      } catch {
        /* sem rumo; a bússola fica a apontar ao norte, que é o caso normal */
      }
      centroRef.current = { lat: regiao.latitude, lng: regiao.longitude };
      regiaoRef.current = regiao;
      setDelta(regiao.latitudeDelta);
      recalcularCartoes();
      // COM TRAVÃO (21/09/2026). Cada paragem do mapa pedia os nomes da zona
      // ao servidor. Quem arrasta o mapa à procura de um sítio pára cinco ou
      // seis vezes pelo caminho, e pagava seis pedidos por uma resposta que
      // só lhe interessa no fim. Meio segundo de espera não se nota a
      // arrastar, e é o que separa o arrasto da paragem.
      clearTimeout(relogioNossos.current);
      relogioNossos.current = setTimeout(() => buscarNossos(regiao), 500);
      if (modoEscolha && onCentro) {
        onCentro({ type: 'centro', lat: regiao.latitude, lng: regiao.longitude });
      }
    },
    [modoEscolha, onCentro, recalcularCartoes, buscarNossos]
  );

  // O PRIMEIRO ENVIO É IMEDIATO. Quem abre o modo de escolha já está a
  // apontar para algum sítio, e esperar pelo primeiro arrasto deixava o
  // botão de confirmar sem nome nenhum por baixo.
  useEffect(() => {
    if (modoEscolha && onCentro) onCentro({ type: 'centro', lat: c.lat, lng: c.lng });
  }, [modoEscolha]); // eslint-disable-line react-hooks/exhaustive-deps

  // O react-native-maps não existe na web.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, styles.fallback, fill ? styles.fill : { height }]}>
        <Text style={styles.fallbackIcon}>🗺️</Text>
        <Text style={styles.fallbackText}>O mapa está disponível na app do telemóvel.</Text>
      </View>
    );
  }

  // ONDE COMEÇA A COLUNA DE BOTÕES (localização, bússola, seguir, satélite),
  // numa só conta para os quatro. Por omissão fica no canto de cima, descida
  // `topoDosBotoes`; com `botoesAoMeio` fica centrada na altura do mapa. Cada
  // botão fica 48 abaixo do anterior. `null` quer dizer "onde o estilo já o
  // põe", e é o caso normal, que fica exactamente como estava.
  // Quantos botões nossos ficam na coluna. Com as ferramentas do Google
  // ligadas sobra o satélite, que não tem equivalente do lado deles.
  const nBotoes = FERRAMENTAS_DO_GOOGLE
    ? modoEscolha || mostrarSatelite
      ? 3
      : 2
    : modoEscolha || mostrarSatelite
      ? 4
      : 3;
  const topoColuna =
    botoesAoMeio && altura
      ? Math.max(spacing.sm, Math.round(altura / 2 - (nBotoes * 48) / 2))
      : spacing.sm + topoDosBotoes;
  const naColuna = (i) => (topoColuna !== spacing.sm ? { top: topoColuna + 48 * i } : null);

  return (
    <View
      style={[styles.wrap, fill ? styles.fill : { height }]}
      onLayout={(e) => {
        setLargura(e.nativeEvent.layout.width);
        setAltura(e.nativeEvent.layout.height);
      }}
    >
      <MapView
        ref={mapaRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        // "hybrid" e não "satellite": é a fotografia COM os nomes das ruas por
        // cima. O satélite puro é mais bonito e serve pior — quem escolhe um
        // ponto de recolha precisa de reconhecer a casa E de saber em que rua
        // ela fica.
        mapType={satelite ? 'hybrid' : 'standard'}
        initialRegion={regiaoInicial}
        // Antes o primeiro enquadramento corria no `useEffect` de montagem,
        // quando o mapa nativo ainda não existia — e não fazia nada.
        onMapReady={() => {
          setMapaPronto(true);
          // Sem isto, os nossos lugares só apareciam depois de a pessoa
          // mexer no mapa — e quem não mexesse nunca os via.
          buscarNossos(regiaoInicial);
        }}
        // O `aMexer` vale para os dois: levanta a mira, e esconde os
        // cartões enquanto as posições deles estão desactualizadas.
        onRegionChange={() => {
          if (!aMexer) setAMexer(true);
        }}
        // ARRASTAR DESLIGA O SEGUIMENTO.
        //
        // Com os dois ligados havia dois a mandar no mapa: a pessoa arrastava
        // e a bússola puxava de volta meio segundo depois. Quem toca no mapa
        // com o dedo está a dizer que quer decidir, e ganha.
        onPanDrag={() => {
          if (aSeguirBussola) setASeguirBussola(false);
        }}
        onRegionChangeComplete={centroMudou}
        // O TOQUE SÓ AVISA, NÃO DESENHA.
        //
        // Quem nos chama recebe a coordenada, guarda-a como recolha ou
        // destino e devolve-a em `markers` — o pino aparece por aí. Se
        // desenhássemos também um aqui ficavam DOIS pinos no mesmo sítio,
        // e o de baixo nunca mais saía porque este componente não sabe
        // quando o ponto deixou de interessar.
        onPress={
          pickable
            ? (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                if (onPick) onPick({ lat: latitude, lng: longitude });
              }
            : undefined
        }
        // O PONTO AZUL DO GOOGLE, o mesmo que o Google Maps desenha.
        //
        // Estava desligado, e isso deixava o utilizador sem forma de comparar
        // o PINO (onde o motorista vai) com ONDE ELE ESTÁ AGORA. O Simão só
        // deu pela diferença abrindo o Google Maps ao lado.
        //
        // Agora vê os dois no mesmo ecrã: se não coincidirem, arrasta o pino.
        // Não corrige o satélite — dá a quem está lá a forma de mandar nele.
        mapPadding={margemDoMapa}
        showsUserLocation
        showsMyLocationButton={FERRAMENTAS_DO_GOOGLE}
        // A BÚSSOLA DO GOOGLE, DESLIGADA. Nós temos a nossa.
        //
        // Vem ligada de origem e só aparece com o mapa torto — por isso
        // ficou invisível até eu ligar a rotação, e depois apareceu sozinha
        // no canto oposto ao dos nossos três botões. O Simão viu duas
        // bússolas e perguntou qual apagar.
        //
        // Fica a nossa: está na coluna com as outras duas, aparece sempre, e
        // a agulha aponta ao norte mesmo com o mapa direito — diz para onde é
        // o norte, e não só que o mapa está torto.
        // A BÚSSOLA DO GOOGLE FICA DESLIGADA, mesmo com as ferramentas dele.
        //
        // Não é preferência: no Android o SDK ancora a bússola ao canto
        // superior ESQUERDO e não há forma de a mudar de lado — a única coisa
        // que a move é o `mapPadding`, que empurraria tudo o resto com ela.
        // O Simão pediu os botões todos à direita, e do lado direito só a
        // nossa lá chega. Fica a nossa agulha, na coluna de sempre.
        //
        // (No iPhone o SDK já a põe à direita, mas uma app com a bússola num
        // lado no Android e no outro no iPhone é pior do que qualquer das
        // duas: quem explica a app a um motorista teria de explicar duas.)
        showsCompass={false}
        toolbarEnabled={FERRAMENTAS_DO_GOOGLE}
        // O TRÂNSITO, que nunca esteve ligado. Em Díli diz qual a avenida que
        // está parada — é a ferramenta do Google que mais falta fazia.
        showsTraffic={TRANSITO_DO_GOOGLE}
        // A ROTAÇÃO ESTAVA DESLIGADA, e sem ela uma bússola não teria o
        // que mostrar. Roda-se com dois dedos, como em qualquer mapa.
        rotateEnabled
        pitchEnabled={false}
      >
        {/* A CIRCUNFERÊNCIA DE INCERTEZA SAIU DAQUI.
            Desenhávamos uma, em teal, à volta do pino. Desde que o ponto
            azul do Google passou a aparecer, ele traz a dele — e duas
            circunferências translúcidas sobrepostas não dizem duas coisas,
            dizem uma coisa turva.
            A do Google é melhor: é do momento, e encolhe quando ele ganha
            confiança. A nossa era do instante em que o pino foi posto e
            ficava parada. O "±40 m" na folha de baixo continua a dizer o
            erro daquela leitura, que é a informação que faltaria. */}

        {/* A CHAVE MUDA quando a rota deixa de ser a provisória, e isso é
            obrigatório.

            Passar `lineDashPattern={undefined}` NÃO apaga o tracejado: o
            React reaproveita o mesmo objecto nativo e `undefined` significa
            "não mexas nisto", não "tira isso". A rota verdadeira aparecia
            correcta — a seguir as estradas — mas vestida de pontinhos, como
            se ainda fosse a linha recta.

            Com chaves diferentes, a linha verdadeira nasce num objecto novo,
            que nunca teve tracejado nenhum. */}
        {/* O TROÇO A PÉ, de onde a pessoa está até ao ponto de recolha.
            Aos pontinhos e não a cheio: uma linha cheia é o caminho do
            carro, e esta não é — é o caminho dela. Responde a uma pergunta
            que a pessoa tem e a que ninguém respondia: onde é que eu espero?
            Cinzento-escuro em vez do teal, para não competir com a rota. */}
        {trocosAPe.map((t, i) => (
          <Polyline
            key={`a-pe-${t.qual || i}`}
            coordinates={[
              { latitude: t.de.lat, longitude: t.de.lng },
              { latitude: t.para.lat, longitude: t.para.lng },
            ]}
            // Como os do Google: pontos redondos e espaçados, cinzento
            // neutro. Não é a cor de nada nosso de propósito — este troço não
            // é da app, é o bocado que a pessoa faz a pé.
            strokeColor="#5A6B66"
            strokeWidth={4}
            lineCap="round"
            lineDashPattern={[1, 9]}
          />
        ))}

        {/* A ROTA, DESENHADA COMO O GOOGLE DESENHA A DELE.
            O caminho já era o deles — as coordenadas vêm da Routes API, por
            isso a linha passa pelas estradas por onde eles mandariam. O que
            faltava era o aspecto: eles põem DUAS linhas, uma escura mais
            larga por baixo e a da cor por cima, com as pontas redondas.

            Não é enfeite. Uma linha lisa da nossa cor cruza uma avenida
            cinzenta, um rio azul e um quarteirão creme, e em cada um deles
            perde-se um bocado — o verde escuro sobre o cinzento de uma via
            rápida quase não se vê. O contorno dá-lhe uma margem própria: seja
            o que for que esteja por baixo, há sempre dois tons a separá-los.

            AS CORES ESTÃO ESCRITAS À MÃO, e é de propósito. São as do tema
            (`teal` e `tealDark`), mas o mapa do Google é sempre claro — não
            segue o nosso modo escuro. Uma linha que mudasse de cor à noite
            ficaria a ser desenhada sobre o mesmo fundo de sempre.

            A LINHA RECTA NÃO LEVA CONTORNO. Ela aparece quando não sabemos o
            caminho e ligamos os dois pontos a direito; o tracejado é o que
            diz "isto é um palpite". Vesti-la com o acabamento da rota a
            sério era dar-lhe uma confiança que ela não tem. */}
        {rota && rota.tracejada ? (
          <Polyline
            key="recta"
            coordinates={rota.linha}
            strokeColor="#0E5C54"
            strokeWidth={4}
            strokeOpacity={0.6}
            lineDashPattern={[8, 8]}
          />
        ) : null}

        {/* O TROÇO DE APROXIMAÇÃO — o que ele está a conduzir AGORA.
            Desenhado ANTES da rota da viagem, e por isso por baixo dela:
            onde as duas se sobrepõem, a da viagem é que manda.

            Tracejado de propósito, e não por ser um palpite — a linha é
            verdadeira. É para se lerem as duas de relance como coisas
            diferentes: o traço cheio é o trabalho, o tracejado é o caminho
            até ele. A mesma cor porque é a mesma viagem. */}
        {aproximacao?.linha?.length > 1 ? (
          <Polyline
            key="aproximacao"
            coordinates={aproximacao.linha}
            strokeColor="#0E5C54"
            strokeWidth={5}
            strokeOpacity={0.75}
            lineDashPattern={[10, 10]}
            lineCap="round"
            zIndex={0}
          />
        ) : null}

        {/* AS DUAS SOLTAS e não dentro de um fragmento. O MapView entrega os
            filhos ao mapa nativo, e um fragmento é uma camada de React que
            não existe do lado nativo. Funciona quase sempre; "quase" não
            chega quando eu não tenho o telemóvel dele para confirmar. */}
        {rota && !rota.tracejada ? (
          <Polyline
            key="estrada-contorno"
            coordinates={rota.linha}
            strokeColor="#0A463F"
            strokeWidth={10}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        ) : null}

        {rota && !rota.tracejada ? (
          // SEM `strokeOpacity`, e a ausência é a decisão.
          //
          // A linha antiga ia a 0,9 e sozinha ninguém dava pelos 10% — o que
          // se via por baixo era o mapa. Com uma linha escura debaixo dela,
          // esses 10% passavam a ser o contorno a subir através do verde, e a
          // cor saía turva. Opaca, cada uma faz o seu trabalho.
          <Polyline
            key="estrada"
            coordinates={rota.linha}
            strokeColor="#0E5C54"
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        ) : null}

        {pts.map((p, i) => (
          <Marker
            key={`${p.lat},${p.lng},${p.qual},${i}`}
            coordinate={{
              latitude: p.pino ? p.pino.lat : p.lat,
              longitude: p.pino ? p.pino.lng : p.lng,
            }}
            anchor={{ x: 0.5, y: ANCORA_Y }}
            // ARRASTAR PARA CORRIGIR. O GPS de um telemóvel entre prédios
            // erra 20 a 40 metros, e nenhum código corrige uma leitura de
            // satélite. O que se pode fazer é deixar quem está lá — e sabe
            // onde está — pôr o ponto no sítio.
            draggable={arrastavel}
            onDragEnd={
              arrastavel && onArrastar
                ? (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    onArrastar({
                      type: 'arrastou',
                      tipo: p.qual,
                      lat: latitude,
                      lng: longitude,
                    });
                  }
                : undefined
            }
            image={IMAGEM[p.qual]}
          />
        ))}

        {/* O CÍRCULO NA PONTA DO TRACEJADO SAIU (22/09/2026, pedido do
            Simão). Marcava onde o carro encosta, e a linha aos pontinhos já
            o diz: o tracejado acaba exactamente aí. O anel era escuro e
            grosso, e ao lado de um pino pequeno pesava mais do que aquilo
            que servia — chamava a atenção para o sítio onde se espera em vez
            do sítio para onde se vai.

            A informação não se perdeu: mudou de quem a dá. Se um dia a linha
            sozinha parecer vaga, ele volta mais pequeno e mais claro — o
            ficheiro fica em assets/mapa/ponto-estrada.png. */}

        {/* AS OUTRAS PARAGENS. Cinzentas e por baixo da que está posta.
            `title` e não um filho: um marcador com filhos é fotografado pelo
            mapa e no telemóvel do Simão não aparece de todo. O título abre o
            balão nativo do Google, desenhado por ele e não por nós — é a
            única maneira de pôr aqui o nome do sítio sem partir o marcador.
            Sem o nome isto eram dois pontos cinzentos iguais, e escolher
            entre dois pontos iguais não é escolher. */}
        {paragens
          // SÓ AS QUE ESTÃO PERTO DO PONTO A QUE PERTENCEM. Ver
          // `ALTERNATIVA_PERTO_M`. Sem o ponto correspondente no ecrã não há
          // com que comparar, e aí mostra-se — não se esconde informação por
          // falta de informação.
          .filter((p) => {
            const dono = pts.find((x) => x.qual === p.qual);
            if (!dono) return true;
            return metrosEntre({ lat: dono.lat, lng: dono.lng }, p) <= ALTERNATIVA_PERTO_M;
          })
          .map((p) => (
            <Marker
              key={`outra-${p.qual}-${p.lat},${p.lng}`}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              // Pela PONTA, como os pinos grandes: é um pino, e um pino
              // aponta com o bico. Centrado, apontaria ao lado.
              anchor={{ x: 0.5, y: ANCORA_Y }}
              zIndex={880}
              image={PEQUENO[p.qual] || PEQUENO.origem}
              title={p.nome || undefined}
              onPress={onEscolherParagem ? () => onEscolherParagem(p) : undefined}
            />
          ))}

        {carroSuave ? (
          <Marker
            coordinate={{ latitude: carroSuave.lat, longitude: carroSuave.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1000}
            image={VEICULO_IMAGEM[veiculoVivo] || VEICULO_IMAGEM.car}
          />
        ) : null}
      </MapView>

      {/* OS NOSSOS LUGARES, escritos no mapa.
          Pequenos e discretos de propósito: são para se lerem quando se
          procura por eles, não para competirem com os nomes do Google. Um
          ponto teal e o nome ao lado, sem caixa branca — a caixa é do ponto
          ESCOLHIDO, e dois desenhos iguais para coisas diferentes fariam
          parecer que já se escolheu o que ainda se está a ver.

          Não se desenha o que já está escolhido: o pino e o cartão dele já
          o dizem, e dizê-lo duas vezes no mesmo sítio é sujidade. */}
      {!aMexer &&
        nossosNoEcra
          .filter(
            (l) =>
              !pts.some((p) => Math.abs(p.lat - l.lat) < 0.0002 && Math.abs(p.lng - l.lng) < 0.0002)
          )
          .map((l) => (
            <View
              key={l.id}
              pointerEvents="none"
              style={[styles.nosso, { left: l.x + 6, top: l.y - 8 }]}
            >
              <View style={styles.nossoPonto} />
              <Text
                style={[styles.nossoNome, satelite && styles.nossoNomeSatelite]}
                numberOfLines={1}
              >
                {l.label}
              </Text>
            </View>
          ))}

      {/* Os cartões dos lugares nossos, desenhados sobre o mapa.
          `pointForCoordinate` devolve o pixel da COORDENADA, que é onde
          assenta a ponta do pino. A cabeça fica 27 pixéis acima, e é a essa
          altura que o cartão se encosta — nunca por cima, que taparia a rua
          por onde se chega.
          Junto à borda direita o cartão passa para a esquerda do pino: fixá-lo
          de um lado deixava-o a sair do ecrã sempre que o ponto ficasse
          encostado a essa borda, e um ponto encostado à borda é o caso normal
          de quem acabou de arrastar o mapa. */}
      {!aMexer &&
        cartoes.map((c) => {
          const aDireita = largura > 0 && c.x > largura * 0.55;
          return (
            <View
              key={`${c.lat},${c.lng}`}
              pointerEvents="none"
              style={[
                styles.cartaoSolto,
                aDireita ? { left: c.x - 16 - CARTAO_L } : { left: c.x + 16 },
                { top: c.y - 46 },
              ]}
            >
              <Cartao nome={c.nome} detalhe={c.detalhe} qual={c.qual} />
            </View>
          );
        })}

      {/* AS ETIQUETAS DOS LOCAIS, de perto.
          Centradas sobre o ponto e ACIMA dele, que é onde o pé e o ponto do
          desenho as põem. Somem enquanto o dedo arrasta, como os cartões:
          uma etiqueta atrasada diz que a recolha é ali, e não é. */}
      {/* A ETIQUETA DO LOCAL, na ESTRADA e só no zoom mais fechado.
          Centrada por cima do ponto, com o pé e a bola a assentar nele — o
          traço aos pontinhos que vem do pino já faz a ligação, e um segundo
          traço a dizer o mesmo era sujidade.
          Some enquanto o dedo arrasta, como tudo o resto que é desenhado por
          cima: uma etiqueta atrasada diz que o carro pára ali, e não pára. */}
      {perto &&
        !aMexer &&
        pinosNoEcra.map((p) => (
          <View
            key={`rotulo-${p.qual}-${p.lat},${p.lng}`}
            pointerEvents="none"
            style={[styles.rotuloSolto, { left: p.x - ROTULO_L / 2, top: p.y - ROTULO_A }]}
          >
            <RotuloLocal
              qual={qualDesenhado(p.qual, modoEscolha)}
              texto={t(ROTULO_CHAVE[qualDesenhado(p.qual, modoEscolha)] || ROTULO_CHAVE.origem)}
            />
          </View>
        ))}

      {/* ONDE O CARRO PÁRA.
          Um ponto na estrada e o rótulo por cima, na ponta da linha aos
          pontinhos. É a pergunta que a pessoa tem quando o pino cai a meio
          de um quarteirão — "então o carro vem cá dentro?" — e que ninguém
          respondia do lado do destino.
          Some enquanto o dedo arrasta, como os cartões: um rótulo atrasado
          diz que o carro pára ali, e não pára. */}

      {/* Só o RÓTULO do veículo fica por cima — o carro é marcador.
          O rótulo tem de continuar aqui porque o texto muda a cada rua, e
          não há imagem que sirva. Esconde-se enquanto o dedo arrasta, como
          os outros cartões: um nome atrasado a flutuar diz que aquela rua é
          a de agora, e não é. O carro, esse, nunca desaparece. */}
      {veiculo && liveLabel && !aMexer ? (
        <View
          pointerEvents="none"
          style={[styles.veiculo, { left: veiculo.x + 24, top: veiculo.y - 17 }]}
        >
          <Cartao nome={liveLabel} qual="origem" agora />
        </View>
      ) : null}

      {/* Em cima à direita, porque o canto de baixo é do botão de expandir
          no MapaExpandivel — e um mapa não pode ter dois botões no mesmo
          sítio conforme o ecrã onde está. */}
      {FERRAMENTAS_DO_GOOGLE || !ferramentas ? null : (
        <Pressable
          style={[styles.botaoMim, aLocalizar && styles.botaoMimOcupado, naColuna(0)]}
          onPress={irParaMim}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('irParaMim')}
        >
          <Mira />
        </Pressable>
      )}

      {/* SEGUIR A BÚSSOLA. Aceso a teal quando está ligado, como no Google:
          é um modo, não uma acção, e um modo tem de se ver que está a
          correr — senão a pessoa não percebe porque é que o mapa "mexe
          sozinho" e não sabe como o parar. */}
      {FERRAMENTAS_DO_GOOGLE || !ferramentas ? null : (
        <Pressable
          style={[styles.botaoSeguir, aSeguirBussola && styles.botaoSeguirActivo, naColuna(2)]}
          onPress={() => setASeguirBussola((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: aSeguirBussola }}
          accessibilityLabel={t('seguirBussola')}
        >
          <Seta />
        </Pressable>
      )}

      {/* O SATÉLITE, E SÓ A ESCOLHER UM PONTO.
          O selector de mapa já existiu e o Simão mandou-o tirar — eram botões
          a mais sem motivo. Este volta com um motivo só, e é forte em Díli:
          grande parte da cidade não tem morada, e as pessoas orientam-se por
          referências. Num bairro sem nomes de rua, um mapa desenhado é um
          emaranhado de linhas iguais; na fotografia, a pessoa reconhece a sua
          própria casa — e é isso que faz o motorista encontrá-la.

          MAS SÓ AQUI, e o número é a razão. O Simão mediu no telemóvel dele:
          8,12 MB em cinco minutos e meio de satélite. São 1,44 MB por minuto,
          87 MB por hora — quase um terço do que a app inteira gastou em nove
          dias, em cinco minutos.

          Um botão em todos os mapas seria uma armadilha: liga-se para
          encontrar uma casa, esquece-se de desligar, e ao fim de um dia de
          serviço o motorista perdeu o pacote de dados sem perceber onde. Aqui
          o modo dura o tempo de apontar, e acaba com ele.

          O SEGUNDO MOMENTO, desde 16/09/2026: com a viagem já definida, antes
          de pedir. É o mesmo propósito — reconhecer o portão ou o telhado, que
          um nome de rua não mostra — e dura o mesmo tempo: o botão desaparece
          quando a viagem sai do ecrã, e o satélite desliga-se com ele.

          Esteve ao pé do logótipo do Google durante umas horas; o Simão viu-o
          e preferiu-o na coluna, com os outros três (16/09/2026).

          Durante a viagem a fotografia não acrescenta nada: vê-se a linha e a
          rua, e o resto só pesa. */}
      {ferramentas && (modoEscolha || mostrarSatelite) ? (
        <Pressable
          style={[
            styles.botaoSatelite,
            satelite && styles.botaoSateliteActivo,
            // Sobe um lugar: com a mira e o «seguir» escondidos, ficava um
            // buraco entre a agulha e ele.
            FERRAMENTAS_DO_GOOGLE && { top: spacing.sm + 104 },
            naColuna(FERRAMENTAS_DO_GOOGLE ? 2 : 3),
          ]}
          onPress={() => setSatelite((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: satelite }}
          accessibilityLabel={t('verSatelite')}
        >
          <Camadas />
        </Pressable>
      ) : null}

      {/* A BÚSSOLA ESTÁ SEMPRE VISÍVEL.
          A primeira versão só a mostrava com o mapa torto, e eu justifiquei
          isso com uma regra que soa bem: um botão permanente para desfazer
          uma coisa que quase nunca se faz só ocupa espaço.
          Estava errado, e a referência que o Simão deu diz o contrário — no
          Google Maps o botão está lá com o mapa direito. Um botão que só
          aparece quando já se sabe que se precisa dele não ensina ninguém
          que existe: quem nunca rodou o mapa nunca descobre que pode.
          A agulha aponta sempre ao norte, e por isso diz duas coisas ao
          mesmo tempo: para onde é o norte, e quanto o mapa está torto. */}
      {!ferramentas ? null : (
        <Pressable
          style={[
            styles.botaoBussola,
            // O botão do Google ocupa o primeiro lugar da coluna e é maior do
            // que os nossos (48 contra 40). A agulha desce oito pontos para
            // não lhe encostar.
            FERRAMENTAS_DO_GOOGLE && { top: spacing.sm + 56 },
            naColuna(1),
          ]}
          onPress={aoNorte}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('voltarAoNorte')}
        >
          <View style={{ transform: [{ rotate: `${-rumo}deg` }] }}>
            <Agulha />
          </View>
        </Pressable>
      )}

      {/* GUIAR ATÉ LÁ, no mapa nativo do telemóvel.
          MAIOR do que as outras ferramentas (52 contra 40) e sozinho em
          baixo, longe da coluna: as outras quatro mexem NESTE mapa, esta
          leva a pessoa para FORA da app. Um comando que muda de aplicação
          não deve parecer-se com os que só mudam a vista. */}
      {ferramentas && navegarPara ? (
        <Pressable
          style={styles.botaoGuiar}
          onPress={() => abrirNoMapa(Linking, navegarPara.lat, navegarPara.lng)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('guiarAteLa')}
        >
          {/* A seta contra-rodada: o BOTÃO é que está em losango, e uma
              seta torta não se lê. */}
          <View style={styles.guiarConteudo}>
            <SetaGuiar />
          </View>
        </Pressable>
      ) : null}

      {/* ── A MIRA ────────────────────────────────────────────────────
          O pino fica FIXO no centro do ecrã e o mapa é que se move por
          baixo.

          A mira usa o componente <Pino>; o marcador usa uma IMAGEM. São
          duas peças diferentes com o mesmo caminho SVG, e é preciso saber
          disso: se a forma mudar num sítio e não no outro, o que se vê ao
          apontar deixa de ser o que fica marcado. As imagens geram-se com
          scripts/desenhar-pinos.py, do mesmo caminho.

          A mira sobe três pixéis enquanto o mapa mexe. É o que dá a sensação
          de que o mapa está a passar por baixo dela, e não o contrário. */}
      {modoEscolha ? (
        <View style={styles.miraCaixa} pointerEvents="none">
          <View style={[styles.mira, aMexer && styles.miraAMexer]}>
            <Pino tipo={modoEscolha === 'destino' ? 'destino' : 'origem'} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    wrap: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#e9e4db',
    },
    fill: { flex: 1, borderRadius: 0, borderWidth: 0 },
    mapa: { flex: 1 },
    fallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    fallbackIcon: { fontSize: 32, marginBottom: spacing.sm },
    fallbackText: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },

    // O cartão do nome. Afastado do pino e subido até à cabeça — ver o
    // comentário na âncora do marcador.
    // LARGURA FIXA, e não `maxWidth`.
    //
    // `maxWidth` diz até onde o cartão PODE crescer; não diz de que tamanho
    // ele É. Numa lista ou num ecrã há sempre um pai que o estica até ao
    // limite — dentro de um marcador não há nada, e ele encolhe até ao
    // mínimo do conteúdo. Com texto que não parte, esse mínimo deu ZERO, e
    // o que se via era só o risco de 3 pixéis da borda esquerda.
    //
    // 150 é o que cabe ao lado do pino num ecrã de telemóvel estreito sem
    // sair pela direita quando o ponto está encostado a essa borda.
    folgaCartao: { width: CARTAO_L + 22, paddingLeft: 22, paddingBottom: 20 },
    cartao: {
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingVertical: 7,
      paddingHorizontal: 12,
      width: CARTAO_L,
      borderLeftWidth: 3,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    // Um risco da cor à esquerda, para se saber qual é a recolha e qual é o
    // destino sem ter de olhar para o pino.
    risco_origem: { borderLeftColor: '#006870' },
    risco_destino: { borderLeftColor: '#F85038' },
    // Sem esta linha, `styles['risco_paragem']` era `undefined` e o cartão
    // saía sem risco — nada rebentava, e a paragem ficava sem cor.
    risco_paragem: { borderLeftColor: '#FF8064' },
    cartaoAgora: { backgroundColor: '#14201D', borderLeftColor: '#FF6B4A' },
    cartaoNome: { fontSize: 12.5, fontWeight: '700', color: '#14201D', letterSpacing: -0.1 },
    cartaoNomeAgora: { color: '#EAF2EF' },
    cartaoDetalhe: { fontSize: 11, color: '#6A7671', marginTop: 1 },
    cartaoDetalheAgora: { color: '#9DB0AA' },

    // O balão sobre a ponta da linha, com o bico a apontar-lhe. Coral, como
    // nas imagens que o Simão mandou: é a cor da acção nesta app, e parar o
    // carro é a acção.

    veiculo: { position: 'absolute', width: CARTAO_L },

    cartaoSolto: { position: 'absolute' },
    nosso: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 150,
    },
    nossoPonto: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.teal,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      marginRight: 4,
    },
    // Um halo branco em vez de caixa: lê-se sobre qualquer fundo do mapa e
    // não tapa as ruas por baixo, que é o que uma caixa faria.
    // SOBRE A FOTOGRAFIA, O CONTRÁRIO. Teal com halo branco lê-se bem sobre um
    // mapa claro e desaparece sobre um telhado escuro. Branco com sombra
    // escura é o que o próprio Google usa nos nomes em cima do satélite, e
    // pela mesma razão: funciona sobre qualquer coisa.
    nossoNomeSatelite: {
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowRadius: 4,
    },
    nossoNome: {
      ...tipo.legenda,
      color: '#0E5C54',
      fontWeight: '700',
      textShadowColor: '#FFFFFF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
      flexShrink: 1,
    },
    botaoMim: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      borderWidth: 3,
      borderColor: TINTA.tealAnel,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    botaoMimOcupado: { opacity: 0.5 },
    botaoSeguir: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm + 96,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      borderWidth: 3,
      borderColor: TINTA.tealAnel,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    // ACENDE EM TINTA E NÃO EM CHEIO (22/09/2026): a figura passou a ser a
    // ilustração a cores, e um fundo teal cheio engolia-a. A tinta mais o
    // contorno dizem o mesmo — o modo está ligado — e deixam-na ver-se.
    botaoSeguirActivo: { backgroundColor: colors.tintaTeal, borderColor: colors.teal },
    // O quarto da coluna: 8 + 48 + 48 + 48.
    botaoSatelite: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm + 144,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      borderWidth: 3,
      borderColor: TINTA.coral,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    botaoSateliteActivo: { backgroundColor: colors.tintaTeal, borderColor: colors.teal },
    botaoBussola: {
      position: 'absolute',
      right: spacing.sm,
      // Por baixo do de voltar a mim: 40 de altura mais um respiro.
      top: spacing.sm + 48,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      borderWidth: 3,
      borderColor: TINTA.coral,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    miraCaixa: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    botaoGuiar: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.xl,
      // UM LOSANGO, e não um círculo (23/09/2026, desenho do Simão). Um
      // quadrado de 40 rodado 45 graus mede 56 na diagonal — fica com a
      // mesma presença do círculo de 52 que substituiu, e distingue-se à
      // vista dos quatro redondos da coluna. A forma diz «isto é outra
      // coisa» antes de o ícone dizer o quê.
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '45deg' }],
      ...elevacao.flutuante,
    },
    guiarConteudo: { transform: [{ rotate: '-45deg' }] },
    rotuloSolto: {
      position: 'absolute',
      width: ROTULO_L,
      height: ROTULO_A,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    rotuloCaixa: { alignItems: 'center' },
    rotuloPastilha: {
      maxWidth: ROTULO_L,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    rotuloTexto: {
      ...tipo.pequeno,
      color: '#FFFFFF',
      fontWeight: '700',
      textAlign: 'center',
    },
    // O pé e o ponto, como no desenho dele: um risco fino e uma bola.
    rotuloPe: { width: 3, height: 10 },
    rotuloPonto: { width: 11, height: 11, borderRadius: 6 },
    mira: { transform: [{ translateY: SUBIR_MIRA }] },
    miraAMexer: { transform: [{ translateY: SUBIR_MIRA_A_MEXER }] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
