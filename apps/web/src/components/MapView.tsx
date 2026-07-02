'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PRIORITY_COLOR } from '@/lib/format';
import {
  PRIORITY_LABELS,
  TYPE_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type LocalReport,
  type LocalNeed,
  type Priority,
} from '@/lib/types';

export default function MapView({
  reports,
  needs,
}: {
  reports?: LocalReport[];
  needs?: LocalNeed[];
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [10.4806, -66.9036],
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

    const allPoints: {
      lat: number;
      lng: number;
      priority: Priority;
      label: string;
      sublabel: string;
      detail: string;
    }[] = [];

    if (reports) {
      for (const r of reports) {
        if (r.lat == null || r.lng == null) continue;
        allPoints.push({
          lat: r.lat,
          lng: r.lng,
          priority: r.priority,
          label: TYPE_LABELS[r.incidentType],
          sublabel: PRIORITY_LABELS[r.priority],
          detail: r.rawText.slice(0, 120),
        });
      }
    }

    if (needs) {
      for (const n of needs) {
        if (n.lat == null || n.lng == null) continue;
        allPoints.push({
          lat: n.lat,
          lng: n.lng,
          priority: n.priority,
          label: `${CATEGORY_ICONS[n.category]} ${n.title}`,
          sublabel: `${CATEGORY_LABELS[n.category]} · ${PRIORITY_LABELS[n.priority]}`,
          detail: n.description.slice(0, 120),
        });
      }
    }

    for (const p of allPoints) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: p.priority === 'critica' ? 11 : 8,
        color: PRIORITY_COLOR[p.priority],
        fillColor: PRIORITY_COLOR[p.priority],
        fillOpacity: 0.7,
        weight: 2,
      });
      marker.bindPopup(`<strong>${p.label}</strong> · ${p.sublabel}<br/><em>${p.detail}</em>`);
      marker.addTo(layer);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
  }, [reports, needs]);

  return <div ref={containerRef} className="h-full w-full" />;
}
