import { BoardState, Difficulty, Player, Position } from './types';
import { getAllLegalMoves, getRawMoves, applyMove } from './moves';

/** 마지막 탐색 정보 — 화면에 "몇 수 앞을 읽었는지" 보여주는 용도 */
export interface SearchInfo {
  depth: number;
  nodes: number;
  ms: number;
}
let lastInfo: SearchInfo = { depth: 0, nodes: 0, ms: 0 };
export const getLastSearchInfo = (): SearchInfo => lastInfo;
let nodes = 0;

const VALUES: Record<string, number> = {
  general: 10000,
  chariot: 130,
  cannon: 105,
  horse: 80,
  elephant: 55,
  guard: 35,
  soldier: 30,
};

/* Positional bonus per piece type */
function posBonus(type: string, player: Player, r: number, c: number): number {
  switch (type) {
    case 'soldier': {
      // Reward advancing into enemy territory
      const adv = player === 'han' ? Math.max(0, r - 3) : Math.max(0, 6 - r);
      // Extra reward for reaching the last two rows
      const deep = player === 'han' ? Math.max(0, r - 7) : Math.max(0, 2 - r);
      return adv * 8 + deep * 10;
    }
    case 'cannon':
      // Prefer center files, penalise corners
      return (c >= 2 && c <= 6) ? 8 : -5;
    case 'chariot':
      return (c >= 2 && c <= 6) ? 4 : 0;
    case 'horse':
      // Horses are stronger near the center
      return (c >= 2 && c <= 6 && r >= 2 && r <= 7) ? 6 : 0;
    default:
      return 0;
  }
}

function evaluate(board: BoardState, player: Player): number {
  nodes++;
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = (VALUES[p.type] ?? 0) + posBonus(p.type, p.player, r, c);
      score += (p.player === player ? 1 : -1) * val;
    }
  }
  return score;
}

function getAllRawMoves(board: BoardState, player: Player): { from: Position; to: Position }[] {
  const result: { from: Position; to: Position }[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        for (const to of getRawMoves(board, r, c)) {
          result.push({ from: { row: r, col: c }, to });
        }
      }
    }
  }
  return result;
}

/* MVV-LVA: Most Valuable Victim / Least Valuable Attacker */
function sortMoves(board: BoardState, moves: { from: Position; to: Position }[]) {
  return moves.sort((a, b) => {
    const victimA = VALUES[board[a.to.row][a.to.col]?.type ?? ''] ?? 0;
    const victimB = VALUES[board[b.to.row][b.to.col]?.type ?? ''] ?? 0;
    const atkA = VALUES[board[a.from.row][a.from.col]?.type ?? ''] ?? 200;
    const atkB = VALUES[board[b.from.row][b.from.col]?.type ?? ''] ?? 200;
    return (victimB * 10 - atkB) - (victimA * 10 - atkA);
  });
}

/* Quiescence search: keep searching captures at leaf nodes to avoid horizon effect */
function quiesce(
  board: BoardState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: Player,
  opp: Player,
  qdepth: number,
): number {
  const standPat = evaluate(board, me);

  if (maximizing) {
    if (standPat >= beta) return beta;
    let a = Math.max(alpha, standPat);
    if (qdepth === 0) return a;

    const captures = sortMoves(
      board,
      getAllRawMoves(board, me).filter(mv => board[mv.to.row][mv.to.col] !== null),
    );
    for (const mv of captures) {
      const { board: next } = applyMove(board, mv.from, mv.to);
      const score = quiesce(next, a, beta, false, me, opp, qdepth - 1);
      if (score >= beta) return beta;
      a = Math.max(a, score);
    }
    return a;
  } else {
    if (standPat <= alpha) return alpha;
    let b = Math.min(beta, standPat);
    if (qdepth === 0) return b;

    const captures = sortMoves(
      board,
      getAllRawMoves(board, opp).filter(mv => board[mv.to.row][mv.to.col] !== null),
    );
    for (const mv of captures) {
      const { board: next } = applyMove(board, mv.from, mv.to);
      const score = quiesce(next, alpha, b, true, me, opp, qdepth - 1);
      if (score <= alpha) return alpha;
      b = Math.min(b, score);
    }
    return b;
  }
}

