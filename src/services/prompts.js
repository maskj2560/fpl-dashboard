// Rene promptbyggere for AI-funksjonene. Ingen nettverkskall her.
import { formatPrice } from './analysis.js';

export function buildBriefPrompt(brief) {
  const parts = [
    `Skriv en kort gameweek-brief på norsk for Fantasy Premier League, ${brief.gameweek?.name ?? 'kommende runde'}.`,
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
  ];
  if (brief.mine) {
    parts.push('', 'Mine kapteinskandidater:', ...brief.mine.captains.map((c) => `- ${c.player.web_name}: ${c.reasons.join('; ')}`));
    parts.push('', 'Mine mulige bytter:', ...brief.mine.transfers.map((t) => `- Ut: ${t.out.player.web_name} (${t.out.reasons.join('; ')}). Inn-kandidater: ${t.inn.map((k) => k.player.web_name).join(', ') || 'ingen'}`));
  }
  parts.push(
    '',
    'Skriv briefen med disse seksjonene i markdown: «Deadline», «Skadenytt», «Kapteinsvalg», «Kamper å følge med på»' +
      (brief.mine ? ', «Mine grep»' : '') +
      '. Vær konkret og kortfattet, sett spillernavn i **fet**. Maks ~350 ord. Ingen innledning utover seksjonene.',
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
