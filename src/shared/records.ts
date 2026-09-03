import { readJSON, writeJSON, ROOT_NS } from './storage';

export interface BestEntry {
  /** 비교에 쓰는 값 (점수 또는 시간 ms) */
  value: number;
  /** 화면에 보여줄 문자열 */
  label: string;
  at: number;
}

type BestTable = Record<string, BestEntry>;

const key = (gameId: string) => `${ROOT_NS}:${gameId}:best`;

export function listBests(gameId: string): BestTable {
  return readJSON<BestTable>(key(gameId), {});
}

export function getBest(gameId: string, slot = 'default'): BestEntry | null {
  return listBests(gameId)[slot] ?? null;
}

/**
 * 허브 카드에 보여줄 대표 기록.
 * 'default' 슬롯이 있으면 그것을, 없으면 가장 최근에 갱신된 기록을 쓴다.
 */
export function getPrimaryBest(gameId: string): BestEntry | null {
  const table = listBests(gameId);
  if (table.default) return table.default;
  const entries = Object.values(table);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b.at > a.at ? b : a));
}

/**
 * 기존 기록보다 좋을 때만 저장한다.
 * @param higherIsBetter 점수형이면 true, 시간형이면 false
 * @returns 기록을 갱신했으면 true
 */
export function submitBest(
  gameId: string,
  slot: string,
  value: number,
  label: string,
  higherIsBetter: boolean
): boolean {
  const table = listBests(gameId);
  const prev = table[slot];
  if (prev && (higherIsBetter ? prev.value >= value : prev.value <= value)) return false;
  table[slot] = { value, label, at: Date.now() };
  writeJSON(key(gameId), table);
  return true;
}
