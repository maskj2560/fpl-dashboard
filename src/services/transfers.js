// Historisk «hva hvis»-analyse av egne transfers: hva hver overgang faktisk
// var verdt i rå spillerpoeng (uten benk-/kapteinsvekting), minus straff.
// Vinduet per transfer er perioden byttet var i effekt: fra runden det
// gjaldt, til inn-spilleren ble solgt igjen eller ut-spilleren kjøpt
// tilbake. Free hit-transfers reverseres av FPL og terminerer aldri andre
// vinduer.
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
  const name = (id) => elementsById.get(id)?.web_name ?? `Ukjent (${id})`;

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

    return {
      event: from,
      chip: chipName === 'wildcard' || chipName === 'freehit' ? chipName : null,
      inn: { id: tr.element_in, name: name(tr.element_in), points: innPoints },
      ut: { id: tr.element_out, name: name(tr.element_out), points: utPoints },
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

  return {
    rows,
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
