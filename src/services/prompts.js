// Rene promptbyggere for AI-funksjonene. Ingen nettverkskall her.
import { formatPrice } from './analysis.js';

export function buildBriefPrompt(brief) {
  const parts = [
    `Skriv en kort rundebrief på norsk for Fantasy Premier League, ${brief.gameweek?.name ?? 'kommende runde'}.`,
    `Deadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}.`,
    '',
    'Skadenytt (høyt eide spillere):',
    ...(brief.injuries.length
      ? brief.injuries.map((i) => `- ${i.name} (${i.team}, eid ${i.ownership} %): ${i.news}`)
      : ['- Ingen høyt eide spillere er flagget.']),
    '',
    // FPL publiserer ingen målt kapteinsandel — lista er høyt eide spillere
    // med gunstig kamp, og etiketten skal ikke late som noe annet (v1.2.5).
    `Kapteinskandidater globalt (høyt eide spillere med gunstig kamp, rangert på ${CRITERION_LABELS[brief.captainsCriterion] ?? 'form'} — ikke målt kapteinsandel):`,
    ...brief.captains.map((c) => `- ${c.name} (${c.team}), form ${c.form}, ventet ${c.epNext ?? '?'} p, eid ${c.ownership} %`),
    '',
    'Kamper:',
    ...brief.fixturesByDay.map((d) => `${d.day}: ${d.matches.map((m) => `${m.home}–${m.away} ${m.kickoff}`).join(', ')}`),
    '',
    // Modellen regnet tidligere selv ut hva som lå før deadline, og bommet.
    // Fasiten er beregnet her; modellen skal bare gjengi den.
    'Forhåndsberegnede tidsfakta (fasit — ikke regn ut noe selv):',
    brief.fixturesBeforeDeadline?.length
      ? `Disse kampene starter FØR deadline: ${brief.fixturesBeforeDeadline.join(', ')}. Alle andre kamper i runden starter etter deadline.`
      : 'Ingen kamper starter før deadline — samtlige kamper i runden spilles etter at deadline har passert.',
  ];
  if (brief.mine) {
    parts.push('', 'Mine kapteinskandidater:', ...brief.mine.captains.map((c) => `- ${c.player.web_name}: ${c.reasons.join('; ')}`));
    parts.push('', 'Mine mulige bytter:', ...brief.mine.transfers.map((t) => `- Ut: ${t.out.player.web_name} (${t.out.reasons.join('; ')}). Inn-kandidater: ${t.inn.map((k) => k.player.web_name).join(', ') || 'ingen'}`));
  }
  parts.push(
    '',
    'REGLER:',
    '- Bruk kun tall som står i datagrunnlaget over. Finn aldri på tall, og gjengi prosenter og formtall eksakt slik de står — ikke rund av.',
    '- Skadelista over er fasit. Er den ikke tom: skriv aldri at alle er friske eller at det ikke er noe skadenytt.',
    '- Kapteinslista er høyt eide spillere med gunstig kamp — ikke målt kapteinsandel. Omtal den aldri som «mest valgte» eller «mest brukte» kapteiner.',
    '- Utled aldri tidsforhold selv: skal du si noe om hva som skjer før eller etter deadline, bruk kun de forhåndsberegnede tidsfaktaene over.',
    '',
    'Skriv briefen med disse seksjonene i markdown: «Deadline», «Skadenytt», «Kapteinsvalg», «Kamper å følge med på»' +
      (brief.mine ? ', «Mine grep»' : '') +
      '. Vær konkret og kortfattet, sett spillernavn i **fet**. Maks ~350 ord. Ingen innledning utover seksjonene.' +
      ' Bruk norske fotballuttrykk: skriv «holdt nullen», aldri «clean sheet»; «runde», aldri «gameweek». Ordet «deadline» brukes som det er.',
  );
  return parts.join('\n');
}

// Kriterienavn fra captainSuggestions (analysis.js) → norsk etikett.
const CRITERION_LABELS = { form: 'form', ep_next: 'forventet poeng (FPL)' };

