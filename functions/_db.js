import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../src/db/schema.js';

export function getDb(env) {
  return drizzle(env.DB, { schema });
}

export const { games, gamePlayers } = schema;
