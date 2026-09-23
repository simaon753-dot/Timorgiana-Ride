import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { cargaCabe } from '../dados/veiculos.js';
import { nomeDaRua, metrosEntre } from '../lib/geocode.js';
import * as Location from 'expo-location';
import { api, perderSessao } from '../api/client.js';
import { createSocket } from '../socket.js';
import {
  comecarAEnviarPosicao,
  pararDeEnviarPosicao,
  ouvirPosicao,
} from '../lib/servicoLocalizacao.js';
import { registarParaNotificacoes } from '../push.js';
import { useAuth } from './AuthContext.js';
import { criarFiltroPosicao } from '../lib/filtroPosicao.js';

const RideContext = createContext(null);

const FINAL = ['completed', 'cancelled'];

// Metros que o veículo tem de percorrer para valer a pena perguntar a rua
// outra vez. 150 m em Díli é cerca de um quarteirão.
const DISTANCIA_NOVA_RUA = 150;

export function RideProvider({ children }) {
  const { token, user } = useAuth();
  // Buscar pedidos e enviar a posição são coisas de quem PODE conduzir,
  // não de quem escolheu "motorista" no registo. Um passageiro que se
  // tornou motorista tem de as receber; um motorista por aprovar não.
  const isDriver = !!user?.podeConduzir;

  const [activeRide, setActiveRide] = useState(null);
  const [requests, setRequests] = useState([]); // só motoristas
  // PEDIDOS QUE ESTE MOTORISTA PÔS DE LADO.
  //
  // Só deste motorista e só nesta sessão. Ignorar não recusa a viagem a
  // ninguém: o pedido continua a ir para os outros motoristas disponíveis do
  // município, e quem o ignorou é que deixa de o ver.
  //
  // GUARDADO AQUI e não no ecrã, porque a lista é recarregada do servidor de
  // cada vez que a ligação volta. Tirado só do ecrã, o pedido reaparecia na
  // actualização seguinte, e o motorista teria de o ignorar outra vez.
  //
  // NÃO VAI PARA O SERVIDOR de propósito. Um pedido sem resposta expira
  // sozinho em dez minutos, e a app reiniciada é uma app que já não tem
  // aqueles pedidos. Guardar isto na base de dados seria acrescentar uma
  // tabela para um esquecimento que o tempo já faz.
  const [ignorados, setIgnorados] = useState(() => new Set());

  const ignorarPedido = useCallback((id) => {
    setIgnorados((prev) => new Set(prev).add(id));
  }, []);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [bloqueio, setBloqueio] = useState(null);
  const [rated, setRated] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnlineState] = useState(!!user?.isOnline); // motorista disponível
  const [driverLocation, setDriverLocation] = useState(null); // posição vista pelo passageiro
  // UM FILTRO POR FLUXO, e não um partilhado: o que o passageiro vê do
  // motorista e o que o motorista vê de si próprio são séries diferentes, e
  // o teste do salto impossível compara sempre com a ÚLTIMA da mesma série.
  const filtroDoMotorista = useRef(criarFiltroPosicao());
  const filtroDoProprio = useRef(criarFiltroPosicao());
  const [driverPlace, setDriverPlace] = useState(null); // rua onde o veículo vai agora
  // A minha própria posição, quando sou eu o motorista. Era enviada e
  // deitada fora; guardá-la deixa-me desenhá-la no meu mapa.
  const [minhaPosicao, setMinhaPosicao] = useState(null);
  const ultimoGeocode = useRef(null); // onde foi feita a última pergunta

  // O UTILIZADOR ACTUAL PARA OS HANDLERS DO SOCKET.
  //
  // O efeito do socket deixou de depender do objecto `user` (ver as notas nas
  // dependências), e isso traz o reverso da medalha: os handlers ficam com o
  // `user` que existia quando foram criados. Para o que eles perguntam — a
  // capacidade do veículo — isso podia ficar velho depois de o motorista a
  // declarar pela primeira vez. Uma referência resolve as duas coisas: a
  // ligação não se reconstrói, e quem lê vê sempre o valor de agora.
  const userRef = useRef(user);
  userRef.current = user;

  const socketRef = useRef(null);
  const rideIdRef = useRef(null); // id da viagem atual (para os handlers do socket)
  const onlineRef = useRef(false); // o mesmo, para o estado de disponível

  // Carregamento inicial + ligação ao socket
  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const { ride } = await api.activeRide(token);
        if (!cancelled && ride) setActiveRide(ride);
        // SÓ QUEM ESTÁ AO SERVIÇO VÊ PEDIDOS (14/09/26). O servidor já
        // devolve a lista vazia a quem está indisponível; pedir aqui só
        // quando se está ligado evita mostrar pedidos que não se podem aceitar.
        if (!cancelled && isDriver && userRef.current?.isOnline) {
          const { rides } = await api.availableRides(token);
          if (!cancelled) setRequests(rides || []);
        }
      } catch {
        /* sem rede ou sem viagem ativa */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const socket = createSocket(token);
    socketRef.current = socket;

    // AO RELIGAR, VOLTAR A PERGUNTAR O QUE HÁ.
    //
    // O `ride:new` é anunciado UMA vez, a quem estiver ligado naquele
    // instante. Um motorista que perca a rede durante cinco segundos — e em
    // Díli perde — não ouve o anúncio, e um anúncio não se repete.
    //
    // Até 06/09/2026 a lista só era pedida em dois momentos: ao abrir a app,
    // e ao dispensar uma viagem. Entre os dois, o motorista via "ligado" e
    // uma lista que podia estar desactualizada há meia hora, sem nada que
    // lho dissesse. Perdia trabalho, o passageiro esperava, e nenhum dos
    // dois ficava a saber porquê.
    //
    // Descobriu-se no guião de teste, que sofria exactamente do mesmo mal:
    // ficou preso a ignorar pedidos porque só ouvia o anúncio.
    //
    // Isto também corre na PRIMEIRA ligação, o que repete o pedido feito
    // acima. É de propósito: uma chamada a mais ao abrir custa menos do que
    // um caminho que só funciona da segunda vez em diante.
    socket.on('connect', async () => {
      setConnected(true);

      // PÔR A VIAGEM EM DIA, e para os dois lados.
      //
      // Isto só o motorista fazia, e o passageiro ficava por sua conta. Se a
      // ligação dele caísse durante a viagem — ecrã apagado, app em segundo
      // plano, rede fraca —, perdia o aviso de conclusão pelo socket e nunca
      // mais perguntava o que tinha acontecido. O ecrã ficava preso em
      // "Motorista a chegar" depois de a viagem estar concluída.
      //
      // Pergunta-se pela viagem CONCRETA e não por "a activa": uma viagem
      // terminada já não é activa, e era justamente o seu fim que faltava
      // saber. Sem isto, a app perdia também a avaliação, que só aparece com
      // a viagem concluída na mão.
      try {
        const id = rideIdRef.current;
        const { ride } = id ? await api.ride(token, id) : await api.activeRide(token);
        if (!cancelled && ride) setActiveRide(ride);
      } catch {
        /* a viagem pode já não existir; a próxima ligação tenta outra vez */
      }

      if (!isDriver) return;

      // VOLTAR A DIZER QUE ESTAMOS AO SERVIÇO.
      //
      // O servidor deixou de acreditar em quem não dá sinal: varre os
      // motoristas sem batida há dez minutos e marca-os indisponíveis. Isso
      // resolve os fantasmas de um reinício, mas cria um desencontro — a
      // app continuaria a mostrar "ao serviço" e o motorista ficaria a
      // olhar para um ecrã que diz uma coisa enquanto o servidor faz outra,
      // sem receber pedidos e sem perceber porquê.
      //
      // Ao religar, a app reafirma. O servidor é quem manda no registo, mas
      // a app é quem sabe o que o motorista escolheu.
      //
      // A LISTA SÓ DEPOIS DE O SERVIDOR CONFIRMAR. O servidor passou a dar a
      // lista vazia a quem está indisponível; pedi-la antes de ele processar o
      // "estou ao serviço" devolvia uma lista vazia a quem está ligado. Por
      // isso vai no aviso de recepção do próprio `driver:setOnline`.
      // Desligado, a lista fica vazia — é o que o motorista escolheu.
      if (onlineRef.current) {
        socket.emit('driver:setOnline', true, async () => {
          try {
            const { rides } = await api.availableRides(token);
            if (!cancelled) setRequests(rides || []);
          } catch {
            /* sem rede; a próxima ligação tenta outra vez */
          }
        });
      } else {
        setRequests([]);
      }
    });
    socket.on('disconnect', () => setConnected(false));

    // A CONTA FOI ABERTA NOUTRO TELEMÓVEL (23/09/2026).
    //
    // O servidor avisa e corta a seguir. Chega por aqui, e não pelo primeiro
    // pedido a falhar, porque um motorista à espera de viagens pode estar
    // minutos sem fazer pedido nenhum — e não pode ficar esse tempo a olhar
    // para uma app que já não é dele.
    socket.on('sessao:terminada', () => perderSessao('sessao_noutro_aparelho'));

    socket.on('ride:new', (ride) => {
      // Desligado não ouve pedidos. O servidor já não o põe nas salas, mas um
      // anúncio a meio de desligar não pode aparecer num ecrã indisponível.
      if (!onlineRef.current) return;
      // Só o que cabe no veículo — a mesma regra que o servidor aplica na
      // lista e na aceitação (14/09/26).
      if (!cargaCabe(ride.carga?.volume, userRef.current?.vehicle?.capacidade)) return;
      setRequests((prev) => (prev.some((r) => r.id === ride.id) ? prev : [...prev, ride]));
    });
    socket.on('ride:taken', ({ id }) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    });
    socket.on('ride:update', (ride) => {
      setActiveRide((curr) => (!curr || curr.id === ride.id ? ride : curr));
    });
    socket.on('ride:driverLocation', ({ rideId, lat, lng, precisao }) => {
      if (rideId !== rideIdRef.current) return;
      // SÓ O QUE MERECE CRÉDITO. Uma leitura com 80 metros de erro põe o
      // carro noutra rua, e um salto impossível fá-lo teleportar-se. Ver
      // `lib/filtroPosicao.js` — e repare-se que o filtro está AQUI, no
      // desenho, e não no envio: a posição de um motorista à espera é também
      // a batida que o mantém ao serviço.
      if (!filtroDoMotorista.current({ lat, lng, precisao })) return;
      setDriverLocation({ lat, lng });

      // A rua só se pergunta quando o veículo andou mesmo. Um carro parado
      // num semáforo continua a enviar posição de 12 em 12 segundos e não
      // tem rua nova para dizer — e o Nominatim é gratuito e partilhado,
      // aceita cerca de um pedido por segundo no total.
      const agora = { lat, lng };
      if (metrosEntre(ultimoGeocode.current, agora) < DISTANCIA_NOVA_RUA) return;
      ultimoGeocode.current = agora;
      nomeDaRua(lat, lng)
        .then((rua) => rua && setDriverPlace(rua))
        .catch(() => {});
    });
    socket.on('message:new', (msg) => {
      // Comparados como números: um id que viesse como texto numa das pontas
      // descartava a mensagem sem aviso.
      if (Number(msg.rideId) !== Number(rideIdRef.current)) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setUnread((n) => n + 1);
    });

    // Notificações: sem isto o motorista teria de manter a app aberta o
    // dia todo para não perder pedidos.
    registarParaNotificacoes()
      .then((pushToken) => pushToken && api.savePushToken(token, pushToken))
      .catch(() => {});

    return () => {
      cancelled = true;
      socket.close();
      socketRef.current = null;
    };
    // AS DEPENDÊNCIAS SÃO O ID E O PAPEL, e não o objecto `user` inteiro
    // (21/09/2026).
    //
    // `refreshUser()` põe um OBJECTO NOVO vindo do servidor, com os mesmos
    // dados. Com o objecto nas dependências, cada refresh fechava o socket e
    // abria outro — e há refreshes por todo o lado: ao confirmar o email, ao
    // guardar o veículo, ao aceitar os termos, e de 20 em 20 segundos no ecrã
    // de quem espera aprovação.
    //
    // Cada troca custa um aperto de mão, uma reautenticação e a reentrada nas
    // salas — e no intervalo perde-se o que for anunciado. É a explicação mais
    // provável do chat que entregava a primeira mensagem e não as seguintes.
    //
    // O que este efeito precisa de saber é DE QUEM é a ligação e SE recebe
    // pedidos. Isso são dois valores simples, e valores simples só mudam
    // quando mudam de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id, isDriver]);

  // ESTOU NUMA VIAGEM? — para o GPS saber que cadência usar.
  //
  // «Em viagem» aqui é tudo o que já tem passageiro do outro lado: a caminho
  // dele, à porta dele, ou com ele dentro. Nos três casos há alguém a olhar
  // para o mapa à espera de ver o carro mexer-se.
  const emViagem =
    !!activeRide &&
    activeRide.driver?.id === user?.id &&
    ['accepted', 'arriving', 'in_progress'].includes(activeRide.status);
  const emViagemRef = useRef(emViagem);
  emViagemRef.current = emViagem;

  // A POSIÇÃO DO MOTORISTA, enquanto ele está ao serviço. É assim que o
  // passageiro vê o veículo a aproximar-se — e é o que mais distingue isto
  // de uma app de mensagens.
  //
  // DEIXOU DE SER UM RELÓGIO (21/09/2026). Era uma leitura de GPS de 12 em 12
  // segundos, estivesse o carro a andar ou parado à sombra à espera de
  // pedidos. Um turno de oito horas são 2400 leituras de satélite, e a maior
  // parte delas dizia exactamente o mesmo que a anterior — gastava bateria
  // do motorista, dados de quem paga ao megabyte, e escritas na base de
  // dados, para não dizer nada de novo.
  //
  // Agora é o SISTEMA que avisa quando há novidade, e só há novidade quando o
  // carro anda. O filtro é por distância e não por tempo, porque é a
  // distância que interessa a quem está à espera na rua.
  //
  // DUAS CADÊNCIAS, e é a diferença entre os dois trabalhos:
  //   • EM VIAGEM (ou a caminho de alguém): 25 metros. É o que faz o carro
  //     mexer-se no mapa de quem espera.
  //   • À ESPERA DE PEDIDOS: 120 metros. Aqui a posição serve para escolher
  //     quem está mais perto do próximo pedido, e um quarteirão chega.
  //
  // O TEMPO MÍNIMO continua a existir como tecto: sem ele, um carro em
  // autoestrada dispararia dezenas de envios por minuto.
  useEffect(() => {
    if (!isDriver || !online) return undefined;
    let parado = false;
    let sub = null; // só no caminho de recurso (ver abaixo)
    let servicoACorrer = false;
    let ultima = null;

    function enviar(pos) {
      if (parado) return;
      const aqui = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precisao: pos.coords.accuracy ?? null,
        quando: pos.timestamp ?? Date.now(),
      };
      ultima = aqui;
      setMinhaPosicao(aqui);
      socketRef.current?.emit('driver:location', aqui);
    }

    // O serviço em primeiro plano avisa por aqui: corre fora do ciclo do
    // React e não pode mexer em estado directamente.
    const deixarDeOuvir = ouvirPosicao((aqui) => {
      if (parado) return;
      ultima = aqui;
      setMinhaPosicao(aqui);
    });

    // A BATIDA DO CAMINHO DE RECURSO. Ver a nota mais abaixo: só serve quando
    // não há permissão de segundo plano, e aí a app está à frente — é o único
    // estado em que um temporizador de JavaScript corre de certeza.
    const batida = setInterval(() => {
      if (!parado && !servicoACorrer && ultima) {
        socketRef.current?.emit('driver:location', ultima);
      }
    }, 240000);

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || parado) return;

        // A primeira vai já: quem acaba de ficar disponível tem de entrar na
        // lista dos que estão perto sem esperar pelo primeiro aviso do
        // sistema, que pode demorar minutos.
        const agora = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        enviar(agora);
        if (parado) return;

        // A PERMISSÃO DE SEGUNDO PLANO, pedida aqui e não no registo.
        //
        // É pedida no momento em que passa a fazer sentido — quando ele fica
        // ao serviço — e não à entrada, onde seria uma pergunta sem contexto
        // a que quase toda a gente responde «não». No Android 10 para cima
        // isto abre as definições do sistema com a opção «Sempre».
        const bg = await Location.requestBackgroundPermissionsAsync().catch(() => ({
          status: 'denied',
        }));
        if (parado) return;

        if (bg.status === 'granted') {
          await comecarAEnviarPosicao({ emViagem: emViagemRef.current });
          servicoACorrer = true;
          return;
        }

        // CAMINHO DE RECURSO: sem permissão de segundo plano, faz-se o que se
        // fazia antes — seguir a posição dentro da app. Continua a funcionar
        // enquanto ela estiver à frente, e pára quando o telemóvel vai para o
        // bolso. É pior, mas é melhor do que nada: negar a permissão não pode
        // impedir alguém de trabalhar.
        sub = await Location.watchPositionAsync(
          {
            accuracy: emViagemRef.current ? Location.Accuracy.High : Location.Accuracy.Balanced,
            distanceInterval: emViagemRef.current ? 25 : 120,
            timeInterval: emViagemRef.current ? 8000 : 30000,
          },
          enviar
        );
        if (parado) {
          sub.remove();
          sub = null;
        }
      } catch {
        /* sem GPS nem permissão: o servidor fica com a última posição conhecida */
      }
    })();

    return () => {
      parado = true;
      clearInterval(batida);
      deixarDeOuvir();
      sub?.remove();
      sub = null;
      // PARAR É TÃO IMPORTANTE COMO COMEÇAR: um serviço em primeiro plano
      // que ficasse a correr depois de o motorista se desligar seria uma
      // notificação permanente a dizer que ele está ao serviço quando não
      // está — e bateria gasta por nada.
      if (servicoACorrer) pararDeEnviarPosicao();
    };
    // `emViagem` entra nas dependências para a cadência mudar quando a viagem
    // começa ou acaba: o serviço é refeito com o filtro do outro trabalho.
  }, [isDriver, online, emViagem]);

  // O QUE SE VÊ NÃO É O QUE SE ENVIA (21/09/2026).
  //
  // Erro meu, apanhado pelo Simão no primeiro teste a sério com o carro em
  // movimento: o ponto azul do Google andava e o pino do veículo ficava
  // parado.
  //
  // A causa foi ter-se misturado duas perguntas diferentes numa só cadência.
  // De manhã troquei o relógio de 12 segundos por um filtro de distância, e
  // pus a leitura à espera de pedidos em quatro minutos — certo para POUPAR
  // BATERIA e para dizer ao servidor «continuo aqui», errado para DESENHAR o
  // veículo no ecrã de quem está a olhar para ele. O ponto azul é nativo e
  // atualiza-se sozinho; o nosso pino esperava pela leitura seguinte.
  //
  // São mesmo dois trabalhos:
  //   • DIZER AO SERVIDOR onde estou — raro, filtrado, e tem de funcionar com
  //     o telemóvel no bolso (é o serviço em primeiro plano, acima).
  //   • MOSTRAR-ME onde estou — frequente, mas só enquanto alguém está a olhar.
  //
  // Esta leitura NÃO É ENVIADA a lado nenhum e só corre com a app à frente.
  // Custa bateria enquanto o ecrã está aceso, que é exatamente quando a pessoa
  // aceita gastá-la para ver o mapa mexer-se.
  useEffect(() => {
    if (!isDriver) return undefined;
    let vivo = true;
    let sub = null;

    async function ligar() {
      if (!vivo || sub || AppState.currentState !== 'active') return;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || !vivo) return;
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 2000 },
          (pos) => {
            if (!vivo) return;
            const aqui = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              precisao: pos.coords.accuracy ?? null,
              quando: pos.timestamp ?? Date.now(),
            };
            if (!filtroDoProprio.current(aqui)) return;
            setMinhaPosicao({ lat: aqui.lat, lng: aqui.lng });
          }
        );
        if (vivo) sub = s;
        else s.remove();
      } catch {
        /* sem GPS: fica a última posição conhecida */
      }
    }

    function desligar() {
      sub?.remove();
      sub = null;
    }

    ligar();
    const ouvinte = AppState.addEventListener('change', (estado) =>
      estado === 'active' ? ligar() : desligar()
    );
    return () => {
      vivo = false;
      desligar();
      ouvinte.remove();
    };
  }, [isDriver]);

  // Quando a viagem ativa muda: repor chat/avaliação e carregar histórico
  const activeId = activeRide?.id ?? null;
  const hasDriver = !!activeRide?.driver;
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    rideIdRef.current = activeId;
    setMessages([]);
    setUnread(0);
    setRated(false);
    setDriverLocation(null);
    // A rua pertence à viagem: guardá-la entre viagens mostraria ao
    // passageiro seguinte onde andou o anterior.
    setDriverPlace(null);
    ultimoGeocode.current = null;
    if (activeId && hasDriver && token) {
      api
        .listMessages(token, activeId)
        .then(({ messages }) => setMessages(messages || []))
        .catch(() => {});
    }
  }, [activeId, hasDriver, token]);

  // --- Ações ---------------------------------------------------------------

  // PEDIR UMA VIAGEM, incluindo o caso em que ela já foi pedida (21/09/2026).
  //
  // Numa rede lenta o pedido pode chegar ao servidor e a RESPOSTA perder-se.
  // O servidor faz o que deve — recusa a segunda com 409, porque cada
  // passageiro só tem uma viagem de cada vez — mas a app mostrava essa recusa
  // como erro. Ou seja: a viagem estava criada, um motorista podia já estar a
  // caminho, e o ecrã dizia que tinha falhado. A pessoa desistia.
  //
  // Um 409 aqui não é uma falha: é a confirmação de que a viagem existe. Vai
  // buscá-la e segue como se a primeira resposta tivesse chegado.
  const requestRide = useCallback(
    async (payload) => {
      try {
        const { ride } = await api.createRide(token, payload);
        setActiveRide(ride);
        return ride;
      } catch (e) {
        if (e?.status !== 409) throw e;
        const { ride } = await api.activeRide(token);
        if (!ride) throw e;
        setActiveRide(ride);
        return ride;
      }
    },
    [token]
  );

  const acceptRide = useCallback(
    async (id, fareUsd) => {
      const { ride } = await api.acceptRide(token, id, fareUsd);
      setActiveRide(ride);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      return ride;
    },
    [token]
  );

  const advanceStatus = useCallback(
    async (id, status) => {
      const { ride } = await api.setRideStatus(token, id, status);
      setActiveRide(ride);
      return ride;
    },
    [token]
  );

  const updateFare = useCallback(
    async (id, fareUsd) => {
      const { ride } = await api.updateFare(token, id, fareUsd);
      setActiveRide(ride);
      return ride;
    },
    [token]
  );

  const cancelRide = useCallback(
    async (id, reason) => {
      const resposta = await api.cancelRide(token, id, reason);
      setActiveRide(resposta.ride);
      // Devolve a resposta inteira: além da viagem, traz o número de
      // cancelamentos recentes, que o ecrã usa para avisar quem exagera.
      return resposta;
    },
    [token]
  );

  // Começar a viagem com o código que o passageiro leu em voz alta.
  const startRide = useCallback(
    async (id, code) => {
      const { ride } = await api.startRide(token, id, code);
      setActiveRide(ride);
      return ride;
    },
    [token]
  );

  const sendMessage = useCallback(
    async (body) => {
      // ATIRA em vez de desistir em silêncio.
      //
      // Era `return` sem mais nada. Quem escrevesse sem viagem activa via o
      // texto desaparecer da caixa e mais nada acontecer — a mensagem não
      // ia, não ficava, e não havia erro. O ecrã só repõe o texto quando
      // apanha uma excepção, e aqui não havia nenhuma para apanhar.
      if (!activeId) throw new Error('SEM_VIAGEM');
      const { message } = await api.sendMessage(token, activeId, body);
      // Sem repetir: a consulta periódica do ecrã do chat pode já a ter trazido.
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      return message;
    },
    [token, activeId]
  );

  // Ficar disponível/indisponível. Avisa o servidor pelas duas vias: o
  // socket trata das salas em tempo real, a API garante que fica gravado
  // mesmo que o socket esteja a reconectar.
  const toggleOnline = useCallback(
    async (valor) => {
      setOnlineState(valor);
      // DESLIGAR LIMPA A LISTA NO MESMO INSTANTE: quem está indisponível não
      // vê pedidos nem os pode aceitar (14/09/26).
      if (!valor) setRequests([]);
      socketRef.current?.emit('driver:setOnline', valor);
      try {
        const { online } = await api.setAvailability(token, valor);
        setOnlineState(!!online);
        setBloqueio(null);
        // Ligar mostra os pedidos que já estavam à espera — não só os que
        // forem anunciados daqui para a frente.
        if (online) {
          const { rides } = await api.availableRides(token);
          setRequests(rides || []);
        }
      } catch (e) {
        setOnlineState(!valor); // reverter se falhou
        // O `catch` mudo que estava aqui era o pior dos dois mundos: o
        // interruptor voltava atrás e ninguém dizia porquê. Um motorista
        // sem saldo carregava, via o botão desligar-se sozinho, e ficava a
        // pensar que a aplicação estava avariada. O motivo vem do servidor;
        // guardá-lo é o que deixa o ecrã explicar-se.
        setBloqueio(e?.motivo ? { motivo: e.motivo, mensagem: e.message } : null);
      }
    },
    [token]
  );

  // Marcar uma etapa da entrega (motorista). O servidor devolve a viagem já
  // com a hora da etapa, e o passageiro recebe-a pelo tempo real.
  const marcarEtapaCarga = useCallback(
    async (id, etapa) => {
      const { ride } = await api.marcarEtapaCarga(token, id, etapa);
      setActiveRide(ride);
      return ride;
    },
    [token]
  );

  const markChatRead = useCallback(() => setUnread(0), []);

  // A CONVERSA NÃO DEPENDE SÓ DO SOCKET (13/09/26).
  //
  // O Simão viu a primeira mensagem aparecer e as seguintes não, embora
  // fossem enviadas com sucesso. O servidor grava-as (o envio devolve-as);
  // o que falhava era a entrega ao vivo. Não consegui reproduzir a causa
  // exacta — precisava de duas contas —, e há mais de uma que dá este
  // sintoma: o socket fecha e reabre quando o objecto do utilizador muda, e
  // numa rede de Díli uma ligação que cai perde o que chega entretanto.
  //
  // Em vez de adivinhar qual, a conversa passa a ter duas vias: o socket, que
  // é o caminho rápido, e o servidor, que é a verdade. O ecrã do chat pede a
  // lista enquanto está aberto e JUNTA por id — o que o socket já trouxe não
  // se repete, o que ele perdeu aparece.
  const refreshMessages = useCallback(async () => {
    if (!activeId || !token) return;
    try {
      const { messages: doServidor } = await api.listMessages(token, activeId);
      setMessages((prev) => {
        const porId = new Map();
        for (const m of [...prev, ...(doServidor || [])]) porId.set(m.id, m);
        const juntas = [...porId.values()].sort((a, b) => a.id - b.id);
        // Mesma lista, mesmo objecto: sem isto cada volta redesenhava o ecrã.
        return juntas.length === prev.length ? prev : juntas;
      });
    } catch {
      // Sem rede: fica o que já havia; a próxima volta tenta outra vez.
    }
  }, [token, activeId]);

  const rateRide = useCallback(
    async (id, stars) => {
      await api.rateRide(token, id, stars);
      setRated(true);
    },
    [token]
  );

  const dismissRide = useCallback(async () => {
    // A REFERÊNCIA É LIMPA AQUI, e não só pelo efeito que a segue.
    //
    // O efeito que a acerta corre depois do desenho, e nesse intervalo uma
    // reconexão ainda leria o id antigo — e como a app passou a pôr-se em dia
    // ao religar, iria buscar a viagem que o utilizador acabou de dispensar e
    // punha-a outra vez no ecrã. Janela estreita, mas o custo de a fechar é
    // uma linha.
    rideIdRef.current = null;
    setActiveRide(null);
    if (isDriver && onlineRef.current) {
      try {
        const { rides } = await api.availableRides(token);
        setRequests(rides || []);
      } catch {
        /* ignora */
      }
    }
  }, [isDriver, token]);

  const isFinal = activeRide && FINAL.includes(activeRide.status);

  // A filtragem é feita AQUI, à saída, e não em cada ecrã que use a lista.
  // Um filtro por consumidor divergiria no dia em que houvesse dois.
  // RECUSAR COM MOTIVO: o pedido sai da lista deste motorista e o motivo
  // fica registado no servidor (sem esperar — a lista não fica à espera da
  // rede para esconder o que ele já pôs de lado).
  const recusarPedido = useCallback(
    (id, motivo = 'agora') => {
      api.recusarPedido(token, id, motivo).catch(() => {});
      ignorarPedido(id);
    },
    [token, ignorarPedido]
  );

  const pedidosVisiveis = requests.filter((r) => !ignorados.has(r.id));

  return (
    <RideContext.Provider
      value={{
        activeRide,
        isFinal,
        requests: pedidosVisiveis,
        ignorarPedido,
        recusarPedido,
        marcarEtapaCarga,
        messages,
        unread,
        rated,
        connected,
        loading,
        online,
        toggleOnline,
        bloqueio,
        limparBloqueio: () => setBloqueio(null),
        driverLocation,
        driverPlace,
        minhaPosicao,
        requestRide,
        acceptRide,
        advanceStatus,
        startRide,
        updateFare,
        cancelRide,
        sendMessage,
        refreshMessages,
        markChatRead,
        rateRide,
        dismissRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRides() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error('useRides tem de ser usado dentro de <RideProvider>');
  return ctx;
}
