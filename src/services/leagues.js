import config from '../config.js';
import { getEntry } from './fplClient.js';

/**
 * Ligaene brukeren faktisk får se på /liga: LEAGUE_IDS når den er satt,
 * ellers de private klassiske ligaene laget er med i.
 * Delt med /health, slik at health teller det samme som siden viser.
 */
export async function resolveLeagueIds() {
  if (config.leagueIds.length > 0) return config.leagueIds;
  if (!config.hasTeamId) return [];
  const entry = await getEntry(config.fplTeamId);
  // 'x' = privat klassisk liga; 's' = globale gigaligaer (filtreres bort)
  return entry.leagues.classic.filter((l) => l.league_type === 'x').map((l) => l.id);
}
