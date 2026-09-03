import { describe, it, expect } from "vitest";
import { secureRandomInt, shuffle, shuffledIndices } from "../src/games/sudoku/engine/rng";
import { isValid, isBoardComplete } from "../src/games/sudoku/engine/validator";
import { countSolutions, solve, hasUniqueSolution } from "../src/games/sudoku/engine/solver";
import { generatePuzzle } from "../src/games/sudoku/engine/generator";

// ── RNG 테스트 ──────────────────────────────────────────────────────────────

describe("rng", () => {
  it("secureRandomInt(n) 은 0..n-1 범위를 반환한다", () => {
    for (let i = 0; i < 200; i++) {
      const v = secureRandomInt(9);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(9);
    }
  });

  it("secureRandomInt(1) 은 항상 0을 반환한다", () => {
    for (let i = 0; i < 10; i++) expect(secureRandomInt(1)).toBe(0);
  });

  it("shuffle 은 모든 원소를 보존한다", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = shuffle([...arr]);
    expect(result.sort()).toEqual(arr.sort());
  });

  it("shuffledIndices(9) 는 0..8을 모두 포함한다", () => {
    const idx = shuffledIndices(9);
    expect(idx.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("연속 두 번 호출이 대부분 다른 순열을 반환한다", () => {
    const a = shuffledIndices(9);
    const b = shuffledIndices(9);
    // 9! = 362880 경우 중 같을 확률 < 0.001%
    expect(a).not.toEqual(b);
  });
});

// ── Validator 테스트 ─────────────────────────────────────────────────────────

describe("validator", () => {
  it("빈 보드에서 모든 값이 유효하다", () => {
    const board = new Array<number>(81).fill(0);
    for (let v = 1; v <= 9; v++) {
      expect(isValid(board, 0, v)).toBe(true);
    }
  });

  it("같은 행에 같은 숫자가 있으면 무효", () => {
    const board = new Array<number>(81).fill(0);
    board[0] = 5;
    expect(isValid(board, 5, 5)).toBe(false);
    expect(isValid(board, 5, 3)).toBe(true);
  });

  it("같은 열에 같은 숫자가 있으면 무효", () => {
    const board = new Array<number>(81).fill(0);
    board[0] = 7;
    expect(isValid(board, 63, 7)).toBe(false); // same col
  });

  it("같은 박스에 같은 숫자가 있으면 무효", () => {
    const board = new Array<number>(81).fill(0);
    board[0] = 3;
    expect(isValid(board, 11, 3)).toBe(false); // (1,2) same box
  });

  it("isBoardComplete — 빈 칸 있으면 false", () => {
    const board = new Array<number>(81).fill(1);
    board[40] = 0;
    expect(isBoardComplete(board)).toBe(false);
  });

  it("isBoardComplete — 완성된 유효한 보드 감지", () => {
    // 알려진 완성 보드
    const board = [
      5,3,4,6,7,8,9,1,2,
      6,7,2,1,9,5,3,4,8,
      1,9,8,3,4,2,5,6,7,
      8,5,9,7,6,1,4,2,3,
      4,2,6,8,5,3,7,9,1,
      7,1,3,9,2,4,8,5,6,
      9,6,1,5,3,7,2,8,4,
      2,8,7,4,1,9,6,3,5,
      3,4,5,2,8,6,1,7,9,
    ];
    expect(isBoardComplete(board)).toBe(true);
  });
});

// ── Solver 테스트 ────────────────────────────────────────────────────────────

describe("solver", () => {
  // 풀 수 있는 퍼즐 (유일 해)
  const puzzle = [
    5,3,0,0,7,0,0,0,0,
    6,0,0,1,9,5,0,0,0,
    0,9,8,0,0,0,0,6,0,
    8,0,0,0,6,0,0,0,3,
    4,0,0,8,0,3,0,0,1,
    7,0,0,0,2,0,0,0,6,
    0,6,0,0,0,0,2,8,0,
    0,0,0,4,1,9,0,0,5,
    0,0,0,0,8,0,0,7,9,
  ];

  it("solve() 가 퍼즐을 완성한다", () => {
    const board = puzzle.slice();
    const success = solve(board);
    expect(success).toBe(true);
    expect(board.every((v) => v !== 0)).toBe(true);
  });

  it("hasUniqueSolution() — 단일 해 퍼즐", () => {
    expect(hasUniqueSolution(puzzle.slice())).toBe(true);
  });

  it("countSolutions — 빈 보드는 해가 여러 개", () => {
    const empty = new Array<number>(81).fill(0);
    expect(countSolutions(empty, 2)).toBe(2);
  });

  it("countSolutions — 완성 보드는 해가 정확히 1개", () => {
    const board = puzzle.slice();
    solve(board);
    expect(countSolutions(board, 2)).toBe(1);
  });
});

// ── Generator 테스트 ─────────────────────────────────────────────────────────

describe("generator", () => {
  const difficulties = ["easy", "medium", "hard"] as const;
  const clueRange: Record<string, [number, number]> = {
    easy: [40, 45],
    medium: [32, 36],
    hard: [26, 30],
  };

  for (const diff of difficulties) {
    describe(`난이도: ${diff}`, () => {
      it("clue 수가 범위 내에 있다", () => {
        const { clues } = generatePuzzle(diff);
        const [min, max] = clueRange[diff];
        expect(clues).toBeGreaterThanOrEqual(min);
        expect(clues).toBeLessThanOrEqual(max);
      });

      it("퍼즐이 유일 해를 가진다", () => {
        const { puzzle } = generatePuzzle(diff);
        expect(hasUniqueSolution(puzzle.slice())).toBe(true);
      });

      it("솔루션이 완전하고 유효하다", () => {
        const { solution } = generatePuzzle(diff);
        expect(isBoardComplete(solution)).toBe(true);
      });
    });
  }

  it("10회 연속 생성 시 모두 다른 퍼즐(easy)", () => {
    const puzzles = Array.from({ length: 10 }, () =>
      generatePuzzle("easy").puzzle.join(",")
    );
    const unique = new Set(puzzles);
    expect(unique.size).toBe(10);
  });
});
