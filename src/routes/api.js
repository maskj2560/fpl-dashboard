import { Router } from 'express';
import { assembleBrief } from './brief.js';

const router = Router();

router.get('/brief.json', async (req, res, next) => {
  try {
    res.json(await assembleBrief());
  } catch (err) {
    next(err);
  }
});

export default router;