/**
 * AI-kommentaren til overgangsanalysen (/overganger). Kompakt grunnlag:
 * sesongtall, én linje per SPILT bytte (pending utelates — modellen skal
 * aldri spå), beste/verste og «laget uten bytter»-differansen når den
 * finnes. Samme regelfilosofi som briefen: kun tall fra grunnlaget.
 */
export function buildTransferCommentPrompt(analysis, { baseline = null } = {}) {
  const played = analysis.rows.filter((r) => r.played);
  const parts = [
    'Kommenter overgangene mine i Fantasy Premier League denne sesongen.',
    '',
    `Sesongtall: ${analysis.season.played} spilte bytter, ${analysis.season.wins} i pluss` +
      (analysis.season.hitRate !== null
        ? ` (treffprosent ${Math.round(analysis.season.hitRate * 100)} %)`
        : '') +
      `, netto ${analysis.totals.netto} poeng inkludert ${analysis.totals.cost} i trekk.`,
    '',
    'Byttene (rå poengdiff inn mot ut i byttets vindu, netto = diff minus straffandel):',
    ...played.map((r) => {
      const vindu =
        r.window.from === r.window.to
          ? `R${r.window.from}`
          : `R${r.window.from}–R${r.window.to}`;
      const milepael = r.after5 ? `, etter ${r.after5.gws} runder: ${r.after5.diff}` : '';
      const chip = r.chip ? `, chip: ${r.chip}` : '';
      return `- R${r.event}: ${r.ut.name} ut, ${r.inn.name} inn (${vindu}): diff ${r.diff}, netto ${r.netto}${milepael}${chip}`;
    }),
  ];
  if (analysis.bestIndex !== null && analysis.worstIndex !== null) {
    parts.push(
      '',
      `Beste bytte: ${analysis.rows[analysis.bestIndex].inn.name} inn. Verste: ${analysis.rows[analysis.worstIndex].inn.name} inn.`,
    );
  }
  if (baseline && baseline.diff !== null) {
    parts.push(
      '',
      `Laget uten bytter: ${baseline.simTotal} poeng simulert mot ${baseline.actualTotal} faktisk — byttene har totalt ${baseline.diff >= 0 ? 'gitt' : 'kostet'} ${Math.abs(baseline.diff)} poeng.`,
    );
  }
  parts.push(
    '',
    'REGLER:',
    '- Bruk kun tall som står i grunnlaget over. Finn aldri på tall.',
    '- Vurder hvert bytte kort og ærlig: uttelling og timing («godt bytte», «dårlig timing», «for tidlig å dømme»).',
    '- Maks ~120 ord, norsk, spillernavn i **fet**. Ingen innledning og ingen overskrifter.',
    '- Skriv «runde», aldri «gameweek». Ordet «deadline» brukes som det er.',
  );
  return parts.join('\n');
}

/**
 * Rådgiver-prompten (/lag → «Spør AI om råd»).
 *
 * Fullt signalsett per spiller (form, ep_next, minutter, totalpoeng,
 * skadestatus) skiller «ingen data» fra «dårlig form» — uten det diktet
 * modellen begrunnelser om spillere med 0 minutter (B-2, prod 22. aug 2026).
 * Sidens egne beregninger (kapteinstopp med kriterium, innkjøpskandidater)
 * sendes med så rådgiveren og /lag resonnerer fra samme rangering — UI-et
 * faller tilbake på ep_next når all form er 0. Runde, deadline og nåværende
 * kaptein er med fordi modellen ellers ikke vet hvilken runde rådet gjelder.
 * Antall gratis bytter er ikke tilgjengelig uten innlogging (`my-team/` gir
 * 403), så modellen instrueres eksplisitt om ikke å spekulere i det.
 */
