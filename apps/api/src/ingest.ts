/**
 * Script autónomo de ingesta.
 * Uso: npx tsx src/ingest.ts
 *      npx tsx src/ingest.ts --interval 30  (loop cada 30 min)
 */

import { pool, waitForDb } from './db';
import { runMigrations } from './migrate';
import { runIngestion, seedExternalSources } from './services/ingestion';

async function main() {
  await waitForDb();
  await runMigrations();

  const args = process.argv.slice(2);
  const intervalIdx = args.indexOf('--interval');
  const intervalMin = intervalIdx >= 0 ? parseInt(args[intervalIdx + 1], 10) : 0;

  for (;;) {
    const result = await runIngestion();
    console.log(
      `[ingest] ${new Date().toISOString()} Sincronizadas ${result.total} personas:` +
        result.sources.map((s) => ` ${s.name}=${s.inserted}`).join(''),
    );

    if (!intervalMin) break;
    console.log(`[ingest] Próxima en ${intervalMin} min...`);
    await new Promise((r) => setTimeout(r, intervalMin * 60 * 1000));
  }

  await pool.end();
}

main().catch((err) => {
  console.error('[ingest] Error:', err);
  process.exit(1);
});
