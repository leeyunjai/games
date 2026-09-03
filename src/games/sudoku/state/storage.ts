import type { GameState } from "./gameState.js";
import type { Difficulty } from "../engine/generator.js";
import { createStore } from "../../../shared/storage";
import { submitBest, getBest, type BestEntry } from "../../../shared/records";
import { setProgress, clearProgress } from "../../../shared/progress";

const store = createStore("sudoku");
const STATE_KEY = "state";
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function loadState(): GameState | null {
  const parsed = store.get<GameState | null>(STATE_KEY, null);
  if (!parsed) return null;
  if (parsed.schemaVersion !== 2) return null;
  if (!Array.isArray(parsed.board) || parsed.board.length !== 81) return null;
  /* 되돌리기 스택은 저장본이 커지므로 복원하지 않는다 */
  return { ...parsed, past: [], future: [] };
}

export function saveState(state: GameState): void {
  // 1초 쓰로틀
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    _persist(state);
    saveTimeout = null;
  }, 1000);
}

export function flushState(state: GameState): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  _persist(state);
}

const DIFF_LABEL: Record<Difficulty, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };

function _persist(state: GameState): void {
  const { past: _past, future: _future, ...rest } = state;
  store.set(STATE_KEY, { ...rest, past: [], future: [] });

  const filled = state.board.filter((c) => c.value !== 0).length;
  setProgress("sudoku", `${DIFF_LABEL[state.difficulty]} · ${filled}/81칸`);
}

export function clearState(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  store.remove(STATE_KEY);
  clearProgress("sudoku");
}

/* ── 난이도별 최고 기록 (공통 기록 저장소 사용) ── */
export function loadBest(difficulty: Difficulty): BestEntry | null {
  return getBest("sudoku", difficulty);
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** 기록을 갱신했으면 true. 대표 기록(default)에도 함께 남긴다. */
export function saveBest(difficulty: Difficulty, timeMs: number): boolean {
  const label = `${DIFF_LABEL[difficulty]} ${formatTime(timeMs)}`;
  const improved = submitBest("sudoku", difficulty, timeMs, label, false);
  if (improved) submitBest("sudoku", "default", timeMs, label, false);
  return improved;
}
