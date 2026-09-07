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

// De globale gigaligaene FPL melder alle inn i. Navnene er engelske og
// generiske — de to vi kjenner får norske navn, resten står som de er.
const GLOBALE_NAVN = { Overall: 'Globalt', Norway: 'Norge' };

/**
 * «Dine plasseringer» (v1.14.0): de globale ligaene (`league_type === 's'`)
 * som `resolveLeagueIds` filtrerer bort. Sortert på størrelse, størst først;
 * ligaer uten `rank_count` (test-verdenen) havner sist. `trend` sammenligner
 * plasseringen mot forrige runde — lavere rank er bedre.
 */
export function globalStandings(entry) {
  const alle = entry?.leagues?.classic ?? [];
  return alle
    .filter((l) => l.league_type === 's')
    .map((l) => ({
      id: l.id,
      name: GLOBALE_NAVN[l.name] ?? l.name,
      rank: l.entry_rank ?? null,
      lastRank: l.entry_last_rank ?? null,
      percentile: l.entry_percentile_rank ?? null,
      count: l.rank_count ?? null,
      trend: trendAv(l.entry_rank, l.entry_last_rank),
    }))
    .sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
}

function trendAv(rank, lastRank) {
  if (rank == null || lastRank == null) return null;
  if (rank < lastRank) return 'opp';
  if (rank > lastRank) return 'ned';
  return 'lik';
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
