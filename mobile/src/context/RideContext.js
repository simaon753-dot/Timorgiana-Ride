import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { createSocket } from '../socket.js';
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
    socket.on('message:new', (msg) => {
      if (msg.rideId !== rideIdRef.current) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setUnread((n) => n + 1);
    });

    return () => {
      cancelled = true;
      socket.close();
      socketRef.current = null;
    };
  }, [token, user, isDriver]);

  // Quando a viagem ativa muda: repor chat/avaliação e carregar histórico
  const activeId = activeRide?.id ?? null;
  const hasDriver = !!activeRide?.driver;
  useEffect(() => {
    rideIdRef.current = activeId;
    setMessages([]);
    setUnread(0);
    setRated(false);
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
