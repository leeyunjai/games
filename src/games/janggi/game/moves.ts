import { BoardState, Piece, Player, Position } from './types';
import { cloneBoard } from './board';

const ROWS = 10;
const COLS = 9;

function inBounds(r: number, c: number) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function canLand(board: BoardState, r: number, c: number, player: Player) {
  if (!inBounds(r, c)) return false;
  const p = board[r][c];
  return !p || p.player !== player;
}

// Palace definitions
const HAN_PAL = { r1: 0, r2: 2, c1: 3, c2: 5 };
const CHO_PAL = { r1: 7, r2: 9, c1: 3, c2: 5 };

function inPalace(r: number, c: number, player: Player) {
  const p = player === 'han' ? HAN_PAL : CHO_PAL;
  return r >= p.r1 && r <= p.r2 && c >= p.c1 && c <= p.c2;
}

// Palace diagonal paths (each array is a traversable line)
const DIAG_PATHS: [number, number][][] = [
  [[0,3],[1,4],[2,5]],
  [[0,5],[1,4],[2,3]],
  [[7,3],[8,4],[9,5]],
  [[7,5],[8,4],[9,3]],
];

function diagPathsThrough(r: number, c: number): { path: [number,number][]; idx: number }[] {
  const result: { path: [number,number][]; idx: number }[] = [];
  for (const path of DIAG_PATHS) {
    const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
    if (idx !== -1) result.push({ path, idx });
  }
  return result;
}

function getGeneralGuardMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inPalace(nr, nc, player) && canLand(board, nr, nc, player)) {
      moves.push({ row: nr, col: nc });
    }
  }
  for (const { path, idx } of diagPathsThrough(r, c)) {
    if (!inPalace(r, c, player)) continue;
    for (const di of [-1, 1]) {
      const ni = idx + di;
      if (ni < 0 || ni >= path.length) continue;
      const [nr, nc] = path[ni];
      if (inPalace(nr, nc, player) && canLand(board, nr, nc, player)) {
        moves.push({ row: nr, col: nc });
      }
    }
  }
  return moves;
}

function getChariotMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (!p) {
        moves.push({ row: nr, col: nc });
      } else {
        if (p.player !== player) moves.push({ row: nr, col: nc });
        break;
      }
      nr += dr; nc += dc;
    }
  }
  // Palace diagonals
  for (const { path, idx } of diagPathsThrough(r, c)) {
    for (const dir of [-1, 1]) {
      let i = idx + dir;
      while (i >= 0 && i < path.length) {
        const [nr, nc] = path[i];
        const p = board[nr][nc];
        if (!p) {
          moves.push({ row: nr, col: nc });
        } else {
          if (p.player !== player) moves.push({ row: nr, col: nc });
          break;
        }
        i += dir;
      }
    }
  }
  return moves;
}

function getHorseMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  const patterns: [number,number,number,number][] = [
    [-1,0,-1,-1], [-1,0,-1,1],
    [1,0,1,-1],   [1,0,1,1],
    [0,-1,-1,-1], [0,-1,1,-1],
    [0,1,-1,1],   [0,1,1,1],
  ];
  for (const [dr1, dc1, dr2, dc2] of patterns) {
    const mr = r + dr1, mc = c + dc1;
    if (!inBounds(mr, mc) || board[mr][mc]) continue;
    const nr = mr + dr2, nc = mc + dc2;
    if (inBounds(nr, nc) && canLand(board, nr, nc, player)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function getElephantMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  const patterns: [number,number,number,number][] = [
    [-1,0,-1,-1], [-1,0,-1,1],
    [1,0,1,-1],   [1,0,1,1],
    [0,-1,-1,-1], [0,-1,1,-1],
    [0,1,-1,1],   [0,1,1,1],
  ];
  for (const [dr1, dc1, dr2, dc2] of patterns) {
    const r1 = r + dr1, c1 = c + dc1;
    if (!inBounds(r1, c1) || board[r1][c1]) continue;
    const r2 = r1 + dr2, c2 = c1 + dc2;
    if (!inBounds(r2, c2) || board[r2][c2]) continue;
    const r3 = r2 + dr2, c3 = c2 + dc2;
    if (inBounds(r3, c3) && canLand(board, r3, c3, player)) {
      moves.push({ row: r3, col: c3 });
    }
  }
  return moves;
}

function getCannonMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nc = c + dc;
    let hasScreen = false;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (!hasScreen) {
        if (p) {
          if (p.type === 'cannon') break;
          hasScreen = true;
        }
      } else {
        if (p) {
          if (p.player !== player && p.type !== 'cannon') moves.push({ row: nr, col: nc });
          break;
        } else {
          moves.push({ row: nr, col: nc });
        }
      }
      nr += dr; nc += dc;
    }
  }
  // Palace diagonals
  for (const { path, idx } of diagPathsThrough(r, c)) {
    for (const dir of [-1, 1]) {
      let i = idx + dir;
      let hasScreen = false;
      while (i >= 0 && i < path.length) {
        const [nr, nc] = path[i];
        const p = board[nr][nc];
        if (!hasScreen) {
          if (p) {
            if (p.type === 'cannon') break;
            hasScreen = true;
          }
        } else {
          if (p) {
            if (p.player !== player && p.type !== 'cannon') moves.push({ row: nr, col: nc });
            break;
          } else {
            moves.push({ row: nr, col: nc });
          }
        }
        i += dir;
      }
    }
  }
  return moves;
}