/* 탐색 시간 예산 — 초과하면 즉시 현재 평가값으로 되돌아온다 */
let searchDeadline = Infinity;
function outOfTime(): boolean {
  return performance.now() > searchDeadline;
}

/* Minimax with α-β pruning; leaves use quiescence search */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: Player,
  opp: Player,
): number {
  if (depth === 0 || outOfTime()) return quiesce(board, alpha, beta, maximizing, me, opp, outOfTime() ? 0 : 2);

  const cur = maximizing ? me : opp;
  const moves = sortMoves(board, getAllRawMoves(board, cur));
  if (moves.length === 0) return maximizing ? -9000 : 9000;

  if (maximizing) {
    let best = -Infinity;
    for (const mv of moves) {
      const { board: next } = applyMove(board, mv.from, mv.to);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, me, opp));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const mv of moves) {
      const { board: next } = applyMove(board, mv.from, mv.to);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, me, opp));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function isLowEndDevice(): boolean {
  const mem = (navigator as unknown as Record<string, number>)['deviceMemory'] ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  return mem <= 2 || cores <= 2 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

/* Search at a fixed depth; returns best move found */
function searchAtDepth(
  board: BoardState,
  moves: { from: Position; to: Position }[],
  depth: number,
  player: Player,
): { move: { from: Position; to: Position }; val: number } {
  const opp = player === 'han' ? 'cho' : 'han';
  const sorted = sortMoves(board, [...moves]);
  let best = sorted[0];
  let bestVal = -Infinity;
  for (const mv of sorted) {
    const { board: next } = applyMove(board, mv.from, mv.to);
    const val = minimax(next, depth - 1, -Infinity, Infinity, false, player, opp);
    if (val > bestVal) { bestVal = val; best = mv; }
  }
  return { move: best, val: bestVal };
}

export function getBestMove(
  board: BoardState,
  player: Player,
  difficulty: Difficulty,
): { from: Position; to: Position } | null {
  const moves = getAllLegalMoves(board, player);
  if (moves.length === 0) return null;

  const started = performance.now();
  nodes = 0;

  /* 쉬움도 완전 무작위는 아니게 — 1수 앞만 보는 탐욕 탐색에 약간의 무작위를 섞는다 */
  if (difficulty === 'easy') {
    searchDeadline = performance.now() + 300;
    lastInfo = { depth: 1, nodes: moves.length, ms: 0 };
    const scored = moves.map(mv => {
      const { board: next } = applyMove(board, mv.from, mv.to);
      return { mv, val: evaluate(next, player) + Math.random() * 20 };
    });
    scored.sort((a, b) => b.val - a.val);
    const pool = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.25)));
    return pool[Math.floor(Math.random() * pool.length)].mv;
  }

  const mobile = isLowEndDevice();

  if (difficulty === 'normal') {
    searchDeadline = performance.now() + 800;
    const r = searchAtDepth(board, moves, mobile ? 1 : 2, player);
    lastInfo = { depth: mobile ? 1 : 2, nodes, ms: performance.now() - started };
    return r.move;
  }

  // 어려움/최고: 시간 예산 안에서 반복 심화. 예산을 넘기면 이전 깊이 결과를 쓴다.
  const budget = difficulty === 'expert' ? 2500 : 1200;
  const maxDepth = difficulty === 'expert' ? 5 : 4;

  if (mobile) {
    searchDeadline = performance.now() + budget * 0.6;
    const r = searchAtDepth(board, moves, 2, player);
    lastInfo = { depth: 2, nodes, ms: performance.now() - started };
    return r.move;
  }

  searchDeadline = performance.now() + budget;
  let best = searchAtDepth(board, moves, 2, player).move;
  let reached = 2;
  for (let depth = 3; depth <= maxDepth; depth++) {
    if (outOfTime()) break;
    const r = searchAtDepth(board, moves, depth, player);
    /* 예산 초과로 중간에 끊긴 결과는 신뢰할 수 없으므로 버린다 */
    if (outOfTime()) break;
    best = r.move;
    reached = depth;
  }
  lastInfo = { depth: reached, nodes, ms: performance.now() - started };
  return best;
}
