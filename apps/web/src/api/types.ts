/** Mirrors apps/api/voyage/models.py and packages/contracts. Do not invent fields. */

export type Stage = 'cockpit' | 'route' | 'world' | 'reflection';
export type SceneTrack = 'test' | 'candidate' | 'confirmed';
export type SceneStatus = 'test' | 'pending' | 'confirmed';
export type Classification = 'historical_claim' | 'counterfactual' | 'creative' | 'test';
export type RecordKind = 'material' | 'fragment' | 'choice' | 'artifact' | 'log' | 'reflection';

export interface Crew {
  id: string;
  role: string;
  model_id: string | null;
  confirmation: 'pending' | 'confirmed';
}

export interface Route {
  id: string;
  steps: string[];
  rationale: string;
  budget: number;
  currency: string;
}

export interface Voyage {
  id: string;
  title: string;
  scene_id: string;
  scene_version: number;
  scene_track: SceneTrack;
  question: string;
  shared_task: string;
  crew: Crew[];
  route: Route | null;
  scene_snapshot: Record<string, unknown>;
  owner: 'local';
  stage: Stage;
  world: Record<string, unknown>;
  balance: number;
  capacity: number;
  inventory: Record<string, number>;
  resource_kind: 'fictional_test_resource';
}

export interface VoyageCreate {
  title: string;
  scene_id?: string;
  scene_version?: number;
  scene_track?: SceneTrack;
  question?: string;
  shared_task?: string;
  crew?: Crew[];
  route?: Route | null;
}

export interface VoyageUpdate {
  stage: Stage;
  question: string;
  shared_task: string;
  crew: Crew[];
  route: Route | null;
  world: Record<string, unknown>;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  license: string;
  verification: 'unverified' | 'verified';
}

export interface VoyageRecord {
  id: string;
  voyage_id: string;
  kind: RecordKind;
  text: string;
  classification: Classification;
  sources: Source[];
  material_ids: string[];
  version: number;
  access: 'private';
}

export interface Port {
  id: string;
  name: string;
  goods: Record<string, { buy: number; sell: number; stock: number }>;
  resource_kind: 'fictional_test_resource';
}

export interface Trade {
  id: string;
  request_id: string;
  port_id: string;
  good_id: string;
  side: 'buy' | 'sell';
  quantity: number;
  delta_balance: number;
  delta_inventory: number;
  balance_after: number;
  inventory_after: number;
  resource_kind: 'fictional_test_resource';
}

export interface Task {
  id: string;
  voyage_id: string;
  request_id: string;
  prompt: string;
  model_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  cancel_requested: boolean;
}

export interface TaskEvent {
  seq: number;
  task_id: string;
  kind: string;
  data: Record<string, unknown>;
}

export interface Usage {
  task_id: string;
  model: string;
  elapsed_ms: number;
  usage: Record<string, unknown>;
  settlement: 'not_connected';
}

export interface ModelInfo {
  id: string;
  model: string;
  capabilities: string[];
  credential_source: 'server_environment';
}

export interface Scene {
  id: string;
  version: number;
  status: SceneStatus;
  label: string;
  background: string;
  cultural_core: string;
  questions: string[];
  fragments: string[];
  interactions: string[];
  economy: string;
  educational_value: string;
  sources: Source[];
  needs_verification: string[];
}

export interface Health {
  status: string;
  access_mode: string;
  hmt: 'not_connected' | string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
