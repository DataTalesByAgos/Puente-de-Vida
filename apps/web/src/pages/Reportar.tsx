import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { createLocalNeed } from '@/lib/sync';
import {
  NEED_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  SUBCATEGORY_LABELS,
  type NeedCategory,
} from '@/lib/types';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 3 * 1024 * 1024;

export default function ReportarPage() {
  const { online } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<NeedCategory>('logistica');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

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
    if (!file) return;
    setPhotoError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Solo JPEG, PNG y WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setPhotoError(
        `La foto no debe superar los 3 MB (este archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      );
      return;
    }
    setPhoto(await fileToDataUrl(file));
  }

  const subcategories = useMemo(() => {
    const subs = SUBCATEGORY_LABELS as Record<string, string>;
    const entries = Object.entries(subs);
    return entries.filter(([key]) => {
      const catSubs = {
        profesionales: [
          'medico',
          'enfermeria',
          'ingenieria',
          'psicologia',
          'educacion',
          'legal',
          'comunicacion',
          'otro_prof',
        ],
        no_profesionales: [
          'carga',
          'limpieza',
          'cocina',
          'cuidado',
          'traduccion',
          'compania',
          'otro_no_prof',
        ],
        logistica: [
          'transporte',
          'donaciones',
          'albergue',
          'alimento',
          'agua',
          'medicinas',
          'ropa',
          'otro_log',
        ],
        otros: ['informacion', 'difusion', 'apoyo_moral', 'otro'],
      };
      return (catSubs[category] ?? []).includes(key);
    });
  }, [category]);

  const [subcategory, setSubcategory] = useState('');

  async function submit() {
    if (title.trim().length < 3 || desc.trim().length < 10) return;
    setSaving(true);
    try {
      await createLocalNeed({
        title: title.trim(),
        description: desc.trim(),
        category,
        subcategory: subcategory || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        locationText: null,
        photoDataUrl: photo,
        source: 'pwa',
      });
      setDone(true);
      setTitle('');
      setDesc('');
      setCategory('logistica');
      setSubcategory('');
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
            📱 Solicitud ciudadana
          </span>
        </div>
        <h1 className="mt-1 font-display text-lg font-bold">Publicar necesidad</h1>
        <p className="text-sm text-muted">
          Publicá una necesidad para que voluntarios y organizaciones puedan ayudarte. Se guarda en
          tu dispositivo al instante y se sincroniza solo cuando vuelva Internet.{' '}
          <strong className="text-ink">Funciona sin señal.</strong>
        </p>
      </div>

      {done && (
        <div className="card border-wa/40 bg-wa/10 text-sm font-medium text-waInk">
          ✓ Necesidad publicada
          {online ? ' y sincronizándose…' : ' (offline, se subirá al reconectar).'}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Título *</span>
        <input
          className="input"
          placeholder="Ej.: Necesitamos agua potable"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">¿Qué necesitas? *</span>
        <textarea
          className="input min-h-28"
          placeholder="Describí la necesidad con el mayor detalle posible..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">Categoría</span>
          <select
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as NeedCategory);
              setSubcategory('');
            }}
          >
            {NEED_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        {subcategories.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Subcategoría</span>
            <select
              className="input"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">—</option>
              {subcategories.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
              accept=".jpg,.jpeg,.png,.webp"
              capture="environment"
              className="hidden"
              onChange={onPhoto}
            />
          </label>
          {photo ? (
            <img src={photo} alt="adjunto" className="h-20 w-full rounded-lg object-cover" />
          ) : (
            <p className="text-xs text-muted">JPEG, PNG o WebP · máx 3 MB.</p>
          )}
          {photoError && <p className="text-xs text-red-500">{photoError}</p>}
        </div>
      </div>

      <button
        className="btn-primary text-base"
        onClick={submit}
        disabled={saving || title.trim().length < 3 || desc.trim().length < 10}
      >
        {saving ? 'Guardando…' : 'Publicar necesidad'}
      </button>
    </div>
  );
}
