/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMyRooms } from '../services/roomService';

export const RoomContext = createContext();

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setRooms([]);
      setActiveRoom(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getMyRooms();
      setRooms(data);
    } catch (error) {
      console.error('Odalar yüklenirken hata oluştu:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRooms();
    
    const handleStorageChange = () => {
      fetchRooms();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchRooms]);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        activeRoom,
        setActiveRoom,
        loading,
        refreshRooms: fetchRooms
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  return useContext(RoomContext);
}
