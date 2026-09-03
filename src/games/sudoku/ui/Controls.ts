import type { Difficulty } from "../engine/generator.js";
import { STR } from "./strings.js";

export class Controls {
  onNewGame: (difficulty: Difficulty) => void = () => {};
  onReset: () => void = () => {};

  private diffSelect: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.diffSelect = document.createElement("select");
    this.diffSelect.className = "diff-select";
    this.diffSelect.setAttribute("aria-label", STR.difficulty);

    const diffs: Array<{ value: Difficulty; label: string }> = [
      { value: "easy",   label: STR.easy },
      { value: "medium", label: STR.medium },
      { value: "hard",   label: STR.hard },
    ];
    for (const d of diffs) {
      const opt = document.createElement("option");
      opt.value = d.value;
      opt.textContent = d.label;
      this.diffSelect.appendChild(opt);
    }

    const newGameBtn = document.createElement("button");
    newGameBtn.className = "btn-primary";
    newGameBtn.textContent = STR.newGame;
    newGameBtn.addEventListener("click", () => {
      this.onNewGame(this.diffSelect.value as Difficulty);
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "btn-ghost";
    resetBtn.textContent = STR.reset;
    resetBtn.setAttribute("aria-label", STR.reset);
    resetBtn.addEventListener("click", () => this.onReset());

    container.append(this.diffSelect, newGameBtn, resetBtn);
  }

  setDifficulty(d: Difficulty): void {
    this.diffSelect.value = d;
  }

  getDifficulty(): Difficulty {
    return this.diffSelect.value as Difficulty;
  }
}
