import type { Difficulty } from "../engine/generator.js";

export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Cell {
  value: CellValue;
  /** 처음부터 주어진 숫자 */
  given: boolean;
  notes: number[];
  /** 정답과 다른 숫자가 들어있는 상태 */
  isError: boolean;
  /** 힌트로 채워진 칸 */
  hinted: boolean;
}

/** 되돌리기용 셀 변경 기록 */
export interface CellDiff {
  index: number;
  before: Cell;
  after: Cell;
}

export const MISTAKE_LIMIT = 3;

export interface GameState {
  schemaVersion: 2;
  difficulty: Difficulty;
  puzzle: CellValue[];
  solution: CellValue[];
  board: Cell[];
  startedAt: number;
  elapsedMs: number;
  isPaused: boolean;
  isCompleted: boolean;
  /** 실수 제한을 넘겨 실패한 상태 */
  isFailed: boolean;
  /** null이면 실수 제한 없음 */
  mistakeLimit: number | null;
  mistakes: number;
  hintsUsed: number;
  score: number;
  createdAt: number;
  past: CellDiff[][];
  future: CellDiff[][];
}

const BASE_SCORE: Record<Difficulty, number> = {
  easy: 1000,
  medium: 2000,
  hard: 4000,
};

export function calcScore(state: GameState): number {
  const base = BASE_SCORE[state.difficulty];
  const timePenalty = Math.floor(state.elapsedMs / 1000) * 2;
  const mistakePenalty = state.mistakes * 50;
  const hintPenalty = state.hintsUsed * 100;
  return Math.max(0, base - timePenalty - mistakePenalty - hintPenalty);
}

export function createInitialState(
  difficulty: Difficulty,
  puzzle: number[],
  solution: number[]
): GameState {
  const now = Date.now();
  const board: Cell[] = puzzle.map((v) => ({
    value: v as CellValue,
    given: v !== 0,
    notes: [],
    isError: false,
    hinted: false,
  }));
  return {
    schemaVersion: 2,
    difficulty,
    puzzle: puzzle as CellValue[],
    solution: solution as CellValue[],
    board,
    startedAt: now,
    elapsedMs: 0,
    isPaused: false,
    isCompleted: false,
    isFailed: false,
    mistakeLimit: MISTAKE_LIMIT,
    mistakes: 0,
    hintsUsed: 0,
    score: BASE_SCORE[difficulty],
    createdAt: now,
    past: [],
    future: [],
  };
}

export type Action =
  | { type: "SET_VALUE"; index: number; value: CellValue }
  | { type: "SET_NOTE"; index: number; note: number }
  | { type: "CLEAR_CELL"; index: number }
  | { type: "USE_HINT"; index: number }
  | { type: "AUTO_NOTES" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LIFT_LIMIT" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TICK"; elapsedMs: number }
  | { type: "COMPLETE" };

/* ── 좌표 도우미 ───────────────────────────── */
export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** 같은 행·열·박스에 속한 칸들의 인덱스 */
export function peersOf(index: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (i === index) continue;
    if (rowOf(i) === rowOf(index) || colOf(i) === colOf(index) || boxOf(i) === boxOf(index)) out.push(i);
  }
  return out;
}

/** 같은 그룹 안에서 같은 숫자가 겹치는 칸들 */
export function conflictsOf(board: Cell[], index: number): number[] {
  const v = board[index].value;
  if (v === 0) return [];
  return peersOf(index).filter((i) => board[i].value === v);
}

/** 해당 칸에 들어갈 수 있는 후보 숫자 */
export function candidatesOf(board: Cell[], index: number): number[] {
  if (board[index].value !== 0) return [];
  const used = new Set(peersOf(index).map((i) => board[i].value));
  const out: number[] = [];
  for (let n = 1; n <= 9; n++) if (!used.has(n as CellValue)) out.push(n);
  return out;
}

function editable(state: GameState, index: number): boolean {
  const cell = state.board[index];
  return !cell.given && !cell.hinted && !state.isCompleted && !state.isPaused && !state.isFailed;
}

/** 셀 변경 묶음을 적용하고 되돌리기 스택에 쌓는다. */
function applyDiffs(state: GameState, diffs: CellDiff[]): GameState {
  if (diffs.length === 0) return state;
  const board = state.board.slice();
  for (const d of diffs) board[d.index] = d.after;
  return {
    ...state,
    board,
    past: [...state.past.slice(-99), diffs],
    future: [],
  };
}

