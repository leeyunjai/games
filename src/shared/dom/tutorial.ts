import { GameMeta } from '../registry';
import { TutorialContent, hasSeenTutorial, markTutorialSeen } from '../tutorial';

/** React를 쓰지 않는 게임용 튜토리얼 오버레이 (React 버전과 같은 마크업) */
export function createTutorial(meta: GameMeta, content: TutorialContent) {
  const overlay = document.createElement('div');
  overlay.className = 'tut-overlay fade-in';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${meta.title} 게임 방법`);
  overlay.hidden = true;

  const sections = content.sections
    .map((sec) => `
      <section class="tut-section">
        <h3>${sec.title}</h3>
        <ul>${sec.items.map((i) => `<li>${i}</li>`).join('')}</ul>
      </section>`)
    .join('');

  const keys = content.keys
    .map(([k, v]) => `<tr><th><kbd>${k}</kbd></th><td>${v}</td></tr>`)
    .join('');

  overlay.innerHTML = `
    <div class="tut-box pop-in" style="--tut-accent:${meta.accent}">
      <header class="tut-head">
        <span class="tut-icon" aria-hidden="true">${meta.emoji}</span>
        <div>
          <h2>${meta.title} 게임 방법</h2>
          <p>${content.goal}</p>
        </div>
        <button class="tut-close" aria-label="닫기">✕</button>
      </header>
      <div class="tut-body">
        <blockquote class="tut-lore">${content ? meta.lore.map((l) => `<span>${l}</span>`).join('') : ''}</blockquote>
        ${sections}
        <section class="tut-section">
          <h3>조작</h3>
          <table class="tut-keys"><tbody>${keys}</tbody></table>
        </section>
      </div>
      ${content.tip ? `<p class="tut-tip">💡 ${content.tip}</p>` : ''}
      <button class="tut-start">시작하기</button>
    </div>`;

  const close = () => {
    overlay.hidden = true;
    markTutorialSeen(meta.id);
  };
  const open = () => {
    overlay.hidden = false;
    overlay.querySelector<HTMLButtonElement>('.tut-start')?.focus();
  };

  overlay.querySelector('.tut-close')!.addEventListener('click', close);
  overlay.querySelector('.tut-start')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);

  return {
    element: overlay,
    open,
    close,
    isOpen: () => !overlay.hidden,
    openIfFirstVisit: () => { if (!hasSeenTutorial(meta.id)) open(); },
  };
}