function getSoldierMoves(board: BoardState, r: number, c: number, player: Player): Position[] {
  const moves: Position[] = [];
  const fwd = player === 'han' ? 1 : -1;

  if (inBounds(r + fwd, c) && canLand(board, r + fwd, c, player)) {
    moves.push({ row: r + fwd, col: c });
  }
  for (const dc of [-1, 1]) {
    if (inBounds(r, c + dc) && canLand(board, r, c + dc, player)) {
      moves.push({ row: r, col: c + dc });
    }
  }
  // Palace diagonal forward
  for (const { path, idx } of diagPathsThrough(r, c)) {
    for (const di of [-1, 1]) {
      const ni = idx + di;
      if (ni < 0 || ni >= path.length) continue;
      const [nr, nc] = path[ni];
      if ((nr - r) * fwd > 0 && canLand(board, nr, nc, player)) {
        moves.push({ row: nr, col: nc });
      }
    }
  }
  return moves;
}

export function getRawMoves(board: BoardState, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  switch (piece.type) {
    case 'general':
    case 'guard':    return getGeneralGuardMoves(board, r, c, piece.player);
    case 'chariot':  return getChariotMoves(board, r, c, piece.player);
    case 'horse':    return getHorseMoves(board, r, c, piece.player);
    case 'elephant': return getElephantMoves(board, r, c, piece.player);
    case 'cannon':   return getCannonMoves(board, r, c, piece.player);
    case 'soldier':  return getSoldierMoves(board, r, c, piece.player);
  }
}

export function applyMove(board: BoardState, from: Position, to: Position): { board: BoardState; captured: Piece | null } {
  const next = cloneBoard(board);
  const captured = next[to.row][to.col];
  next[to.row][to.col] = next[from.row][from.col];
  next[from.row][from.col] = null;
  return { board: next, captured };
}

function findGeneral(board: BoardState, player: Player): Position | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'general' && p.player === player) return { row: r, col: c };
    }
  }
  return null;
}

function isAttacked(board: BoardState, pos: Position, byPlayer: Player): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.player === byPlayer) {
        const moves = getRawMoves(board, r, c);
        if (moves.some(m => m.row === pos.row && m.col === pos.col)) return true;
      }
    }
  }
  return false;
}

export function isInCheck(board: BoardState, player: Player): boolean {
  const gen = findGeneral(board, player);
  if (!gen) return true;
  const opp = player === 'han' ? 'cho' : 'han';
  return isAttacked(board, gen, opp);
}

export function getLegalMoves(board: BoardState, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  return getRawMoves(board, r, c).filter(to => {
    const { board: next } = applyMove(board, { row: r, col: c }, to);
    return !isInCheck(next, piece.player);
  });
}

export function getAllLegalMoves(board: BoardState, player: Player): { from: Position; to: Position }[] {
  const result: { from: Position; to: Position }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        for (const to of getLegalMoves(board, r, c)) {
          result.push({ from: { row: r, col: c }, to });
        }
      }
    }
  }
  return result;
}

export function hasLegalMoves(board: BoardState, player: Player): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.player === player && getLegalMoves(board, r, c).length > 0) return true;
    }
  }
  return false;
}
