/**
 * 玩家身份：纯本地。
 *
 * - 名字 + 口令。口令只存「盐 + SHA-256」的哈希，从不存明文。
 * - 身份码：把名字、口令校验和这一路的记忆（补给、人心、走过的航线、遇见的人、暗线）
 *   打包成一段可复制的码。清了缓存或换了设备，贴回来、再输一次口令，就能接上同一个身份。
 * - 航程存档在本机后端里，身份码带不走它；带得走的是「你是谁、你走过哪里」。
 */
import { loadStats, saveStats, type VoyageStats } from './world/encounters';

export interface Player {
  id: string;
  name: string;
  salt: string;
  hash: string;
  createdAt: number;
}

const KEY = 'cv.player.v1';
const SESSION = 'cv.session.v1';

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(salt: string, passcode: string) {
  const data = new TextEncoder().encode(`${salt}:${passcode}`);
  return hex(await crypto.subtle.digest('SHA-256', data));
}

function randomHex(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return hex(a.buffer);
}

export function loadPlayer(): Player | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Player) : null;
  } catch {
    return null;
  }
}

export function sessionPlayer(): Player | null {
  const p = loadPlayer();
  if (!p) return null;
  try {
    return sessionStorage.getItem(SESSION) === p.id ? p : null;
  } catch {
    return null;
  }
}

function openSession(p: Player) {
  sessionStorage.setItem(SESSION, p.id);
}

export function signOut() {
  sessionStorage.removeItem(SESSION);
}

export function validName(name: string) {
  const n = name.trim();
  if (n.length < 1 || n.length > 16) return '名字要 1 到 16 个字';
  return null;
}

export function validPasscode(code: string) {
  if (!/^\d{4,8}$/.test(code)) return '口令是 4 到 8 位数字';
  return null;
}

export async function register(name: string, passcode: string): Promise<Player> {
  const salt = randomHex(8);
  const p: Player = {
    id: `CV-${randomHex(3).toUpperCase()}`,
    name: name.trim(),
    salt,
    hash: await digest(salt, passcode),
    createdAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(p));
  openSession(p);
  return p;
}

export async function signIn(passcode: string): Promise<Player> {
  const p = loadPlayer();
  if (!p) throw new Error('这台设备上还没有船长，请先登船注册');
  if ((await digest(p.salt, passcode)) !== p.hash) throw new Error('口令不对');
  openSession(p);
  return p;
}

/* ---------------- 身份码：复现 ---------------- */

interface Bundle {
  v: 1;
  player: Player;
  stats: VoyageStats;
}

function toB64(s: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64(s: string) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}

export function exportCode(p: Player): string {
  const bundle: Bundle = { v: 1, player: p, stats: loadStats() };
  return `CV1.${toB64(JSON.stringify(bundle))}`;
}

/** 贴回身份码：口令对上了，才把身份和记忆写回这台设备 */
export async function importCode(code: string, passcode: string): Promise<Player> {
  const raw = code.trim();
  if (!raw.startsWith('CV1.')) throw new Error('这不是文明航程的身份码');
  let bundle: Bundle;
  try {
    bundle = JSON.parse(fromB64(raw.slice(4))) as Bundle;
  } catch {
    throw new Error('身份码不完整，请整段复制');
  }
  const p = bundle.player;
  if (!p?.salt || !p.hash) throw new Error('身份码不完整，请整段复制');
  if ((await digest(p.salt, passcode)) !== p.hash) throw new Error('口令与身份码对不上');
  localStorage.setItem(KEY, JSON.stringify(p));
  if (bundle.stats) saveStats(bundle.stats);
  openSession(p);
  return p;
}
