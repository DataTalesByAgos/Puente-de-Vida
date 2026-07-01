import type {
  Need,
  NeedUpdate,
  NeedDashboardStats,
  PendingReview,
  VolunteerProfile,
} from './types';
import type { z } from 'zod';
import type {
  createNeedSchema,
  updateNeedSchema,
  createNeedUpdateSchema,
  volunteerProfileSchema,
} from './schemas';

type CreateNeedInput = z.input<typeof createNeedSchema>;
type UpdateNeedInput = z.input<typeof updateNeedSchema>;
type CreateNeedUpdateInput = z.input<typeof createNeedUpdateSchema>;
type VolunteerProfileInput = z.input<typeof volunteerProfileSchema>;

export interface ApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}

export function createApiClient(config: ApiConfig) {
  const { baseUrl, getToken } = config;

  async function http<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...((init?.headers as Record<string, string>) || {}) },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    // Auth
    login: (user: string, pass: string) =>
      http<{ token: string; role: string; username: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ user, pass }),
      }),

    register: (data: Record<string, unknown>) =>
      http<{ id: string; role: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Needs
    listNeeds: (params?: Record<string, unknown>) =>
      http<Need[]>(`/api/needs${buildQuery(params)}`),

    getNeed: (id: string) => http<Need>(`/api/needs/${id}`),

    createNeed: (data: CreateNeedInput) =>
      http<Need>('/api/needs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateNeed: (id: string, data: UpdateNeedInput) =>
      http<Need>(`/api/needs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getNeedChildren: (id: string) => http<Need[]>(`/api/needs/${id}/children`),

    // Need updates (volunteer progress)
    createNeedUpdate: (needId: string, data: CreateNeedUpdateInput) =>
      http<NeedUpdate>(`/api/needs/${needId}/updates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getNeedUpdates: (needId: string) => http<NeedUpdate[]>(`/api/needs/${needId}/updates`),

    // Sync
    pushNeeds: (needs: CreateNeedInput[]) =>
      http<{ synced: number }>('/api/needs/sync', {
        method: 'POST',
        body: JSON.stringify({ needs }),
      }),

    pullNeeds: (since?: string) =>
      http<{ now: string; needs: Need[] }>(
        `/api/needs/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`,
      ),

    // Volunteer
    getProfile: () => http<VolunteerProfile>('/api/volunteer/profile'),

    updateProfile: (data: VolunteerProfileInput) =>
      http<VolunteerProfile>('/api/volunteer/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getMatches: () => http<Need[]>('/api/volunteer/matches'),

    getAssignments: () => http<Need[]>('/api/volunteer/assignments'),

    // Dashboard
    getStats: () => http<NeedDashboardStats>('/api/dashboard/stats'),

    getPendingReview: () => http<PendingReview[]>('/api/needs/pending-review'),

    // Info pública
    getOrganizations: () =>
      http<{ id: string; name: string; description: string; location: string }[]>(
        '/api/info/organizations',
      ),

    getCenters: () =>
      http<{ id: string; name: string; address: string; phone: string; services: string[] }[]>(
        '/api/info/centers',
      ),

    getGuides: () =>
      http<{ id: string; title: string; content: string; category: string }[]>('/api/info/guides'),

    // Admin
    listUsers: () =>
      http<{ id: string; username: string; role: string; verified: boolean }[]>('/api/admin/users'),

    getAuditLogs: (params?: Record<string, unknown>) =>
      http<{ entries: unknown[] }>(`/api/admin/audit${buildQuery(params)}`),

    health: () => http<{ status: string }>('/health'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
