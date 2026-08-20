import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { api } from '../api/client.js';
import { createSocket } from '../socket.js';
import { registarParaNotificacoes } from '../push.js';
import { useAuth } from './AuthContext.js';

const RideContext = createContext(null);

const FINAL = ['completed', 'cancelled'];

export function RideProvider({ children }) {
  const { token, user } = useAuth();
  const isDriver = user?.role === 'driver';

  const [activeRide, setActiveRide] = useState(null);
  const [requests, setRequests] = useState([]); // só motoristas
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [rated, setRated] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnlineState] = useState(!!user?.isOnline); // motorista disponível
  const [driverLocation, setDriverLocation] = useState(null); // posição vista pelo passageiro

  const socketRef = useRef(null);
  const rideIdRef = useRef(null); // id da viagem atual (para os handlers do socket)

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

    socket.on('connect', () => setConnected(true));
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
        socketRef.current?.emit('driver:location', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
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
    rideIdRef.current = activeId;
    setMessages([]);
    setUnread(0);
    setRated(false);
    setDriverLocation(null);
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
    async (id) => {
      const { ride } = await api.cancelRide(token, id);
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
      } catch {
        setOnlineState(!valor); // reverter se falhou
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

  return (
    <RideContext.Provider
      value={{
        activeRide,
        isFinal,
        requests,
        messages,
        unread,
        rated,
        connected,
        loading,
        online,
        toggleOnline,
        driverLocation,
        requestRide,
        acceptRide,
        advanceStatus,
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
