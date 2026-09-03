import { BoardState, PieceColor, Position } from './types';
import { BOARD_SIZE, isValidPos } from './board';

const WIN = 5;
const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

function walk(
  board: BoardState,
  row: number, col: number,
  color: PieceColor,
  dr: number, dc: number
): Position[] {
  const out: Position[] = [];
  let r = row + dr, c = col + dc;
  while (isValidPos(r, c) && board[r][c] === color) {
    out.push({ row: r, col: c });
    r += dr; c += dc;
  }
  return out;
}

/** 마지막 착수(row,col)로 5목이 완성됐다면 그 줄의 좌표들을 반환한다. */
export function getWinLine(
  board: BoardState,
  row: number, col: number,
  color: PieceColor
): Position[] | null {
  for (const [dr, dc] of DIRS) {
    const fwd = walk(board, row, col, color, dr, dc);
    const bck = walk(board, row, col, color, -dr, -dc);
    if (1 + fwd.length + bck.length >= WIN) {
      return [...bck.reverse(), { row, col }, ...fwd];
    }
  }
  return null;
}

export function checkWin(board: BoardState, row: number, col: number, color: PieceColor): boolean {
  return getWinLine(board, row, col, color) !== null;
}

export function isBoardFull(board: BoardState): boolean {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (!board[r][c]) return false;
  return true;
}

/** 기존 돌 주변 2칸 이내의 빈 칸만 후보로 추린다. */
export function getValidMoves(board: BoardState, radius = 2): Position[] {
  const near = new Set<string>();
  let hasAny = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) continue;
      hasAny = true;
      for (let dr = -radius; dr <= radius; dr++)
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr, nc = c + dc;
          if (isValidPos(nr, nc) && !board[nr][nc]) near.add(`${nr},${nc}`);
        }
    }
  }
  if (!hasAny) return [{ row: 7, col: 7 }];
  return [...near].map(s => {
    const [rr, cc] = s.split(',').map(Number);
    return { row: rr, col: cc };
  });
}
