/** 행/열/3x3 박스 충돌 검사. board는 81칸 배열(0=빈칸). */
export function isValid(board: number[], index: number, value: number): boolean {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === value) return false;
    if (board[i * 9 + col] === value) return false;
    const br = boxRow + Math.floor(i / 3);
    const bc = boxCol + (i % 3);
    if (board[br * 9 + bc] === value) return false;
  }
  return true;
}

/** 완성된 보드가 유효한 스도쿠인지 확인. */
export function isBoardComplete(board: number[]): boolean {
  if (board.some((v) => v === 0)) return false;
  for (let row = 0; row < 9; row++) {
    const rowSet = new Set<number>();
    const colSet = new Set<number>();
    for (let col = 0; col < 9; col++) {
      rowSet.add(board[row * 9 + col]);
      colSet.add(board[col * 9 + row]);
    }
    if (rowSet.size !== 9 || colSet.size !== 9) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxSet = new Set<number>();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          boxSet.add(board[(br * 3 + i) * 9 + bc * 3 + j]);
        }
      }
      if (boxSet.size !== 9) return false;
    }
  }
  return true;
}

/** 현재 셀 입력이 솔루션과 일치하는지 확인. */
export function matchesSolution(board: number[], solution: number[]): boolean {
  return board.every((v, i) => v === 0 || v === solution[i]);
}
