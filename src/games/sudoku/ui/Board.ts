import type { GameState, CellValue, Action } from "../state/gameState.js";
import { conflictsOf } from "../state/gameState.js";

export class Board {
  private el: HTMLElement;
  private cells: HTMLElement[] = new Array(81);
  private selectedIndex: number = -1;
  private noteMode: boolean = false;
  private dispatch: (action: Action) => void;
  private prevValues: number[] = new Array(81).fill(0);
  private state: GameState | null = null;
  /** 선택이 바뀔 때마다 호출 */
  onSelectionChange: (index: number) => void = () => {};

  constructor(container: HTMLElement, dispatch: (action: Action) => void) {
    this.dispatch = dispatch;
    this.el = document.createElement("div");
    this.el.className = "board";
    this.el.setAttribute("role", "grid");
    this.el.setAttribute("aria-label", "스도쿠 보드");

    const boxes: HTMLElement[] = [];
    for (let b = 0; b < 9; b++) {
      const box = document.createElement("div");
      box.className = "box";
      this.el.appendChild(box);
      boxes.push(box);
    }

    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);

      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("tabindex", i === 0 ? "0" : "-1");
      cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열`);
      cell.dataset.index = String(i);
      cell.addEventListener("click", () => this.focusCell(i));

      this.cells[i] = cell;
      boxes[boxIdx].appendChild(cell);
    }

    container.appendChild(this.el);
  }

  setNoteMode(on: boolean): void {
    this.noteMode = on;
    this.el.classList.toggle("note-mode", on);
  }

  selectCell(index: number): void {
    if (index < 0 || index > 80) return;
    this.selectedIndex = index;
    for (let i = 0; i < 81; i++) this.cells[i].setAttribute("tabindex", i === index ? "0" : "-1");
    this.renderHighlights();
    this.onSelectionChange(index);
  }

  focusCell(index: number): void {
    this.selectCell(index);
    this.cells[index].focus({ preventScroll: true });
  }

  /** 방향키 이동. 선택이 없으면 첫 빈 칸에서 시작한다. */
  moveSelection(dr: number, dc: number): void {
    if (this.selectedIndex === -1) {
      this.focusCell(this.firstEmptyIndex());
      return;
    }
    const row = Math.floor(this.selectedIndex / 9);
    const col = this.selectedIndex % 9;
    const nr = Math.min(8, Math.max(0, row + dr));
    const nc = Math.min(8, Math.max(0, col + dc));
    this.focusCell(nr * 9 + nc);
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  firstEmptyIndex(): number {
    if (!this.state) return 0;
    const i = this.state.board.findIndex((c) => c.value === 0);
    return i === -1 ? 0 : i;
  }

  inputNumber(value: CellValue): void {
    if (this.selectedIndex === -1) {
      this.focusCell(this.firstEmptyIndex());
    }
    if (this.selectedIndex === -1) return;
    if (this.noteMode && value !== 0) {
      this.dispatch({ type: "SET_NOTE", index: this.selectedIndex, note: value });
    } else if (value === 0) {
      this.dispatch({ type: "CLEAR_CELL", index: this.selectedIndex });
    } else {
      this.dispatch({ type: "SET_VALUE", index: this.selectedIndex, value });
    }
  }

  render(state: GameState): void {
    this.state = state;
    const { board, isPaused, isCompleted, isFailed } = state;

    this.el.classList.toggle("completed", isCompleted);
    this.el.classList.toggle("paused", isPaused);
    this.el.classList.toggle("failed", isFailed);

    if (this.selectedIndex === -1 && !isPaused) this.selectCell(this.firstEmptyIndex());

    for (let i = 0; i < 81; i++) {
      const cell = this.cells[i];
      const data = board[i];

      cell.className = "cell";
      if (data.given) cell.classList.add("given");
      if (data.hinted) cell.classList.add("hinted");

      if (isPaused) {
        cell.textContent = "";
        cell.setAttribute("aria-label", "일시정지됨");
        continue;
      }

      if (data.isError) cell.classList.add("error");
      /* 정답 여부와 별개로, 같은 줄·박스에 같은 숫자가 있으면 표시 */
      if (data.value !== 0 && !data.isError && conflictsOf(board, i).length > 0) {
        cell.classList.add("conflict");
      }

      if (data.value !== 0) {
        cell.innerHTML = `<span class="cell-num">${data.value}</span>`;
      } else if (data.notes.length > 0) {
        cell.innerHTML = this.buildNotes(data.notes);
      } else {
        cell.textContent = "";
      }

      const row = Math.floor(i / 9) + 1;
      const col = (i % 9) + 1;
      cell.setAttribute(
        "aria-label",
        `${row}행 ${col}열 ${data.value === 0 ? "빈 칸" : data.value}${data.given ? ", 고정" : ""}${data.isError ? ", 오답" : ""}`
      );

      if (data.value !== 0 && data.value !== this.prevValues[i]) {
        this.triggerAnim(cell, data.isError ? "anim-shake" : "anim-pop");
      }
      this.prevValues[i] = data.value;

      cell.setAttribute("aria-selected", i === this.selectedIndex ? "true" : "false");
    }

    if (!isPaused) this.renderHighlights();
  }

  private buildNotes(notes: number[]): string {
    let html = '<div class="notes-grid">';
    for (let n = 1; n <= 9; n++) {
      html += `<span class="note-cell">${notes.includes(n) ? n : ""}</span>`;
    }
    return html + "</div>";
  }

  private triggerAnim(cell: HTMLElement, cls: string): void {
    cell.classList.remove("anim-pop", "anim-shake");
    void cell.offsetWidth; // reflow
    cell.classList.add(cls);
    cell.addEventListener("animationend", () => cell.classList.remove(cls), { once: true });
  }

  private renderHighlights(): void {
    const sel = this.selectedIndex;
    if (sel === -1 || !this.state || this.state.isPaused) return;

    const selRow = Math.floor(sel / 9);
    const selCol = sel % 9;
    const selBoxR = Math.floor(selRow / 3);
    const selBoxC = Math.floor(selCol / 3);
    const selNum = this.state.board[sel].value;

    for (let i = 0; i < 81; i++) {
      const cell = this.cells[i];
      cell.classList.remove("selected", "highlight", "same-num");

      if (i === sel) { cell.classList.add("selected"); continue; }

      const row = Math.floor(i / 9);
      const col = i % 9;
      const sameGroup =
        row === selRow ||
        col === selCol ||
        (Math.floor(row / 3) === selBoxR && Math.floor(col / 3) === selBoxC);

      if (sameGroup) cell.classList.add("highlight");
      if (selNum > 0 && this.state.board[i].value === selNum) cell.classList.add("same-num");
    }
  }

  getElement(): HTMLElement { return this.el; }
}
