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

// Siste kjente antall ligaer. Starter på config-verdien, oppdateres av
// bakgrunnsoppslag. /health leser dette i stedet for å vente på FPL.
let lastKnownLeagues = config.leagueIds.length;

/**
 * Antall ligaer — svares synkront, aldri med et nettverkskall i veien.
 * Oppslaget fyres av i bakgrunnen og oppdaterer tallet til neste spørring.
 * Coolify bruker /health som gate: henger FPL, ville en ventende probe kunnet
 * gi en restart-loop. Første svar etter kaldstart kan derfor vise config-tallet.
 */
export function knownLeagueCount(resolve = resolveLeagueIds) {
  Promise.resolve()
    .then(resolve)
    .then((ids) => {
      lastKnownLeagues = ids.length;
    })
    .catch((err) => {
      console.error('Klarte ikke å løse opp ligaer:', err.message);
    });
  return lastKnownLeagues;
}
