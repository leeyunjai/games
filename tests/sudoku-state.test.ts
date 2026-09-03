import { describe, it, expect } from "vitest";
import {
  createInitialState,
  reducer,
  conflictsOf,
  candidatesOf,
  MISTAKE_LIMIT,
  type GameState,
  type CellValue,
} from "../src/games/sudoku/state/gameState.js";
import { generatePuzzle } from "../src/games/sudoku/engine/generator.js";

function newGame(): GameState {
  const { puzzle, solution } = generatePuzzle("easy");
  return createInitialState("easy", puzzle, solution);
}

function firstEmpty(state: GameState): number {
  return state.board.findIndex((c) => c.value === 0);
}

describe("gameState reducer", () => {
  it("정답 입력은 실수로 세지 않는다", () => {
    const s0 = newGame();
    const i = firstEmpty(s0);
    const s1 = reducer(s0, { type: "SET_VALUE", index: i, value: s0.solution[i] });
    expect(s1.board[i].value).toBe(s0.solution[i]);
    expect(s1.board[i].isError).toBe(false);
    expect(s1.mistakes).toBe(0);
  });

  it("오답은 실수로 세고, 제한을 넘기면 실패 상태가 된다", () => {
    let s = newGame();
    let count = 0;
    for (let i = 0; i < 81 && count < MISTAKE_LIMIT; i++) {
      if (s.board[i].value !== 0) continue;
      const wrong = ((s.solution[i] % 9) + 1) as CellValue;
      s = reducer(s, { type: "SET_VALUE", index: i, value: wrong });
      count++;
    }
    expect(s.mistakes).toBe(MISTAKE_LIMIT);
    expect(s.isFailed).toBe(true);

    /* 실패 상태에서는 더 입력되지 않는다 */
    const j = firstEmpty(s);
    const blocked = reducer(s, { type: "SET_VALUE", index: j, value: s.solution[j] });
    expect(blocked.board[j].value).toBe(0);

    /* 제한을 풀면 다시 진행할 수 있다 */
    const lifted = reducer(s, { type: "LIFT_LIMIT" });
    expect(lifted.isFailed).toBe(false);
    const after = reducer(lifted, { type: "SET_VALUE", index: j, value: lifted.solution[j] });
    expect(after.board[j].value).toBe(lifted.solution[j]);
  });

  it("되돌리기와 다시실행이 값을 정확히 복원한다", () => {
    const s0 = newGame();
    const i = firstEmpty(s0);
    const s1 = reducer(s0, { type: "SET_VALUE", index: i, value: s0.solution[i] });
    const s2 = reducer(s1, { type: "UNDO" });
    expect(s2.board[i].value).toBe(0);
    const s3 = reducer(s2, { type: "REDO" });
    expect(s3.board[i].value).toBe(s0.solution[i]);
  });

  it("정답을 넣으면 같은 그룹의 같은 숫자 메모가 지워진다", () => {
    const s0 = newGame();
    const i = firstEmpty(s0);
    const v = s0.solution[i];
    /* 같은 행에 있는 다른 빈 칸에 메모를 달아 둔다 */
    const row = Math.floor(i / 9);
    const peer = s0.board.findIndex((c, k) => c.value === 0 && k !== i && Math.floor(k / 9) === row);
    if (peer === -1) return;
    const withNote = reducer(s0, { type: "SET_NOTE", index: peer, note: v });
    expect(withNote.board[peer].notes).toContain(v);
    const placed = reducer(withNote, { type: "SET_VALUE", index: i, value: v });
    expect(placed.board[peer].notes).not.toContain(v);
    /* 되돌리면 메모도 함께 돌아온다 */
    const undone = reducer(placed, { type: "UNDO" });
    expect(undone.board[peer].notes).toContain(v);
  });

  it("힌트는 정답을 채우고 다시 수정되지 않는다", () => {
    const s0 = newGame();
    const i = firstEmpty(s0);
    const s1 = reducer(s0, { type: "USE_HINT", index: i });
    expect(s1.board[i].value).toBe(s0.solution[i]);
    expect(s1.board[i].hinted).toBe(true);
    expect(s1.hintsUsed).toBe(1);
    const s2 = reducer(s1, { type: "CLEAR_CELL", index: i });
    expect(s2.board[i].value).toBe(s0.solution[i]);
  });

  it("메모 자동 채우기는 각 빈 칸의 후보만 넣는다", () => {
    const s0 = newGame();
    const s1 = reducer(s0, { type: "AUTO_NOTES" });
    for (let i = 0; i < 81; i++) {
      if (s0.board[i].value !== 0) continue;
      expect(s1.board[i].notes).toEqual(candidatesOf(s0.board, i));
      /* 정답은 항상 후보에 포함된다 */
      expect(s1.board[i].notes).toContain(s0.solution[i]);
    }
  });

  it("같은 그룹에 같은 숫자가 있으면 충돌로 잡아낸다", () => {
    const s0 = newGame();
    const i = firstEmpty(s0);
    const row = Math.floor(i / 9);
    const peer = s0.board.findIndex((c, k) => c.value === 0 && k !== i && Math.floor(k / 9) === row);
    if (peer === -1) return;
    const v = s0.solution[i];
    let s = reducer(s0, { type: "SET_VALUE", index: i, value: v });
    s = reducer(s, { type: "SET_VALUE", index: peer, value: v });
    expect(conflictsOf(s.board, peer)).toContain(i);
  });

  it("일시정지 중에는 값이 바뀌지 않는다", () => {
    const s0 = reducer(newGame(), { type: "PAUSE" });
    const i = firstEmpty(s0);
    const s1 = reducer(s0, { type: "SET_VALUE", index: i, value: s0.solution[i] });
    expect(s1.board[i].value).toBe(0);
  });
});
