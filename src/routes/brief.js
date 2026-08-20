import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getFixtures, getPicks, FplError } from '../services/fplClient.js';
import { buildBrief } from '../services/brief.js';
import { currentEvent, nextEvent, resolvePicks } from '../services/analysis.js';
import { buildBriefPrompt, sanitizeBriefText } from '../services/prompts.js';
import * as ai from '../services/ai.js';

const router = Router();

/** Delt av /brief (HTML) og /api/brief.json. Eksporteres for gjenbruk. */
export async function assembleBrief() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
  let myTeam = null;
  if (config.hasTeamId) {
    const gw = currentEvent(bootstrap.events)?.id ?? (nextEvent(bootstrap.events)?.id ?? 2) - 1;
    if (gw >= 1) {
      try {
        const picks = await getPicks(config.fplTeamId, gw);
        const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
        myTeam = {
          squadPlayers: resolvePicks(picks.picks, byId).map((s) => s.player),
          elements: bootstrap.elements,
          bank: picks.entry_history.bank,
          fromGw: nextEvent(bootstrap.events)?.id ?? gw,
        };
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
      }
    }
  }
  return buildBrief({ bootstrap, fixtures, myTeam });
}

router.get('/', async (req, res, next) => {
  try {
    const brief = await assembleBrief();
    let aiBrief = null;
    if (ai.isEnabled()) {
      aiBrief = await ai.generate({
        cacheKey: `ai-brief-gw${brief.gameweek?.id ?? 0}`,
        minIntervalMs: 60 * 60_000,
        system: 'Du er en norsk Fantasy Premier League-ekspert. Skriv presist og handlingsorientert.',
        prompt: buildBriefPrompt(brief),
        maxTokens: 4000,
      });
      // Etterkontroll: modellen har påstått ting om deadline som ikke stemmer
      // med kampdataene. Uriktige setninger fjernes før briefen vises.
      if (aiBrief?.text) aiBrief = { ...aiBrief, text: sanitizeBriefText(aiBrief.text, brief) };
    }
    res.renderPage('brief', { title: 'Rundebrief', brief, aiBrief });
  } catch (err) {
    next(err);
  }
});

export default router;
