import { STR } from "./strings.js";

/** 250ms 간격으로만 갱신해 배터리 소모를 줄인다. */
export class Timer {
  private valueEl: HTMLElement;
  private startAt: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTick: (elapsedMs: number) => void;

  constructor(container: HTMLElement, onTick: (elapsedMs: number) => void) {
    this.onTick = onTick;

    const pill = document.createElement("div");
    pill.className = "stat-pill timer-pill";
    pill.innerHTML = `
      <span class="stat-pill-icon">⏱</span>
      <div class="stat-pill-body">
        <span class="stat-pill-label">${STR.time}</span>
        <span class="stat-pill-value">00:00</span>
      </div>`;
    this.valueEl = pill.querySelector(".stat-pill-value")!;
    container.appendChild(pill);
  }

  start(elapsedMs = 0): void {
    this.stop();
    this.startAt = Date.now() - elapsedMs;
    this.render(elapsedMs);
    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startAt;
      this.onTick(elapsed);
      this.render(elapsed);
    }, 250);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  render(elapsedMs: number): void {
    const total = Math.floor(elapsedMs / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    this.valueEl.textContent = `${mm}:${ss}`;
  }
}
