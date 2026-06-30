import type { IncidentType, Priority, ServerReport, Source, Status } from './types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export interface SyncItem {
  clientId: string;
  source: Source;
  rawText: string;
  lat: number | null;
  lng: number | null;
  locationText: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
  photoUrl: string | null;
  incidentType?: IncidentType;
  priority?: Priority;
  status?: Status;
  createdAt?: string;
}

export interface WhatsappStatus {
  mode: 'mock' | 'generic';
  connected: boolean;
  autoReply: boolean;
  label: string;
  description: string;
}

export interface DashboardStats {
  totals: {
    total: number;
    duplicates: number;
    active: number;
    people_affected: number;
  } | null;
  byType: { incident_type: IncidentType; count: number }[];
  byPriority: { priority: Priority; count: number }[];
  byStatus: { status: Status; count: number }[];
  shelters: { count: number; capacity: number; occupancy: number } | null;
  volunteers: { active: number } | null;
}

export const api = {
  health: () => http<{ status: string; aiEngine: string }>('/health'),

  listReports: () => http<ServerReport[]>('/api/reports?limit=300'),

  pushReports: (reports: SyncItem[]) =>
    http<{ synced: number; results: { clientId: string; report: ServerReport }[] }>('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ reports }),
    }),

  pullReports: (since?: string) =>
    http<{ now: string; reports: ServerReport[] }>(
      `/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`,
    ),

  updateReport: (id: string, fields: Partial<{ status: Status; priority: Priority }>) =>
    http<ServerReport>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }),

  stats: () => http<DashboardStats>('/api/dashboard/stats'),

  getSummary: () =>
    http<{ summary: string; engine: string; created_at: string } | null>('/api/dashboard/summary'),

  generateSummary: () =>
    http<{ summary: string; engine: string; created_at: string }>('/api/dashboard/summary', {
      method: 'POST',
    }),

  shelters: () => http<unknown[]>('/api/shelters'),
  volunteers: () => http<unknown[]>('/api/volunteers'),
  supplies: () => http<unknown[]>('/api/supplies'),

  whatsappStatus: () => http<WhatsappStatus>('/api/whatsapp/status'),
};