export function buildAdvicePrompt({
  entryName,
  bank,
  fromGw,
  deadlineText,
  captainName,
  viceName,
  roundsPlayed,
  squad = [],
  pageCaptains = null,
  transfers = [],
}) {
  const opponentText = (opponents) =>
    opponents.length
      ? opponents.map((o) => `mot ${o.team} (${o.home ? 'hjemme' : 'borte'}, FDR ${o.fdr})`).join(' og ')
      : 'ingen kamp';
  const injuryNote = (p) => {
    if (p.status === 'a' && (p.chance == null || p.chance >= 100)) return '';
    const cause = p.news?.trim() || 'skadet/usikker';
    const chance = p.chance != null ? ` (spillesjanse ${p.chance} %)` : '';
    return ` — SKADET/USIKKER: ${cause}${chance}`;
  };
  const playerLine = (p) =>
    `- ${p.name} (${p.team}, ${p.pos}, ${formatPrice(p.price)}, form ${p.form}, ventet ${p.epNext} p neste runde, ${p.minutes} min, ${p.totalPoints} p totalt, ${opponentText(p.opponents)})${injuryNote(p)}`;
  const innText = (inn) =>
    inn.length
      ? inn.map((k) => `${k.name} (${k.team}, ${formatPrice(k.price)}, form ${k.form}, ventet ${k.epNext} p)`).join(', ')
      : 'ingen';

  const parts = [`Du er FPL-rådgiver. Laget «${entryName}» har ${formatPrice(bank)} £m i banken.`];
  if (fromGw != null) {
    parts.push(
      deadlineText
        ? `Rådet gjelder Runde ${fromGw} (deadline ${deadlineText}).`
        : `Rådet gjelder Runde ${fromGw}.`,
    );
  }
  if (captainName) {
    parts.push(
      viceName
        ? `Nåværende kaptein: ${captainName} (visekaptein: ${viceName}).`
        : `Nåværende kaptein: ${captainName}.`,
    );
  }
  if (roundsPlayed != null) parts.push(`Ferdigspilte runder denne sesongen: ${roundsPlayed}.`);

  parts.push(
    '',
    'DATAGRUNNLAG — troppen (lag, posisjon, pris, form, ventet poeng neste runde (FPL), spilletid, totalpoeng, motstander):',
    ...squad.map(playerLine),
    '',
    'SIDENS BEREGNINGER (det brukeren ser på /lag):',
    pageCaptains?.list?.length
      ? `Kapteinsforslag, rangert på ${CRITERION_LABELS[pageCaptains.criterion] ?? pageCaptains.criterion}:`
      : 'Siden har ingen kapteinsforslag ennå (mangler datagrunnlag).',
    ...(pageCaptains?.list ?? []).map((c) => `- ${c.name}: ${c.reasons.join('; ')}`),
    '',
    transfers.length
      ? 'Salgskandidater med sidens innkjøpskandidater:'
      : 'Ingen automatisk flaggede salgskandidater.',
    ...transfers.map((t) => `- Ut: ${t.outName} (${t.reasons.join('; ')}). Inn-kandidater: ${innText(t.inn)}`),
    '',
    'REGLER:',
    '- 0 minutter spilt betyr «ingen data ennå» — omtal det aldri som svak eller dårlig form.',
    '- Bruk kun tall som står i datagrunnlaget over. Finn aldri på formtall, poeng eller annen statistikk.',
    '- Anbefal aldri en spiller merket SKADET/USIKKER som kaptein, og nevn spillesjansen når du omtaler en flagget spiller.',
    '- Du vet ikke hvor mange gratis bytter laget har. Anta aldri at et bytte er gratis, og bruk aldri antall gratis bytter som argument. Nevn kostnaden på 4 poeng kun som forbehold.',
    '',
    'OPPGAVE — gi på norsk: 1) beste kaptein denne runden med begrunnelse — si eksplisitt om nåværende kaptein bør beholdes eller byttes, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Avviker rådet ditt fra sidens beregninger, si kort hvorfor. Sett spillernavn i **fet**. Maks ~250 ord.',
  );
  return parts.join('\n');
}

