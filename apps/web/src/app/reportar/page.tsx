'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { createLocalReport } from '@/lib/sync';
import { classifyLocal } from '@/lib/heuristic';
import { PRIORITY_LABELS, TYPE_ICONS, TYPE_LABELS } from '@/lib/types';
import { PRIORITY_CHIP } from '@/lib/format';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ReportarPage() {
  const { online } = useApp();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  const preview = useMemo(() => (text.trim().length > 3 ? classifyLocal(text) : null), [text]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMsg('Geolocalización no disponible.');
      return;
    }
    setGeoMsg('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoMsg('Ubicación capturada ✓');
      },
      () => setGeoMsg('No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto(await fileToDataUrl(file));
  }

  async function submit() {
    if (text.trim().length < 4) return;
    setSaving(true);
    try {
      await createLocalReport({
        rawText: text.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        locationText: null,
        reporterName: name.trim() || null,
        photoDataUrl: photo,
      });
      setDone(true);
      setText('');
      setName('');
      setCoords(null);
      setPhoto(null);
      setGeoMsg('');
      setTimeout(() => setDone(false), 4000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="chip border border-sky/40 bg-sky/15 text-skyInk">
            📱 Voluntario en terreno
          </span>
        </div>
        <h1 className="mt-1 font-display text-lg font-bold">Reportar incidente</h1>
        <p className="text-sm text-muted">
          Para voluntarios y equipos de respuesta. Se guarda en tu dispositivo al instante y se
          sincroniza solo cuando vuelva Internet.{' '}
          <strong className="text-ink">Funciona sin señal.</strong>
        </p>
      </div>

      {done && (
        <div className="card border-wa/40 bg-wa/10 text-sm font-medium text-waInk">
          ✓ Reporte guardado{online ? ' y enviándose…' : ' (offline, se subirá al reconectar).'}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">¿Qué está pasando?</span>
        <textarea
          className="input min-h-32"
          placeholder="Ej.: Hay un edificio derrumbado en la calle Sucre, 3 personas atrapadas."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {preview && (
        <div className="card flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">🤖 Clasificación automática:</span>
          <span className="chip border border-line bg-paper text-ink">
            {TYPE_ICONS[preview.incidentType]} {TYPE_LABELS[preview.incidentType]}
          </span>
          <span className={`chip ${PRIORITY_CHIP[preview.priority]}`}>
            {PRIORITY_LABELS[preview.priority]}
          </span>
          <span className="text-xs text-muted">(la IA del servidor la afina al sincronizar)</span>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Tu nombre (opcional)</span>
        <input
          className="input"
          placeholder="Nombre o equipo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card flex flex-col gap-2">
          <button className="btn-ghost" onClick={locate} type="button">
            📍 Usar mi ubicación
          </button>
          <p className="text-xs text-muted">
            {coords
              ? `Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(4)}`
              : geoMsg || 'Sin ubicación'}
          </p>
        </div>
        <div className="card flex flex-col gap-2">
          <label className="btn-ghost cursor-pointer text-center">
            📷 Adjuntar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhoto}
            />
          </label>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="adjunto" className="h-20 w-full rounded-lg object-cover" />
          ) : (
            <p className="text-xs text-muted">Se guarda en el dispositivo.</p>
          )}
        </div>
      </div>

      <button
        className="btn-primary text-base"
        onClick={submit}
        disabled={saving || text.trim().length < 4}
      >
        {saving ? 'Guardando…' : 'Enviar reporte'}
      </button>
    </div>
  );
}
