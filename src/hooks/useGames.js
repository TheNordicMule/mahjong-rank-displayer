import { useState, useEffect, useCallback } from 'react';
import * as storage from '../utils/storage';

export function useGames() {
  const [games, setGames] = useState(() => storage.getGames());

  useEffect(() => {
    setGames(storage.getGames());
  }, []);

  const refresh = useCallback(() => {
    setGames(storage.getGames());
  }, []);

  const addGame = useCallback((players) => {
    const saved = storage.addGame(players);
    setGames(storage.getGames());
    return saved;
  }, []);

  const deleteGame = useCallback((id) => {
    storage.deleteGame(id);
    setGames(storage.getGames());
  }, []);

  const clearAll = useCallback(() => {
    storage.clearAll();
    setGames([]);
  }, []);

  return { games, addGame, deleteGame, refresh, clearAll };
}
