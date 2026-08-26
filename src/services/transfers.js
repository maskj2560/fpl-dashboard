// Historisk «hva hvis»-analyse av egne transfers: hva hver overgang faktisk
// var verdt i rå spillerpoeng (uten benk-/kapteinsvekting), minus straff.
// Vinduet per transfer er perioden byttet var i effekt: fra runden det
// gjaldt, til inn-spilleren ble solgt igjen eller ut-spilleren kjøpt
// tilbake. Free hit-transfers reverseres av FPL og terminerer aldri andre
// vinduer.
import config from '../config.js';
import {
  getBootstrap,
  getEntryHistory,
  getEntryTransfers,
  getLive,
  getLiveHistoric,
} from './fplClient.js';
import { byId, resolvedGw } from './analysis.js';

// Skjemaet for entry/{id}/transfers/ er uverifisert før sesongstart —
// records uten disse feltene hoppes over og telles som «ukjente».
function isValidTransfer(t) {
  return (
    [t?.element_in, t?.element_out, t?.event].every((v) => Number.isInteger(v) && v > 0) &&
    t.event <= 38
  );
}

export function buildTransferAnalysis({ transfers, history, bootstrap, liveByGw }) {
  const maxGw = resolvedGw(bootstrap.events);
  const elementsById = byId(bootstrap.elements);
  const teamsById = byId(bootstrap.teams ?? []);
  // Navn + lag for Inn/Ut-cellene. Klubbkoden er det partialen trenger for
  // merket; kortnavnet er teksten ved siden av.
  const ref = (id) => {
    const p = elementsById.get(id);
    const t = p ? teamsById.get(p.team) : null;
    return {
      id,
      name: p?.web_name ?? `Ukjent (${id})`,
      teamShort: t?.short_name ?? null,
      teamCode: t?.code ?? null,
    };
  };

  const pointsByGw = new Map(
    [...liveByGw].map(([gw, live]) => [
      gw,
      new Map((live?.elements ?? []).map((e) => [e.id, e.stats?.total_points ?? 0])),
    ]),
  );
  const pointsFor = (id, from, to) => {
    let sum = 0;
    for (let gw = from; gw <= to; gw++) sum += pointsByGw.get(gw)?.get(id) ?? 0;
    return sum;
  };

  const all = Array.isArray(transfers) ? transfers : [];
  const valid = all
    .filter(isValidTransfer)
    .sort((a, b) => a.event - b.event || String(a.time).localeCompare(String(b.time)));
  const skipped = all.length - valid.length;

  const chipByEvent = new Map((history?.chips ?? []).map((c) => [c.event, c.name]));
  const isFhEvent = (e) => chipByEvent.get(e) === 'freehit';

  const costByEvent = new Map(
    (history?.current ?? []).map((r) => [r.event, r.event_transfers_cost ?? 0]),
  );
  const countByEvent = new Map();
  for (const tr of valid) countByEvent.set(tr.event, (countByEvent.get(tr.event) ?? 0) + 1);

  const rows = valid.map((tr, i) => {
    const from = tr.event;
    const isFh = isFhEvent(from);

    // Vinduet slutter runden før byttet oppheves: inn-spilleren selges, eller
    // ut-spilleren kjøpes tilbake. Free hit-transfers teller ikke (FPL
    // reverserer laget selv etterpå).
    let to = maxGw;
    if (isFh) {
      to = Math.min(from, maxGw);
    } else {
      const closer = valid
        .slice(i + 1)
        .find(
          (s) =>
            !isFhEvent(s.event) &&
            (s.element_out === tr.element_in || s.element_in === tr.element_out),
        );
      if (closer) to = Math.min(closer.event - 1, maxGw);
    }

    const pending = from > maxGw;
    const played = !pending && to >= from;
    const innPoints = played ? pointsFor(tr.element_in, from, to) : 0;
    const utPoints = played ? pointsFor(tr.element_out, from, to) : 0;
    const diff = innPoints - utPoints;
    const penaltyShare = (costByEvent.get(from) ?? 0) / (countByEvent.get(from) ?? 1);
    const chipName = chipByEvent.get(from);

    // Per-runde-nedbrytning med løpende sum — viser NÅR byttet snudde.
    const perGw = [];
    if (played) {
      let cum = 0;
      for (let gw = from; gw <= to; gw++) {
        const inn = pointsByGw.get(gw)?.get(tr.element_in) ?? 0;
        const ut = pointsByGw.get(gw)?.get(tr.element_out) ?? 0;
        cum += inn - ut;
        perGw.push({ gw, inn, ut, diff: inn - ut, cum });
      }
    }

    // Milepælen «etter 5 runder»: de første 5 rundene av vinduet. Komplett
    // når 5 runder er talt, eller når vinduet er terminert (dommen er endelig
    // selv om byttet varte kortere).
    let after5 = null;
    if (played) {
      const milestone = perGw.slice(0, 5);
      after5 = {
        diff: milestone[milestone.length - 1].cum,
        gws: milestone.length,
        complete: milestone.length === 5 || to < maxGw,
      };
    }

    return {
      perGw,
      after5,
      event: from,
      chip: chipName === 'wildcard' || chipName === 'freehit' ? chipName : null,
      inn: { ...ref(tr.element_in), points: innPoints },
      ut: { ...ref(tr.element_out), points: utPoints },
      diff,
      penaltyShare,
      netto: diff - penaltyShare,
      window: played ? { from, to } : null,
      played,
      pending,
    };
  });

  const totalDiff = rows.reduce((s, r) => s + r.diff, 0);
  // Totalen bruker rundekostene fra history (eksakte heltall), ikke summen
  // av brøkdelte andeler — da er totalsummen alltid nøyaktig.
  const totalCost = [...costByEvent.values()].reduce((s, c) => s + c, 0);

  const playedIdx = rows.map((r, i) => (r.played ? i : -1)).filter((i) => i >= 0);
  let bestIndex = null;
  let worstIndex = null;
  if (playedIdx.length >= 2) {
    bestIndex = playedIdx.reduce((a, b) => (rows[b].netto > rows[a].netto ? b : a));
    worstIndex = playedIdx.reduce((a, b) => (rows[b].netto < rows[a].netto ? b : a));
  }

  // Sesongtall for toppkortet. `totals`-formen er låst av eksisterende
  // konsumenter — nye aggregat bor her.
  const playedRows = rows.filter((r) => r.played);
  const wins = playedRows.filter((r) => r.netto > 0).length;
  const season = {
    played: playedRows.length,
    wins,
    hitRate: playedRows.length ? wins / playedRows.length : null,
    hitsPaid: totalCost / 4,
  };

  return {
    rows,
    season,
    totals: {
      diff: totalDiff,
      cost: totalCost,
      netto: totalDiff - totalCost,
      count: rows.length,
      skipped,
    },
    bestIndex,
    worstIndex,
    maxGw,
  };
}

