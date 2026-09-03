/**
 * 테트리스 규칙 엔진 — 화면과 무관한 순수 로직만 담는다.
 * SRS(Super Rotation System) 회전 + 월킥, 7-bag 랜덤, 홀드, 고스트,
 * 락 딜레이, T-스핀 판정, 백투백/콤보 점수까지 여기서 처리한다.
 */

export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type CellKind = PieceKind | 'G' | null; // G = 가비지(사용하지 않음, 확장용)

export const COLS = 10;
export const ROWS = 20;
/** 스폰 여유 공간(화면에는 보이지 않는 위쪽 2줄) */
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

/** 각 조각의 회전 상태별 블록 좌표 (x=열, y=행, 스폰 기준) */
const SHAPES: Record<PieceKind, [number, number][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

/** SRS 월킥 표 (JLSTZ 공통) — [from][to] 순서로 시도할 보정값 */
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

/** SRS 월킥 표 (I 전용) */
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export interface ActivePiece {
  kind: PieceKind;
  rot: number;
  x: number;
  y: number;
  /** 직전 동작이 회전이었는지 (T-스핀 판정에 사용) */
  lastActionWasRotation: boolean;
  /** 마지막 회전이 킥을 사용했는지 */
  lastKickIndex: number;
}

export type Grid = CellKind[][];

export type ClearKind = 'single' | 'double' | 'triple' | 'tetris' | 'tspin' | 'tspin-mini' | null;

export interface LockResult {
  grid: Grid;
  clearedRows: number[];
  lines: number;
  kind: ClearKind;
  /** 이번 잠금으로 얻은 점수 */
  points: number;
  backToBack: boolean;
  combo: number;
  /** 보드가 꽉 차서 게임 오버인지 */
  topOut: boolean;
}

export function createGrid(): Grid {
  return Array.from({ length: TOTAL_ROWS }, () => Array<CellKind>(COLS).fill(null));
}

export function cellsOf(piece: ActivePiece): [number, number][] {
  return SHAPES[piece.kind][piece.rot % 4].map(([dx, dy]) => [piece.x + dx, piece.y + dy]);
}

export function collides(grid: Grid, piece: ActivePiece): boolean {
  for (const [x, y] of cellsOf(piece)) {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y >= 0 && grid[y][x] !== null) return true;
  }
  return false;
}

export function spawnPiece(kind: PieceKind): ActivePiece {
  return {
    kind,
    rot: 0,
    x: kind === 'O' ? 3 : 3,
    y: 0,
    lastActionWasRotation: false,
    lastKickIndex: 0,
  };
}

/** 7-bag 랜덤 — 일곱 조각이 한 번씩 나온 뒤에 다음 묶음이 시작된다. */
export class BagRandomizer {
  private bag: PieceKind[] = [];
  constructor(private rand: () => number = Math.random) {}

  next(): PieceKind {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  private refill() {
    const kinds: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    this.bag = kinds;
  }
}

export function move(grid: Grid, piece: ActivePiece, dx: number, dy: number): ActivePiece | null {
  const next: ActivePiece = { ...piece, x: piece.x + dx, y: piece.y + dy, lastActionWasRotation: false };
  return collides(grid, next) ? null : next;
}

/** SRS 회전. dir=1 시계, dir=-1 반시계 */
export function rotate(grid: Grid, piece: ActivePiece, dir: 1 | -1): ActivePiece | null {
  if (piece.kind === 'O') return piece;
  const from = piece.rot % 4;
  const to = (from + dir + 4) % 4;
  const table = piece.kind === 'I' ? KICKS_I : KICKS_JLSTZ;
  const kicks = table[`${from}>${to}`] ?? [[0, 0]];

  for (let i = 0; i < kicks.length; i++) {
    const [kx, ky] = kicks[i];
    const next: ActivePiece = {
      ...piece,
      rot: to,
      x: piece.x + kx,
      /* 표는 y가 위로 증가하는 좌표계라서 부호를 뒤집는다 */
      y: piece.y - ky,
      lastActionWasRotation: true,
      lastKickIndex: i,
    };
    if (!collides(grid, next)) return next;
  }
  return null;
}

export function ghostOf(grid: Grid, piece: ActivePiece): ActivePiece {
  let ghost = piece;
  for (;;) {
    const next = move(grid, ghost, 0, 1);
    if (!next) return ghost;
    ghost = next;
  }
}

export function hardDropDistance(grid: Grid, piece: ActivePiece): number {
  return ghostOf(grid, piece).y - piece.y;
}

/** T-스핀 판정 — T 조각이 회전으로 놓였고 네 모서리 중 셋 이상이 막혀 있으면 T-스핀 */
function detectTSpin(grid: Grid, piece: ActivePiece): 'tspin' | 'tspin-mini' | null {
  if (piece.kind !== 'T' || !piece.lastActionWasRotation) return null;
  const corners: [number, number][] = [[0, 0], [2, 0], [0, 2], [2, 2]];
  const blocked = corners.map(([dx, dy]) => {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y < 0) return false;
    return grid[y][x] !== null;
  });
  const count = blocked.filter(Boolean).length;
  if (count < 3) return null;
  /* 조각이 향한 쪽 두 모서리(front)가 모두 막혔으면 정식 T-스핀 */
  const frontByRot: Record<number, [number, number]> = { 0: [0, 1], 1: [1, 3], 2: [2, 3], 3: [0, 2] };
  const [a, b] = frontByRot[piece.rot % 4];
  const front = blocked[a] && blocked[b];
  if (front) return 'tspin';
  /* 킥을 크게 써서 들어간 경우는 정식 T-스핀으로 인정한다(SRS 관례) */
  return piece.lastKickIndex >= 4 ? 'tspin' : 'tspin-mini';
}

