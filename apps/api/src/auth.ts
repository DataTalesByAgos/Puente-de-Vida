import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Sesiones activas compartidas entre rutas admin y orgs
// El Map almacena sesiones con expiración (timestamp en ms)
export interface Session {
  userId: string;
  username: string;
  role: string;
  expiresAt: number; // ms desde epoch
}

export const sessions = new Map<string, Session>();

// Limpiar sesiones expiradas cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
      if (session.expiresAt <= now) sessions.delete(token);
    }
  }, CLEANUP_INTERVAL);
  // Permitir que el proceso termine aunque el timer esté activo
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function hashPass(pass: string, salt: string): string {
  return scryptSync(pass, salt, 64).toString('hex');
}

export function createSession(userId: string, username: string, role: string): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    username,
    role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });
  startCleanup();
  return token;
}

export function parseCookie(cookieHeader: string | string[] | undefined): string | null {
  if (!cookieHeader) return null;
  const raw = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === 'pdv_token') {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

export function parseAuth(req: {
  headers?: Record<string, string | string[] | undefined>;
}): Session | null {
  const authHeader = req.headers?.['authorization'];
  const auth = (Array.isArray(authHeader) ? authHeader[0] : (authHeader ?? '')).replace(
    /^bearer\s+/i,
    '',
  );

  let token = auth;
  if (!token || !sessions.get(token)) {
    token = parseCookie(req.headers?.['cookie']) ?? '';
  }

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export const PERM = { viewer: 0, operator: 1, admin: 2 } as const;

export function minRole(role: string, required: keyof typeof PERM): boolean {
  return (PERM[role as keyof typeof PERM] ?? 0) >= PERM[required];
}
