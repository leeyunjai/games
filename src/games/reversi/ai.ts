import {
  BLACK, Board, EMPTY, LegalMove, Player,
  applyMove, counts, hasMove, legalMoves, opponent,
} from './engine';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

/** 칸별 가치 — 모서리는 크게, 모서리 옆(X·C 자리)은 크게 감점 */
const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

const CORNERS = [0, 7, 56, 63];

export interface SearchInfo {
  depth: number;
  nodes: number;
  ms: number;
  /** 종반 완전탐색이었는지 */
  exact: boolean;
}

let lastInfo: SearchInfo = { depth: 0, nodes: 0, ms: 0, exact: false };
export const getLastSearchInfo = (): SearchInfo => lastInfo;

let nodes = 0;
let deadline = Infinity;
const outOfTime = () => (nodes & 511) === 0 && performance.now() > deadline;

/** 전선(frontier) 돌 — 빈칸에 접한 돌은 상대에게 수를 내주기 쉬워 감점 */
function frontier(board: Board, player: Player): number {
  let n = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] !== player) continue;
    const r = i >> 3, c = i & 7;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        if (board[nr * 8 + nc] === EMPTY) { n++; dr = 2; break; }
      }
    }
  }
  return n;
}

/** 확정석(모서리에서 이어지는 뒤집히지 않는 돌) 개수 */
function stableFromCorners(board: Board, player: Player): number {
  let n = 0;
  const scan = (start: number, step: number, len: number) => {
    for (let k = 0; k < len; k++) {
      const i = start + step * k;
      if (board[i] !== player) break;
      n++;
    }
  };
  if (board[0] === player) { n++; scan(1, 1, 7); scan(8, 8, 7); }
  if (board[7] === player) { n++; scan(6, -1, 7); scan(15, 8, 7); }
  if (board[56] === player) { n++; scan(57, 1, 7); scan(48, -8, 7); }
  if (board[63] === player) { n++; scan(62, -1, 7); scan(55, -8, 7); }
  return n;
}

/** 평가값(me 기준). 국면 진행에 따라 항목 비중을 바꾼다. */
export function evaluate(board: Board, me: Player): number {
  nodes++;
  const opp = opponent(me);
  const { black, white, empty } = counts(board);
  const myDiscs = me === BLACK ? black : white;
  const oppDiscs = me === BLACK ? white : black;

  /* 종반에는 돌 수가 곧 승패 */
  if (empty === 0) return (myDiscs - oppDiscs) * 10000;

  let position = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] === me) position += WEIGHTS[i];
    else if (board[i] === opp) position -= WEIGHTS[i];
  }

  const myMob = legalMoves(board, me).length;
  const oppMob = legalMoves(board, opp).length;
  const mobility = myMob + oppMob === 0 ? 0 : (100 * (myMob - oppMob)) / (myMob + oppMob + 1);

  const myCorner = CORNERS.filter((i) => board[i] === me).length;
  const oppCorner = CORNERS.filter((i) => board[i] === opp).length;
  const corner = 25 * (myCorner - oppCorner);

  const stability = 12 * (stableFromCorners(board, me) - stableFromCorners(board, opp));
  const front = -2 * (frontier(board, me) - frontier(board, opp));

  /* 초·중반은 위치와 기동력, 종반으로 갈수록 돌 수 비중을 높인다 */
  const lateness = (64 - empty) / 64;
  const discDiff = ((myDiscs - oppDiscs) * 100) / (myDiscs + oppDiscs);

  return (
    position * (1 - lateness * 0.5) +
    mobility * 8 * (1 - lateness) +
    corner * 10 +
    stability * (1 + lateness) +
    front * (1 - lateness) +
    discDiff * lateness * 12
  );
}

/** 수 정렬 — 모서리 우선, 상대 기동력을 줄이는 수 우선 */
function orderMoves(board: Board, player: Player, moves: LegalMove[]): LegalMove[] {
  return moves
    .map((m) => {
      let score = WEIGHTS[m.index];
      const next = applyMove(board, m.index, player, m.flips);
      score -= legalMoves(next, opponent(player)).length * 6;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);
}

function negamax(board: Board, player: Player, me: Player, depth: number, alpha: number, beta: number): number {
  if (depth <= 0 || outOfTime()) {
    const v = evaluate(board, me);
    return player === me ? v : -v;
  }

  const moves = legalMoves(board, player);
  if (moves.length === 0) {
    /* 둘 곳이 없으면 패스. 양쪽 다 없으면 종료 */
    if (!hasMove(board, opponent(player))) {
      const { black, white } = counts(board);
      const diff = me === BLACK ? black - white : white - black;
      const v = diff * 10000;
      return player === me ? v : -v;
    }
    return -negamax(board, opponent(player), me, depth - 1, -beta, -alpha);
  }

  let best = -Infinity;
  for (const mv of orderMoves(board, player, moves)) {
    const next = applyMove(board, mv.index, player, mv.flips);
    const v = -negamax(next, opponent(player), me, depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const SETTINGS: Record<Difficulty, { depth: number; ms: number; exactAt: number; noise: number }> = {
  /* exactAt: 남은 빈칸이 이 수 이하면 끝까지 완전탐색 */
  easy: { depth: 1, ms: 120, exactAt: 0, noise: 1 },
  normal: { depth: 3, ms: 400, exactAt: 8, noise: 0.25 },
  hard: { depth: 6, ms: 1200, exactAt: 12, noise: 0 },
  expert: { depth: 9, ms: 2500, exactAt: 16, noise: 0 },
};

export function getBestMove(board: Board, player: Player, difficulty: Difficulty): number | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  if (moves.length === 1) {
    lastInfo = { depth: 1, nodes: 1, ms: 0, exact: false };
    return moves[0].index;
  }

  const cfg = SETTINGS[difficulty];
  const started = performance.now();
  nodes = 0;
  deadline = started + cfg.ms;

  const { empty } = counts(board);
  const exact = empty <= cfg.exactAt;
  const maxDepth = exact ? empty : cfg.depth;

  const ordered = orderMoves(board, player, moves);
  let best = ordered[0].index;
  let reached = 1;

  /* 반복 심화 — 예산 안에서 깊이를 늘려 간다 */
  for (let depth = exact ? maxDepth : 2; depth <= maxDepth; depth++) {
    let localBest = ordered[0].index;
    let localVal = -Infinity;
    let alpha = -Infinity;
    let aborted = false;

    for (const mv of ordered) {
      const next = applyMove(board, mv.index, player, mv.flips);
      let v = -negamax(next, opponent(player), player, depth - 1, -Infinity, -alpha);
      if (cfg.noise > 0) v += (Math.random() - 0.5) * 200 * cfg.noise;
      if (performance.now() > deadline && depth > 2) { aborted = true; break; }
      if (v > localVal) { localVal = v; localBest = mv.index; }
      if (v > alpha) alpha = v;
    }

    if (aborted) break;
    best = localBest;
    reached = depth;
    if (performance.now() > deadline) break;
    if (exact) break;
  }

  lastInfo = { depth: reached, nodes, ms: performance.now() - started, exact };
  return best;
}

/** 사람에게 보여줄 추천 수 (힌트) */
export function hintMove(board: Board, player: Player): number | null {
  return getBestMove(board, player, 'hard');
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움', normal: '보통', hard: '어려움', expert: '최고',
};
