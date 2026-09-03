import type { CellValue, GameState } from "../state/gameState.js";

export class NumberPad {
  private numBtns: HTMLButtonElement[] = [];
  private onInput: (value: CellValue) => void;

  constructor(container: HTMLElement, onInput: (value: CellValue) => void) {
    this.onInput = onInput;

    const grid = document.createElement("div");
    grid.className = "numpad-grid";

    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement("button");
      btn.className = "num-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${n} 입력`);
      btn.innerHTML = `<span class="num-digit">${n}</span><span class="num-count"></span>`;
      btn.addEventListener("click", () => this.onInput(n as CellValue));
      this.numBtns.push(btn);
      grid.appendChild(btn);
    }

    container.appendChild(grid);
  }

  /** 정답으로 놓인 개수만 세어 남은 개수를 표시한다(오답은 세지 않는다). */
  update(state: GameState): void {
    const counts = new Array(10).fill(0);
    state.board.forEach((cell, i) => {
      if (cell.value > 0 && cell.value === state.solution[i]) counts[cell.value]++;
    });
    this.numBtns.forEach((btn, idx) => {
      const remaining = 9 - counts[idx + 1];
      const countEl = btn.querySelector<HTMLElement>(".num-count")!;
      countEl.textContent = remaining > 0 ? `${remaining}` : "";
      btn.disabled = remaining === 0;
      btn.classList.toggle("exhausted", remaining === 0);
    });
  }
}
