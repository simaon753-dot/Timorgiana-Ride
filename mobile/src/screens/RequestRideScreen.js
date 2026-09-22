import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  AppState,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
// O mapa. A SAÍDA DE EMERGÊNCIA DEIXOU DE VIVER AQUI DENTRO.
//
// Havia dois mapas de reserva instalados e nunca usados — o OpenStreetMap por
// WebView e o MapLibre nativo. Nenhum era importado por ecrã nenhum, e mesmo
// assim os dois iam dentro de cada APK: o MapLibre porque estava declarado
// como plugin no app.json, o que compila o motor de mapas nativo inteiro.
//
// Custavam dezenas de megabytes a cada pessoa que instalasse a app, num país
// onde os dados se compram ao megabyte. Uma reserva que ninguém usa e que toda
// a gente paga não é uma reserva; é um imposto.
//
// Continuam no histórico do git, e o mapa próprio continua servido pelo nosso
// servidor. Voltar é recuperar os ficheiros e compilar — um dia de trabalho,
// e só no dia em que for preciso. A interface é a mesma nos dois.
import Mapa from '../components/MapaGoogle.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherLugares from '../components/EscolherLugares.js';
import ParaOutraPessoa from '../components/ParaOutraPessoa.js';
import CargaDoPedido, {
  TIPOS_CARGA_LISTA,
  AJUDAS_CARGA_LISTA,
} from '../components/CargaDoPedido.js';
import Cartao from '../design/Cartao.js';
import { LinhaInfo } from '../design/LinhaMenu.js';
import NomearLugar from '../components/NomearLugar.js';
import SegmentedPicker from '../components/SegmentedPicker.js';
import { ResumoEncomenda } from '../components/Encomenda.js';
import { LUGARES, LUGARES_CARRY } from '../dados/veiculos.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { seguirPosicao } from '../lib/posicao.js';
import { pontoNaEstrada } from '../lib/estrada.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import Icone from '../design/Icone.js';
import { TIPOS_VEICULO, VEICULOS, nomeDoVeiculo, veiculo } from '../dados/tiposDeVeiculo.js';
import BarraEstado from '../design/BarraEstado.js';

