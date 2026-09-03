export type PieceType = 'general' | 'guard' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';
export type Player = 'han' | 'cho';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type GameMode = 'vs-ai' | 'vs-human';
export type GameStatus = 'menu' | 'playing' | 'ended';
export type EndReason = 'checkmate' | 'stalemate' | 'resign' | null;

/** 차림(마·상 배치). 왼쪽 두 칸 → 오른쪽 두 칸 순서로 읽는다. */
export type Setup = 'msms' | 'smsm' | 'mssm' | 'smms';

export interface Piece {
  id: string;
  type: PieceType;
  player: Player;
}

export interface Position {
  row: number;
  col: number;
}

export interface MoveRecord {
  from: Position;
  to: Position;
  player: Player;
  type: PieceType;
  captured: PieceType | null;
  /** 한 수 쉼 */
  pass?: boolean;
}

export type BoardState = (Piece | null)[][];
