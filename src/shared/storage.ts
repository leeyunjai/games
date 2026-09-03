/**
 * 모든 게임이 공유하는 localStorage 래퍼.
 * 키는 `games:<gameId>:<key>` 형태로 묶어 게임끼리 충돌하지 않게 한다.
 * 브라우저가 저장을 막아도(시크릿 모드 등) 던지지 않고 조용히 무시한다.
 */
export const ROOT_NS = 'games';

function full(gameId: string, key: string): string {
  return `${ROOT_NS}:${gameId}:${key}`;
}

export function readJSON<T>(rawKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(rawKey);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(rawKey: string, value: unknown): void {
  try {
    localStorage.setItem(rawKey, JSON.stringify(value));
  } catch {
    /* 저장 실패는 게임 진행을 막지 않는다 */
  }
}

export function removeRaw(rawKey: string): void {
  try { localStorage.removeItem(rawKey); } catch { /* 무시 */ }
}

export interface Store {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  /** 이 게임 네임스페이스의 모든 키 삭제 */
  clear(): void;
}

export function createStore(gameId: string): Store {
  return {
    get: (key, fallback) => readJSON(full(gameId, key), fallback),
    set: (key, value) => writeJSON(full(gameId, key), value),
    remove: (key) => removeRaw(full(gameId, key)),
    clear: () => {
      try {
        const prefix = `${ROOT_NS}:${gameId}:`;
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch { /* 무시 */ }
    },
  };
}
