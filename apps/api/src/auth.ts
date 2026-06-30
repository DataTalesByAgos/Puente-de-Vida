import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Sesiones activas compartidas entre rutas admin y orgs
export const sessions = new Map<string, { userId: string; username: string; role: string }>();

export function hashPass(pass: string, salt: string): string {
  return scryptSync(pass, salt, 64).toString('hex');
}

export function parseAuth(req: {
  headers?: Record<string, string | string[] | undefined>;
}): { userId: string; username: string; role: string } | null {
  const authHeader = req.headers?.['authorization'];
  const auth = (Array.isArray(authHeader) ? authHeader[0] : (authHeader ?? '')).replace(
    /^bearer\s+/i,
    '',
  );
  return sessions.get(auth) ?? null;
}

export const PERM = { viewer: 0, operator: 1, admin: 2 } as const;

export function minRole(role: string, required: keyof typeof PERM): boolean {
  return (PERM[role as keyof typeof PERM] ?? 0) >= PERM[required];
}
