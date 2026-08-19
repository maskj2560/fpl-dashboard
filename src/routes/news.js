import { Router } from 'express';
import { getNews } from '../services/news.js';
import * as ai from '../services/ai.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const news = await getNews();
    res.renderPage('news', {
      title: 'Nyheter',
      items: news.items,
      points: news.points,
      generatedAt: news.summary?.generatedAt ?? null,
      aiEnabled: ai.isEnabled(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
