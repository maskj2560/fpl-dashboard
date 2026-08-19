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

/**
 * Etterkontroll av AI-briefen: fjerner setninger som påstår noe om «før» eller
 * «etter deadline» som ikke stemmer med de forhåndsberegnede kampdataene.
 * Ren funksjon, ingen regenerering — svaret er uansett cachet en time, så det
 * robuste valget er å utelate setningen framfor å be modellen prøve igjen.
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
  const names = (sentence, set) => [...set].some((name) => sentence.includes(name));
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
    if (claimsBefore && names(sentence, after) && !names(sentence, before)) return false;
    if (claimsAfter && names(sentence, before) && !names(sentence, after)) return false;
    // Uten lagnavn: bare utsagn om selve kampene kan motbevises av dataene.
    if (claimsBefore && !anyBefore && OM_KAMPER.test(sentence)) return false;
    return true;
  };

  const dropped = [];
  const lines = text.split('\n').map((line) => {
    if (!/deadline/i.test(line)) return line;
    const sentences = line.match(/[^.!?]+[.!?]*/g) ?? [line];
    const kept = sentences.filter((s) => {
      if (keep(s)) return true;
      dropped.push(s.trim());
      return false;
    });
    if (kept.length === sentences.length) return line;
    const rest = kept.join('').trim();
    // Er det bare et punktmerke eller en overskriftsmarkør igjen, ryddes linjen bort.
    return /^([-*]|#{1,3})?\s*$/.test(rest) ? null : rest;
  });

  if (dropped.length) {
    console.warn('AI-brief: fjernet %d uriktig(e) deadline-påstand(er):', dropped.length, dropped);
  }
  return lines.filter((line) => line !== null).join('\n');
}
