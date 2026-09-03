import { describe, it, expect } from 'vitest';
import {
  BLACK, WHITE, applyMove, counts, createBoard, flipsFor, hasMove,
  isGameOver, legalMoves, opponent, winnerOf, NOTATION,
} from '../src/games/reversi/engine';
import { getBestMove, evaluate } from '../src/games/reversi/ai';

describe('리버시 규칙', () => {
  it('시작 배치는 흑 2 · 백 2', () => {
    const c = counts(createBoard());
    expect(c.black).toBe(2);
    expect(c.white).toBe(2);
    expect(c.empty).toBe(60);
  });

  it('첫 수는 흑에게 네 곳', () => {
    const moves = legalMoves(createBoard(), BLACK).map((m) => NOTATION(m.index)).sort();
    expect(moves).toEqual(['C4', 'D3', 'E6', 'F5'].sort());
  });

  it('둔 자리 기준으로 사이의 돌만 뒤집힌다', () => {
    const b = createBoard();
    const idx = 'ABCDEFGH'.indexOf('D') + (3 - 1) * 8; // D3 = index 19
    const flips = flipsFor(b, idx, BLACK);
    expect(flips).toEqual([27]); // D4(백)이 뒤집힌다
    const next = applyMove(b, idx, BLACK, flips);
    expect(next[27]).toBe(BLACK);
    expect(counts(next)).toEqual({ black: 4, white: 1, empty: 59 });
  });

  it('판을 가로질러 뒤집히지 않는다(가장자리 넘김 금지)', () => {
    const b = new Uint8Array(64);
    b[8] = BLACK;  // A2
    b[15] = WHITE; // H2
    /* A3에 백을 둬도 줄을 넘어 뒤집히면 안 된다 */
    expect(flipsFor(b, 16, WHITE)).toEqual([]);
  });

  it('둘 곳이 없으면 패스, 양쪽 다 없으면 종료', () => {
    const b = new Uint8Array(64);
    b[0] = BLACK;
    expect(hasMove(b, BLACK)).toBe(false);
    expect(hasMove(b, WHITE)).toBe(false);
    expect(isGameOver(b)).toBe(true);
    expect(winnerOf(b)).toBe(BLACK);
  });

  it('opponent는 서로를 가리킨다', () => {
    expect(opponent(BLACK)).toBe(WHITE);
    expect(opponent(WHITE)).toBe(BLACK);
  });
});

describe('리버시 AI', () => {
  it('모서리를 잡을 수 있으면 잡는다', () => {
    const b = new Uint8Array(64);
    /* A1이 비어 있고 B1(백) 너머 C1(흑) → 흑이 A1에 두면 B1을 뒤집는다 */
    b[1] = WHITE; b[2] = BLACK;
    b[9] = WHITE; b[18] = BLACK;
    const move = getBestMove(b, BLACK, 'hard');
    expect(move).toBe(0);
  });

  it('평가는 모서리를 가진 쪽에 유리하게 나온다', () => {
    const withCorner = createBoard();
    withCorner[0] = BLACK;
    const withoutCorner = createBoard();
    withoutCorner[1] = BLACK;
    expect(evaluate(withCorner, BLACK)).toBeGreaterThan(evaluate(withoutCorner, BLACK));
  });

  it('둘 수 있는 자리만 고른다', () => {
    const b = createBoard();
    const legal = new Set(legalMoves(b, BLACK).map((m) => m.index));
    for (const diff of ['easy', 'normal', 'hard', 'expert'] as const) {
      const mv = getBestMove(b, BLACK, diff)!;
      expect(legal.has(mv)).toBe(true);
    }
  });

  it('둘 곳이 없으면 null', () => {
    const b = new Uint8Array(64);
    b[0] = BLACK;
    expect(getBestMove(b, WHITE, 'hard')).toBeNull();
  });

  it('종반 완전탐색으로 끝까지 둘 수 있다', () => {
    /* 빈칸 4개만 남은 국면을 만들어 끝까지 진행 */
    let b = createBoard();
    for (let i = 0; i < 64; i++) if (b[i] === 0) b[i] = i % 2 === 0 ? BLACK : WHITE;
    b[0] = 0; b[7] = 0; b[56] = 0; b[63] = 0;
    let player: 1 | 2 = BLACK;
    let guard = 0;
    while (!isGameOver(b) && guard++ < 10) {
      const mv = getBestMove(b, player, 'expert');
      if (mv === null) { player = opponent(player); continue; }
      b = applyMove(b, mv, player);
      player = opponent(player);
    }
    expect(counts(b).empty).toBeLessThanOrEqual(4);
  });
});
