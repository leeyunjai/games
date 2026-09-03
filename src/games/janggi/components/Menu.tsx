import { useGameStore, loadSavedGame } from '../stores/gameStore';
import { Difficulty, Player, Setup } from '../game/types';
import { SETUP_LABEL } from '../game/board';
import { gameById } from '../../../shared/registry';

const meta = gameById('janggi');

const DIFFS: { key: Difficulty; label: string; desc: string }[] = [
  { key: 'easy', label: '쉬움', desc: '1수 앞' },
  { key: 'normal', label: '보통', desc: '2수 앞' },
  { key: 'hard', label: '어려움', desc: '4수 · 1.2초' },
  { key: 'expert', label: '최고', desc: '5수 · 2.5초' },
];

const SIDES: { key: Player; label: string; desc: string }[] = [
  { key: 'cho', label: '초 楚', desc: '선수' },
  { key: 'han', label: '한 漢', desc: '후수 · 덤 1.5' },
];

const SETUPS: Setup[] = ['msms', 'smsm', 'mssm', 'smms'];

export function Menu() {
  const startGame = useGameStore(s => s.startGame);
  const resumeSaved = useGameStore(s => s.resumeSaved);
  const difficulty = useGameStore(s => s.difficulty);
  const playerSide = useGameStore(s => s.playerSide);
  const setupCho = useGameStore(s => s.setupCho);
  const setupHan = useGameStore(s => s.setupHan);
  const setPref = useGameStore(s => s.setPref);
  const saved = loadSavedGame();

  const setupRow = (side: 'cho' | 'han', value: Setup) => (
    <div className="flex gap-1.5">
      {SETUPS.map(s => (
        <button key={s}
          onClick={() => setPref(side === 'cho' ? { setupCho: s } : { setupHan: s })}
          aria-pressed={value === s}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors focus-ring ${
            value === s
              ? (side === 'cho' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white')
              : 'bg-stone-700/70 text-amber-200 hover:bg-stone-600'
          }`}>
          {SETUP_LABEL[s]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-2 px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%,#2a1a08 0%,#140d04 60%,#0a0602 100%)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="text-center mb-6">
        <h1 className="text-5xl sm:text-6xl font-bold text-amber-200 mb-1"
          style={{ fontFamily: 'serif', textShadow: '0 0 24px rgba(255,180,40,0.35)' }}>장기</h1>
        <p className="text-amber-600 text-sm tracking-[0.3em]">JANGGI · 楚漢之爭</p>
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
          <p className="text-amber-300/90 text-xs mb-2 font-semibold tracking-wider">내 진영</p>
          <div className="flex gap-2">
            {SIDES.map(s => (
              <button key={s.key} onClick={() => setPref({ playerSide: s.key })}
                aria-pressed={playerSide === s.key}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors focus-ring ${
                  playerSide === s.key
                    ? (s.key === 'cho' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white')
                    : 'bg-stone-700/70 text-amber-200 hover:bg-stone-600'
                }`}>
                <span className="block" style={{ fontFamily: 'serif' }}>{s.label}</span>
                <span className={`block text-[10px] font-normal ${playerSide === s.key ? 'text-white/70' : 'text-amber-500/70'}`}>{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-amber-300/90 text-xs font-semibold tracking-wider">차림 (마·상 배치)</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-[11px] w-6 shrink-0" style={{ fontFamily: 'serif' }}>초</span>
              {setupRow('cho', setupCho)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-[11px] w-6 shrink-0" style={{ fontFamily: 'serif' }}>한</span>
              {setupRow('han', setupHan)}
            </div>
          </div>
          <p className="text-stone-600 text-[10px]">왼쪽 두 자리 → 오른쪽 두 자리 순서</p>
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
        붉은 기물 = 초(楚) · 푸른 기물 = 한(漢) · 초가 먼저 둡니다<br />
        진행 중인 대국은 자동 저장 · 100% 브라우저 실행
      </p>
    </div>
  );
}
