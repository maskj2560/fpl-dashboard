// Oppstart: den ENESTE fila som lytter, håndterer signaler og starter timere.
// Selve appen bygges av createApp() i app.js — den kan lastes i tester uten at
// noe av dette skjer.
import config from './config.js';
import { createApp } from './app.js';
import { createShutdown } from './middleware.js';
import { startScheduler } from './services/notify.js';
import { startAiRefresher } from './services/refresh.js';
import { startPriceWatcher } from './services/prices.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`FPL-dashboard lytter på http://localhost:${config.port}`);
});

// Ryddig avslutning ved deploy/omstart — uten dette må Docker SIGKILL-e.
const shutdown = createShutdown({ server });
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Inaktiv uten DISCORD_WEBHOOK_URL.
startScheduler();

// Inaktiv uten ANTHROPIC_API_KEY. Holder AI-tekstene varme på timer, slik at
// ingen sidevisning venter på en Claude-rundtur.
startAiRefresher();
// Prisvarsler (v1.10.0): alltid aktiv — snapshot hver time, Discord kun med webhook.
startPriceWatcher();
