import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { nomeDaRua, metrosEntre } from '../lib/geocode.js';
import * as Location from 'expo-location';
import { api } from '../api/client.js';
import { createSocket } from '../socket.js';
import { registarParaNotificacoes } from '../push.js';
import { useAuth } from './AuthContext.js';

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
  const [driverPlace, setDriverPlace] = useState(null); // rua onde o veículo vai agora
  // A minha própria posição, quando sou eu o motorista. Era enviada e
  // deitada fora; guardá-la deixa-me desenhá-la no meu mapa.
  const [minhaPosicao, setMinhaPosicao] = useState(null);
  const ultimoGeocode = useRef(null); // onde foi feita a última pergunta

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
        if (!cancelled && isDriver) {
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
      if (onlineRef.current) socket.emit('driver:setOnline', true);

      try {
        const { rides } = await api.availableRides(token);
        if (!cancelled) setRequests(rides || []);
      } catch {
        /* sem rede; a próxima ligação tenta outra vez */
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('ride:new', (ride) => {
      setRequests((prev) => (prev.some((r) => r.id === ride.id) ? prev : [...prev, ride]));
    });
    socket.on('ride:taken', ({ id }) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    });
    socket.on('ride:update', (ride) => {
      setActiveRide((curr) => (!curr || curr.id === ride.id ? ride : curr));
    });
    socket.on('ride:driverLocation', ({ rideId, lat, lng }) => {
      if (rideId !== rideIdRef.current) return;
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
      if (msg.rideId !== rideIdRef.current) return;
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
  }, [token, user, isDriver]);

  // Enquanto disponível, o motorista envia a sua posição. É assim que o
  // passageiro vê o veículo a aproximar-se — e é o que mais distingue
  // isto de uma app de mensagens.
  useEffect(() => {
    if (!isDriver || !online) return;
    let parado = false;

    async function enviarPosicao() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || parado) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const aqui = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMinhaPosicao(aqui);
        socketRef.current?.emit('driver:location', aqui);
      } catch {
        /* sem GPS agora — tenta outra vez no próximo ciclo */
      }
    }

    enviarPosicao();
    const id = setInterval(enviarPosicao, 12000);
    return () => {
      parado = true;
      clearInterval(id);
    };
  }, [isDriver, online]);

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

  const requestRide = useCallback(
    async (payload) => {
      const { ride } = await api.createRide(token, payload);
      setActiveRide(ride);
      return ride;
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
      if (!activeId) return;
      const { message } = await api.sendMessage(token, activeId, body);
      setMessages((prev) => [...prev, message]);
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
      socketRef.current?.emit('driver:setOnline', valor);
      try {
        const { online } = await api.setAvailability(token, valor);
        setOnlineState(!!online);
        setBloqueio(null);
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

  const markChatRead = useCallback(() => setUnread(0), []);

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
    if (isDriver) {
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
  const pedidosVisiveis = requests.filter((r) => !ignorados.has(r.id));

  return (
    <RideContext.Provider
      value={{
        activeRide,
        isFinal,
        requests: pedidosVisiveis,
        ignorarPedido,
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
