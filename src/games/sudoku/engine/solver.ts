import { isValid } from "./validator.js";

/** MRV(최소 후보 칸 우선) 휴리스틱으로 다음 빈 칸 인덱스 선택. */
function pickCell(board: number[]): number {
  let bestIdx = -1;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    let count = 0;
    for (let v = 1; v <= 9; v++) {
      if (isValid(board, i, v)) count++;
    }
    if (count < bestCount) {
      bestCount = count;
      bestIdx = i;
      if (count === 0) return i;
    }
  }
  return bestIdx;
}

/**
 * 최대 limit개의 해를 찾아 반환.
 * limit=2 로 설정하면 유일 해 여부를 빠르게 판정 가능.
 */
function _count(board: number[], limit: number, found: { n: number }): void {
  const idx = pickCell(board);
  if (idx === -1) {
    found.n++;
    return;
  }
  for (let v = 1; v <= 9; v++) {
    if (found.n >= limit) return;
    if (isValid(board, idx, v)) {
      board[idx] = v;
      _count(board, limit, found);
      board[idx] = 0;
    }
  }
}

export function countSolutions(board: number[], limit = 2): number {
  const copy = board.slice();
  const found = { n: 0 };
  _count(copy, limit, found);
  return found.n;
}

/** 보드를 제자리(in-place)로 풀어 최초 해 반환. 해 없으면 false. */
export function solve(board: number[]): boolean {
  const idx = pickCell(board);
  if (idx === -1) return true;
  for (let v = 1; v <= 9; v++) {
    if (isValid(board, idx, v)) {
      board[idx] = v;
      if (solve(board)) return true;
      board[idx] = 0;
    }
  }
  return false;
}

export function hasUniqueSolution(board: number[]): boolean {
  return countSolutions(board, 2) === 1;
}
