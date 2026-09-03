export type PieceColor = 'black' | 'white';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type GameMode = 'vs-ai' | 'vs-human';
export type GameStatus = 'menu' | 'playing' | 'ended';
export type EndReason = 'five' | 'draw' | 'resign' | null;

export interface Position {
  row: number;
  col: number;
}

export type BoardState = (PieceColor | null)[][];
