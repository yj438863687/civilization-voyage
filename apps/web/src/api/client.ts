import {
  ApiError,
  type Health,
  type ModelInfo,
  type Port,
  type Scene,
  type Task,
  type TaskEvent,
  type Trade,
  type Usage,
  type Voyage,
  type VoyageCreate,
  type VoyageRecord,
  type VoyageUpdate,
} from './types';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8010';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const raw = await res.text();
    let message = raw || res.statusText;
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown };
      if (typeof parsed.detail === 'string') message = parsed.detail;
      else if (parsed.detail) message = JSON.stringify(parsed.detail);
    } catch {
      /* keep text */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => req<Health>('/health'),
  models: () => req<ModelInfo[]>('/models'),
  scenes: () => req<Scene[]>('/scenes'),
  listVoyages: () => req<Voyage[]>('/voyages'),
  createVoyage: (body: VoyageCreate) =>
    req<Voyage>('/voyages', { method: 'POST', body: JSON.stringify(body) }),
  getVoyage: (id: string) => req<Voyage>(`/voyages/${id}`),
  putVoyage: (id: string, body: VoyageUpdate) =>
    req<Voyage>(`/voyages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  records: (id: string) => req<VoyageRecord[]>(`/voyages/${id}/records`),
  addRecord: (id: string, body: Omit<VoyageRecord, 'id' | 'voyage_id'>) =>
    req<VoyageRecord>(`/voyages/${id}/records`, { method: 'POST', body: JSON.stringify(body) }),
  ports: (id: string) => req<Port[]>(`/voyages/${id}/ports`),
  trades: (id: string) => req<Trade[]>(`/voyages/${id}/trades`),
  trade: (id: string, body: { request_id: string; port_id: string; good_id: string; side: 'buy' | 'sell'; quantity: number }) =>
    req<Trade>(`/voyages/${id}/trades`, { method: 'POST', body: JSON.stringify(body) }),
  tasks: (id: string) => req<Task[]>(`/voyages/${id}/tasks`),
  createTask: (id: string, body: { request_id: string; prompt: string; model_id: string }) =>
    req<Task>(`/voyages/${id}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  getTask: (id: string, tid: string) => req<Task>(`/voyages/${id}/tasks/${tid}`),
  cancelTask: (id: string, tid: string) =>
    req<Task>(`/voyages/${id}/tasks/${tid}/cancel`, { method: 'POST' }),
  events: (id: string, tid: string, after = 0) =>
    req<TaskEvent[]>(`/voyages/${id}/tasks/${tid}/events?after=${after}`),
  usage: (id: string) => req<Usage[]>(`/voyages/${id}/usage`),
};

export function newRequestId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
