import { useState, useEffect, useCallback } from 'react';
import * as storage from '../utils/storage';

export function useGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await storage.getGames();
      setGames(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGame = useCallback(async (players) => {
    const saved = await storage.addGame(players);
    setGames(prev => [...prev, saved]);
    return saved;
  }, []);

  const deleteGame = useCallback(async (id) => {
    await storage.deleteGame(id);
    setGames(prev => prev.filter(g => g.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    setGames([]);
  }, []);

  return { games, loading, error, addGame, deleteGame, refresh, clearAll };
}
