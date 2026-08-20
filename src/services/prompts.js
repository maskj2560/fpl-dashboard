// Rene promptbyggere for AI-funksjonene. Ingen nettverkskall her.
import { formatPrice } from './analysis.js';

export function buildBriefPrompt(brief) {
  const parts = [
    `Skriv en kort rundebrief på norsk for Fantasy Premier League, ${brief.gameweek?.name ?? 'kommende runde'}.`,
    `Deadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}.`,
    '',
    'Skadenytt (høyt eide spillere):',
    ...brief.injuries.map((i) => `- ${i.name} (${i.team}, eid ${i.ownership} %): ${i.news}`),
    '',
    'Mest aktuelle kapteiner globalt:',
    ...brief.captains.map((c) => `- ${c.name} (${c.team}), form ${c.form}, eid ${c.ownership} %`),
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
    'Skriv briefen med disse seksjonene i markdown: «Deadline», «Skadenytt», «Kapteinsvalg», «Kamper å følge med på»' +
      (brief.mine ? ', «Mine grep»' : '') +
      '. Vær konkret og kortfattet, sett spillernavn i **fet**. Maks ~350 ord. Ingen innledning utover seksjonene.' +
      ' Utled aldri tidsforhold selv: skal du si noe om hva som skjer før eller etter deadline, bruk kun de forhåndsberegnede tidsfaktaene over.' +
      ' Bruk norske fotballuttrykk: skriv «holdt nullen», aldri «clean sheet»; «runde», aldri «gameweek». Ordet «deadline» brukes som det er.',
  );
  return parts.join('\n');
}

export function buildAdvicePrompt({ entryName, bank, squadLines, outs }) {
  return [
    `Du er FPL-rådgiver. Laget «${entryName}» har ${formatPrice(bank)} £m i banken.`,
    '',
    'Troppen (navn, lag, posisjon, pris, form):',
    ...squadLines.map((l) => `- ${l}`),
    '',
    outs.length ? 'Automatisk flaggede salgskandidater:' : 'Ingen automatisk flaggede salgskandidater.',
    ...outs.map((o) => `- ${o}`),
    '',
    'Gi på norsk: 1) beste kaptein denne runden med begrunnelse, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Sett spillernavn i **fet**. Maks ~250 ord.',
  ].join('\n');
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

/**
 * Etterkontroll av AI-briefen: fjerner setninger som påstår noe om «før» eller
 * «etter deadline» som ikke stemmer med de forhåndsberegnede kampdataene.
 * Ren funksjon, ingen regenerering — svaret er uansett cachet en time, så det
 * robuste valget er å utelate setningen framfor å be modellen prøve igjen.
 * Setninger splittes med maskering av norske forkortelser og klokkeslett, så
 * punktum i «kl.»/«21.00» ikke kutter setningen i to.
 */
export function sanitizeBriefText(text, brief) {
  const matches = (brief?.fixturesByDay ?? []).flatMap((d) => d.matches);
  if (!text || matches.length === 0 || matches.every((m) => m.beforeDeadline == null)) return text;

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

  const keep = (sentence) => {
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

  const dropped = [];
  const lines = text.split('\n').map((line) => {
    if (!/deadline/i.test(line)) return line;
    const masked = maskDots(line);
    const sentences = masked.match(/[^.!?]+[.!?]*/g) ?? [masked];
    const kept = sentences.filter((s) => {
      if (keep(s)) return true;
      dropped.push(unmaskDots(s).trim());
      return false;
    });
    if (kept.length === sentences.length) return line;
    const rest = unmaskDots(kept.join('')).trim();
    // Er det bare et punktmerke eller en overskriftsmarkør igjen, ryddes linjen bort.
    return /^([-*]|#{1,3})?\s*$/.test(rest) ? null : rest;
  });

  if (dropped.length) {
    console.warn('AI-brief: fjernet %d uriktig(e) deadline-påstand(er):', dropped.length, dropped);
  }
  return lines.filter((line) => line !== null).join('\n');
}