// HH:MM na hora do telemóvel, o mesmo formato das etapas da viagem
// (design/EtapasViagem.js). Serve a "Última procura às …".
function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function RequestRideScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { requestRide } = useRides();
  // O sítio que está a ser nomeado, e o nome que a app lhe tinha dado.
  const [aNomear, setANomear] = useState(null);

  // Dois passos, e de propósito.
  //
  // O ícone sozinho não diz para que serve — um "!" ao lado de um nome pode
  // querer dizer muita coisa. A pergunta explica antes de abrir um formulário,
  // e quem tocou por curiosidade sai com um toque.
  //
  // Só quem responder "Corrigir" chega ao formulário do OpenStreetMap.
  const perguntarNome = useCallback(
    (alvo) => {
      Alert.alert(t('lugarPerguntaNome'), `${alvo.ponto.label}\n\n${t('lugarCorrigirExplica')}`, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('lugarCorrigirBotao'), onPress: () => setANomear(alvo) },
      ]);
    },
    [t]
  );

  // A ENCOMENDA (jastip, 20/09/2026) chega feita do ecrã anterior: a lista, o
  // teto, a loja (que é a ORIGEM — é lá que o motorista compra) e onde
  // entregar (o destino). Numa viagem normal isto é tudo nulo e nada muda.
  const encomenda = route?.params?.jastip || null;
  const [origem, setOrigem] = useState(route?.params?.origem || null); // { lat, lng, label }
  // Um destino pode chegar já escolhido — de um lugar guardado ou de um
  // recente no ecrã inicial. Poupa a pesquisa inteira, que numa rede
  // lenta é a parte que custa.
  const [destino, setDestino] = useState(route?.params?.destino || null);
  const [orcamento, setOrcamento] = useState(null);
  const [aCalcular, setACalcular] = useState(false);
  // "PROCURAR OUTRA VEZ", quando não há motorista por perto (16/09/2026).
  // `procuras` conta os toques e entra nas dependências da cotação; `aProcurar`
  // é a roda do próprio botão, para a lista não sair do ecrã; `ultimaProcura`
  // é a hora da última resposta, porque um toque que dá o mesmo resultado
  // parece não ter feito nada.
  const [procuras, setProcuras] = useState(0);
  const [aProcurar, setAProcurar] = useState(false);
  const [ultimaProcura, setUltimaProcura] = useState(null);
  const soProcuraRef = useRef(false);
  // A PROCURA AUTOMÁTICA, de 20 em 20 segundos (16/09/2026). `silenciosaRef`
  // marca a próxima cotação como sem roda; `emCursoRef` impede outra enquanto
  // a anterior não respondeu (numa rede lenta acumulavam-se); `cotacaoRef`
  // numera os pedidos, para só o último poder dizer que acabou.
  const silenciosaRef = useRef(false);
  const emCursoRef = useRef(false);
  const cotacaoRef = useRef(0);
  // O VEÍCULO CHEGA JÁ ESCOLHIDO do primeiro passo, e fica PRÉ-SELECCIONADO —
  // não fechado.
  //
  // O Simão separou o pedido em dois ecrãs: veículo primeiro, destino depois.
  // Seria natural passar a mostrar aqui só o veículo escolhido, e foi a
  // primeira coisa que pensei fazer. Está errado.
  //
  // Os dois preços lado a lado são a informação que faz a decisão: entre a
  // mota e o carro a diferença é mais do dobro, e ninguém sabe qual quer sem
  // ver quanto custa CADA UM para AQUELE destino. Escolher o veículo antes de
  // haver destino é escolher sem preço à frente.
  //
  // Por isso o primeiro passo é uma intenção, não um compromisso: chega aqui
  // já marcado, e a pessoa continua a ver o outro preço e a poder trocar com
  // um toque. Ganha-se o ecrã inicial simples sem perder a comparação.
  // O VEÍCULO ESCOLHIDO NO PRIMEIRO PASSO FECHA A ESCOLHA AQUI.
  //
  // Eu tinha-o deixado apenas PRÉ-MARCADO, com os dois preços à vista, para
  // se poderem comparar. O Simão viu no telemóvel e decidiu ao contrário:
  // quem carregou na mota e pediu uma viagem deve ver só a mota.
  //
  // Tem razão, e a razão é a que eu não vi: dois passos que voltam a
  // perguntar a mesma coisa não são dois passos, são um passo repetido. A
  // escolha estava feita no ecrã anterior; repeti-la aqui dizia à pessoa que
  // a primeira não tinha contado.
  //
  // Quem quiser o outro veículo carrega em voltar — o ecrã do destino mostra
  // qual está escolhido e volta-se ao início com dois toques.
  //
  // `null` E NÃO 'car' quando não vem nenhum: há um caminho que entra aqui
  // sem passar pelo primeiro passo — o motorista que muda para passageiro,
  // pelo Perfil. Esse continua a escolher aqui, como sempre escolheu, e é
  // por isso que a escolha não desapareceu do ecrã, só deixou de aparecer a
  // quem já a fez.
  const veiculoFixo = route?.params?.veiculo || null;
  const [veiculoAtual, setVeiculo] = useState(veiculoFixo || 'car');

  // QUANTOS PEDIDOS DE NOME ESTÃO EM VOO para o destino.
  //
  // PORQUE EXISTE. O Simão escolheu um destino e carregou em "Pedir" antes de
  // o nome do sítio chegar. A viagem foi criada com o rótulo de reserva — as
  // coordenadas cruas, "−8.55044, 125.56155" — e a partir daí não havia como
  // corrigir: o motorista via um par de números em vez do nome do sítio.
  //
  // Não se resolve bloqueando enquanto o rótulo for provisório: há sítios que
  // NÃO TÊM nome, e o rótulo fica provisório para sempre. Bloquear por aí era
  // tornar impossível pedir viagem para uma casa sem morada, que em Díli é a
  // maioria delas.
  //
  // Bloqueia-se enquanto a PERGUNTA está em voo, e só isso. Se o nome chegar,
  // o botão liberta-se com o nome certo; se não chegar nenhum, liberta-se na
  // mesma com as coordenadas. A espera dura o que durar a resposta, e não um
  // tempo inventado por mim.
  const [aNomearDestino, setANomearDestino] = useState(0);

  // Envolve uma pergunta de nome para o destino, contando-a enquanto dura.
  async function comNomeEmVoo(promessa) {
    setANomearDestino((n) => n + 1);
    try {
      return await promessa;
    } finally {
      setANomearDestino((n) => Math.max(0, n - 1));
    }
  }
  const [pessoas, setPessoas] = useState(1);
  // Pedir para outra pessoa. Tudo vazio no caso normal, que é a maioria.
  const [paraOutra, setParaOutra] = useState(false);
  // A carga, só usada quando o veículo não transporta pessoas. Volume e ajuda
  // já nascem escolhidos — são perguntas com resposta habitual, e obrigar a
  // tocar nas três antes de ver o preço é atrito sem informação nova.
  // Um OU MAIS tipos de carga (14/09/26). O primeiro escolhido é o principal
  // — é o que as listas e as estatísticas lêem.
  const [cargaTipos, setCargaTipos] = useState([]);
  const cargaTipo = cargaTipos[0] || null;
  const [cargaVolume, setCargaVolume] = useState('medio');
  const [cargaAjuda, setCargaAjuda] = useState('nenhuma');
  const [cargaNotas, setCargaNotas] = useState('');
  const [cargaOutro, setCargaOutro] = useState('');
  const [cargaDeclarado, setCargaDeclarado] = useState(false);
  const [cargaFotos, setCargaFotos] = useState([]);
  // Paragens pelo caminho, só no Carry. Ver a nota em `paragensActivas`.
  const [cargaDestinos, setCargaDestinos] = useState([]);
  const [aEscolherParagem, setAEscolherParagem] = useState(false);
  // Carry: bens OU pessoas, decidido pelo Simão (13/09/26). Um pedido é uma
  // coisa ou outra; o servidor recebe o modo explícito e não o adivinha.
  const [modoCarry, setModoCarry] = useState(route?.params?.modoCarry || 'bens');
  // Quando o passo "O que pretende transportar?" já escolheu, o fluxo fica
  // fechado: bens e pessoas são dois pedidos diferentes, e trocar aqui a meio
  // voltava a misturar as perguntas de um com as do outro.
  const modoFixo = !!route?.params?.modoCarry;
  const [outroNome, setOutroNome] = useState('');
  const [outroTelefone, setOutroTelefone] = useState('');
  const [outroMenor, setOutroMenor] = useState(false);
  const [outroConsentimento, setOutroConsentimento] = useState(false);
  const [gps, setGps] = useState(false);
  // O erro que o GPS declarou na última leitura. Desenha o círculo no mapa
  // e impede a app de nomear um edifício quando não tem como saber qual é.
  const [precisao, setPrecisao] = useState(null);
  // Espelho da recolha, para o afinar do GPS poder perguntar "isto ainda é
  // o ponto que eu pus?" sem ler estado de dentro de um actualizador.
  // O troço a pé: de onde a pessoa está até ao ponto de recolha na estrada.
  //
  // Guarda AS DUAS PONTAS, e não só a de partida. Assim sabe dizer sozinho se
  // ainda vale: se a recolha deixar de ser a ponta que ele conhece — por um
  // arrasto, uma pesquisa, um toque no mapa — a linha desaparece sem ninguém
  // ter de se lembrar de a apagar em cada um desses sítios.
  //
  // Uma linha que sobrevivesse a uma mudança do ponto diria "vá a pé daqui
  // até ali" apontando para um sítio que já não é o de recolha.
  const [troco, setTroco] = useState(null);
  const [trocoDestino, setTrocoDestino] = useState(null);
  // AS PARAGENS DE CADA PONTA, quando o Simão definiu mais do que uma para o
  // mesmo sítio. Guarda-se a lista inteira e não só as que sobram: a que está
  // posta muda quando se toca noutra, e uma lista completa não precisa de ser
  // remontada de cada vez.
  const [paragensOrigem, setParagensOrigem] = useState(null);
  const [paragensDestino, setParagensDestino] = useState(null);
  // Qual foi o último ponto que já mandámos encostar. Ver o efeito em baixo.
  const encostado = useRef(null);
  const origemRef = useRef(null);
  const destinoRef = useRef(null);
  const [erro, setErro] = useState(null);
  // "Avisar quando houver motorista": null | 'a_pedir' | 'pedido' | 'erro'.
  const [aviso, setAviso] = useState(null);
  const [aPedir, setAPedir] = useState(false);
  const [pesquisa, setPesquisa] = useState(null); // 'origem' | 'destino' | null
  // Escolher no mapa: o pino fica fixo no centro e o mapa move-se por baixo.
  //
  // Substitui o arrastar. Num telemóvel, arrastar um pino é pôr o dedo em
  // cima do sítio exacto que se está a tentar ver — e o polegar tapa
  // precisamente aquilo que se quer acertar. Com o pino no centro, o dedo
  // trabalha longe do alvo e a vista fica livre.
  const [aEscolherNoMapa, setAEscolherNoMapa] = useState(null); // 'origem' | 'destino'
  const [centro, setCentro] = useState(null); // { lat, lng } do meio do mapa
  const [nomeCentro, setNomeCentro] = useState(null);
  // Os sítios com nome à volta do ponto para onde se está a apontar.
  const [pertoDoCentro, setPertoDoCentro] = useState([]);
  // Se dá para ir ao sítio que a mira aponta. `null` = ainda não se sabe, e
  // nesse caso não se diz nada.
  const [coberturaCentro, setCoberturaCentro] = useState(null);
  // ONDE O CARRO PARARIA, mostrado ANTES de a pessoa confirmar o ponto.
  //
  // O pino do meio do mapa diz onde ela está a apontar; não dizia onde o
  // carro consegue chegar. Nos sítios em que os dois coincidem não falta
  // nada — e são os sítios em que isto não interessa. No Cristo Rei, quem
  // aponta o monumento estava a confirmar um ponto sem saber que o carro
  // pára trezentos metros abaixo, e só descobria depois.
  const [paragemCentro, setParagemCentro] = useState(null);
  // O MESMO PARA O DESTINO JÁ ESCOLHIDO, e não só para a mira.
  //
  // O aviso do modo de apontar só existe enquanto se aponta. Um destino
  // escolhido pela pesquisa ou por um toque no mapa não passava por ele: a
  // pessoa via o preço, carregava em Pedir, e só aí o servidor recusava.
  //
  // Descobrir que não há serviço depois de decidir é descobrir tarde de mais.
  const [coberturaDestino, setCoberturaDestino] = useState(null);

  // AS PARAGENS SÓ CONTAM NO CARRY.
  //
  // Trocar de veículo não apaga o que já foi escolhido — apaga-lhe o efeito.
  // Sem isto, quem punha duas paragens e voltava para carro levava-as na
  // cotação: o servidor, vendo paragens, devolve só a opção Carry, e a
  // pessoa ficava sem preço de carro sem perceber porquê.
  const carryPessoas = veiculoAtual === 'carry' && modoCarry === 'pessoas';
  const paragensActivas = veiculo(veiculoAtual).levaPessoas || carryPessoas ? [] : cargaDestinos;

  // A CHAVE É SÓ DE COORDENADAS, e não o objecto inteiro.
  //
  // O nome de um lugar chega DEPOIS das coordenadas (vem do geocodificador).
  // Com o objecto inteiro nas dependências, a chegada do nome refazia a
  // cotação sem nada de relevante ter mudado — uma chamada paga ao Google por
  // cada nome que aterra.
  const chaveParagens = paragensActivas.map((x) => `${x.lat},${x.lng}`).join(';');

  // Assim que houver os dois pontos, o servidor devolve rota, preços e
  // tempo de chegada num só pedido — é ele que fixa o preço.
  useEffect(() => {
    if (!origem || !destino) return setOrcamento(null);
    let cancelado = false;
    // Uma nova procura refaz a cotação SEM tirar a lista do ecrã: só o botão
    // mostra que está a trabalhar. A roda grande fica para a primeira cotação e
    // para quando muda o que se pede. A rota vem da memória do servidor
    // (rotas.js), por isso procurar outra vez não gasta rotas do Google.
    const soProcura = soProcuraRef.current;
    const silenciosa = silenciosaRef.current;
    soProcuraRef.current = false;
    silenciosaRef.current = false;
    // A automática não mostra roda nenhuma: a lista fica, e só muda se a
    // resposta mudar.
    if (soProcura) setAProcurar(true);
    else if (!silenciosa) setACalcular(true);
    const meu = ++cotacaoRef.current;
    emCursoRef.current = true;
    api
      .quote(token, {
        originLat: origem.lat,
        originLng: origem.lng,
        destLat: destino.lat,
        destLng: destino.lng,
        // Os desvios entram na distância, e é dessa distância que sai o preço
        // mostrado no ecrã. Calcular sem eles aqui e com eles no pedido era
        // mostrar um valor e cobrar outro.
        destinos: paragensActivas,
        // QUANTAS PESSOAS VÃO, porque a partir de cinco o quilómetro do carro
        // é outro — só um carro grande as leva, e custa mais ao motorista.
        // Ver a nota em config.js do servidor.
        passengers: pessoas,
        // O MODO E A CARGA TAMBÉM ENTRAM NA COTAÇÃO. O volume e a ajuda iam só
        // no pedido: um Carry "Grande" com ajuda mostrava no ecrã o preço de
        // um pequeno sem ajuda, e era cobrado pelo verdadeiro. Estava assim
        // desde a fase 2 — mostrar um preço e cobrar outro.
        ...(veiculoAtual === 'carry'
          ? {
              carryModo: modoCarry,
              ...(modoCarry === 'bens' ? { cargaVolume, cargaAjuda } : {}),
            }
          : {}),
        // A TAXA DA ENCOMENDA vai na cotação, e não só no pedido. O passageiro
        // compara mota e carro pelos números do ecrã; se a taxa aparecesse só
        // no fim, escolhia por um preço e pagava outro.
        ...(encomenda ? { servico: 'jastip', jastipTeto: encomenda.teto } : {}),
      })
      .then((q) => {
        if (cancelado) return;
        setOrcamento(q);
        setUltimaProcura(new Date());
      })
      // Numa nova procura, manual ou automática, uma falha de rede NÃO apaga o
      // que está no ecrã: fica a última resposta boa, e tenta-se outra vez.
      .catch(() => !cancelado && !soProcura && !silenciosa && setOrcamento(null))
      .finally(() => {
        if (cotacaoRef.current === meu) emCursoRef.current = false;
        if (cancelado) return;
        setACalcular(false);
        setAProcurar(false);
      });
    return () => {
      cancelado = true;
    };
    // `pessoas` ENTRA NAS DEPENDÊNCIAS, e tem de entrar.
    //
    // Sem isto, mudar de 4 para 5 pessoas não refazia a cotação: o ecrã
    // continuava a mostrar o preço de quatro e a viagem nascia com o de
    // cinco. O passageiro aceitava um preço e pagava outro — e o preço do
    // ecrã é o que ele aceitou.
    //
    // `chaveParagens` entra pela MESMA razão que `pessoas`, e o defeito seria
    // idêntico: juntar uma paragem sem refazer a cotação deixava no ecrã o
    // preço do percurso curto, e a viagem nascia com o do percurso longo.
  }, [
    token,
    origem?.lat,
    origem?.lng,
    destino?.lat,
    destino?.lng,
    pessoas,
    chaveParagens,
    veiculoAtual,
    modoCarry,
    cargaVolume,
    cargaAjuda,
    // O botão "Procurar outra vez": cada toque soma um e refaz a cotação.
    procuras,
  ]);

  // A PROCURA AUTOMÁTICA. Os motoristas ligam-se e desligam-se a qualquer
  // momento, e o ecrã mostrava a fotografia da última cotação: um motorista que
  // já se tinha desligado continuava "a 1 min" (visto pelo Simão a 16/09/2026).
  // De 20 em 20 segundos a app volta a perguntar, em silêncio, e o ecrã acerta
  // nos dois sentidos: o que se liga aparece, o que se desliga desaparece.
  //
  // Só com este ecrã à frente e a app aberta. Em segundo plano, ou com outro
  // ecrã por cima, ninguém está a ver, e cada pergunta são dados de quem paga
  // ao megabyte. Pára durante o pedido, e salta a vez se a anterior ainda não
  // respondeu. A rota vem da memória do servidor (rotas.js): não gasta rotas do
  // Google.
  const focado = useIsFocused();
  // As medidas do ecrã, para a pesquisa descer abaixo da barra de estado: ela
  // é uma camada absoluta e não herda o espaço da moldura segura.
  const margensEcra = useSafeAreaInsets();
  const [appAberta, setAppAberta] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => setAppAberta(estado === 'active'));
    return () => sub.remove();
  }, []);
  const procurarSozinha = !!origem && !!destino && !!orcamento && !aPedir && focado && appAberta;
  useEffect(() => {
    if (!procurarSozinha) return;
    const relogio = setInterval(() => {
      if (emCursoRef.current) return;
      silenciosaRef.current = true;
      setProcuras((n) => n + 1);
    }, 20000);
    return () => clearInterval(relogio);
  }, [procurarSozinha]);

  useEffect(() => {
    origemRef.current = origem;
    destinoRef.current = destino;
  }, [origem, destino]);

  const usarLocalizacao = useCallback(async () => {
    setGps(true);
    setErro(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // ALTA PRECISÃO, e não a equilibrada.
      //
      // `Balanced` está documentada como "com erro de cerca de cem metros" —
      // usa antenas e wi-fi antes do satélite, para poupar bateria. Cem
      // metros numa cidade é o edifício ao lado.
      //
      // Foi o que aconteceu ao Simão: estava no Centro de Formação Jurídica e
      // a app pôs o ponto no Tribunal da Primeira Instância, que fica a 93
      // metros. Dentro do erro declarado.
      //
      // Esta é A coordenada mais importante da aplicação — é onde o motorista
      // vai buscar alguém. Uns segundos a mais e um pouco de bateria valem
      // menos do que um carro parado na porta errada.
      // E VÁRIAS LEITURAS, e não uma.
      //
      // A primeira leitura de um GPS é quase sempre a pior — o receptor
      // ainda está a apanhar satélites — e pode declarar-se boa estando a
      // trinta metros. Era isso que punha o pino da app num edifício e o
      // ponto azul do Google Maps noutro, no mesmo instante.
      //
      // A primeira aparece já, para o mapa não ficar parado. As seguintes
      // corrigem-na enquanto o utilizador não lhe tiver tocado.
      const meu = { lat: null, lng: null };

      const marcar = async (pos, primeira) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // SÓ SE MELHORA O QUE FOMOS NÓS A PÔR.
        //
        // Entre a primeira leitura e a seguinte, o utilizador pode ter
        // arrastado o pino ou escolhido outro sítio. Nesse caso ele sabe
        // melhor do que o satélite: quem está lá viu onde está.
        if (!primeira) {
          // COM DESTINO ESCOLHIDO, NÃO SE MEXE MAIS NA RECOLHA.
          //
          // Faltava esta guarda no que publiquei há uma hora. Uma leitura
          // que chegasse depois de o destino estar posto movia o ponto de
          // partida — e com ele a distância, o tempo e o PREÇO, sem
          // ninguém carregar em nada.
          //
          // É a mesma regra que o Simão já tinha pedido para o arrasto:
          // fixados os dois pontos, deixam de mudar sozinhos.
          if (destinoRef.current) return;
          // Lido de um ref e não de dentro do actualizador de estado.
          //
          // A primeira versão decidia "isto ainda é nosso?" DENTRO do
          // `setOrigem`, escrevendo numa variável de fora. Um actualizador
          // pode ser chamado mais do que uma vez pelo React, e um que
          // escreve fora de si deixa de ser previsível — que é o género de
          // coisa que só aparece meses depois e ninguém liga à causa.
          const atual = origemRef.current;
          if (!atual || atual.lat !== meu.lat || atual.lng !== meu.lng) return;
          setOrigem({ lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true });
        } else {
          // Mesma ordem de sempre: o ponto primeiro, o nome quando vier. Ter
          // o mapa centrado onde estamos vale mais do que saber a rua.
          setOrigem({ lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true });
        }
        meu.lat = lat;
        meu.lng = lng;
        // O erro que o próprio GPS declara vai junto: com um erro grande,
        // dar um nome de edifício é escolher à sorte entre os que cabem no
        // círculo.
        setPrecisao(pos.coords.accuracy ?? null);
        const nome = await nomeDoLugar(lat, lng, pos.coords.accuracy, token);
        if (nome) {
          setOrigem((p) =>
            p && p.lat === lat && p.lng === lng ? { ...p, label: nome, provisorio: false } : p
          );
        }
      };

      const melhor = await seguirPosicao({
        onPrimeira: (pos) => marcar(pos, true),
        onMelhor: (pos) => marcar(pos, false),
      });

      // ENCOSTAR À ESTRADA, e só depois de a posição assentar.
      //
      // Um carro não entra num pátio nem a meio de um quarteirão. O
      // motorista chegava à coordenada, não via ninguém, e telefonava.
      //
      // Feito UMA vez e no fim, e não a cada leitura: são chamadas a um
      // serviço gratuito e partilhado, e encostar um ponto que ainda está a
      // mexer daria um pino aos saltos.
      if (!melhor || destinoRef.current) return;
      const aqui = { lat: melhor.coords.latitude, lng: melhor.coords.longitude };
      const naEstrada = await pontoNaEstrada(aqui.lat, aqui.lng, token);
      if (!naEstrada || destinoRef.current) return;
      const atual = origemRef.current;
      // Como no afinar: só se mexe no que fomos nós a pôr.
      if (!atual || atual.lat !== meu.lat || atual.lng !== meu.lng) return;

      setTroco({ de: aqui, para: { lat: naEstrada.lat, lng: naEstrada.lng } });
      setParagensOrigem(naEstrada.paragens || null);
      setOrigem({
        lat: naEstrada.lat,
        lng: naEstrada.lng,
        // De onde veio, para o pino poder ficar lá e o nome poder
        // encontrar-se com ele. Ver `ondeMostrar` e o `mesmo()` do nome.
        escolhido: aqui,
        label: naEstrada.rua || rotuloCoordenadas(naEstrada.lat, naEstrada.lng),
        provisorio: !naEstrada.rua,
      });
      meu.lat = naEstrada.lat;
      meu.lng = naEstrada.lng;
      if (!naEstrada.rua) {
        const nome = await nomeDoLugar(naEstrada.lat, naEstrada.lng, null, token);
        if (nome) {
          setOrigem((pp) =>
            pp && pp.lat === naEstrada.lat && pp.lng === naEstrada.lng
              ? { ...pp, label: nome, provisorio: false }
              : pp
          );
        }
      }
    } catch {
      /* sem GPS — o utilizador pode escolher no mapa */
    } finally {
      setGps(false);
    }
  }, []);

  // Pedir a localização logo à entrada: quase sempre a recolha é onde a
  // pessoa está, e poupa-lhe um toque.
  //
  // NUMA ENCOMENDA NÃO. A origem é a loja escolhida no ecrã anterior, e o
  // satélite não tem nada que a corrigir: quem escolheu o mercado de Taibessi
  // não quer o pino na rua onde está a olhar para o telemóvel.
  useEffect(() => {
    if (encomenda) return;
    usarLocalizacao();
  }, [usarLocalizacao, encomenda]);

  // Alguém arrastou um pino para o sítio certo.
  //
  // Um ponto posto à mão é EXACTO por definição — quem o arrastou está lá e
  // sabe onde está. Por isso o círculo de incerteza desaparece e o nome é
  // pedido sem margem de erro: aqui já se pode dizer o nome do edifício.
  async function arrastouPino({ tipo, lat, lng }) {
    const ponto = { lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true };
    if (tipo === 'destino') setDestino(ponto);
    else {
      setOrigem(ponto);
      setPrecisao(null);
    }
    const nome =
      tipo === 'destino'
        ? await comNomeEmVoo(nomeDoLugar(lat, lng, 0, token))
        : await nomeDoLugar(lat, lng, 0, token);
    if (!nome) return;
    // Bate certo com o ponto TAL COMO FOI ESCOLHIDO, mesmo que ele já tenha
    // sido encostado à estrada entretanto. Ver `escolhido` no efeito de
    // encostar o destino.
    const mesmo = (p) =>
      p &&
      ((p.lat === lat && p.lng === lng) ||
        (p.escolhido && p.escolhido.lat === lat && p.escolhido.lng === lng));
    if (tipo === 'destino')
      setDestino((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
    else setOrigem((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
  }

  // O centro do mapa mudou. Guarda a coordenada já e pergunta o nome depois.
  //
  // O nome é pedido só quando o mapa PARA há 500 ms. Sem essa espera, um
  // arrasto de dois segundos dispararia uma dúzia de perguntas ao Nominatim
  // — que é gratuito, partilhado, e aceita cerca de um pedido por segundo.
  const relogioNome = useRef(null);
  // QUAL É O PEDIDO A VALER. Sem isto, um arrasto durante a espera das
  // respostas deixava duas voltas em voo, e a que chegasse por último
  // escrevia por cima — mesmo sendo a do sítio antigo. O nome errado
  // corrigia-se ao arrastar outra vez; um ponto de paragem errado ficava
  // desenhado no mapa, e isso é uma afirmação sobre onde o carro pára.
  const pedidoCentro = useRef(0);
  function centroMudou({ lat, lng }) {
    setCentro({ lat, lng });
    setNomeCentro(null);
    setParagemCentro(null);
    clearTimeout(relogioNome.current);
    const meu = ++pedidoCentro.current;
    relogioNome.current = setTimeout(async () => {
      // Precisão zero: um ponto posto à mão é exacto por definição — quem o
      // apontou está a olhar para o mapa e viu onde o pôs.
      //
      // Os dois pedidos ao mesmo tempo e não um a seguir ao outro: são
      // independentes, e numa rede de Díli esperar por um para começar o
      // outro duplica o tempo até a lista aparecer.
      const [nome, perto, cobertura, naEstrada] = await Promise.all([
        nomeDoLugar(lat, lng, 0, token),
        api.lugaresPerto(token, lat, lng).catch(() => ({ lugares: [] })),
        // A mesma pergunta que o servidor volta a fazer ao criar a viagem.
        api.cobertura(token, lat, lng).catch(() => null),
        // A MESMA função que encosta o ponto depois de escolhido. De
        // propósito: se a previsão usasse outro caminho, mostrava-se uma
        // coisa e confirmava-se outra, e o dia em que divergissem ninguém
        // saberia qual das duas estava certa.
        pontoNaEstrada(lat, lng, token).catch(() => null),
      ]);
      // Chegou tarde: entretanto o mapa já foi para outro sítio.
      if (meu !== pedidoCentro.current) return;
      setNomeCentro(nome || rotuloCoordenadas(lat, lng));
      setPertoDoCentro(perto?.lugares || []);
      // Sem resposta fica `null` e não se diz nada. Um aviso que pisca a cada
      // arrasto por causa da rede é pior do que aviso nenhum.
      setCoberturaCentro(cobertura ? !!cobertura.ok : null);
      setParagemCentro(naEstrada || null);
    }, 500);
  }

  function confirmarEscolha() {
    if (!centro) return;
    const ponto = {
      lat: centro.lat,
      lng: centro.lng,
      label: nomeCentro || rotuloCoordenadas(centro.lat, centro.lng),
      provisorio: !nomeCentro,
    };
    if (aEscolherNoMapa === 'origem') {
      setOrigem(ponto);
      setPrecisao(null); // posto à mão: a incerteza do GPS deixa de valer
    } else {
      setDestino(ponto);
    }
    setAEscolherNoMapa(null);
    setCentro(null);
    setNomeCentro(null);
    setPertoDoCentro([]);
  }

  // Escolheu um dos sítios com nome da lista.
  //
  // Fica com o NOME e as COORDENADAS desse sítio, e não com o ponto para onde
  // o mapa estava a apontar. É essa a diferença: quem toca em "Hotel Timor"
  // quer o Hotel Timor, e não um ponto a doze metros da porta dele.
  function escolherDaLista(l) {
    // Esta lista vem toda da tabela `lugares_propostos` — é por definição
    // gente nossa. Ver a nota em `aoEscolherDaPesquisa`.
    const ponto = {
      lat: l.lat,
      lng: l.lng,
      label: l.label,
      provisorio: false,
      fonte: 'nosso',
      desenhar: l.desenhar === true,
    };
    if (aEscolherNoMapa === 'origem') {
      setOrigem(ponto);
      setPrecisao(null);
    } else {
      setDestino(ponto);
    }
    setAEscolherNoMapa(null);
    setCentro(null);
    setNomeCentro(null);
    setPertoDoCentro([]);
  }

  async function escolherNoMapa({ lat, lng }) {
    // A coordenada já se sabe no instante do toque; o NOME é que demora.
    // Antes esperava-se pelo nome antes de marcar o ponto, e numa rede
    // lenta tocava-se no mapa e não acontecia nada durante segundos — a
    // pessoa tocava outra vez, e outra. Agora o pino aparece já, com a
    // coordenada por rótulo, e o nome entra quando chegar.
    const ponto = { lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true };

    // Com a pesquisa aberta, o campo que a abriu decide — a pessoa disse
    // explicitamente qual queria. Só sem pesquisa é que adivinhamos:
    // primeiro toque é a recolha, o seguinte é o destino.
    // Guarda-se QUAL dos dois este toque definiu: só o destino conta para a
    // espera do nome, e daqui para baixo as duas hipóteses seguem o mesmo
    // caminho.
    let ehDestino = false;
    if (pesquisa === 'origem') {
      setOrigem(ponto);
      setPesquisa(null);
    } else if (pesquisa === 'destino') {
      setDestino(ponto);
      setPesquisa(null);
      ehDestino = true;
    } else if (!origem) {
      setOrigem(ponto);
    } else if (!destino) {
      setDestino(ponto);
      ehDestino = true;
    } else {
      // VIAGEM DEFINIDA: o toque no mapa deixa de mudar seja o que for.
      //
      // Fixar só o arrasto não chegava, e este caminho era o pior dos dois.
      // Com recolha e destino postos, um toque solto no mapa caía aqui e
      // SUBSTITUÍA O DESTINO — a distância mudava, a tarifa mudava, e nada
      // no ecrã perguntava se era mesmo aquilo que se queria.
      //
      // Quem quiser mudar toca na recolha ou no destino e procura outra vez.
      // A linha por baixo dos dois campos di-lo, e está à vista no momento
      // exacto em que a dúvida aparece.
      return;
    }

    // O nome chega depois e substitui o rótulo — mas só se o ponto ainda
    // for este. Sem essa verificação, um nome lento de um toque antigo
    // sobrescrevia um ponto que a pessoa entretanto já tinha mudado.
    const nome = ehDestino
      ? await comNomeEmVoo(nomeDoLugar(lat, lng, null, token))
      : await nomeDoLugar(lat, lng, null, token);
    if (!nome) return;
    // Bate certo com o ponto TAL COMO FOI ESCOLHIDO, mesmo que ele já tenha
    // sido encostado à estrada entretanto. Ver `escolhido` no efeito de
    // encostar o destino.
    const mesmo = (p) =>
      p &&
      ((p.lat === lat && p.lng === lng) ||
        (p.escolhido && p.escolhido.lat === lat && p.escolhido.lng === lng));
    setOrigem((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
    setDestino((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
  }

  // A pesquisa flutua por cima do mapa, que nunca é desmontado. O campo
  // que a abriu decide o que a escolha define — recolha ou destino.
  function aoEscolherDaPesquisa(lugar) {
    // A FONTE VIAJA COM O PONTO. Serve para o mapa saber se deve escrever o
    // nome ao lado do pino: os lugares que os passageiros baptizaram não
    // estão desenhados no Google, e sem o cartão o pino fica anónimo. Os
    // outros já têm o nome escrito no próprio mapa.
    const ponto = {
      lat: lugar.lat,
      lng: lugar.lng,
      label: lugar.label,
      fonte: lugar.fonte,
      desenhar: lugar.desenhar === true,
    };
    if (pesquisa === 'origem') setOrigem(ponto);
    else setDestino(ponto);
    setPesquisa(null);
  }

  async function pedir() {
    setErro(null);
    if (!origem || !destino) return setErro(t('needBothPoints'));
    setAPedir(true);
    try {
      const criada = await requestRide({
        destLabel: destino.label,
        destLat: destino.lat,
        destLng: destino.lng,
        originLabel: origem.label,
        originLat: origem.lat,
        originLng: origem.lng,
        vehicleType: veiculoAtual,
        ...(veiculo(veiculoAtual).perguntaLugares || carryPessoas ? { passengers: pessoas } : {}),
        ...(veiculoAtual === 'carry' ? { carryModo: modoCarry } : {}),
        ...(!veiculo(veiculoAtual).levaPessoas && !carryPessoas && cargaTipo
          ? {
              cargaTipo,
              cargaTipos,
              cargaVolume,
              cargaAjuda,
              cargaNotas: cargaNotas.trim(),
              cargaOutro: cargaOutro.trim(),
              cargaDeclarada: cargaDeclarado,
              // O servidor volta a filtrar: só aceita paragens no Carry, e só
              // duas. Mandar daqui o que já está filtrado aqui é cinto e
              // suspensórios de propósito — um telemóvel modificado manda o
              // que quiser, e o preço é calculado do lado de lá.
              destinos: paragensActivas,
            }
          : {}),
        ...(encomenda
          ? {
              servico: 'jastip',
              jastip: {
                itens: encomenda.itens,
                loja: encomenda.loja,
                teto: encomenda.teto,
              },
            }
          : {}),
        ...(paraOutra
          ? {
              viajanteNome: outroNome.trim(),
              viajanteTelefone: outroTelefone.trim(),
              viajanteMenor: outroMenor,
              consentimentoMenor: outroMenor ? outroConsentimento : undefined,
            }
          : {}),
      });
      // AS FOTOGRAFIAS SOBEM AGORA, e o erro delas é engolido de propósito.
      //
      // Só há `id` depois da viagem existir — a chave estrangeira obriga a
      // esta ordem. E a ordem traz um risco que não havia: chegado aqui, a
      // VIAGEM JÁ FOI PEDIDA. Se eu mostrasse um erro de envio, a pessoa
      // carregava outra vez em "pedir" e ficavam duas viagens à procura de
      // motorista — um estrago muito maior do que o que se estava a evitar.
      //
      // Uma a uma e não em paralelo: são três no máximo, e três envios ao
      // mesmo tempo numa rede de Díli acabam a falhar os três.
      // As da ENCOMENDA sobem pelo mesmo caminho, e é a mesma porta de
      // propósito: são fotografias de quem pede, desta viagem, e apagam-se com
      // o mesmo prazo. Um segundo armazém seria a mesma coisa escrita duas
      // vezes.
      const fotosASubir = encomenda ? encomenda.fotos || [] : carryPessoas ? [] : cargaFotos;
      if (criada?.id && fotosASubir.length) {
        for (const f of fotosASubir) {
          try {
            await api.enviarFotoDaCarga(token, criada.id, {
              mime: 'image/jpeg',
              base64: f.base64,
            });
          } catch {
            // De propósito: ver a nota acima. A viagem seguiu.
          }
        }
      }

      // VOLTA AO INÍCIO, e não um passo atrás.
      //
      // Era `goBack()`, e chegava enquanto a pilha tinha dois ecrãs: Início e
      // Pedir viagem. Um passo atrás dava no Início, que é onde a viagem a
      // decorrer se mostra.
      //
      // Ao separar o pedido em dois passos, a pilha passou a ter três — o
      // "Para onde vai?" entrou pelo meio — e o mesmo `goBack()` passou a cair
      // aí. Quem pedia uma viagem via o ecrã de escolher destino, como se o
      // pedido não tivesse acontecido; só carregando outra vez em voltar é que
      // aparecia "à procura de motorista".
      //
      // `navigate` e não `popToTop()`: o que queremos é chegar ao Início, e
      // dizê-lo pelo nome sobrevive a alguém acrescentar um ecrã antes dele.
      // `popToTop` leva ao primeiro da pilha, seja ele qual for.
      navigation.navigate('Tabs');
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAPedir(false);
    }
  }

  // O CARTÃO SÓ APARECE NO QUE O GOOGLE NÃO CONHECE.
  //
  // A primeira regra era "só nos lugares nossos", e não chegava: o Hotel
  // Timor e a CRA Timor são nossos E estão no Google. O cartão aparecia por
  // cima do nome que o Google já escrevia, e o Simão viu o mesmo nome duas
  // vezes no mesmo sítio.
  //
  // A pergunta certa não é de quem é o nome — é se ele acrescenta alguma
  // coisa. A "Kios Mana Rita" acrescenta, porque não está em mais lado
  // nenhum. O Hotel Timor não.
  //
  // Quem responde é o servidor, que pergunta ao Google uma vez quando o
  // lugar é aprovado e guarda a resposta.
  // Perguntado sempre que o destino muda, venha ele de onde vier.
  useEffect(() => {
    if (!destino || !token) {
      setCoberturaDestino(null);
      return undefined;
    }
    let vivo = true;
    setCoberturaDestino(null);
    api
      .cobertura(token, destino.lat, destino.lng)
      .then((r) => vivo && setCoberturaDestino(r ? !!r.ok : null))
      .catch(() => vivo && setCoberturaDestino(null));
    return () => {
      vivo = false;
    };
  }, [destino?.lat, destino?.lng, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ENCOSTAR O DESTINO À ESTRADA.
  //
  // Feito num efeito e não em cada `setDestino` porque há nove sítios onde o
  // destino se escolhe — pesquisa, mapa, recentes, casa, trabalho, lugares
  // nossos. Nove cópias da mesma regra divergem; uma só, não pode.
  //
  // O RÓTULO NÃO MUDA. Quem escreveu "Praia Cristo Rei" vai para a Praia
  // Cristo Rei — o que muda é a coordenada para onde o carro conduz, que
  // passa a ser a beira da estrada. O nome é da pessoa; a coordenada é do
  // carro.
  useEffect(() => {
    if (!destino?.lat) {
      setTrocoDestino(null);
      setParagensDestino(null);
      encostado.current = null;
      return undefined;
    }
    const chave = `${destino.lat},${destino.lng}`;
    // Já tratámos este ponto — ou é ele o RESULTADO de o termos tratado.
    // Sem esta guarda, encostar mudava o destino, o que voltava a chamar
    // isto, que encostava outra vez: um ciclo sem fim.
    if (encostado.current === chave) return undefined;
    encostado.current = chave;

    let vivo = true;
    const escolhido = { lat: destino.lat, lng: destino.lng };
    pontoNaEstrada(escolhido.lat, escolhido.lng, token)
      .then((na) => {
        if (!vivo || !na) return;
        encostado.current = `${na.lat},${na.lng}`;
        setTrocoDestino({ de: escolhido, para: { lat: na.lat, lng: na.lng } });
        setParagensDestino(na.paragens || null);
        setDestino((d) =>
          d && d.lat === escolhido.lat && d.lng === escolhido.lng
            ? // `escolhido` FICA GUARDADO no ponto, e não é enfeite.
              //
              // O nome do sítio chega do geocodificador segundos depois, e
              // quem o recebe confirma que o ponto ainda é o mesmo comparando
              // COORDENADAS. Ao encostar à estrada eu mudo-as — e o nome, ao
              // chegar, deixava de bater certo e era deitado fora. O destino
              // ficava a mostrar "-8.52285, 125.60982".
              //
              // Guardando aqui de onde este ponto veio, o nome volta a
              // encontrar-se com ele.
              {
                ...d,
                lat: na.lat,
                lng: na.lng,
                escolhido,
                // O NOME DA RUA SERVE DE REDE, e estávamos a deitá-lo fora.
                //
                // Quem encosta o ponto à estrada já sabe o nome dessa estrada
                // — vem na mesma resposta. A recolha usava-o há muito; o
                // destino não, e por isso um sítio que o geocodificador não
                // conhece — uma encosta, um caminho de terra — ficava a
                // mostrar "-8.51956, 125.60763" para sempre.
                //
                // Só substitui enquanto o rótulo for PROVISÓRIO. Um nome a
                // sério, escrito pela pessoa ou vindo da pesquisa, não se
                // troca por uma rua.
                ...(d.provisorio && na.rua ? { label: na.rua, provisorio: false } : {}),
              }
            : d
        );
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [destino?.lat, destino?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const trocoAPe =
    troco && origem && origem.lat === troco.para.lat && origem.lng === troco.para.lng
      ? troco
      : null;

  // OS DOIS TROÇOS, o da recolha e o da largada.
  //
  // O da largada não existia. Quem pedia para um sítio no meio de um
  // quarteirão — uma casa, uma escola, um mercado — via o pino lá dentro e
  // não fazia ideia de onde é que o carro o ia deixar. O motorista sabia; o
  // passageiro não. É a mesma pergunta que o troço da recolha já respondia
  // do outro lado da viagem.
  const trocosAPe = [];
  if (trocoAPe) trocosAPe.push({ ...trocoAPe, qual: 'origem' });
  if (trocoDestino) trocosAPe.push({ ...trocoDestino, qual: 'destino' });

  // A PREVISÃO, enquanto se escolhe no mapa e antes de confirmar.
  //
  // Entra na MESMA lista dos troços a pé, e não num desenho próprio. O que
  // se quer mostrar é exactamente aquilo: o círculo na estrada e os pontinhos
  // do pino até lá. Um desenho paralelo ficaria parecido hoje e diferente
  // daqui a três meses, quando alguém mexesse num e não no outro.
  //
  // O `qual` é 'centro' e não 'origem'/'destino' porque este ponto ainda não
  // é nenhum dos dois — é o que qualquer deles VAI SER se a pessoa confirmar.
  if (aEscolherNoMapa && centro && paragemCentro) {
    trocosAPe.push({
      de: centro,
      para: { lat: paragemCentro.lat, lng: paragemCentro.lng },
      qual: 'centro',
    });
  }

  // AS OUTRAS PARAGENS: as da lista que não são a que está posta.
  //
  // A que está posta já está desenhada — é o círculo escuro no fim do troço a
  // pé. Desenhá-la outra vez por baixo, a cinzento, punha dois marcadores na
  // mesma coordenada e o de cima tapava o de baixo sem nada mudar aos olhos,
  // a não ser um toque que escolhia o que já estava escolhido.
  const outrasParagens = [];
  const juntarOutras = (lista, ponto, qual) => {
    if (!lista || !ponto) return;
    for (const pa of lista) {
      if (pa.lat === ponto.lat && pa.lng === ponto.lng) continue;
      outrasParagens.push({ ...pa, qual });
    }
  };
  juntarOutras(paragensOrigem, origem, 'origem');
  juntarOutras(paragensDestino, destino, 'destino');

  // TOCAR NUMA DAS OUTRAS passa o carro a parar ali.
  //
  // O que muda é só a COORDENADA para onde o carro conduz. O rótulo fica —
  // quem escreveu "Cristo Rei" continua a ir ao Cristo Rei — e o pino fica
  // onde a pessoa apontou, porque `escolhido` vai no espalhar. É a mesma
  // separação de sempre: o nome e o pino são da pessoa, a coordenada é do
  // carro.
  //
  // O troço a pé é refeito com ela, senão os pontinhos continuavam a apontar
  // para a paragem antiga e o mapa dizia duas coisas ao mesmo tempo.
  //
  // Muda o preço, e tem de mudar: outra paragem é outro caminho. A cotação
  // recalcula-se sozinha porque depende das coordenadas.
  const escolherParagem = (pa) => {
    if (!pa) return;
    if (pa.qual === 'origem') {
      setTroco((t) => (t ? { ...t, para: { lat: pa.lat, lng: pa.lng } } : t));
      setOrigem((o) => (o ? { ...o, lat: pa.lat, lng: pa.lng } : o));
      return;
    }
    // A GUARDA ANTES DE MUDAR, e não depois.
    //
    // Mudar o destino acorda o efeito que encosta pontos à estrada. Ele veria
    // uma coordenada que ainda não tratou, perguntaria ao servidor qual é a
    // paragem que a cobre — e a resposta seria a mais próxima, ou seja a que
    // acabámos de trocar. O toque desfazia-se sozinho.
    encostado.current = `${pa.lat},${pa.lng}`;
    setTrocoDestino((t) => (t ? { ...t, para: { lat: pa.lat, lng: pa.lng } } : t));
    setDestino((d) => (d ? { ...d, lat: pa.lat, lng: pa.lng } : d));
  };

  // O PINO FICA ONDE A PESSOA APONTOU. O ponto na estrada é que é do carro.
  //
  // Antes o pino saltava para a beira da estrada, porque é lá que o carro
  // encosta e era essa a coordenada guardada. Mas quem aponta uma casa quer
  // ver o pino NA CASA — ver o pino saltar para a avenida diz que se apontou
  // mal, quando não se apontou.
  //
  // São duas informações diferentes e passam a ter dois desenhos: o pino diz
  // "é aqui que eu quero ir", o ponto diz "é aqui que o carro pára", e os
  // pontinhos entre eles são o caminho a pé.
  //
  // A coordenada que vai no pedido continua a ser a da estrada — é para lá
  // que o motorista conduz. Isto muda o que se VÊ, não o que se envia.
  // A COORDENADA VAI INTEIRA; o sítio do pino vai à parte.
  //
  // `lat`/`lng` são sempre as da estrada — é com elas que se calcula a rota
  // e o preço, e é para lá que o motorista conduz. `pino` diz só onde
  // DESENHAR o pino, que é onde a pessoa apontou.
  //
  // Na versão anterior mandei o ponto escolhido como coordenada do marcador,
  // e a rota passou a ser calculada de dentro de um quarteirão para dentro de
  // outro. Duas informações diferentes no mesmo campo.
  const marcadores = [];
  if (origem)
    marcadores.push({
      lat: origem.lat,
      lng: origem.lng,
      pino: origem.escolhido || null,
      label: origem.label,
      tipo: 'origem',
      cartao: origem.desenhar === true,
    });
  // Pela ordem do percurso: recolha, paragens, entrega. É a ordem por que o
  // motorista lê o mapa de cima para baixo.
  for (const pa of paragensActivas)
    marcadores.push({
      lat: pa.lat,
      lng: pa.lng,
      label: pa.label,
      tipo: 'paragem',
      cartao: false,
    });
  if (destino)
    marcadores.push({
      lat: destino.lat,
      lng: destino.lng,
      pino: destino.escolhido || null,
      label: destino.label,
      tipo: 'destino',
      cartao: destino.desenhar === true,
    });

  // `veiculoAtual` e não `veiculo`: este último passou a ser a FUNÇÃO que lê
  // a tabela dos tipos. Comparado com ela, `o.type === veiculo` nunca é
  // verdade — e não rebenta: devolve `undefined` e o preço desaparece do
  // botão, em silêncio. Nenhum verificador apanha isto; apanhou-o uma busca
  // às sobras da renomeação.
  const opcao = orcamento?.options?.find((o) => o.type === veiculoAtual);

  // Pedir depende de haver DOIS PONTOS, não de haver preço.
  //
  // Antes o botão exigia a cotação. Mas `pedir()` não envia preço nenhum
  // — quem o calcula é o servidor, ao criar a viagem. A cotação só serve
  // para mostrar o valor antes de confirmar. Numa rede lenta, uma
  // cotação que não chegava bloqueava por completo a funcionalidade
  // principal da aplicação, por causa de um número que é apenas
  // informativo.
  // O BOTÃO SÓ ACENDE COM O PEDIDO COMPLETO.
  //
  // O servidor recusa na mesma — é ele quem manda, e um telemóvel
  // modificado manda o que quiser. Mas deixar o botão aceso para depois
  // devolver um erro é fazer a pessoa carregar para descobrir o que lhe
  // falta. O ecrã já sabe.
  const outroCompleto =
    !paraOutra ||
    (!!outroNome.trim() && !!outroTelefone.trim() && (!outroMenor || outroConsentimento));
  // Uma viagem de bens precisa de duas respostas que uma de pessoas não tem:
  // o que é a carga, e a declaração de que é legal e cabe. Sem elas o botão
  // não avança — a declaração não é um aviso que se ignora.
  const cargaCompleta =
    veiculo(veiculoAtual).levaPessoas ||
    carryPessoas ||
    // "Outro" obriga a dizer o quê: o motorista não decide sobre "Outro".
    (!!cargaTipo && cargaDeclarado && (!cargaTipos.includes('outros') || !!cargaOutro.trim()));

  // A VERDADE SOBRE A DISPONIBILIDADE, para o botão e para o aviso.
  const semMotorista = !!opcao && !opcao.available;
  // Texto escuro sobre o coral, como no resto da app: branco fica a 2,8:1.
  const corBotao = colors.text;
  const precoTexto = opcao ? `$${opcao.fareUsd.toFixed(2)}` : null;

  async function pedirAviso() {
    if (!origem) return;
    setAviso('a_pedir');
    try {
      await api.pedirAviso(token, {
        vehicleType: veiculoAtual,
        originLat: origem.lat,
        originLng: origem.lng,
        cargaVolume: !veiculo(veiculoAtual).levaPessoas && !carryPessoas ? cargaVolume : null,
      });
      setAviso('pedido');
    } catch {
      setAviso('erro');
    }
  }

  const podePedir =
    !!origem &&
    !!destino &&
    !aPedir &&
    aNomearDestino === 0 &&
    outroCompleto &&
    cargaCompleta &&
    coberturaDestino !== false;

  const rotuloBotao = !(origem && destino)
    ? t('whereTo')
    : opcao
      ? semMotorista
        ? t('procurarMotoristaPreco', { preco: precoTexto })
        : veiculo(veiculoAtual).chaveBotaoPedir
          ? t(veiculo(veiculoAtual).chaveBotaoPedir, { preco: precoTexto })
          : `${t('confirmRide')} ${precoTexto}`
      : podePedir
        ? `${t('confirmRide')} · ${t('fareToAgree')}`
        : t('whereTo');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />

      {/* Mapa a ocupar o espaço todo até ao painel. Nunca é desmontado:
          além de manter o contexto visual durante a pesquisa, remontá-lo
          obrigaria o WebView a recarregar o Leaflet e a perder o zoom. */}
      <View style={styles.mapa}>
        {/* OS PINOS SÓ SE ARRASTAM ENQUANTO A VIAGEM NÃO ESTIVER DEFINIDA.
            Com recolha e destino postos, um arrasto sem querer — um dedo a
            passar no mapa para o mover — mudava o ponto e, com ele, a
            distância e a tarifa. Sem aviso nenhum, porque arrastar não
            pergunta nada.
            Para mudar, toca-se na recolha ou no destino e procura-se outra
            vez. É um gesto deliberado, e é essa a diferença. */}
        <Mapa
          pickable
          fill
          // O HALO À VOLTA DA RECOLHA, quando o telemóvel se declara pouco
          // certo.
          //
          // A CONDIÇÃO É A MESMA do aviso de texto que já existe logo abaixo
          // («arrastar o pino · ±N m»), e de propósito: são a mesma
          // informação dita de duas maneiras, e duas condições diferentes
          // para a mesma coisa acabariam por divergir — um dia o texto
          // aparecia sem o círculo, ou ao contrário, e ninguém saberia qual
          // dos dois estava certo.
          incerteza={
            origem && !origem.provisorio && precisao > 15
              ? { lat: origem.lat, lng: origem.lng, metros: precisao }
              : null
          }
          // COM O PAINEL ESCONDIDO o mapa é o ecrã inteiro, e o topo é da
          // pesquisa e das sugestões, que tapavam a coluna de botões. Aí a
          // coluna vai para o meio, na lateral direita (Simão, 16/09/2026).
          // Com o painel à vista, fica no canto de cima, como sempre.
          botoesAoMeio={!!(pesquisa || aEscolherNoMapa || aEscolherParagem)}
          trocosAPe={trocosAPe}
          paragens={outrasParagens}
          onEscolherParagem={escolherParagem}
          // A LINHA VEM DA COTAÇÃO, que é quem calculou o preço.
          //
          // Sem isto o mapa pedia a rota por sua conta e ficavam duas: uma que
          // determinou o preço e outra desenhada por cima. Podiam divergir, e
          // numa discussão sobre a tarifa não haveria como mostrar por onde é
          // que o preço passou.
          linhaDaRota={orcamento?.linha || null}
          markers={marcadores}
          onPick={escolherNoMapa}
          arrastavel={!aEscolherNoMapa && !(origem && destino)}
          onArrastar={arrastouPino}
          modoEscolha={aEscolherNoMapa}
          // O SATÉLITE PARA CONFIRMAR, depois de a recolha e o destino
          // estarem postos: na fotografia reconhece-se o portão ou o
          // telhado, que um nome de rua não mostra. Só aqui, e não a
          // pesquisar nem a apontar — nesses o mapa já tem o seu botão.
          mostrarSatelite={
            !!origem && !!destino && !aEscolherNoMapa && !pesquisa && !aEscolherParagem
          }
          onCentro={centroMudou}
        />
        {!pesquisa && !aEscolherNoMapa ? (
          <Pressable
            style={styles.voltar}
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Icone nome="voltar" tamanho={22} cor={colors.teal} traco={2.4} />
          </Pressable>
        ) : null}
        {orcamento && !pesquisa && !aEscolherNoMapa ? (
          <View style={styles.rotaBadge}>
            <Icone nome="relogio" tamanho={18} cor={colors.onTeal} />
            <Text style={styles.rotaTexto}>
              {t('tripInfo', { km: orcamento.distanceKm, min: orcamento.durationMin })}
              {orcamento.approximate ? ` · ${t('priceApprox')}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* A BARRA DE ESCOLHA substitui a folha de baixo enquanto se aponta.
          Ocupa o mesmo sítio de propósito: o que está em causa naquele
          momento é uma coisa só, e ter a folha por baixo com os dois campos
          convidava a tocar noutra coisa a meio do gesto. */}
      {aEscolherNoMapa ? (
        <View style={styles.barraEscolha}>
          <Text style={styles.barraRotulo}>
            {aEscolherNoMapa === 'origem' ? t('pickupPoint') : t('dropoffPoint')}
          </Text>
          <Text style={styles.barraNome} numberOfLines={2}>
            {nomeCentro || (centro ? t('aVerNome') : t('gettingLocation'))}
          </Text>
          {/* OS SÍTIOS COM NOME À VOLTA.
              Apontar devolve uma rua; esta lista devolve um sítio. É a
              diferença entre "Rua de Caicoli" e "Hotel Timor — entrada
              lateral", e é o que faz o motorista parar à porta certa.
              Vem da camada que os passageiros vão baptizando: cada nome que
              alguém escreve aparece aqui à pessoa seguinte. */}
          {pertoDoCentro.length ? (
            <View style={styles.pertoLista}>
              {pertoDoCentro.slice(0, 4).map((l) => (
                <Pressable key={l.id} style={styles.pertoItem} onPress={() => escolherDaLista(l)}>
                  <Text style={styles.pertoIcone}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pertoNome} numberOfLines={1}>
                      {l.label}
                    </Text>
                    {l.detalhe ? (
                      <Text style={styles.pertoDetalhe} numberOfLines={1}>
                        {l.detalhe}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.pertoMetros}>{l.metros} m</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {/* O AVISO APARECE ANTES DE ESCOLHER, e não depois.
              Saber que não há serviço depois de confirmar é saber tarde de
              mais: a pessoa já decidiu, já contou com a viagem, e a recusa
              chega como uma avaria. Aqui é uma informação. */}
          {coberturaCentro === false ? (
            <View style={styles.semServico}>
              <Text style={styles.semServicoTexto}>{t('semServico')}</Text>
              <Text style={styles.semServicoNota}>{t('semServicoNota')}</Text>
            </View>
          ) : null}
          <Pressable
            style={[
              styles.botao,
              { marginTop: spacing.sm },
              coberturaCentro === false && styles.botaoInativo,
            ]}
            onPress={confirmarEscolha}
            disabled={!centro || coberturaCentro === false}
          >
            <Text style={styles.botaoTexto}>
              {aEscolherNoMapa === 'origem' ? t('escolherEstaRecolha') : t('escolherEsteDestino')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAEscolherNoMapa(null);
              setCentro(null);
              setNomeCentro(null);
              setPertoDoCentro([]);
            }}
            hitSlop={8}
            style={{ alignSelf: 'center', marginTop: spacing.sm }}
          >
            <Text style={styles.barraCancelar}>{t('cancel')}</Text>
          </Pressable>
        </View>
      ) : aEscolherParagem ? (
        /* A SEGUNDA PESQUISA, e não um terceiro alvo na primeira.
           O ecrã já tem uma máquina que decide entre recolha e destino: o
           toque no mapa, o arrasto do pino, a pesquisa aberta por um dos dois
           campos. Ela ramifica em `'origem' | 'destino'` em quatro sítios, e
           recusa-se a mudar seja o que for depois de ambos postos — o que foi
           a correcção de um defeito real, em que um toque solto substituía o
           destino e mudava a tarifa sem ninguém perguntar nada.
           Montar uma instância própria custa estas dez linhas e não toca em
           nenhum desses quatro sítios. Estendê-la tocaria nos quatro.
           SEM `onEscolherNoMapa`, de propósito: o componente protege a prop
           com `&&` e a linha não aparece. Uma paragem é uma morada — diz-se
           pelo nome, não apontando ao mapa por cima de uma viagem já
           definida. */
        <PlaceSearch
          margemTopo={margensEcra.top}
          placeholder={t('paragemAdicionar')}
          onEscolher={(lugar) => {
            setCargaDestinos((lista) =>
              [...lista, { label: lugar.label, lat: lugar.lat, lng: lugar.lng }].slice(0, 2)
            );
            setAEscolherParagem(false);
          }}
          onFechar={() => setAEscolherParagem(false)}
        />
      ) : pesquisa ? (
        <PlaceSearch
          margemTopo={margensEcra.top}
          placeholder={t('searchPlaceholder')}
          onEscolher={aoEscolherDaPesquisa}
          onFechar={() => setPesquisa(null)}
          onEscolherNoMapa={() => {
            // Quem abriu a pesquisa já disse QUAL dos dois campos quer. Passa
            // essa escolha ao mapa em vez de a voltar a perguntar.
            setAEscolherNoMapa(pesquisa);
            setPesquisa(null);
          }}
          rotuloMapa={t('escolherNoMapa')}
          onUsarLocalizacao={
            pesquisa === 'origem'
              ? () => {
                  setPesquisa(null);
                  usarLocalizacao();
                }
              : undefined
          }
        />
      ) : null}

      {/* Painel inferior */}
      {/* A folha esconde-se TAMBÉM enquanto se aponta no mapa.
          Escondia-se só com a pesquisa aberta. Ao apontar, ficavam as duas
          coisas no ecrã ao mesmo tempo — a barra de escolha e a folha
          inteira com os dois campos, o veículo, os lugares e o botão de
          pedir. O mapa era espremido entre elas.
          Notava-se sobretudo no destino, porque nessa altura a folha já tem
          tudo preenchido e é muito mais alta do que quando se marca a
          recolha: a barra ficava fora de alcance.
          O comentário lá em cima já dizia que a barra "substitui a folha".
          Dizia-o e não era verdade. */}
      <View
        style={[
          styles.painel,
          (pesquisa || aEscolherNoMapa || aEscolherParagem) && styles.escondido,
        ]}
      >
        <View style={styles.puxador} />
        {/* O indicador de deslize é mostrado de propósito. Escondido, o
            painel cortava a meio — a pergunta "quantas pessoas?" ficava
            visível e as respostas por baixo da dobra, sem nada a dizer
            que havia mais. Parecia avariado, e não estava. */}
        <ScrollView>
          {/* O TÍTULO DA FOLHA diz em que passo se está: enquanto falta um
              ponto, a pergunta; com os dois postos, "confirme" — a partir
              daqui já não se escolhe o percurso, verifica-se. */}
          <Text style={styles.folhaTitulo}>
            {origem && destino ? t('confirmaTitulo') : t('whereTo')}
          </Text>
          {origem && destino ? <Text style={styles.folhaSub}>{t('confirmaSub')}</Text> : null}
          {/* SEM MOTORISTAS POR PERTO, dito ANTES de pedir e não depois.
              Um botão "Pedir por $3.25" com ninguém por perto promete o que o
              sistema não pode cumprir. Aqui diz-se a verdade — o preço é o
              estimado, e o pedido fica aberto alguns minutos para o primeiro que
              aceitar — e o botão passa a dizer "Procurar motorista".

              DENTRO DA LISTA e não no rodapé fixo (16/09/2026). No rodapé,
              cada linha do cartão era tirada à lista, e com o botão de procurar
              os detalhes da viagem ficaram numa tira fina. O rodapé fica só com
              as duas acções. */}
          {semMotorista && podePedir ? (
            <View style={styles.semMotoristaAviso}>
              <Icone nome="info" tamanho={22} cor={colors.coralDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.semMotoristaTitulo}>{t('semMotoristaTitulo')}</Text>
                <Text style={styles.semMotoristaTexto}>
                  {t('semMotoristaTexto', {
                    preco: `$${opcao.fareUsd.toFixed(2)}`,
                    // O número vem do servidor (`MINUTOS_ATE_DESISTIR`), que é
                    // quem fecha o pedido. Escrito à mão aqui, uma mudança lá
                    // deixava esta frase a prometer um prazo que já não existe.
                    min: orcamento.minutosAteDesistir ?? 5,
                  })}
                </Text>
                {/* PROCURAR OUTRA VEZ, com a hora da última resposta na mesma
                    linha. A app já pergunta sozinha de 20 em 20 segundos (ver a
                    procura automática); o botão é para quem quer saber já. */}
                <View style={styles.procurarLinha}>
                  <Pressable
                    style={({ pressed }) => [styles.procurarOutraVez, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      soProcuraRef.current = true;
                      setProcuras((n) => n + 1);
                    }}
                    disabled={aProcurar}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityState={{ busy: aProcurar }}
                  >
                    {aProcurar ? (
                      <ActivityIndicator size="small" color={colors.coralDark} />
                    ) : (
                      <Icone nome="atualizar" tamanho={18} cor={colors.coralDark} />
                    )}
                    <Text style={styles.procurarOutraVezTexto}>
                      {aProcurar ? t('aProcurarMotoristas') : t('procurarOutraVez')}
                    </Text>
                  </Pressable>
                  {ultimaProcura ? (
                    <View
                      style={styles.horaProcura}
                      accessible
                      accessibilityLabel={t('ultimaProcura', { hora: hhmm(ultimaProcura) })}
                    >
                      <Icone nome="relogio" tamanho={14} cor={colors.textMuted} />
                      <Text style={styles.ultimaProcura}>{hhmm(ultimaProcura)}</Text>
                    </View>
                  ) : null}
                </View>
                {/* DIZER QUE A APP TAMBÉM PROCURA SOZINHA. Sem isto, quem vê o
                    botão pensa que só há motorista se ele carregar — e fica a
                    carregar, ou desiste. Com a frase, o botão passa a ser o
                    atalho de quem não quer esperar (Simão, 16/09/2026). */}
                <Text style={styles.procuraAutomatica}>{t('procuraAutomatica')}</Text>
              </View>
            </View>
          ) : null}

          {/* RECOLHA E DESTINO NUM CARTÃO, como na referência: são as duas
              pontas de uma coisa só, e lidas juntas. O ! aparece nos dois
              campos — quem está PARADO num sítio é quem melhor sabe como ele
              se chama, por isso a recolha é, das duas, a melhor fonte. */}
          <View style={styles.rotaCartao}>
            <Ponto
              cor={colors.teal}
              rotulo={t('pickupPoint')}
              valor={origem?.label}
              vazio={gps ? t('gettingLocation') : t('useMyLocation')}
              onPress={() => setPesquisa('origem')}
              onCorrigir={
                origem && !origem.provisorio
                  ? () => perguntarNome({ ponto: origem, qual: 'origem' })
                  : undefined
              }
            />
            <View style={styles.linha} />
            <Ponto
              cor={colors.coral}
              rotulo={t('dropoffPoint')}
              valor={destino?.label}
              vazio={t('searchOrTap')}
              onPress={() => setPesquisa('destino')}
              onCorrigir={
                destino && !destino.provisorio
                  ? () => perguntarNome({ ponto: destino, qual: 'destino' })
                  : undefined
              }
            />
          </View>
          {/* A dica, por baixo do cartão: o nome a caminho, os pontos
              fixados, ou — SÓ enquanto o ponto vier do GPS — o convite a
              arrastar com o erro em metros, que explica porque é que o pino
              não está exactamente na porta. */}
          {aNomearDestino > 0 ? (
            // ENQUANTO O NOME VEM A CAMINHO. O botão de pedir fica à espera, e
            // um botão que não responde sem dizer porquê parece avariado.
            <Text style={styles.dicaArrastar}>{t('aObterNome')}</Text>
          ) : origem && destino ? (
            // Fixados. Dizê-lo evita o pior caso: alguém tentar arrastar,
            // não conseguir, e concluir que a app está avariada.
            <Text style={styles.dicaArrastar}>{t('pontosFixados')}</Text>
          ) : origem && !origem.provisorio && precisao > 15 ? (
            <Text style={styles.dicaArrastar}>
              {t('arrastarPino')} · ±{Math.round(precisao)} m
            </Text>
          ) : null}

          {aCalcular ? (
            <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.lg }} />
          ) : orcamento ? (
            <>
              {/* O título muda com o número de opções: "Escolha o veículo"
                  em cima de uma lista de um é uma instrução que não se pode
                  cumprir. */}
              <Text style={styles.seccao}>{t(veiculoFixo ? 'seuVeiculo' : 'chooseVehicle')}</Text>
              {orcamento.options
                .filter((o) => !veiculoFixo || o.type === veiculoFixo)
                .map((o) => (
                  <CartaoVeiculo
                    key={o.type}
                    opcao={o}
                    ativo={veiculoAtual === o.type}
                    // Sem toque quando é o único: um cartão que responde ao
                    // dedo e não muda nada ensina que os toques não contam.
                    onPress={veiculoFixo ? undefined : () => setVeiculo(o.type)}
                    t={t}
                  />
                ))}
              {/* OS TRÊS NÚMEROS DA REFERÊNCIA: tempo, distância, e o que o
                  veículo leva — pessoas, ou o tamanho da carga no Carry de
                  bens. O preço já está no cartão do veículo, ao lado do nome. */}
              <Estatisticas
                t={t}
                min={orcamento.durationMin}
                km={orcamento.distanceKm}
                terceiro={
                  veiculo(veiculoAtual).levaPessoas || carryPessoas
                    ? {
                        icone: 'pessoa',
                        valor: t('nPessoas', { n: pessoas }),
                        rotulo: t('capacidadeRotulo'),
                      }
                    : {
                        icone: 'caixa',
                        valor: t(CHAVE_VOLUME[cargaVolume] || 'cargaVolMedio'),
                        rotulo: t('tamanhoRotulo'),
                      }
                }
              />
              {/* Taxas de entrada, logo a seguir à escolha do veículo.
                  Aqui e não antes, porque no Timor Plaza só o carro paga —
                  o aviso muda conforme o que se escolhe. */}
              <TaxasDeEntrada taxas={orcamento.taxasDeEntrada} tipoVeiculo={veiculoAtual} t={t} />

              {/* O QUE FOI ENCOMENDADO, à vista enquanto se escolhe o veículo.
                  A taxa mostrada é a que o servidor devolveu com a cotação
                  (`taxaJastip`) e não a que o ecrã anterior previu: quem cobra
                  é o servidor, e duas contas paralelas acabam a discordar. */}
              {encomenda ? (
                <ResumoEncomenda
                  itens={encomenda.itens}
                  loja={encomenda.loja}
                  teto={encomenda.teto}
                  taxa={orcamento.taxaJastip}
                  onAlterar={() => navigation.goBack()}
                />
              ) : null}

              {/* Só em carro: numa motorizada vai sempre uma pessoa, e
                  perguntar seria fazer perder tempo com uma resposta que
                  já se sabe. */}
              {/* SÓ A QUEM TRANSPORTA PESSOAS.
                  Era `veiculo === 'car'`. Com o Carry a pergunta deixa de
                  fazer sentido: quem manda uma máquina de lavar não vai lá
                  dentro. A condição passa a ler-se da tabela dos tipos, e o
                  quarto tipo não obriga a voltar aqui. */}
              {veiculo(veiculoAtual).perguntaLugares ? (
                <>
                  <Text style={styles.seccao}>{t('howManyPeople')}</Text>
                  <EscolherLugares opcoes={LUGARES} valor={pessoas} onEscolher={setPessoas} />
                  <View style={{ height: spacing.md }} />
                </>
              ) : null}

              <Pagamento t={t} />
            </>
          ) : origem && destino ? (
            // Sem cotação — a rede não respondeu. A viagem continua a
            // poder ser pedida; o preço combina-se com o motorista, que é
            // o que já acontece quando o servidor não consegue calcular.
            <>
              <Text style={styles.seccao}>{t(veiculoFixo ? 'seuVeiculo' : 'chooseVehicle')}</Text>
              {veiculoFixo ? (
                <View style={styles.veiculoFixo}>
                  <View style={styles.veiculoFixoFotoCaixa}>
                    <Image
                      source={
                        veiculo(veiculoFixo).imagens[paletaEmUso()] ||
                        veiculo(veiculoFixo).imagens.claro
                      }
                      style={styles.veiculoFixoFoto}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.veiculoFixoTexto}>{nomeDoVeiculo(t, veiculoFixo)}</Text>
                </View>
              ) : (
                <SegmentedPicker
                  value={veiculoAtual}
                  onChange={setVeiculo}
                  options={TIPOS_VEICULO.map((id) => ({
                    value: id,
                    label: t(VEICULOS[id].chaveNome),
                    icon: VEICULOS[id].emoji,
                  }))}
                />
              )}
              {/* SÓ A QUEM TRANSPORTA PESSOAS.
                  Era `veiculo === 'car'`. Com o Carry a pergunta deixa de
                  fazer sentido: quem manda uma máquina de lavar não vai lá
                  dentro. A condição passa a ler-se da tabela dos tipos, e o
                  quarto tipo não obriga a voltar aqui. */}
              {veiculo(veiculoAtual).perguntaLugares ? (
                <>
                  <Text style={styles.seccao}>{t('howManyPeople')}</Text>
                  <EscolherLugares opcoes={LUGARES} valor={pessoas} onEscolher={setPessoas} />
                  <View style={{ height: spacing.md }} />
                </>
              ) : null}
              <Pagamento t={t} />
            </>
          ) : null}

          {/* Aqui e não dentro dos dois ramos acima: a pergunta é a mesma
              haja cotação ou não, e repetida nos dois divergiria ao primeiro
              descuido. */}
          {/* CARRY: BENS OU PESSOAS. Com pessoas, pergunta quantas (até 15) e
              não mostra carga, fotografias nem paragens — um pedido é uma
              coisa ou outra. Uma condição só, com o comentário cá fora. */}
          {origem && destino && veiculoAtual === 'carry' ? (
            <View>
              {modoFixo ? null : (
                <>
                  <Text style={styles.seccao}>{t('carryModoTitulo')}</Text>
                  <SegmentedPicker
                    options={[
                      { value: 'bens', icon: '📦', label: t('carryModoBens') },
                      { value: 'pessoas', icon: '👥', label: t('carryModoPessoas') },
                    ]}
                    value={modoCarry}
                    onChange={setModoCarry}
                  />
                </>
              )}
              {carryPessoas ? (
                <>
                  <Text style={styles.seccao}>{t('howManyPeople')}</Text>
                  <EscolherLugares opcoes={LUGARES_CARRY} valor={pessoas} onEscolher={setPessoas} />
                </>
              ) : null}
            </View>
          ) : null}

          {/* AS PERGUNTAS DA CARGA, e só quando o veículo não leva pessoas.
              Aqui e não dentro dos ramos da cotação, pela mesma razão do
              bloco abaixo: a pergunta é a mesma haja preço calculado ou não,
              e repetida nos dois divergiria ao primeiro descuido. */}
          {origem && destino && !veiculo(veiculoAtual).levaPessoas && !carryPessoas ? (
            <CargaDoPedido
              carga={cargaTipos}
              onCarga={(id) =>
                setCargaTipos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
              }
              volume={cargaVolume}
              onVolume={setCargaVolume}
              ajuda={cargaAjuda}
              onAjuda={setCargaAjuda}
              notas={cargaNotas}
              onNotas={setCargaNotas}
              outro={cargaOutro}
              onOutro={setCargaOutro}
              declarado={cargaDeclarado}
              onDeclarado={setCargaDeclarado}
              fotos={cargaFotos}
              onFotos={setCargaFotos}
              paragens={cargaDestinos}
              onRemoverParagem={(i) => setCargaDestinos((lista) => lista.filter((_, j) => j !== i))}
              onAdicionarParagem={() => setAEscolherParagem(true)}
            />
          ) : null}

          {/* O RESUMO ANTES DE PEDIR, só no Carry de bens: é o pedido com mais
              respostas, e a última coisa antes do botão tem de ser tudo o que
              se vai pedir, lido de uma vez — incluindo o que ainda falta. */}
          {origem && destino && !veiculo(veiculoAtual).levaPessoas && !carryPessoas ? (
            <ResumoCarry
              t={t}
              origem={origem}
              destino={destino}
              tipos={cargaTipos}
              volume={cargaVolume}
              ajuda={cargaAjuda}
              paragens={cargaDestinos.length}
              fotos={cargaFotos.length}
              preco={precoTexto}
              declarado={cargaDeclarado}
            />
          ) : null}

          {/* Só quando há alguém a viajar. Para bens, "quem recebe" é outra
              coisa — nome e telefone de quem recebe a entrega — e entra com o
              resto do ecrã do Carry, na fase seguinte.

              UMA condição, e não duas encaixadas: dentro dos parênteses de um
              ternário não cabe um `{ }` — nem um comentário nem outro
              ternário. É a terceira vez hoje que caio neste mesmo sítio. */}
          {origem && destino && veiculo(veiculoAtual).levaPessoas ? (
            <ParaOutraPessoa
              activo={paraOutra}
              onActivo={setParaOutra}
              nome={outroNome}
              onNome={setOutroNome}
              telefone={outroTelefone}
              onTelefone={setOutroTelefone}
              menor={outroMenor}
              onMenor={setOutroMenor}
              consentimento={outroConsentimento}
              onConsentimento={setOutroConsentimento}
            />
          ) : null}

          {/* O aviso do destino, onde quer que ele tenha sido escolhido.
              Fica aqui em cima e não junto ao botão: quem lê isto ainda pode
              tocar no destino e escolher outro, que é a acção que resolve. */}
          {coberturaDestino === false ? (
            <View style={styles.semServico}>
              <Text style={styles.semServicoTexto}>{t('semServico')}</Text>
              <Text style={styles.semServicoNota}>{t('semServicoNota')}</Text>
            </View>
          ) : null}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        </ScrollView>

        {/* AVISAR QUANDO HOUVER MOTORISTA (14/09/26): em vez de pedir às cegas,
            fica um aviso de duas horas. Quando aparecer um motorista adequado
            perto, chega uma notificação — e a pessoa volta e pede com o preço à
            frente. */}
        {semMotorista && podePedir ? (
          <Pressable
            style={({ pressed }) => [styles.avisarBotao, pressed && { opacity: 0.8 }]}
            onPress={pedirAviso}
            disabled={aviso === 'a_pedir' || aviso === 'pedido'}
            accessibilityRole="button"
          >
            <Icone nome={aviso === 'pedido' ? 'visto' : 'sino'} tamanho={20} cor={colors.teal} />
            <Text style={styles.avisarTexto}>
              {aviso === 'pedido'
                ? t('avisoPedidoOk')
                : aviso === 'erro'
                  ? t('avisoErro')
                  : t('avisarQuando')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.botaoPedir, !podePedir && styles.botaoInativo]}
          onPress={pedir}
          disabled={!podePedir}
          accessibilityRole="button"
          accessibilityState={{ disabled: !podePedir }}
        >
          {aPedir ? (
            <ActivityIndicator color={corBotao} />
          ) : (
            <>
              <Icone nome={veiculo(veiculoAtual).icone} tamanho={24} cor={corBotao} />
              <Text style={[styles.botaoPedirTexto, { color: corBotao }]} numberOfLines={1}>
                {rotuloBotao}
              </Text>
              <Icone nome="seta" tamanho={22} cor={corBotao} traco={2.5} />
            </>
          )}
        </Pressable>
        <View style={styles.seguro}>
          <Icone nome="escudo" tamanho={16} cor={colors.textMuted} />
          <Text style={styles.seguroTexto}>{t('viagemSegura')}</Text>
        </View>
      </View>

      {/* Dar nome a um sítio.
          Guarda a correcção no servidor E muda o rótulo aqui. As duas coisas
          porque servem fins diferentes: o rótulo é para esta viagem, a
          correcção é para o mapa de toda a gente. */}
      <NomearLugar
        alvo={aNomear}
        onFechar={() => setANomear(null)}
        onGuardar={async (nome, tipo, morada) => {
          const p = aNomear.ponto;
          setANomear(null);
          if (aNomear.qual === 'destino') setDestino({ ...p, label: nome });
          else setOrigem({ ...p, label: nome });
          try {
            await api.proporLugar(token, {
              nome,
              nomeMapa: p.label,
              lat: p.lat,
              lng: p.lng,
              tipo,
              ...morada,
            });
          } catch {
            // Se falhar, não se diz nada. A viagem dele não depende disto, e
            // um erro sobre uma contribuição ao mapa no meio de um pedido de
            // transporte é ruído no pior momento.
          }
        }}
      />
    </SafeAreaView>
  );
}

function Ponto({ cor, rotulo, valor, vazio, onPress, onCorrigir }) {
  return (
    <Pressable style={styles.ponto} onPress={onPress}>
      <View style={[styles.bolinha, { borderColor: cor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pontoRotulo}>{rotulo}</Text>
        {/* SELECCIONÁVEL, para as coordenadas se poderem copiar.
            Quando um sítio não tem nome, este campo mostra as coordenadas — e
            é delas que se precisa para definir uma paragem no painel. Sem
            isto, a única forma de as passar para o painel era escrevê-las à
            mão a olhar para o ecrã, com dez algarismos e um sinal de menos
            que não perdoa engano.
            Uma pressão longa selecciona e o Android oferece "copiar". Não
            leva biblioteca nenhuma: é uma propriedade do próprio texto. */}
        <Text style={[styles.pontoValor, !valor && styles.pontoVazio]} numberOfLines={1} selectable>
          {valor || vazio}
        </Text>
      </View>

      {/* O ! ao lado do nome, e não uma frase por baixo. Cinzento e não
          vermelho — a razão está na folha de estilo, em `avisoNome`.
          A frase ocupava uma linha em cada campo e empurrava tudo para
          baixo — duas linhas de texto para uma coisa que quase ninguém
          usa. O ícone diz o mesmo num canto: há aqui uma dúvida, toca se
          quiseres.
          `stopPropagation` porque a linha inteira já abre a pesquisa: sem
          isso, tocar no ! abria a pesquisa em vez do aviso. */}
      {onCorrigir ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onCorrigir();
          }}
          hitSlop={12}
          style={styles.avisoNome}
        >
          <Text style={styles.avisoNomeTexto}>!</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function CartaoVeiculo({ opcao, ativo, onPress, t }) {
  const nome = nomeDoVeiculo(t, opcao.type);
  const v = veiculo(opcao.type);
  return (
    <Pressable
      style={[styles.veiculo, ativo && styles.veiculoAtivo]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* A ilustração do tipo, num quadrado da cor do fundo DELA — ver
          SISTEMA.md. É a mesma do ecrã inicial: a pessoa reconhece o que
          escolheu há dois ecrãs. */}
      <View style={styles.veiculoFotoCaixa}>
        <Image
          source={v.imagens[paletaEmUso()] || v.imagens.claro}
          style={styles.veiculoFoto}
          resizeMode="contain"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.veiculoNome}>{nome}</Text>
        <Text style={[styles.veiculoEta, !opcao.available && styles.veiculoEtaSem]}>
          {opcao.available ? t('motoristaAMin', { min: opcao.etaMin }) : t('noDriverNearby')}
        </Text>
      </View>
      <Text style={styles.veiculoPreco}>${opcao.fareUsd.toFixed(2)}</Text>
    </Pressable>
  );
}

// Os três números por baixo do veículo: tempo, distância e capacidade.
function Estatisticas({ t, min, km, terceiro }) {
  const itens = [
    { icone: 'relogio', valor: min != null ? `${min} min` : '—', rotulo: t('tempuEstimadu') },
    { icone: 'rota', valor: km != null ? `${km} km` : '—', rotulo: t('distancia') },
    terceiro,
  ];
  return (
    <View style={styles.estatisticas}>
      {itens.map((i) => (
        <View key={i.icone} style={styles.estatistica}>
          <Icone nome={i.icone} tamanho={22} cor={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={styles.estatValor} numberOfLines={1}>
              {i.valor}
            </Text>
            <Text style={styles.estatRotulo} numberOfLines={1}>
              {i.rotulo}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// O pagamento: dinheiro, ao motorista. É a única forma que existe, e dizê-lo
// com o "a quem" evita a pergunta à porta do carro.
function Pagamento({ t }) {
  return (
    <View style={styles.pagamento}>
      <Icone nome="dinheiro" tamanho={26} cor={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pagamentoTexto}>{t('payCash')}</Text>
        <Text style={styles.pagamentoNota}>{t('pagarMotorista')}</Text>
      </View>
    </View>
  );
}

// O resumo do pedido de Carry: tudo o que vai ser pedido, numa lista.
function ResumoCarry({
  t,
  origem,
  destino,
  tipos,
  volume,
  ajuda,
  paragens,
  fotos,
  preco,
  declarado,
}) {
  const nomes = tipos.map((x) => t(CHAVE_TIPO[x] || 'cargaOutros')).join(', ');
  return (
    <View style={styles.resumo}>
      <Cartao icone="documento" titulo={t('resumoTitulo')} lista>
        <LinhaInfo icone="pin" rotulo={t('pickupPoint')} valor={origem?.label} />
        <LinhaInfo icone="pin" rotulo={t('dropoffPoint')} valor={destino?.label} />
        <LinhaInfo
          icone="carry"
          rotulo={t('resumoServico')}
          valor={`${t('vehicleCarry')} · ${t('carryModoBens')}`}
        />
        <LinhaInfo icone="caixa" rotulo={t('resumoCarga')} valor={nomes || '—'} mau={!nomes} />
        <LinhaInfo
          icone="grafico"
          rotulo={t('resumoTamanho')}
          valor={t(CHAVE_VOLUME[volume] || 'cargaVolMedio')}
        />
        <LinhaInfo
          icone="pessoa"
          rotulo={t('resumoAssistencia')}
          valor={t(CHAVE_AJUDA[ajuda] || 'cargaAjudaNenhuma')}
        />
        <LinhaInfo icone="rota" rotulo={t('resumoParagens')} valor={String(paragens)} />
        <LinhaInfo icone="camera" rotulo={t('resumoFotos')} valor={String(fotos)} />
        <LinhaInfo
          icone="carteira"
          rotulo={t('resumoPreco')}
          valor={preco || t('fareToAgree')}
          forte
        />
        <LinhaInfo
          icone="escudo"
          rotulo={t('resumoSeguranca')}
          valor={declarado ? t('resumoConfirmado') : t('resumoPorConfirmar')}
          mau={!declarado}
          ultimo
        />
      </Cartao>
    </View>
  );
}

const CHAVE_TIPO = Object.fromEntries(TIPOS_CARGA_LISTA.map((o) => [o.id, o.chave]));
const CHAVE_AJUDA = Object.fromEntries(AJUDAS_CARGA_LISTA.map((o) => [o.id, o.chave]));

const CHAVE_VOLUME = {
  pequeno: 'cargaVolPequeno',
  medio: 'cargaVolMedio',
  grande: 'cargaVolGrande',
};

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    mapa: { flex: 1, position: 'relative' },
    // display:none em vez de não renderizar: mantém o painel montado, para
    // o veículo escolhido e o orçamento não se perderem ao abrir a pesquisa.
    escondido: { display: 'none' },
    voltar: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 3,
    },
    rotaBadge: {
      position: 'absolute',
      top: spacing.md,
      alignSelf: 'center',
      backgroundColor: colors.teal,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rotaTexto: { ...tipo.corpoForte, fontSize: 16, color: colors.onTeal },
    folhaTitulo: { ...tipo.displayPequeno, color: colors.text },
    folhaSub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    rotaCartao: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginTop: spacing.md,
    },

    barraEscolha: {
      backgroundColor: colors.paper,

      borderTopLeftRadius: radius.xl,

      borderTopRightRadius: radius.xl,

      paddingHorizontal: spacing.lg,

      paddingTop: spacing.md,

      paddingBottom: spacing.lg,
    },

    barraRotulo: { ...tipo.etiqueta, color: colors.textMuted },

    barraNome: { ...tipo.subtitulo, color: colors.text, marginTop: 2, minHeight: 46 },

    barraCancelar: { ...tipo.corpo, color: colors.textMuted },

    pertoLista: { marginTop: spacing.sm, gap: 2 },

    pertoItem: {
      flexDirection: 'row',

      alignItems: 'center',

      paddingVertical: spacing.sm,

      gap: spacing.sm,
    },

    pertoIcone: { fontSize: 15 },

    pertoNome: { ...tipo.corpoForte, color: colors.text },

    pertoDetalhe: { ...tipo.legenda, color: colors.textMuted },

    pertoMetros: { ...tipo.legenda, color: colors.textMuted },

    painel: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      maxHeight: '62%',
    },
    puxador: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    ponto: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
    bolinha: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 3.5,
      backgroundColor: colors.white,
      marginRight: spacing.md,
    },
    pontoRotulo: { ...tipo.etiqueta, color: colors.textMuted },
    pontoValor: { ...tipo.subtitulo, color: colors.text },
    pontoVazio: { color: colors.textMuted, fontWeight: '400' },
    linha: { height: 1, backgroundColor: colors.border, marginLeft: 26 },
    dicaArrastar: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },

    // O veículo já escolhido, quando não há nada a escolher. Cartão calmo

    // e não botão: é informação, não uma pergunta.

    veiculoFixo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,

      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,

      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },

    // A mesma moldura do ecrã inicial, em pequeno. Ver PassengerHomeScreen.
    veiculoFixoFotoCaixa: {
      width: 56,
      height: 42,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    veiculoFixoFoto: { width: 56, height: 42 },
    // corpoForte e não corpo + fontWeight '700': pedir negrito a uma família
    // que não o tem faz o Android cair numa letra de substituição — foi a
    // letra "manuscrita" do Motorizada na captura do Simão (13/09/26).
    veiculoFixoTexto: { ...tipo.corpoForte, color: colors.teal },

    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    veiculo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.sm,
      paddingRight: spacing.md,
      marginBottom: spacing.sm,
    },
    veiculoAtivo: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    // A imagem num quadrado da cor do fundo DELA (branco/preto): as cores
    // são as dos ficheiros e não do tema — ver SISTEMA.md.
    veiculoFotoCaixa: {
      width: 84,
      height: 60,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    veiculoFoto: { width: 84, height: 60 },
    veiculoNome: { ...tipo.subtitulo, color: colors.text },
    veiculoEta: { ...tipo.pequeno, color: colors.teal, marginTop: 1 },
    veiculoEtaSem: { color: colors.coralDark },
    veiculoPreco: { ...tipo.titulo, fontSize: 24, color: colors.teal },
    estatisticas: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    estatistica: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.paper,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    estatValor: { ...tipo.corpoForte, color: colors.text },
    estatRotulo: { ...tipo.legenda, fontSize: 11, color: colors.textMuted },

    pagamento: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
    },
    pagamentoTexto: { ...tipo.corpoForte, color: colors.text },
    pagamentoNota: { ...tipo.legenda, color: colors.textMuted },

    // O "!" ao lado do nome.
    //
    // Vermelho por dentro, aro branco por fora. O aro não é enfeite: sem ele o
    // ícone desaparecia sobre o fundo claro do painel no tema claro, e sobre o
    // preto no tema escuro. Assim lê-se nos dois.
    // CINZENTO, e já foi vermelho.
    //
    // Estava com `colors.danger` — a mesma cor com que a app assinala erros.
    // E isto não é um erro: é um convite a corrigir o nome de um sítio, para
    // quem quiser e souber. Nada está mal quando ele aparece.
    //
    // Ninguém deu por isso em meses de uso, e há uma razão: DENTRO da app
    // toca-se. Toca-se uma vez, percebe-se o que é, e nunca mais engana.
    // O mal-entendido desfaz-se sozinho em dois segundos.
    //
    // Quem apanhou o defeito foi a primeira captura de ecrã para a loja. Uma
    // imagem tira exactamente essa saída — fica o vermelho sem a hipótese de
    // lhe tocar, que é a condição de quem ainda não instalou nada e está a
    // decidir se vale a pena. E aí dois círculos vermelhos ao lado da recolha
    // e do destino dizem o que o vermelho sempre disse.
    //
    // As cores são as fichas do tema e não valores à mão, por isso serve os
    // dois: `textMuted` sobre `white` (a SUPERFÍCIE, escura de noite) dá o
    // anel sempre igual ao cartão por trás, e o `!` sempre com contraste
    // suficiente — 4,77:1 de dia, 5,22:1 de noite.
    //
    // E isto CORRIGE UMA FALHA que ninguém tinha visto: o vermelho de noite
    // (#FF5252 com o ! branco) dava 3,19:1, abaixo do mínimo de 4,5:1. De
    // noite, que é quando os motoristas conduzem. A troca era por causa do
    // significado da cor; o contraste veio de lá a reboque.
    avisoNome: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.textMuted,
      borderWidth: 1.5,
      borderColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    avisoNomeTexto: {
      color: colors.white,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
    },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
    semServico: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    semServicoTexto: { ...tipo.corpoForte, color: colors.danger },
    semServicoNota: { ...tipo.pequeno, color: colors.text, marginTop: 2 },

    botao: {
      backgroundColor: colors.coral,
      borderRadius: radius.md,
      // `minHeight` e não `height`, pela mesma razão do botão do chat: a
      // letra grande do sistema não pode cortar o texto de um botão.
      minHeight: 54,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    botaoInativo: { backgroundColor: colors.border },
    resumo: { marginTop: spacing.lg },
    avisarBotao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.teal,
      borderRadius: radius.lg,
      backgroundColor: colors.white,
    },
    avisarTexto: { ...tipo.corpoForte, fontSize: 14, color: colors.teal, flex: 1 },
    // O botão principal da referência: coral a toda a largura, com o ícone do
    // veículo à esquerda e a seta à direita. O texto é ESCURO — branco sobre
    // coral fica a 2,8:1, abaixo do mínimo (ver SISTEMA.md).
    botaoPedir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.coral,
      borderRadius: radius.lg,
      minHeight: 58,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    botaoPedirTexto: { ...tipo.subtitulo, fontSize: 18, flex: 1, textAlign: 'center' },
    seguro: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    seguroTexto: { ...tipo.legenda, color: colors.textMuted },
    semMotoristaAviso: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    semMotoristaTitulo: { ...tipo.corpoForte, color: colors.coralDark },
    semMotoristaTexto: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    // O botão e a hora lado a lado; num ecrã estreito a hora desce, em vez de
    // cortar o botão.
    procurarLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: spacing.md,
      marginTop: spacing.xs,
    },
    // UMA PASTILHA COM CONTORNO, e não texto com um ícone ao lado. Assim
    // lido, não se percebia que era para tocar (Simão, 16/09/2026): sobre o
    // cartão laranja, o fundo branco e o fio coral dizem "botão" antes de
    // alguém ler a palavra. Alvo de toque de 44, com o hitSlop de 8 por fora.
    procurarOutraVez: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.coralDark,
      backgroundColor: colors.white,
    },
    procurarOutraVezTexto: { ...tipo.corpoForte, color: colors.coralDark },
    procuraAutomatica: { ...tipo.pequeno, color: colors.textMuted, marginTop: 6 },
    horaProcura: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ultimaProcura: { ...tipo.pequeno, color: colors.textMuted },
    botaoTexto: { ...tipo.subtitulo, color: colors.white },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});

// Aviso das taxas de entrada.
//
// Existe por causa de uma discussão à porta de um carro. Um passageiro que
// não sabe da taxa chega à cancela e recusa-se a pagar; quem fica a perder é
// o motorista, que já entrou e tem de sair pela mesma cancela. Duas pessoas
// zangadas por causa de uma informação que ninguém lhes deu.
//
// Só aparece se o veículo ESCOLHIDO pagar. No Timor Plaza a motorizada entra
// de graça, e mostrar-lhe um aviso de taxa seria dizer-lhe uma coisa falsa.
// O parâmetro chama-se `tipoVeiculo` e não `veiculo`: com o nome antigo
// tapava a função importada dentro deste componente, e quem aqui escrevesse
// `veiculo(x)` receberia uma cadeia de texto em vez da ficha do tipo.
function TaxasDeEntrada({ taxas, tipoVeiculo, t }) {
  const aplicaveis = (taxas ?? []).filter((x) => x.taxa?.[tipoVeiculo]);
  if (!aplicaveis.length) return null;

  return (
    <View style={estilosTaxa.caixa}>
      <Text style={estilosTaxa.titulo}>{t('taxaEntradaTitulo')}</Text>
      {aplicaveis.map((x) => {
        const c = x.taxa[tipoVeiculo];
        const valor =
          c.usd == null
            ? t('taxaSemValor')
            : c.por === 'hora'
              ? t('taxaPorHora', { valor: `$${c.usd.toFixed(2)}` })
              : t('taxaAEntrada', { valor: `$${c.usd.toFixed(2)}` });
        const onde =
          x.onde === 'estacionamento' ? t('taxaOndeEstacionamento') : t('taxaOndeRecinto');
        return (
          <Text key={x.id} style={estilosTaxa.linha}>
            {x.nome} · {onde} — <Text style={estilosTaxa.valor}>{valor}</Text>
          </Text>
        );
      })}
      <Text style={estilosTaxa.nota}>{t('taxaEntradaPaga')}</Text>
    </View>
  );
}

const criarEstilosTaxa = () =>
  StyleSheet.create({
    // Contorno coral e fundo neutro: é um aviso, não um erro. O passageiro
    // não fez nada de errado — só precisa de saber antes de ir.
    caixa: {
      borderWidth: 1,
      borderColor: colors.coral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    titulo: { ...tipo.corpoForte, color: colors.coral },
    linha: { ...tipo.pequeno, color: colors.text },
    valor: { ...tipo.corpoForte, color: colors.text },
    nota: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
  });

let estilosTaxa = criarEstilosTaxa();
registarEstilos(() => {
  estilosTaxa = criarEstilosTaxa();
});

// Perguntar como se chama um sítio.
//
// O texto explica PORQUÊ, e isso não é enfeite: sem razão, um campo que
// pergunta o nome de um sítio parece burocracia. Com razão — "o mapa de
// Díli está a ser feito agora, e o que escrever ajuda toda a gente" —
// passa a ser um convite.
// Os tipos, na ordem em que aparecem.
//
// Vivem aqui e não no servidor porque cada um precisa de uma palavra
// traduzida ao lado — e essa palavra está na app. Pôr a lista no servidor
// não pouparia uma publicação nenhuma; só afastaria as duas metades da
// mesma coisa.
