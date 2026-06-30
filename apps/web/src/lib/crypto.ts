import type { LocalReport } from './types';

let key: CryptoKey | null = null;
let ready = false;

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function bytesFromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function initCrypto(secret: string): Promise<void> {
  const salt = new TextEncoder().encode('pdv-crypto-salt-2026');
  const ikm = new TextEncoder().encode(secret);
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'PBKDF2', false, ['deriveKey']);
  key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  ready = true;
}

export function resetCrypto(): void {
  key = null;
  ready = false;
}

export function isCryptoReady(): boolean {
  return ready;
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!key || !plaintext) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return '~' + base64FromBytes(combined);
}

export async function decrypt(ciphertext: string): Promise<string> {
  if (!key || !ciphertext.startsWith('~')) return ciphertext;
  try {
    const combined = bytesFromBase64(ciphertext.slice(1));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return ciphertext;
  }
}

const ENCRYPTED_FIELDS = [
  'reporterName',
  'reporterPhone',
  'rawText',
  'locationText',
  'photoDataUrl',
] as const;

export async function encryptReport(r: LocalReport): Promise<LocalReport> {
  if (!ready) return r;
  const out = { ...r };
  for (const field of ENCRYPTED_FIELDS) {
    const val = (out as Record<string, unknown>)[field];
    if (typeof val === 'string' && val) {
      (out as Record<string, unknown>)[field] = await encrypt(val);
    }
  }
  return out;
}

export async function decryptReport(r: LocalReport): Promise<LocalReport> {
  if (!ready) return r;
  const out = { ...r };
  for (const field of ENCRYPTED_FIELDS) {
    const val = (out as Record<string, unknown>)[field];
    if (typeof val === 'string' && val.startsWith('~')) {
      (out as Record<string, unknown>)[field] = await decrypt(val);
    }
  }
  return out;
}

export async function decryptReports(reports: LocalReport[]): Promise<LocalReport[]> {
  if (!ready) return reports;
  return Promise.all(reports.map(decryptReport));
}
