import { BoardState } from './types';

export const BOARD_SIZE = 15;

export function createInitialBoard(): BoardState {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row]);
}

export function isValidPos(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}
