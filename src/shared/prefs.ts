import { readJSON, writeJSON, ROOT_NS } from './storage';

export interface AppPrefs {
  /** 효과음 전역 on/off */
  sound: boolean;
}

const KEY = `${ROOT_NS}:app:prefs`;
const DEFAULTS: AppPrefs = { sound: true };

let cache: AppPrefs | null = null;
const listeners = new Set<(p: AppPrefs) => void>();

export function getPrefs(): AppPrefs {
  if (!cache) cache = { ...DEFAULTS, ...readJSON<Partial<AppPrefs>>(KEY, {}) };
  return cache;
}

export function setPrefs(patch: Partial<AppPrefs>): AppPrefs {
  const next = { ...getPrefs(), ...patch };
  cache = next;
  writeJSON(KEY, next);
  listeners.forEach((fn) => fn(next));
  return next;
}

export function onPrefsChange(fn: (p: AppPrefs) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
