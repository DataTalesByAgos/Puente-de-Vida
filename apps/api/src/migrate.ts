import { pool, waitForDb } from './db';
import { SCHEMA_SQL } from './schema';
import { seedExternalSources } from './services/ingestion';

export async function runMigrations(): Promise<void> {
  await pool.query(SCHEMA_SQL);
  await seedExternalSources();
  console.log('[migrate] Esquema aplicado y fuentes externas sembradas.');
}

if (require.main === module) {
  (async () => {
    await waitForDb();
    await runMigrations();
    await pool.end();
  })().catch((err) => {
    console.error('[migrate] Error:', err);
    process.exit(1);
  });
}
