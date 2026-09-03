import { useGameStore, loadSavedGame } from '../stores/gameStore';
import { Difficulty, PieceColor } from '../game/types';
import { gameById } from '../../../shared/registry';

const meta = gameById('omok');

const DIFFS: { key: Difficulty; label: string; desc: string }[] = [
  { key: 'easy', label: '쉬움', desc: '입문' },
  { key: 'normal', label: '중간', desc: '0.15초' },
  { key: 'hard', label: '어려움', desc: '0.6초' },
  { key: 'expert', label: '최고', desc: '1.6초' },
];

const COLORS: { key: PieceColor; label: string; desc: string }[] = [
  { key: 'black', label: '● 흑', desc: '선공' },
  { key: 'white', label: '○ 백', desc: '후공' },
];

export function Menu() {
  const startGame = useGameStore(s => s.startGame);
  const resumeSaved = useGameStore(s => s.resumeSaved);
  const difficulty = useGameStore(s => s.difficulty);
  const playerColor = useGameStore(s => s.playerColor);
  const setPref = useGameStore(s => s.setPref);
  const saved = loadSavedGame();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-2 px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%,#2a1a08 0%,#140d04 60%,#0a0602 100%)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="text-center mb-8">
        <h1 className="text-5xl sm:text-6xl font-bold text-amber-200 mb-1"
          style={{ fontFamily: 'serif', textShadow: '0 0 24px rgba(255,180,40,0.35)' }}>오목</h1>
        <p className="text-amber-600 text-sm tracking-[0.3em]">GOMOKU · 五目</p>
        <p className="mt-4 text-amber-700/80 text-xs leading-7 italic">
          {meta.lore.map((line, i) => <span key={i} className="block">{line}</span>)}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{ background: 'linear-gradient(160deg,#2b2018,#171008)', border: '1px solid rgba(217,164,60,0.25)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>

        {saved && (
          <button onClick={resumeSaved}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors focus-ring">
            ▶ 이어하기 <span className="text-emerald-100/80 text-xs font-normal">({saved.moves.length}수 · {saved.mode === 'vs-ai' ? 'AI' : '2인'})</span>
          </button>
        )}

        <div>
          <p className="text-amber-300/90 text-xs mb-2 font-semibold tracking-wider">AI 난이도</p>
          <div className="flex gap-2">
            {DIFFS.map(d => (
              <button key={d.key} onClick={() => setPref({ difficulty: d.key })}
                aria-pressed={difficulty === d.key}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors focus-ring ${
                  difficulty === d.key ? 'bg-amber-500 text-stone-900' : 'bg-stone-700/70 text-amber-200 hover:bg-stone-600'
                }`}>
                <span className="block">{d.label}</span>
                <span className={`block text-[10px] font-normal ${difficulty === d.key ? 'text-stone-800' : 'text-amber-500/70'}`}>{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-amber-300/90 text-xs mb-2 font-semibold tracking-wider">내 돌</p>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c.key} onClick={() => setPref({ playerColor: c.key })}
                aria-pressed={playerColor === c.key}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors focus-ring ${
                  playerColor === c.key ? 'bg-amber-500 text-stone-900' : 'bg-stone-700/70 text-amber-200 hover:bg-stone-600'
                }`}>
                <span className="block">{c.label}</span>
                <span className={`block text-[10px] font-normal ${playerColor === c.key ? 'text-stone-800' : 'text-amber-500/70'}`}>{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button onClick={() => startGame('vs-ai')}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded-xl text-lg transition-colors shadow-lg focus-ring">
            🤖 AI와 대국
          </button>
          <button onClick={() => startGame('vs-human')}
            className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-amber-100 font-bold rounded-xl transition-colors focus-ring">
            👥 2인 대국
          </button>
        </div>

      </div>

      <p className="mt-6 text-stone-600 text-xs text-center leading-relaxed">
        가로·세로·대각선으로 5개를 먼저 이으면 승리<br />
        진행 중인 대국은 자동 저장 · 100% 브라우저 실행
      </p>
    </div>
  );
}
