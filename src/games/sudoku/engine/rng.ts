/**
 * crypto.getRandomValues() 기반 보안 랜덤 정수 생성기.
 * 내부 캐시/시드 저장 없음 — 호출마다 새로 생성.
 */
export function secureRandomInt(n: number): number {
  if (n <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  let val: number;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);
  return val % n;
}

/** Fisher-Yates 셔플 (in-place). secureRandomInt 사용. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 0..n-1 배열을 셔플해 반환. */
export function shuffledIndices(n: number): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i));
}