/** Henter alt /overganger trenger. `teamId`-parameteren er test-hook. */
export async function assembleTransferAnalysis({ teamId = config.fplTeamId } = {}) {
  const [bootstrap, transfers, history] = await Promise.all([
    getBootstrap(),
    getEntryTransfers(teamId),
    getEntryHistory(teamId),
  ]);

  const maxGw = resolvedGw(bootstrap.events);
  const eventsById = new Map(bootstrap.events.map((e) => [e.id, e]));
  const validEvents = (Array.isArray(transfers) ? transfers : [])
    .filter(isValidTransfer)
    .map((t) => t.event);
  const firstEvent = validEvents.length ? Math.min(...validEvents) : Infinity;

  // Poeng per runde hentes kun for vinduet som faktisk trengs — ferdige
  // runder med lang TTL, pågående med kort. Aldri element-summary (N+1).
  const liveByGw = new Map();
  if (firstEvent <= maxGw) {
    const gws = [];
    for (let gw = firstEvent; gw <= maxGw; gw++) gws.push(gw);
    const results = await Promise.all(
      gws.map((gw) => (eventsById.get(gw)?.finished ? getLiveHistoric(gw) : getLive(gw))),
    );
    gws.forEach((gw, i) => liveByGw.set(gw, results[i]));
  }

  return buildTransferAnalysis({ transfers, history, bootstrap, liveByGw });
}
