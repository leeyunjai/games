import {
  ActivePiece, BagRandomizer, ClearKind, Grid, PieceKind, TOTAL_ROWS,
  collides, createGrid, ghostOf, gravityMs, lockPiece, move, rotate, spawnPiece,
} from './engine';
import { sfx } from '../../shared/sound';

export type Status = 'ready' | 'playing' | 'paused' | 'over';

export interface Hud {
  score: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
  status: Status;
  hold: PieceKind | null;
  queue: PieceKind[];
  /** 최근 줄 지우기 알림 */
  flash: { kind: ClearKind; combo: number; b2b: boolean; at: number } | null;
  pieces: number;
  elapsedMs: number;
}

/** 입력 반복(DAS/ARR) 설정 — 값이 작을수록 빠르게 반복된다 */
const DAS_MS = 150;
const ARR_MS = 38;
const SOFT_DROP_MS = 28;
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

export class TetrisGame {
  grid: Grid = createGrid();
  active: ActivePiece | null = null;
  ghost: ActivePiece | null = null;
  hold: PieceKind | null = null;
  holdUsed = false;
  queue: PieceKind[] = [];
  status: Status = 'ready';

  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  backToBack = false;
  pieces = 0;
  elapsedMs = 0;
  flash: Hud['flash'] = null;

  private bag = new BagRandomizer();
  private dropAcc = 0;
  private lockAcc = 0;
  private lockResets = 0;
  private grounded = false;
  private held: Record<'left' | 'right' | 'down', { down: boolean; acc: number; repeating: boolean }> = {
    left: { down: false, acc: 0, repeating: false },
    right: { down: false, acc: 0, repeating: false },
    down: { down: false, acc: 0, repeating: false },
  };

  onHud: (hud: Hud) => void = () => {};
  onGameOver: (hud: Hud) => void = () => {};

  constructor(private onEvent: (name: string) => void = () => {}) {}

