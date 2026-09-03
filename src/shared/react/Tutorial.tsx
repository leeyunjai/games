import { useEffect, useRef } from 'react';
import { TutorialContent } from '../tutorial';
import { GameMeta } from '../registry';

interface Props {
  meta: GameMeta;
  content: TutorialContent;
  open: boolean;
  onClose: () => void;
}

/** 게임 공통 튜토리얼(도움말) 오버레이 */
export function TutorialOverlay({ meta, content, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tut-overlay fade-in" role="dialog" aria-modal="true"
      aria-label={`${meta.title} 게임 방법`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tut-box pop-in" style={{ ['--tut-accent' as string]: meta.accent }}>
        <header className="tut-head">
          <span className="tut-icon" aria-hidden>{meta.emoji}</span>
          <div>
            <h2>{meta.title} 게임 방법</h2>
            <p>{content.goal}</p>
          </div>
          <button ref={closeRef} className="tut-close" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className="tut-body">
          <blockquote className="tut-lore">
            {meta.lore.map((line, i) => <span key={i}>{line}</span>)}
          </blockquote>
          {content.sections.map((sec) => (
            <section key={sec.title} className="tut-section">
              <h3>{sec.title}</h3>
              <ul>{sec.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </section>
          ))}

          <section className="tut-section">
            <h3>조작</h3>
            <table className="tut-keys">
              <tbody>
                {content.keys.map(([k, v]) => (
                  <tr key={k}><th><kbd>{k}</kbd></th><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {content.tip && <p className="tut-tip">💡 {content.tip}</p>}

        <button className="tut-start" onClick={onClose}>시작하기</button>
      </div>
    </div>
  );
}
