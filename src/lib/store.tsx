import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CouncilRoom, Agent, Message } from './types';

interface StoreContextType {
  rooms: CouncilRoom[];
  createRoom: (name: string, agents: Agent[]) => CouncilRoom;
  getRoom: (id: string) => CouncilRoom | undefined;
  addMessage: (roomId: string, message: Message) => void;
  deleteRoom: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

let idCounter = 0;
function genId() {
  return `room-${Date.now()}-${++idCounter}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<CouncilRoom[]>([]);

  const createRoom = useCallback((name: string, agents: Agent[]): CouncilRoom => {
    const room: CouncilRoom = {
      id: genId(),
      name,
      agents,
      messages: [],
      createdAt: Date.now(),
    };
    setRooms((prev) => [room, ...prev]);
    return room;
  }, []);

  const getRoom = useCallback(
    (id: string) => rooms.find((r) => r.id === id),
    [rooms]
  );

  const addMessage = useCallback((roomId: string, message: Message) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, messages: [...r.messages, message] } : r
      )
    );
  }, []);

  const deleteRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <StoreContext.Provider value={{ rooms, createRoom, getRoom, addMessage, deleteRoom }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
