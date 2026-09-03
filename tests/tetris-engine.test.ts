import { describe, it, expect } from 'vitest';
import {
  BagRandomizer, COLS, TOTAL_ROWS, createGrid, spawnPiece, cellsOf, collides,
  move, rotate, ghostOf, lockPiece, gravityMs, type Grid, type PieceKind,
} from '../src/games/tetris/engine';

function fillRow(grid: Grid, y: number, except: number[] = []) {
  for (let x = 0; x < COLS; x++) if (!except.includes(x)) grid[y][x] = 'I';
}

describe('7-bag 랜덤', () => {
  it('일곱 조각이 한 번씩 나온 뒤 다음 묶음이 시작된다', () => {
    const bag = new BagRandomizer();
    const first = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(first).size).toBe(7);
    const second = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(second).size).toBe(7);
  });
});

describe('충돌과 이동', () => {
  it('벽 밖으로는 나가지 못한다', () => {
    const grid = createGrid();
    let p = spawnPiece('T');
    for (let i = 0; i < 10; i++) p = move(grid, p, -1, 0) ?? p;
    expect(Math.min(...cellsOf(p).map(([x]) => x))).toBe(0);
    expect(collides(grid, { ...p, x: p.x - 1 })).toBe(true);
  });

  it('고스트는 바닥에 닿는 위치를 가리킨다', () => {
    const grid = createGrid();
    const p = spawnPiece('O');
    const g = ghostOf(grid, p);
    expect(move(grid, g, 0, 1)).toBeNull();
    expect(Math.max(...cellsOf(g).map(([, y]) => y))).toBe(TOTAL_ROWS - 1);
  });
});

describe('SRS 회전', () => {
  it('빈 판에서는 네 번 회전하면 제자리로 돌아온다', () => {
    const grid = createGrid();
    let p = spawnPiece('T');
    const start = JSON.stringify(cellsOf(p).sort());
    for (let i = 0; i < 4; i++) p = rotate(grid, p, 1)!;
    expect(JSON.stringify(cellsOf(p).sort())).toBe(start);
  });

  it('벽에 붙어도 킥으로 회전할 수 있다', () => {
    const grid = createGrid();
    let p = spawnPiece('I');
    for (let i = 0; i < 6; i++) p = move(grid, p, -1, 0) ?? p;
    const rotated = rotate(grid, p, 1);
    expect(rotated).not.toBeNull();
    expect(Math.min(...cellsOf(rotated!).map(([x]) => x))).toBeGreaterThanOrEqual(0);
  });

  it('O 조각은 회전해도 모양이 같다', () => {
    const grid = createGrid();
    const p = spawnPiece('O');
    expect(cellsOf(rotate(grid, p, 1)!)).toEqual(cellsOf(p));
  });
});

describe('줄 지우기와 점수', () => {
  it('네 줄을 한 번에 지우면 테트리스로 계산한다', () => {
    const grid = createGrid();
    for (let y = TOTAL_ROWS - 4; y < TOTAL_ROWS; y++) fillRow(grid, y, [0]);
    /* I 조각을 세워서 왼쪽 빈 열을 채운다 */
    let p = spawnPiece('I');
    p = rotate(grid, p, 1)!;
    while (true) {
      const next = move(grid, p, -1, 0);
      if (!next) break;
      p = next;
    }
    p = ghostOf(grid, p);
    const res = lockPiece(grid, p, { level: 1, combo: -1, backToBack: false });
    expect(res.lines).toBe(4);
    expect(res.kind).toBe('tetris');
    expect(res.points).toBe(800);
    expect(res.topOut).toBe(false);
  });

  it('백투백 테트리스는 1.5배를 받는다', () => {
    const grid = createGrid();
    for (let y = TOTAL_ROWS - 4; y < TOTAL_ROWS; y++) fillRow(grid, y, [0]);
    let p = rotate(grid, spawnPiece('I'), 1)!;
    while (true) {
      const next = move(grid, p, -1, 0);
      if (!next) break;
      p = next;
    }
    p = ghostOf(grid, p);
    const res = lockPiece(grid, p, { level: 2, combo: -1, backToBack: true });
    expect(res.points).toBe(Math.floor(800 * 2 * 1.5));
    expect(res.backToBack).toBe(true);
  });

  it('줄을 못 지우면 콤보가 끊긴다', () => {
    const grid = createGrid();
    const p = ghostOf(grid, spawnPiece('T'));
    const res = lockPiece(grid, p, { level: 1, combo: 3, backToBack: false });
    expect(res.lines).toBe(0);
    expect(res.combo).toBe(-1);
  });

  it('숨김 영역에 블록이 남으면 게임 오버', () => {
    const grid = createGrid();
    const p = spawnPiece('O');
    const res = lockPiece(grid, p, { level: 1, combo: -1, backToBack: false });
    expect(res.topOut).toBe(true);
  });
});

describe('레벨별 낙하 속도', () => {
  it('레벨이 오를수록 간격이 짧아진다', () => {
    const kinds: PieceKind[] = ['I', 'O'];
    expect(kinds.length).toBe(2);
    for (let lv = 1; lv < 12; lv++) {
      expect(gravityMs(lv + 1)).toBeLessThan(gravityMs(lv));
    }
  });
});
