/* eslint-disable no-console */

import { randomBytes } from 'node:crypto';
import { query } from './db';
import { hashPass } from './auth';

const ADMIN_USER = {
  username: 'admin',
  pass: 'PdV2026!',
  role: 'admin',
  name: 'Administrador del Sistema',
};

async function main() {
  console.log('[seed-admin] Creando usuario administrador de prueba...\n');

  await query("DELETE FROM users WHERE username = 'admin'");

  const salt = randomBytes(16).toString('hex');
  const hash = hashPass(ADMIN_USER.pass, salt);
  await query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', [
    ADMIN_USER.username,
    `${salt}:${hash}`,
    ADMIN_USER.role,
    ADMIN_USER.name,
  ]);

  console.log(`  ✓ Usuario admin creado: ${ADMIN_USER.username} / ${ADMIN_USER.pass}`);
  console.log('\n[seed-admin] Hecho.');
}

main().catch((err) => {
  console.error('[seed-admin] Error:', err);
  process.exit(1);
});
