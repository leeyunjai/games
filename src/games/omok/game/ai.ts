import { BoardState, Difficulty, PieceColor, Position } from './types';
import { checkWin, getValidMoves } from './moves';
import { cloneBoard, isValidPos } from './board';

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

/* 형태별 점수 — 양끝이 열렸는지(open)까지 반영한다 */
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

/** 마지막 탐색 정보 — 화면에 "몇 수 앞을 읽었는지" 보여주는 용도 */
export interface SearchInfo {
  depth: number;
  nodes: number;
  ms: number;
}
let lastInfo: SearchInfo = { depth: 0, nodes: 0, ms: 0 };
export const getLastSearchInfo = (): SearchInfo => lastInfo;

const other = (c: PieceColor): PieceColor => (c === 'black' ? 'white' : 'black');

/** 난이도별 탐색 예산 */
const BUDGET: Record<Difficulty, { ms: number; maxDepth: number; width: number }> = {
  easy: { ms: 60, maxDepth: 1, width: 8 },
  normal: { ms: 150, maxDepth: 2, width: 10 },
  hard: { ms: 600, maxDepth: 6, width: 8 },
  expert: { ms: 1600, maxDepth: 10, width: 8 },
};

let deadline = Infinity;
let nodes = 0;
const outOfTime = () => nodes % 256 === 0 && performance.now() > deadline;

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

/** 빈 칸 (r,c)에 color가 두었을 때의 가치. 공격 + 수비를 합산한다. */
export function moveValue(board: BoardState, r: number, c: number, color: PieceColor): number {
  const opp = other(color);
  let atk = 0, def = 0;
  let atkThreats = 0, defThreats = 0;
  for (const [dr, dc] of DIRS) {
    const mine = lineInfo(board, r, c, color, dr, dc);
    const a = shapeScore(mine.cnt, mine.open);
    atk += a;
    if (a >= S.OPEN_THREE) atkThreats++;

    const theirs = lineInfo(board, r, c, opp, dr, dc);
    const d = shapeScore(theirs.cnt, theirs.open);
    def += d;
    if (d >= S.OPEN_THREE) defThreats++;
  }
  /* 한 수로 두 방향 위협을 동시에 만드는 자리(쌍삼 등)는 따로 크게 쳐준다 */
  const fork = atkThreats >= 2 ? S.OPEN_FOUR : 0;
  const blockFork = defThreats >= 2 ? S.OPEN_FOUR * 0.9 : 0;
  const center = 14 - Math.abs(r - 7) - Math.abs(c - 7);
  return atk + fork + (def + blockFork) * 0.9 + center * 3;
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
        if (seen.has(`${r},${c},${dr},${dc}`)) continue;
        const info = lineInfo(board, r, c, color, dr, dc);
        let rr = r, cc = c;
        while (isValidPos(rr, cc) && board[rr][cc] === color) { seen.add(`${rr},${cc},${dr},${dc}`); rr += dr; cc += dc; }
        rr = r - dr; cc = c - dc;
        while (isValidPos(rr, cc) && board[rr][cc] === color) { seen.add(`${rr},${cc},${dr},${dc}`); rr -= dr; cc -= dc; }
        const s = shapeScore(info.cnt, info.open);
        /* 상대 형태를 조금 더 무겁게 봐서 수비를 게을리하지 않게 한다 */
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
  nodes++;
  if (depth === 0 || outOfTime()) return evaluateBoard(board, ai);
  const cur: PieceColor = maxing ? ai : other(ai);
  const moves = orderedMoves(board, cur, width);
  if (!moves.length) return evaluateBoard(board, ai);

  let best = maxing ? -Infinity : Infinity;
  for (const { row, col } of moves) {
    const nb = cloneBoard(board);
    nb[row][col] = cur;
    if (checkWin(nb, row, col, cur)) {
      /* 같은 승리라면 빨리 끝나는 쪽을 선호 */
      return maxing ? S.FIVE + depth : -(S.FIVE + depth);
    }
    const v = minimax(nb, depth - 1, alpha, beta, !maxing, ai, width);
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

/** 한 수로 이기는 자리 / 상대의 즉승을 막는 자리 */
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

  const started = performance.now();
  nodes = 0;

  /* 어느 난이도든 즉승/즉방은 놓치지 않는다 */
  const tactical = tacticalMove(board, ai);
  if (tactical) {
    lastInfo = { depth: 1, nodes: all.length * 2, ms: performance.now() - started };
    return tactical;
  }

  const budget = BUDGET[difficulty];
  deadline = started + budget.ms;

  if (difficulty === 'easy') {
    /* 상위 후보 중에서 무작위 — 약하지만 엉뚱하지는 않게 */
    const top = orderedMoves(board, ai, budget.width);
    lastInfo = { depth: 1, nodes: top.length, ms: performance.now() - started };
    return top[Math.floor(Math.random() * top.length)] ?? all[0];
  }

  const roots = orderedMoves(board, ai, difficulty === 'normal' ? 10 : 12);
  let best = roots[0];
  let reached = 0;

  /* 반복 심화 — 예산 안에서 갈 수 있는 데까지 깊이를 늘린다 */
  for (let depth = 2; depth <= budget.maxDepth; depth += 2) {
    let localBest = roots[0];
    let localVal = -Infinity;
    let aborted = false;

    for (const { row, col } of roots) {
      const nb = cloneBoard(board);
      nb[row][col] = ai;
      const v = minimax(nb, depth - 1, -Infinity, Infinity, false, ai, budget.width);
      if (performance.now() > deadline) { aborted = true; break; }
      if (v > localVal) { localVal = v; localBest = { row, col }; }
    }

    if (aborted) break;
    best = localBest;
    reached = depth;
    /* 이미 이기는 수를 찾았으면 더 깊이 볼 이유가 없다 */
    if (localVal >= S.FIVE) break;
    if (performance.now() > deadline) break;
  }

  lastInfo = { depth: Math.max(reached, 2), nodes, ms: performance.now() - started };
  return best;
}