  hud(): Hud {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level,
      combo: this.combo,
      backToBack: this.backToBack,
      status: this.status,
      hold: this.hold,
      queue: this.queue.slice(0, 5),
      flash: this.flash,
      pieces: this.pieces,
      elapsedMs: this.elapsedMs,
    };
  }

  private emit() { this.onHud(this.hud()); }

  start() {
    this.grid = createGrid();
    this.bag = new BagRandomizer();
    this.queue = Array.from({ length: 6 }, () => this.bag.next());
    this.hold = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.backToBack = false;
    this.pieces = 0;
    this.elapsedMs = 0;
    this.flash = null;
    this.status = 'playing';
    this.spawn();
    this.emit();
  }

  pause() {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.emit();
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.emit();
  }

  togglePause() {
    if (this.status === 'playing') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  private spawn(kind?: PieceKind) {
    const next = kind ?? this.queue.shift()!;
    if (!kind) this.queue.push(this.bag.next());
    const piece = spawnPiece(next);
    /* 스폰 자리에 이미 블록이 있으면 게임 오버 */
    if (collides(this.grid, piece)) {
      this.active = piece;
      this.updateGhost();
      this.gameOver();
      return;
    }
    this.active = piece;
    this.pieces++;
    this.holdUsed = false;
    this.dropAcc = 0;
    this.lockAcc = 0;
    this.lockResets = 0;
    this.grounded = false;
    this.updateGhost();
  }

  private updateGhost() {
    this.ghost = this.active ? ghostOf(this.grid, this.active) : null;
  }

  private gameOver() {
    this.status = 'over';
    sfx.lose();
    this.emit();
    this.onGameOver(this.hud());
  }

  /* ── 입력 ───────────────────────────────── */
  setHeld(key: 'left' | 'right' | 'down', down: boolean) {
    const state = this.held[key];
    if (state.down === down) return;
    state.down = down;
    state.acc = 0;
    state.repeating = false;
    if (down && this.status === 'playing') {
      if (key === 'down') this.softDrop();
      else this.shift(key === 'left' ? -1 : 1);
    }
  }

  releaseAll() {
    (['left', 'right', 'down'] as const).forEach((k) => this.setHeld(k, false));
  }

  shift(dx: number) {
    if (this.status !== 'playing' || !this.active) return;
    const next = move(this.grid, this.active, dx, 0);
    if (!next) return;
    this.active = next;
    this.updateGhost();
    this.onEvent('move');
    this.resetLockDelay();
  }

  rotate(dir: 1 | -1) {
    if (this.status !== 'playing' || !this.active) return;
    const next = rotate(this.grid, this.active, dir);
    if (!next) return;
    this.active = next;
    this.updateGhost();
    sfx.rotate();
    this.resetLockDelay();
  }

  softDrop() {
    if (this.status !== 'playing' || !this.active) return;
    const next = move(this.grid, this.active, 0, 1);
    if (!next) return;
    this.active = next;
    this.score += 1;
    this.updateGhost();
    this.emit();
  }

  hardDrop() {
    if (this.status !== 'playing' || !this.active) return;
    const target = ghostOf(this.grid, this.active);
    this.score += (target.y - this.active.y) * 2;
    this.active = target;
    sfx.drop();
    this.lock();
  }

  holdPiece() {
    if (this.status !== 'playing' || !this.active || this.holdUsed) return;
    const current = this.active.kind;
    const swap = this.hold;
    this.hold = current;
    this.holdUsed = true;
    if (swap) {
      const piece = spawnPiece(swap);
      if (collides(this.grid, piece)) { this.gameOver(); return; }
      this.active = piece;
      this.dropAcc = 0;
      this.lockAcc = 0;
      this.lockResets = 0;
      this.updateGhost();
    } else {
      this.spawn();
    }
    this.onEvent('hold');
    this.emit();
  }

  private resetLockDelay() {
    if (!this.grounded) return;
    if (this.lockResets >= MAX_LOCK_RESETS) return;
    this.lockAcc = 0;
    this.lockResets++;
  }

  private lock() {
    if (!this.active) return;
    const res = lockPiece(this.grid, this.active, {
      level: this.level,
      combo: this.combo,
      backToBack: this.backToBack,
    });
    this.grid = res.grid;
    this.score += res.points;
    this.lines += res.lines;
    this.combo = res.combo;
    this.backToBack = res.backToBack;

    if (res.lines > 0) {
      this.flash = { kind: res.kind, combo: res.combo, b2b: res.backToBack && res.lines > 0, at: performance.now() };
      if (res.lines === 4 || res.kind === 'tspin') sfx.tetris();
      else sfx.lineClear();
    } else {
      this.flash = null;
      sfx.place();
    }

    /* 10줄마다 레벨 상승 */
    const nextLevel = Math.floor(this.lines / 10) + 1;
    if (nextLevel > this.level) {
      this.level = nextLevel;
      sfx.levelUp();
    }

    if (res.topOut) { this.emit(); this.gameOver(); return; }
    this.spawn();
    this.emit();
  }

  /* ── 매 프레임 ─────────────────────────── */
  update(dt: number) {
    if (this.status !== 'playing' || !this.active) return;
    this.elapsedMs += dt;

    /* 좌우 자동 반복(DAS → ARR) */
    for (const key of ['left', 'right'] as const) {
      const st = this.held[key];
      if (!st.down) continue;
      st.acc += dt;
      const threshold = st.repeating ? ARR_MS : DAS_MS;
      while (st.acc >= threshold) {
        st.acc -= threshold;
        st.repeating = true;
        this.shift(key === 'left' ? -1 : 1);
      }
    }

    /* 소프트 드롭 반복 */
    const down = this.held.down;
    if (down.down) {
      down.acc += dt;
      while (down.acc >= SOFT_DROP_MS) {
        down.acc -= SOFT_DROP_MS;
        this.softDrop();
      }
    }

    /* 중력 */
    const speed = gravityMs(this.level);
    this.dropAcc += dt;
    while (this.dropAcc >= speed) {
      this.dropAcc -= speed;
      const next = move(this.grid, this.active, 0, 1);
      if (next) {
        this.active = next;
        this.grounded = false;
        this.updateGhost();
      } else {
        this.grounded = true;
        break;
      }
    }

    /* 락 딜레이 */
    const canFall = !!move(this.grid, this.active, 0, 1);
    if (!canFall) {
      this.grounded = true;
      this.lockAcc += dt;
      if (this.lockAcc >= LOCK_DELAY_MS) this.lock();
    } else if (this.grounded) {
      this.grounded = false;
      this.lockAcc = 0;
    }
  }

  /** 화면에 그릴 때 쓰는 스냅샷 (숨김 줄 제외) */
  visibleRows(): number {
    return TOTAL_ROWS;
  }
}
