/* 아주 짧은 클릭음만 만드는 경량 사운드. 첫 사용자 입력 시점에 AudioContext를 만든다. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function isSoundEnabled() {
  return enabled;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(freq: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ac.currentTime + dur);
  amp.gain.setValueAtTime(gain, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

/** 돌 놓는 소리 */
export function playStone() { blip(320, 0.08, 0.18, 'triangle'); }
/** 무르기 */
export function playUndo() { blip(180, 0.1, 0.12, 'sine'); }
/** 승리 팡파레(짧은 3음) */
export function playWin() {
  blip(523, 0.14, 0.16);
  setTimeout(() => blip(659, 0.14, 0.16), 110);
  setTimeout(() => blip(784, 0.24, 0.18), 220);
}
