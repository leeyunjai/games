import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function ResultOverlay() {
  const status = useGameStore(s => s.status);
  const winner = useGameStore(s => s.winner);
  const endReason = useGameStore(s => s.endReason);
  const mode = useGameStore(s => s.mode);
  const playerColor = useGameStore(s => s.playerColor);
  const moves = useGameStore(s => s.moves);
  const restart = useGameStore(s => s.restart);
  const undoMove = useGameStore(s => s.undoMove);
  const goToMenu = useGameStore(s => s.goToMenu);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === 'ended') btnRef.current?.focus();
  }, [status]);

  if (status !== 'ended') return null;

  const draw = endReason === 'draw' || !winner;
  const won = mode === 'vs-ai' && winner === playerColor;
  const lost = mode === 'vs-ai' && winner && winner !== playerColor;

  const title = draw ? '무승부' : `${winner === 'black' ? '● 검은 돌' : '○ 흰 돌'} 승리`;
  const sub = draw ? '더 놓을 자리가 없습니다'
    : won ? 'AI를 이겼습니다!'
    : lost ? '다시 도전해 보세요'
    : `${moves.length}수 만에 끝났습니다`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ background: 'rgba(8,5,2,0.72)', backdropFilter: 'blur(3px)' }}
      role="dialog" aria-modal="true" aria-label="대국 결과">
      <div className="w-full max-w-xs rounded-2xl p-6 text-center pop-in"
        style={{ background: 'linear-gradient(160deg,#2b2018,#171008)', border: '1px solid rgba(217,164,60,0.35)', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
        <div className="text-4xl mb-2">{draw ? '🤝' : won ? '🏆' : lost ? '😤' : '🌟'}</div>
        <h2 className="text-amber-200 text-xl font-bold mb-1" style={{ fontFamily: 'serif' }}>{title}</h2>
        <p className="text-amber-600 text-xs mb-5">{sub} · 총 {moves.length}수</p>
        <div className="space-y-2">
          <button ref={btnRef} onClick={restart}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold transition-colors focus-ring">
            다시 하기
          </button>
          <div className="flex gap-2">
            <button onClick={undoMove}
              className="flex-1 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-amber-200 text-sm transition-colors focus-ring">
              한 수 무르기
            </button>
            <button onClick={goToMenu}
              className="flex-1 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-amber-200 text-sm transition-colors focus-ring">
              메뉴로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