function finish(state: GameState): GameState {
  const completed = state.board.every((c, i) => c.value === state.solution[i]);
  const scored = { ...state, score: calcScore(state) };
  return completed ? { ...scored, isCompleted: true } : scored;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_VALUE": {
      if (!editable(state, action.index)) return state;
      const before = state.board[action.index];
      if (before.value === action.value) return state;

      const correct = state.solution[action.index] as CellValue;
      const isError = action.value !== 0 && action.value !== correct;

      const diffs: CellDiff[] = [{
        index: action.index,
        before,
        after: { ...before, value: action.value, notes: [], isError },
      }];

      /* 정답을 넣으면 같은 행·열·박스의 같은 숫자 메모를 자동으로 지운다 */
      if (!isError && action.value !== 0) {
        for (const i of peersOf(action.index)) {
          const c = state.board[i];
          if (c.notes.includes(action.value)) {
            diffs.push({
              index: i,
              before: c,
              after: { ...c, notes: c.notes.filter((n) => n !== action.value) },
            });
          }
        }
      }

      const mistakes = isError ? state.mistakes + 1 : state.mistakes;
      const failed = state.mistakeLimit !== null && mistakes >= state.mistakeLimit;
      const next = applyDiffs({ ...state, mistakes }, diffs);
      return finish({ ...next, isFailed: failed });
    }

    case "SET_NOTE": {
      if (!editable(state, action.index)) return state;
      const before = state.board[action.index];
      const notes = before.notes.includes(action.note)
        ? before.notes.filter((n) => n !== action.note)
        : [...before.notes, action.note].sort((a, b) => a - b);
      return applyDiffs(state, [{
        index: action.index,
        before,
        after: { ...before, notes, value: 0 as CellValue, isError: false },
      }]);
    }

    case "CLEAR_CELL": {
      if (!editable(state, action.index)) return state;
      const before = state.board[action.index];
      if (before.value === 0 && before.notes.length === 0) return state;
      return applyDiffs(state, [{
        index: action.index,
        before,
        after: { ...before, value: 0 as CellValue, notes: [], isError: false },
      }]);
    }

    case "USE_HINT": {
      const cell = state.board[action.index];
      if (cell.given || cell.hinted || state.isCompleted || state.isPaused || state.isFailed) return state;
      const correct = state.solution[action.index] as CellValue;
      const diffs: CellDiff[] = [{
        index: action.index,
        before: cell,
        after: { ...cell, value: correct, notes: [], isError: false, hinted: true },
      }];
      for (const i of peersOf(action.index)) {
        const c = state.board[i];
        if (c.notes.includes(correct)) {
          diffs.push({ index: i, before: c, after: { ...c, notes: c.notes.filter((n) => n !== correct) } });
        }
      }
      const next = applyDiffs({ ...state, hintsUsed: state.hintsUsed + 1 }, diffs);
      return finish(next);
    }

    /* 빈 칸마다 가능한 후보를 메모로 채운다 */
    case "AUTO_NOTES": {
      if (state.isCompleted || state.isPaused || state.isFailed) return state;
      const diffs: CellDiff[] = [];
      for (let i = 0; i < 81; i++) {
        const c = state.board[i];
        if (c.given || c.hinted || c.value !== 0) continue;
        const cand = candidatesOf(state.board, i);
        if (cand.length === c.notes.length && cand.every((n, k) => n === c.notes[k])) continue;
        diffs.push({ index: i, before: c, after: { ...c, notes: cand } });
      }
      return applyDiffs(state, diffs);
    }

    case "UNDO": {
      if (state.past.length === 0 || state.isCompleted) return state;
      const diffs = state.past[state.past.length - 1];
      const board = state.board.slice();
      for (const d of diffs) board[d.index] = d.before;
      return {
        ...state,
        board,
        past: state.past.slice(0, -1),
        future: [diffs, ...state.future.slice(0, 99)],
      };
    }

    case "REDO": {
      if (state.future.length === 0 || state.isCompleted) return state;
      const diffs = state.future[0];
      const board = state.board.slice();
      for (const d of diffs) board[d.index] = d.after;
      return finish({
        ...state,
        board,
        past: [...state.past.slice(-99), diffs],
        future: state.future.slice(1),
      });
    }

    /* 실수 제한을 풀고 계속 푼다 */
    case "LIFT_LIMIT":
      return { ...state, isFailed: false, mistakeLimit: null };

    case "PAUSE":
      return state.isCompleted || state.isPaused ? state : { ...state, isPaused: true };

    case "RESUME":
      return !state.isPaused ? state : { ...state, isPaused: false, startedAt: Date.now() - state.elapsedMs };

    case "TICK": {
      if (state.isPaused || state.isCompleted || state.isFailed) return state;
      const newState = { ...state, elapsedMs: action.elapsedMs };
      return { ...newState, score: calcScore(newState) };
    }

    case "COMPLETE":
      return { ...state, isCompleted: true };

    default:
      return state;
  }
}
