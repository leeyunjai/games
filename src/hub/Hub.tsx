import { useCallback, useEffect, useState } from 'react';
import { GAMES, GameMeta, gameHref } from '../shared/registry';
import { getProgress } from '../shared/progress';
import { getPrimaryBest } from '../shared/records';
import { formatStats, getStats } from '../shared/stats';
import { SoundButton } from '../shared/react/GameShell';
import { ROOT_NS } from '../shared/storage';

interface CardInfo {
  resume: string | null;
  record: string | null;
}

function readInfo(meta: GameMeta): CardInfo {
  const progress = getProgress(meta.id);
  const best = getPrimaryBest(meta.id);
  const stats = formatStats(getStats(meta.id));
  return {
    resume: progress?.label ?? null,
    record: best ? best.label : stats,
  };
}

function GameCard({ meta, index }: { meta: GameMeta; index: number }) {
  const [info, setInfo] = useState<CardInfo>(() => readInfo(meta));

  /* 다른 탭에서 기록이 바뀌었을 수도 있으니 다시 보일 때 갱신한다 */
  useEffect(() => {
    const refresh = () => setInfo(readInfo(meta));
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [meta]);

  return (
    <a
      className="game-card"
      href={gameHref(meta.id)}
      style={{ ['--card-accent' as string]: meta.accent }}
      aria-label={`${meta.title} — ${meta.desc}`}
    >
      <div className="card-top">
        <span className="card-icon" aria-hidden>{meta.emoji}</span>
        <div className="card-heading">
          <h2>{meta.title}</h2>
          <span className="card-sub">{meta.subtitle}</span>
        </div>
        <span className="card-key" aria-hidden>{index + 1}</span>
      </div>

      <p className="card-desc">{meta.desc}</p>
      <p className="card-lore">“{meta.lore[0]}”</p>

      <div className="card-tags">
        {meta.tags.map((t) => <span key={t} className="card-tag">{t}</span>)}
      </div>

      <div className="card-foot">
        {info.resume && <span className="card-badge">이어하기</span>}
        <span>{info.resume ?? '아직 기록 없음'}</span>
        {info.record && <span className="card-record">🏅 {info.record}</span>}
        <span className="card-controls">{meta.controls}</span>
      </div>
    </a>
  );
}

export function Hub() {
  /* 숫자키로 바로 진입 */
  const onKey = useCallback((e: KeyboardEvent) => {
    const n = parseInt(e.key, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= GAMES.length) {
      window.location.href = gameHref(GAMES[n - 1].id);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const resetAll = () => {
    if (!confirm('저장된 진행 상황과 기록을 모두 지웁니다. 계속할까요?')) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${ROOT_NS}:`)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch { /* 무시 */ }
    location.reload();
  };

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-brand">
          <h1>games<span>.</span></h1>
          <p>
            설치도 서버도 없이 브라우저에서 바로 도는 게임 다섯 개.<br />
            진행 상황과 기록은 이 기기에만 저장됩니다.
          </p>
        </div>
        <div className="hub-header-actions">
          <SoundButton />
        </div>
      </header>

      <main className="hub-grid">
        {GAMES.map((meta, i) => <GameCard key={meta.id} meta={meta} index={i} />)}
      </main>

      <footer className="hub-footer">
        <span>숫자키 1~{GAMES.length} 로 바로 실행 · 100% 오프라인 · 저장은 localStorage</span>
        <button className="hub-reset" onClick={resetAll}>기록 전체 삭제</button>
      </footer>
    </div>
  );
}
