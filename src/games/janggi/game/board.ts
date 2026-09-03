import { BoardState, Piece, Player, Position, Setup } from './types';

export const ROWS = 10;
export const COLS = 9;

export const SETUP_LABEL: Record<Setup, string> = {
  msms: '마상마상',
  smsm: '상마상마',
  mssm: '마상상마',
  smms: '상마마상',
};

/** 차림 코드 → 왼쪽(1,2번 자리)·오른쪽(6,7번 자리) 기물 순서 */
function setupPairs(setup: Setup): [Piece['type'], Piece['type'], Piece['type'], Piece['type']] {
  switch (setup) {
    case 'msms': return ['horse', 'elephant', 'horse', 'elephant'];
    case 'smsm': return ['elephant', 'horse', 'elephant', 'horse'];
    case 'mssm': return ['horse', 'elephant', 'elephant', 'horse'];
    case 'smms': return ['elephant', 'horse', 'horse', 'elephant'];
  }
}

/** 한 진영의 배치를 만든다. baseRow는 궁성 바깥쪽 끝 줄. */
function sideSetup(player: Player, setup: Setup): [number, number, Piece['type']][] {
  const [l1, l2, r1, r2] = setupPairs(setup);
  const back = player === 'han' ? 0 : 9;
  const genRow = player === 'han' ? 1 : 8;
  const cannonRow = player === 'han' ? 2 : 7;
  const soldierRow = player === 'han' ? 3 : 6;
  return [
    [back, 0, 'chariot'], [back, 1, l1], [back, 2, l2], [back, 3, 'guard'],
    [genRow, 4, 'general'],
    [back, 5, 'guard'], [back, 6, r1], [back, 7, r2], [back, 8, 'chariot'],
    [cannonRow, 1, 'cannon'], [cannonRow, 7, 'cannon'],
    [soldierRow, 0, 'soldier'], [soldierRow, 2, 'soldier'], [soldierRow, 4, 'soldier'],
    [soldierRow, 6, 'soldier'], [soldierRow, 8, 'soldier'],
  ];
}

export function createInitialBoard(setupCho: Setup = 'msms', setupHan: Setup = 'smsm'): BoardState {
  const board: BoardState = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  let id = 0;
  for (const [row, col, type] of sideSetup('han', setupHan)) {
    board[row][col] = { id: `h${id++}`, type, player: 'han' };
  }
  for (const [row, col, type] of sideSetup('cho', setupCho)) {
    board[row][col] = { id: `c${id++}`, type, player: 'cho' };
  }
  return board;
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row]);
}

/** 장기 점수 — 한(漢)은 후수 덤 1.5점 */
export const PIECE_SCORE: Record<Piece['type'], number> = {
  general: 0, chariot: 13, cannon: 7, horse: 5, elephant: 3, guard: 3, soldier: 2,
};

export function materialScore(board: BoardState, player: Player): number {
  let sum = player === 'han' ? 1.5 : 0;
  for (const row of board)
    for (const p of row)
      if (p && p.player === player) sum += PIECE_SCORE[p.type];
  return sum;
}

/** 기보 표기용 좌표: 세로줄 1~9(왼쪽부터), 가로줄 1~10(아래부터, 10은 0으로 적는 관례) */
export function notate(pos: Position): string {
  return `${pos.col + 1}${(ROWS - pos.row) % 10}`;
}
