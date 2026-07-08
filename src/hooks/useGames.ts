import { useState, useEffect, useCallback } from 'react';
import * as storage from '../utils/storage';
import type { Game, Player } from '../types';

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const g = await storage.getGames();
      setGames(g);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGame = useCallback(async (players: Player[]): Promise<Game> => {
    const saved = await storage.addGame(players);
    setGames((prev) => [...prev, saved]);
    return saved;
  }, []);

  const editGame = useCallback(async (id: string, players: Player[]): Promise<Game> => {
    const updated = await storage.updateGame(id, players);
    setGames((prev) => prev.map((g) => (g.id === id ? updated : g)));
    return updated;
  }, []);

  const deleteGame = useCallback(async (id: string): Promise<void> => {
    await storage.deleteGame(id);
    setGames((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    await storage.clearAll();
    setGames([]);
  }, []);

  return { games, loading, error, addGame, editGame, deleteGame, refresh, clearAll };
}
