import { BoardState, Difficulty, PieceColor, Position } from './types';
import { checkWin, getValidMoves } from './moves';
import { cloneBoard, isValidPos } from './board';

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

/* 열린 정도까지 반영한 형태별 점수 */
const S = {
  FIVE: 1_000_000,
  OPEN_FOUR: 100_000,
  FOUR: 12_000,
  OPEN_THREE: 9_000,
  THREE: 900,
  OPEN_TWO: 400,
  TWO: 60,
  ONE: 10,
};

const other = (c: PieceColor): PieceColor => (c === 'black' ? 'white' : 'black');

/** (r,c)에 color 돌이 있다고 보고 한 방향 라인의 연속 수/양끝 개방 여부를 센다. */
function lineInfo(board: BoardState, r: number, c: number, color: PieceColor, dr: number, dc: number) {
  let cnt = 1;
  let rr = r + dr, cc = c + dc;
  while (isValidPos(rr, cc) && board[rr][cc] === color) { cnt++; rr += dr; cc += dc; }
  const openA = isValidPos(rr, cc) && board[rr][cc] === null;
  rr = r - dr; cc = c - dc;
  while (isValidPos(rr, cc) && board[rr][cc] === color) { cnt++; rr -= dr; cc -= dc; }
  const openB = isValidPos(rr, cc) && board[rr][cc] === null;
  return { cnt, open: (openA ? 1 : 0) + (openB ? 1 : 0) };
}

function shapeScore(cnt: number, open: number): number {
  if (cnt >= 5) return S.FIVE;
  if (cnt === 4) return open === 2 ? S.OPEN_FOUR : open === 1 ? S.FOUR : 0;
  if (cnt === 3) return open === 2 ? S.OPEN_THREE : open === 1 ? S.THREE : 0;
  if (cnt === 2) return open === 2 ? S.OPEN_TWO : open === 1 ? S.TWO : 0;
  return open > 0 ? S.ONE : 0;
}

/** 빈 칸 (r,c)에 color가 두었을 때의 가치. 공격 + 수비(상대 형태 차단)를 합산. */
export function moveValue(board: BoardState, r: number, c: number, color: PieceColor): number {
  const opp = other(color);
  let atk = 0, def = 0;
  for (const [dr, dc] of DIRS) {
    const mine = lineInfo(board, r, c, color, dr, dc);
    atk += shapeScore(mine.cnt, mine.open);
    const theirs = lineInfo(board, r, c, opp, dr, dc);
    def += shapeScore(theirs.cnt, theirs.open);
  }
  /* 방어는 공격보다 살짝 낮게 평가해 선수를 잡도록 한다 */
  const center = 14 - Math.abs(r - 7) - Math.abs(c - 7);
  return atk + def * 0.85 + center * 3;
}

/** 후보 수를 가치 순으로 정렬해 상위 limit개만 남긴다. */
function orderedMoves(board: BoardState, color: PieceColor, limit: number): Position[] {
  return getValidMoves(board)
    .map(p => ({ p, v: moveValue(board, p.row, p.col, color) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, limit)
    .map(x => x.p);
}

function evaluateBoard(board: BoardState, ai: PieceColor): number {
  let score = 0;
  const seen = new Set<string>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      const color = board[r][c];
      if (!color) continue;
      for (const [dr, dc] of DIRS) {
        const key = `${r},${c},${dr},${dc}`;
        if (seen.has(key)) continue;
        const info = lineInfo(board, r, c, color, dr, dc);
        /* 같은 줄을 중복 계산하지 않도록 줄에 속한 칸을 표시 */
        let rr = r, cc = c;
        while (isValidPos(rr, cc) && board[rr][cc] === color) { seen.add(`${rr},${cc},${dr},${dc}`); rr += dr; cc += dc; }
        rr = r - dr; cc = c - dc;
        while (isValidPos(rr, cc) && board[rr][cc] === color) { seen.add(`${rr},${cc},${dr},${dc}`); rr -= dr; cc -= dc; }
        const s = shapeScore(info.cnt, info.open);
        score += color === ai ? s : -s * 1.05;
      }
    }
  }
  return score;
}

function minimax(
  board: BoardState, depth: number, alpha: number, beta: number,
  maxing: boolean, ai: PieceColor, width: number
): number {
  if (depth === 0) return evaluateBoard(board, ai);
  const cur: PieceColor = maxing ? ai : other(ai);
  const moves = orderedMoves(board, cur, width);
  if (!moves.length) return evaluateBoard(board, ai);

  let best = maxing ? -Infinity : Infinity;
  for (const { row, col } of moves) {
    const nb = cloneBoard(board);
    nb[row][col] = cur;
    if (checkWin(nb, row, col, cur)) {
      /* 빨리 끝나는 승리를 더 높게 평가 */
      return maxing ? S.FIVE + depth : -(S.FIVE + depth);
    }
    const v = minimax(nb, depth - 1, alpha, beta, !maxing, ai, width);
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

/** 한 수로 이기는 자리 / 상대의 즉승을 막는 자리를 먼저 찾는다. */
function tacticalMove(board: BoardState, ai: PieceColor): Position | null {
  const opp = other(ai);
  const cands = getValidMoves(board);
  for (const { row, col } of cands) {
    const nb = cloneBoard(board);
    nb[row][col] = ai;
    if (checkWin(nb, row, col, ai)) return { row, col };
  }
  for (const { row, col } of cands) {
    const nb = cloneBoard(board);
    nb[row][col] = opp;
    if (checkWin(nb, row, col, opp)) return { row, col };
  }
  return null;
}

export function getBestMove(board: BoardState, ai: PieceColor, difficulty: Difficulty): Position | null {
  const all = getValidMoves(board);
  if (!all.length) return null;

  /* 쉬움도 즉승/즉방은 놓치지 않게 해서 "허무한 승리"를 막는다 */
  const tactical = tacticalMove(board, ai);
  if (tactical) return tactical;

  if (difficulty === 'easy') {
    /* 상위 후보 중 무작위 — 약하지만 엉뚱하지는 않게 */
    const top = orderedMoves(board, ai, 8);
    return top[Math.floor(Math.random() * top.length)] ?? all[0];
  }

  const depth = difficulty === 'normal' ? 2 : 4;
  const width = difficulty === 'normal' ? 8 : 8;
  const roots = orderedMoves(board, ai, difficulty === 'normal' ? 10 : 12);

  let best = roots[0];
  let bestVal = -Infinity;
  for (const { row, col } of roots) {
    const nb = cloneBoard(board);
    nb[row][col] = ai;
    const v = minimax(nb, depth - 1, -Infinity, Infinity, false, ai, width);
    if (v > bestVal) { bestVal = v; best = { row, col }; }
  }
  return best;
}