// Norske forkortelser med punktum som ikke avslutter en setning. Punktumene
// maskeres før setningssplitting og gjenopprettes etterpå. Bevisst en enkel,
// eksplisitt liste: regelen «ikke splitt før liten bokstav» ville feilet for
// «bl.a. Arsenal», der neste ord er et egennavn.
const ABBREVIATIONS = ['f.eks.', 'bl.a.', 'dvs.', 'osv.', 'mfl.', 'evt.', 'pga.', 'o.l.', 'ca.', 'kl.', 'nr.', 'jf.'];
const ABBR_RE = new RegExp(
  `(?<!\\p{L})(?:${ABBREVIATIONS.map((a) => a.replaceAll('.', '\\.')).join('|')})`,
  'giu',
);
const DOT_MASK = '\u0001';
const maskDots = (line) =>
  line
    .replace(ABBR_RE, (abbr) => abbr.replaceAll('.', DOT_MASK))
    .replace(/(\d)\.(?=\d)/g, `$1${DOT_MASK}`); // klokkeslett/desimaltall: «21.00», «2.5»
const unmaskDots = (s) => s.replaceAll(DOT_MASK, '.');

// FPL-navn (`teams.name`) → skriveformer modellen kan bruke i stedet.
// Lag uten oppføring matches på navnet fra dataene alene — nyopprykkede lag
// virker uten endring her; legg til en rad først når FPL-navnet og vanlig
// skriftform ikke overlapper. Tvetydige enkeltord («City», «United») skal
// bevisst IKKE inn: i tvil beholder funksjonen teksten.
const TEAM_ALIASES = {
  'Spurs': ['Tottenham', 'Tottenham Hotspur'],
  'Man City': ['Manchester City'],
  'Man Utd': ['Manchester United'],
  "Nott'm Forest": ['Nottingham Forest', 'Forest'],
  'Aston Villa': ['Villa'],
  'Coventry City': ['Coventry'],
  'Hull City': ['Hull'],
  'Ipswich Town': ['Ipswich'],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Ordgrense + valgfri genitiv («Liverpools», «Spurs'») — hindrer treff inni
// ord («Forestillingen» er ikke «Forest»). Case-sensitiv, som includes var.
const teamNameRe = (name) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?:'?s|')?(?![\\p{L}\\p{N}])`, 'u');

// Samler alle tallverdier (tall + tall inni strenger, komma normalisert til
// punktum) fra spiller-delene av briefen. Fasit for prosentkontrollen —
// bevisst IKKE hele brief-objektet: kamptider og datoer («17:30», «21.00»)
// ville gitt falske nær-treff mot eierandeler.
function collectBriefNumbers(value, out = new Set()) {
  if (typeof value === 'number' && Number.isFinite(value)) out.add(value);
  else if (typeof value === 'string') {
    for (const m of value.matchAll(/\d+(?:[.,]\d+)?/g)) out.add(parseFloat(m[0].replace(',', '.')));
  } else if (Array.isArray(value)) value.forEach((v) => collectBriefNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectBriefNumbers(v, out));
  return out;
}

// Friskmeldinger: «alle … friske», «ingen … skadenytt/skader». Bevisst uten
// «skadene» (bestemt form) — «ingen av skadene er alvorlige» påstår at det
// FINNES skader, og skal stå. Kontrollen er kun aktiv når skadelista har
// innhold, så tomme runder kan friskmeldes fritt.
const FRISKMELDING_RE =
  /(\balle\b[^.!?]*\bfrisk\w*)|(\bingen\b[^.!?]*\b(skadenytt|skader|skadde|fravær|skadeproblemer)\b)/iu;

/**
 * Etterkontroll av AI-briefen: fjerner setninger som motsier datagrunnlaget.
 * Tre kontroller, hver med sitt aktiveringsvilkår og sitt linjefilter:
 * deadline-påstander som ikke stemmer med de forhåndsberegnede kampdataene
 * (P1-4), friskmeldinger av troppen når skadelista har innhold, og
 * prosenttall som er forvrengte gjengivelser av fasiten (begge v1.2.5).
 * Ren funksjon, ingen regenerering — svaret er uansett cachet en time, så det
 * robuste valget er å utelate setningen framfor å be modellen prøve igjen.
 * Setninger splittes med maskering av norske forkortelser og klokkeslett, så
 * punktum i «kl.»/«21.00» ikke kutter setningen i to.
 */
export function sanitizeBriefText(text, brief) {
  if (!text) return text;

  // Deadline-kontrollen (P1-4 — uendret logikk, nå bak sitt eget vilkår).
  const matches = (brief?.fixturesByDay ?? []).flatMap((d) => d.matches);
  const deadlineAktiv = matches.length > 0 && !matches.every((m) => m.beforeDeadline == null);
  let keepDeadline = () => true;
  if (deadlineAktiv) {
    const before = new Set();
    const after = new Set();
    for (const m of matches) {
      (m.beforeDeadline ? before : after).add(m.home);
      (m.beforeDeadline ? before : after).add(m.away);
    }
    const anyBefore = before.size > 0;
    const toMatchers = (set) =>
      [...set].flatMap((name) => [name, ...(TEAM_ALIASES[name] ?? [])]).map(teamNameRe);
    const beforeMatchers = toMatchers(before);
    const afterMatchers = toMatchers(after);
    const names = (sentence, matchers) => matchers.some((re) => re.test(sentence));
    // Negerte utsagn («ingen kamper starter før deadline») er ikke påstander om
    // at en bestemt kamp ligger før deadline, og skal ikke kontrolleres her.
    const NEGATION = /\b(ingen|ikke|verken|aldri)\b/i;
    // Kontrollen gjelder bare utsagn om når kampene spilles — ikke råd som
    // «sjekk laget rett før deadline», der «før deadline» er et tidspunkt.
    const OM_KAMPER = /\b(kamp|kamper|kampene|oppgjør|oppgjøret|runden spilles|spilles|starter|avspark|sparkes i gang)\b/i;

    keepDeadline = (sentence) => {
      const claimsBefore = /før\s+deadline/i.test(sentence);
      const claimsAfter = /etter\s+deadline/i.test(sentence);
      if (!claimsBefore && !claimsAfter) return true;
      if (NEGATION.test(sentence)) return true;
      // Nevner setningen bare lag som spiller på «feil» side av deadline, er den gal.
      if (claimsBefore && names(sentence, afterMatchers) && !names(sentence, beforeMatchers)) return false;
      if (claimsAfter && names(sentence, beforeMatchers) && !names(sentence, afterMatchers)) return false;
      // Uten lagnavn: bare utsagn om selve kampene kan motbevises av dataene.
      if (claimsBefore && !anyBefore && OM_KAMPER.test(sentence)) return false;
      return true;
    };
  }

  // Friskmeldingskontrollen (v1.2.5): modellen skrev «alle stiller friske»
  // mens skadelista hadde innhold. Deadline-kontrollens negasjonsvern gjelder
  // bevisst ikke her — en friskmelding ER en negasjon.
  const friskAktiv = (brief?.injuries?.length ?? 0) > 0;
  const keepFrisk = (sentence) => !FRISKMELDING_RE.test(sentence);

  // Prosentkontrollen (v1.2.5): nær-miss ±1,0 feller forvrengninger. Et
  // prosenttall som ikke står i dataene, men ligger tett på en fasitverdi, er
  // en forvrengt gjengivelse; tall langt fra alt er en omtrentlighet.
  const fasit = [...collectBriefNumbers({ injuries: brief?.injuries, captains: brief?.captains, mine: brief?.mine })];
  const prosentAktiv = fasit.length > 0;
  const keepProsent = (sentence) => {
    const plain = unmaskDots(sentence); // maskDots har maskert desimalpunktum
    for (const m of plain.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
      const p = parseFloat(m[1].replace(',', '.'));
      if (fasit.some((v) => v === p)) continue; // eksakt i dataene — greit
      if (fasit.some((v) => Math.abs(v - p) <= 1.0)) return false; // forvrengt
    }
    return true; // langt fra alt: omtrentlighet, ikke forvrengning
  };

  const dropped = [];
  const lines = text.split('\n').map((line) => {
    const sjekker = [];
    if (deadlineAktiv && /deadline/i.test(line)) sjekker.push(keepDeadline);
    if (friskAktiv && /frisk|skade|fravær/i.test(line)) sjekker.push(keepFrisk);
    if (prosentAktiv && line.includes('%')) sjekker.push(keepProsent);
    if (sjekker.length === 0) return line;
    const masked = maskDots(line);
    const sentences = masked.match(/[^.!?]+[.!?]*/g) ?? [masked];
    const kept = sentences.filter((s) => {
      if (sjekker.every((k) => k(s))) return true;
      dropped.push(unmaskDots(s).trim());
      return false;
    });
    if (kept.length === sentences.length) return line;
    const rest = unmaskDots(kept.join('')).trim();
    // Er det bare et punktmerke eller en overskriftsmarkør igjen, ryddes linjen bort.
    return /^([-*]|#{1,3})?\s*$/.test(rest) ? null : rest;
  });

  if (dropped.length) {
    console.warn('AI-brief: fjernet %d setning(er) som motsier datagrunnlaget:', dropped.length, dropped);
  }
  return lines.filter((line) => line !== null).join('\n');
}

/**
 * «Rundens rapport» for miniligaen (v1.6.0): én Discord-melding etter
 * rundeslutt — min runde + ligaen, «roast med glimt i øyet».
 * Samme REGLER-mønster som briefen og transfer-kommentaren.
 */
export function buildLeagueReportPrompt(data) {
  const parts = [
    `Skriv «Rundens rapport» for miniligaen ${data.league.name} (${data.league.size} lag) etter ${data.event.name} i Fantasy Premier League.`,
    '',
    'Tabellen (plass, lag, manager, rundepoeng, totalt):',
    ...data.table.map(
      (r) => `- ${r.rank}. ${r.entryName} (${r.playerName}): ${r.eventTotal} p denne runden, ${r.total} totalt`,
    ),
    '',
  ];
  if (data.winner) parts.push(`Rundens vinner: ${data.winner.entryName} (${data.winner.playerName}) med ${data.winner.eventTotal} poeng.`);
  if (data.loser) parts.push(`Rundens taper: ${data.loser.entryName} (${data.loser.playerName}) med ${data.loser.eventTotal} poeng.`);
  if (data.movers.length > 0) {
    parts.push('', 'Bevegelser i tabellen:', ...data.movers.map((m) => `- ${m.entryName}: ${m.from}. → ${m.to}. plass`));
  }
  if (data.captains.length > 0) {
    parts.push(
      '',
      'Kapteinsvalgene (rå poeng, tapt = beste spiller i start-XI minus kapteinen):',
      ...data.captains.map(
        (c) => `- ${c.entryName}: ${c.captain}${c.tc ? ' (TC)' : ''} — ${c.points} p, tapte ${c.lost} mot optimal`,
      ),
    );
  }
  if (data.mine) {
    const cap = data.mine.captain
      ? ` Kaptein: ${data.mine.captain.name} med ${data.mine.captain.points} p (tapte ${data.mine.captain.lost} mot optimal).`
      : '';
    const move =
      data.mine.lastRank && data.mine.lastRank !== data.mine.rank
        ? ` Gikk fra ${data.mine.lastRank}. til ${data.mine.rank}. plass.`
        : '';
    parts.push('', `Mitt lag: ${data.mine.entryName}, ${data.mine.eventTotal} p denne runden, nr. ${data.mine.rank} i ligaen.${move}${cap}`);
  }
  parts.push(
    '',
    'TONE: roast med glimt i øyet — ert rundens taper godmodig, skål for vinneren. Aldri ondsinnet, aldri personangrep utover fotballen.',
    '',
    'REGLER:',
    '- Bruk kun tall og navn som står i grunnlaget over. Finn aldri på tall, kamper eller hendelser.',
    '- Manager- og lagnavn skrives nøyaktig som de står.',
    '- Maks ~180 ord, norsk, 2–4 korte avsnitt. Ingen innledning, ingen overskrifter, ingen punktlister.',
    '- Spillernavn i **fet**.',
    '- Skriv «runde», aldri «gameweek».',
  );
  return parts.join('\n');
}
