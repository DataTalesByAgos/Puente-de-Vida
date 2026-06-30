import { useState } from 'react';

const PRIVACY_SUMMARY = {
  principles: [
    'Recolectamos solo los datos estrictamente necesarios para la coordinación de emergencias.',
    'Los datos sensibles se cifran localmente (AES-256-GCM) y nunca se comparten con terceros.',
    'El acceso está controlado por roles: cada usuario ve solo lo que necesita.',
    'Cada acceso y cambio a un reporte queda registrado con operador y timestamp.',
  ],
  minors: [
    'Los menores de edad reciben protección especial: su ubicación exacta y datos identificatorios se ocultan automáticamente.',
    'La plataforma sigue el interés superior del niño (Convención ONU, Art. 16).',
  ],
  provenance: [
    'Los reportes ingresan por múltiples canales (web, WhatsApp, llamada) y su origen queda registrado.',
    'La clasificación es híbrida: heurística local + IA opcional. Nunca se pierde un reporte por fallo de IA.',
    'Los datos de personas desaparecidas provienen de fuentes públicas verificables.',
  ],
  ethics: [
    'Principio de "no hacer daño": la privacidad y dignidad de las víctimas es prioritaria.',
    'Mínimo necesario: no se pide más información de la imprescindible para la emergencia.',
    'Sin fines de lucro: la plataforma está diseñada exclusivamente para coordinación humanitaria.',
  ],
};

export function PrivacyFooter() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('principles');

  const sections: Record<string, { title: string; items: string[] }> = {
    principles: { title: 'Tratamiento de datos', items: PRIVACY_SUMMARY.principles },
    minors: { title: 'Protección de menores', items: PRIVACY_SUMMARY.minors },
    provenance: { title: 'Procedencia de los datos', items: PRIVACY_SUMMARY.provenance },
    ethics: { title: 'Ética y buenas prácticas', items: PRIVACY_SUMMARY.ethics },
  };

  return (
    <>
      <footer className="mx-auto max-w-5xl px-4 pb-6 pt-8">
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col items-center gap-2 text-xs text-gray-400 sm:flex-row sm:justify-between">
            <span>Puente de Vida · Coordinación de emergencias offline-first</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
            >
              Privacidad y tratamiento de datos
            </button>
          </div>
        </div>
      </footer>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Privacidad y ética</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {Object.entries(sections).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSection(key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    section === key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {sections[section].items.map((item, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
              Alineado con: GDPR · Convención Derechos del Niño (ONU) · Normas Esfera · ISO 27001 ·
              Principios OCDE · Convención Americana sobre Derechos Humanos · Estándares del CICR
              para datos humanitarios.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