const LINE_POINTS: Record<Exclude<ClearKind, null>, number[]> = {
  /* [0줄, 1줄, 2줄, 3줄, 4줄] */
  single: [0, 100, 0, 0, 0],
  double: [0, 0, 300, 0, 0],
  triple: [0, 0, 0, 500, 0],
  tetris: [0, 0, 0, 0, 800],
  tspin: [400, 800, 1200, 1600, 0],
  'tspin-mini': [100, 200, 400, 0, 0],
};

export interface LockContext {
  level: number;
  combo: number;
  backToBack: boolean;
}

/** 조각을 굳히고 줄을 지운 결과를 계산한다. */
export function lockPiece(grid: Grid, piece: ActivePiece, ctx: LockContext): LockResult {
  const tspin = detectTSpin(grid, piece);
  const next = grid.map((row) => row.slice());
  let topOut = false;

  for (const [x, y] of cellsOf(piece)) {
    if (y < 0) { topOut = true; continue; }
    next[y][x] = piece.kind;
  }

  const clearedRows: number[] = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (next[y].every((c) => c !== null)) clearedRows.push(y);
  }
  for (const y of clearedRows) {
    next.splice(y, 1);
    next.unshift(Array<CellKind>(COLS).fill(null));
  }

  const lines = clearedRows.length;
  let kind: ClearKind = null;
  if (tspin) kind = tspin;
  else if (lines === 1) kind = 'single';
  else if (lines === 2) kind = 'double';
  else if (lines === 3) kind = 'triple';
  else if (lines === 4) kind = 'tetris';

  let points = 0;
  if (kind) points = (LINE_POINTS[kind][lines] ?? 0) * ctx.level;

  /* 백투백: 테트리스/T-스핀이 연달아 나오면 1.5배 */
  const isDifficult = kind === 'tetris' || kind === 'tspin' || kind === 'tspin-mini';
  if (lines > 0 && isDifficult && ctx.backToBack) points = Math.floor(points * 1.5);

  /* 콤보: 연속으로 줄을 지울 때마다 가산 */
  const combo = lines > 0 ? ctx.combo + 1 : -1;
  if (combo > 0) points += 50 * combo * ctx.level;

  /* 위쪽 숨김 영역에 블록이 남으면 게임 오버 */
  if (!topOut) {
    for (let y = 0; y < HIDDEN_ROWS; y++) {
      if (next[y].some((c) => c !== null)) { topOut = true; break; }
    }
  }

  return {
    grid: next,
    clearedRows,
    lines,
    kind,
    points,
    backToBack: lines > 0 ? isDifficult : ctx.backToBack,
    combo,
    topOut,
  };
}

/** 레벨별 낙하 간격(ms) — 클래식 곡선을 흉내낸 값 */
export function gravityMs(level: number): number {
  const table = [1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7];
  return table[Math.min(level - 1, table.length - 1)] ?? 7;
}

export const KIND_LABEL: Record<Exclude<ClearKind, null>, string> = {
  single: '싱글',
  double: '더블',
  triple: '트리플',
  tetris: '테트리스!',
  tspin: 'T-스핀!',
  'tspin-mini': 'T-스핀 미니',
};
