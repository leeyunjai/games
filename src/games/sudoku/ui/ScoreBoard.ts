import type { GameState } from "../state/gameState.js";
import { loadBest } from "../state/storage.js";
import { formatTime } from "./Modal.js";
import { STR } from "./strings.js";

const DIFF_LABEL: Record<string, string> = {
  easy: STR.easy, medium: STR.medium, hard: STR.hard,
};

export class ScoreBoard {
  private scoreVal: HTMLElement;
  private mistakesVal: HTMLElement;
  private mistakesPill: HTMLElement;
  private diffVal: HTMLElement;
  private bestVal: HTMLElement;

  constructor(container: HTMLElement) {
    const divider = () => {
      const d = document.createElement("div");
      d.className = "stat-divider";
      return d;
    };

    const scorePill = this.makePill("★", STR.score, "0");
    this.scoreVal = scorePill.querySelector(".stat-pill-value")!;

    this.mistakesPill = this.makePill("✗", STR.mistakes, "0/3");
    this.mistakesVal = this.mistakesPill.querySelector(".stat-pill-value")!;

    const diffPill = this.makePill("◈", STR.difficulty, STR.easy);
    diffPill.classList.add("diff-pill");
    this.diffVal = diffPill.querySelector(".stat-pill-value")!;

    const bestPill = this.makePill("🏅", STR.best, "-");
    bestPill.classList.add("best-pill");
    this.bestVal = bestPill.querySelector(".stat-pill-value")!;

    container.append(
      divider(), scorePill, divider(), this.mistakesPill,
      divider(), diffPill, divider(), bestPill
    );
  }

  private makePill(icon: string, label: string, value: string): HTMLElement {
    const pill = document.createElement("div");
    pill.className = "stat-pill";
    pill.innerHTML = `
      <span class="stat-pill-icon">${icon}</span>
      <div class="stat-pill-body">
        <span class="stat-pill-label">${label}</span>
        <span class="stat-pill-value">${value}</span>
      </div>`;
    return pill;
  }

  render(state: GameState): void {
    this.scoreVal.textContent = state.score.toLocaleString();
    this.mistakesVal.textContent = state.mistakeLimit === null
      ? String(state.mistakes)
      : `${state.mistakes}/${state.mistakeLimit}`;
    /* 마지막 한 번 남았을 때 경고색 */
    const danger = state.mistakeLimit !== null && state.mistakes >= state.mistakeLimit - 1;
    this.mistakesPill.classList.toggle("danger", danger);
    this.diffVal.textContent = DIFF_LABEL[state.difficulty] ?? state.difficulty;

    const best = loadBest(state.difficulty);
    this.bestVal.textContent = best ? formatTime(best.value) : "-";
  }
}
