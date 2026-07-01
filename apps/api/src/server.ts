import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { pool, waitForDb } from './db';
import { runMigrations } from './migrate';
import { reportsRoutes } from './routes/reports';
import { syncRoutes } from './routes/sync';
import { dashboardRoutes } from './routes/dashboard';
import { resourcesRoutes } from './routes/resources';
import { whatsappRoutes } from './routes/whatsapp';
import { adminRoutes } from './routes/admin';
import { orgRoutes } from './routes/orgs';
import { externalRoutes } from './routes/external';
import { needsRoutes } from './routes/needs';
import { volunteerRoutes } from './routes/volunteer';
import { infoRoutes } from './routes/info';
import { runIngestion } from './services/ingestion';

export async function buildServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 5 * 1024 * 1024, // 5MB (permite fotos en base64)
  });

  await app.register(cors, {
    origin: config.corsOrigin.length ? config.corsOrigin : true,
  });

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    hook: 'onRequest',
    allowList: ['127.0.0.1', '::1'],
    errorResponseBuilder: (_req: unknown, context: { after: string }) => ({
      error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
      statusCode: 429,
      retryAfter: context.after,
    }),
  });

  app.get('/health', async () => ({
    status: 'ok',
    aiEngine: config.resolvedAiProvider,
    time: new Date().toISOString(),
  }));

  await app.register(reportsRoutes);
  await app.register(syncRoutes);
  await app.register(dashboardRoutes);
  await app.register(resourcesRoutes);
  await app.register(whatsappRoutes);
  await app.register(adminRoutes);
  await app.register(orgRoutes);
  await app.register(externalRoutes);
  await app.register(needsRoutes);
  await app.register(volunteerRoutes);
  await app.register(infoRoutes);

  return app;
}

async function start() {
  await waitForDb();
  await runMigrations();

  const app = await buildServer();
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Puente de Vida API escuchando en http://${config.host}:${config.port}`);

    // Auto-sync de fuentes externas (opcional)
    if (config.ingestIntervalMin > 0) {
      app.log.info(`Ingesta automática cada ${config.ingestIntervalMin} min`);
      const sync = async () => {
        try {
          const r = await runIngestion();
          app.log.info(
            `[auto-ingest] ${r.total} personas · ${r.sources.map((s) => `${s.name}=${s.inserted}`).join(' ')}`,
          );
        } catch (err) {
          app.log.error({ err }, '[auto-ingest] Error');
        }
      };
      sync(); // primera vez al arrancar
      setInterval(sync, config.ingestIntervalMin * 60 * 1000);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Solo arranca el servidor si se ejecuta directamente (no en tests).
if (require.main === module) {
  start().catch((err) => {
    console.error('Fallo al iniciar la API:', err);
    process.exit(1);
  });
}
