export interface ModalOptions {
  /** ESC·배경 클릭으로 닫을 수 있는지 */
  dismissible?: boolean;
  onClose?: () => void;
  label?: string;
}

export class Modal {
  private overlay: HTMLElement;
  private box: HTMLElement;
  private options: ModalOptions = {};
  private lastFocused: HTMLElement | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay hidden";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");

    this.box = document.createElement("div");
    this.box.className = "modal-box";
    this.overlay.appendChild(this.box);

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay && this.options.dismissible) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (!this.isVisible()) return;
      if (e.key === "Escape" && this.options.dismissible) {
        e.preventDefault();
        this.close();
      }
      if (e.key === "Tab") this.trapFocus(e);
    });

    document.body.appendChild(this.overlay);
  }

  show(content: HTMLElement, options: ModalOptions = {}): void {
    this.options = options;
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.overlay.setAttribute("aria-label", options.label ?? "알림");
    this.box.innerHTML = "";
    this.box.appendChild(content);
    this.overlay.classList.remove("hidden");
    const focusable = this.focusables();
    (focusable[0] ?? this.box).focus?.();
  }

  hide(): void {
    this.overlay.classList.add("hidden");
    this.options = {};
    this.lastFocused?.focus?.();
    this.lastFocused = null;
  }

  isVisible(): boolean {
    return !this.overlay.classList.contains("hidden");
  }

  private close(): void {
    const cb = this.options.onClose;
    this.hide();
    cb?.();
  }

  private focusables(): HTMLElement[] {
    return Array.from(
      this.box.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hasAttribute("disabled"));
  }

  private trapFocus(e: KeyboardEvent): void {
    const items = this.focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
