'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PRIORITY_COLOR } from '@/lib/format';
import { PRIORITY_LABELS, TYPE_LABELS, type LocalReport } from '@/lib/types';

// Mapa con Leaflet + OpenStreetMap. Usamos circleMarker (sin imágenes) para
// evitar dependencias de íconos y mantener todo liviano.

export default function MapView({ reports }: { reports: LocalReport[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [10.4806, -66.9036], // Caracas
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const points = reports.filter((r) => r.lat != null && r.lng != null);
    for (const r of points) {
      const marker = L.circleMarker([r.lat as number, r.lng as number], {
        radius: r.priority === 'critica' ? 11 : 8,
        color: PRIORITY_COLOR[r.priority],
        fillColor: PRIORITY_COLOR[r.priority],
        fillOpacity: 0.7,
        weight: 2,
      });
      marker.bindPopup(
        `<strong>${TYPE_LABELS[r.incidentType]}</strong> · ${PRIORITY_LABELS[r.priority]}<br/>📍 ${r.locationText ?? 'sin dirección'}<br/><em>${r.rawText.slice(0, 120)}</em>`,
      );
      marker.addTo(layer);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((r) => [r.lat as number, r.lng as number]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
  }, [reports]);

  return <div ref={containerRef} className="h-full w-full" />;
}
