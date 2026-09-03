import { readJSON, writeJSON, removeRaw, ROOT_NS } from './storage';

/** 허브에서 "이어하기"를 보여주기 위한 진행 상황 요약 */
export interface Progress {
  /** 예: "23수 진행 중" */
  label: string;
  at: number;
}

const key = (gameId: string) => `${ROOT_NS}:${gameId}:progress`;

export function setProgress(gameId: string, label: string): void {
  writeJSON(key(gameId), { label, at: Date.now() } satisfies Progress);
}

export function clearProgress(gameId: string): void {
  removeRaw(key(gameId));
}

export function getProgress(gameId: string): Progress | null {
  return readJSON<Progress | null>(key(gameId), null);
}
