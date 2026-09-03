/**
 * 리버시(오델로) 규칙 엔진 — 8×8, 순수 로직만 담는다.
 * 보드는 길이 64의 Uint8Array. 0=빈칸, 1=흑, 2=백.
 */

export const SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Player = typeof BLACK | typeof WHITE;
export type Board = Uint8Array;

export const opponent = (p: Player): Player => (p === BLACK ? WHITE : BLACK);

const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];

export function createBoard(): Board {
  const b = new Uint8Array(64);
  b[27] = WHITE; b[28] = BLACK;
  b[35] = BLACK; b[36] = WHITE;
  return b;
}

export const rowOf = (i: number) => i >> 3;
export const colOf = (i: number) => i & 7;

/** 한 방향으로 뒤집히는 돌의 인덱스 목록 (없으면 빈 배열) */
function flipsInDir(board: Board, index: number, player: Player, dir: number): number[] {
  const opp = opponent(player);
  const out: number[] = [];
  let cur = index;
  for (;;) {
    const next = cur + dir;
    if (next < 0 || next > 63) return [];
    /* 좌우로 판을 넘어가는 이동 차단 */
    if (Math.abs(colOf(next) - colOf(cur)) > 1) return [];
    if (board[next] === opp) { out.push(next); cur = next; continue; }
    if (board[next] === player) return out.length ? out : [];
    return [];
  }
}

/** 해당 칸에 두었을 때 뒤집히는 모든 돌 */
export function flipsFor(board: Board, index: number, player: Player): number[] {
  if (board[index] !== EMPTY) return [];
  const out: number[] = [];
  for (const d of DIRS) {
    const f = flipsInDir(board, index, player, d);
    if (f.length) out.push(...f);
  }
  return out;
}

export interface LegalMove {
  index: number;
  flips: number[];
}

export function legalMoves(board: Board, player: Player): LegalMove[] {
  const out: LegalMove[] = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] !== EMPTY) continue;
    const flips = flipsFor(board, i, player);
    if (flips.length) out.push({ index: i, flips });
  }
  return out;
}

export function hasMove(board: Board, player: Player): boolean {
  for (let i = 0; i < 64; i++) {
    if (board[i] !== EMPTY) continue;
    for (const d of DIRS) {
      if (flipsInDir(board, i, player, d).length) return true;
    }
  }
  return false;
}

export function applyMove(board: Board, index: number, player: Player, flips?: number[]): Board {
  const f = flips ?? flipsFor(board, index, player);
  const next = board.slice();
  next[index] = player;
  for (const i of f) next[i] = player;
  return next;
}

export interface Counts { black: number; white: number; empty: number }

export function counts(board: Board): Counts {
  let black = 0, white = 0, empty = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] === BLACK) black++;
    else if (board[i] === WHITE) white++;
    else empty++;
  }
  return { black, white, empty };
}

/** 양쪽 모두 둘 곳이 없으면 게임 종료 */
export function isGameOver(board: Board): boolean {
  return !hasMove(board, BLACK) && !hasMove(board, WHITE);
}

export function winnerOf(board: Board): Player | null {
  const { black, white } = counts(board);
  if (black === white) return null;
  return black > white ? BLACK : WHITE;
}

export const NOTATION = (index: number) => `${'ABCDEFGH'[colOf(index)]}${rowOf(index) + 1}`;
