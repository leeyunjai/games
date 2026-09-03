/**
 * 서비스 워커 등록 — 한 번 방문한 뒤에는 네트워크 없이도 실행된다.
 * 상대 경로만 쓰기 때문에 저장소 이름이나 배포 경로가 바뀌어도 그대로 동작한다.
 */
export function registerServiceWorker(rootHref: string): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  /* 개발 서버에서는 캐시가 방해되므로 등록하지 않는다 */
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    const root = new URL(rootHref, window.location.href);
    const swUrl = new URL('sw.js', root);
    navigator.serviceWorker.register(swUrl.href, { scope: root.href }).catch(() => {
      /* 등록 실패해도 게임 자체는 그대로 동작한다 */
    });
  });
}
