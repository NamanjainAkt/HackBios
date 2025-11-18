export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:4000/api';

export type Hazard = {
  _id: string;
  type: string;
  severity: string;
  location: { lat?: number; lng?: number; sector?: string };
  worker: string;
  timestamp: string;
  status: string;
  description?: string;
  sensorData?: any;
};

async function handleRes(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function getAllHazards(): Promise<Hazard[]> {
  const res = await fetch(`${API_BASE}/hazards`);
  return handleRes(res);
}

export async function getActiveHazards(): Promise<Hazard[]> {
  const res = await fetch(`${API_BASE}/hazards/active`);
  return handleRes(res);
}

export async function getWorkerHazards(workerId: string): Promise<Hazard[]> {
  const res = await fetch(`${API_BASE}/hazards/worker/${encodeURIComponent(workerId)}`);
  return handleRes(res);
}

export async function reportHazard(payload: Partial<Hazard> & { type: string; worker: string }) {
  const res = await fetch(`${API_BASE}/hazard-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function updateHazardStatus(hazardId: string, status: string) {
  const res = await fetch(`${API_BASE}/hazards/${encodeURIComponent(hazardId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleRes(res);
}

export async function getHazardSimulation(hazardId: string, timeSec?: number, duration?: number) {
  const qs: string[] = [];
  if (timeSec !== undefined) qs.push(`time=${timeSec}`);
  if (duration !== undefined) qs.push(`duration=${duration}`);
  const q = qs.length ? `?${qs.join('&')}` : '';
  const res = await fetch(`${API_BASE}/hazards/${encodeURIComponent(hazardId)}/simulation${q}`);
  return handleRes(res);
}

export default {
  getAllHazards,
  getActiveHazards,
  getWorkerHazards,
  reportHazard,
  updateHazardStatus,
  getHazardSimulation,
};
