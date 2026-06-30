export interface IdentityResult {
  verified: boolean;
  fullName: string | null;
  source: 'cne' | 'none';
  error?: string;
}

async function verifyCNE(nacionalidad: string, cedula: string): Promise<IdentityResult> {
  const url = `http://www.cne.gob.ve/web/registro_electoral/ce.php?nacionalidad=${encodeURIComponent(nacionalidad)}&cedula=${encodeURIComponent(cedula)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return { verified: false, fullName: null, source: 'cne', error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const tdMatch = html.match(
      /<td[^>]*>\s*<\/td>\s*<td[^>]*>\s*V-?\d+\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
    );
    if (!tdMatch) {
      return { verified: false, fullName: null, source: 'cne', error: 'No encontrado en CNE' };
    }
    const name = tdMatch[1].trim();
    return { verified: true, fullName: name, source: 'cne' };
  } catch (err) {
    return { verified: false, fullName: null, source: 'cne', error: String(err) };
  }
}

export async function verifyIdentity(cedula: string): Promise<IdentityResult> {
  const match = cedula.match(/^([VE])\-?(\d+)$/i);
  if (!match) {
    return {
      verified: false,
      fullName: null,
      source: 'none',
      error: 'Formato de cédula inválido (ej: V-12345678)',
    };
  }
  const nacionalidad = match[1].toUpperCase();
  const numero = match[2];
  if (nacionalidad !== 'V' && nacionalidad !== 'E') {
    return { verified: false, fullName: null, source: 'none', error: 'Nacionalidad inválida' };
  }
  return verifyCNE(nacionalidad, numero);
}
