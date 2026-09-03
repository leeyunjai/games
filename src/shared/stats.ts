import { readJSON, writeJSON, ROOT_NS } from './storage';

export interface Stats {
  wins: number;
  losses: number;
  draws: number;
}

const EMPTY: Stats = { wins: 0, losses: 0, draws: 0 };
const key = (gameId: string) => `${ROOT_NS}:${gameId}:stats`;

export function getStats(gameId: string): Stats {
  return { ...EMPTY, ...readJSON<Partial<Stats>>(key(gameId), {}) };
}

/** AI 대전 전적 누적 */
export function bumpStat(gameId: string, field: keyof Stats): Stats {
  const next = getStats(gameId);
  next[field] += 1;
  writeJSON(key(gameId), next);
  return next;
}

export function formatStats(s: Stats): string | null {
  const total = s.wins + s.losses + s.draws;
  if (total === 0) return null;
  return s.draws > 0 ? `${s.wins}승 ${s.draws}무 ${s.losses}패` : `${s.wins}승 ${s.losses}패`;
}
