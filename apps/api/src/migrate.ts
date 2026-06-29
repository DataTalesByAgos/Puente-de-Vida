import { pool, waitForDb } from './db';
import { SCHEMA_SQL } from './schema';

export async function runMigrations(): Promise<void> {
  await pool.query(SCHEMA_SQL);
  console.log('[migrate] Esquema aplicado correctamente.');
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
