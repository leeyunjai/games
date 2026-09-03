import { useEffect } from 'react';

export type KeyHandlers = Record<string, (e: KeyboardEvent) => void>;

/**
 * 전역 단축키를 등록한다. 키 이름은 소문자로 비교하며
 * 입력 요소에 포커스가 있을 때는 동작하지 않는다.
 */
export function useKeys(handlers: KeyHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      const fn = handlers[e.key] ?? handlers[e.key.toLowerCase()];
      if (!fn) return;
      fn(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}
