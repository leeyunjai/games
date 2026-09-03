import { useEffect, useMemo, useState } from 'react';
import { GameShell } from '../../shared/react/GameShell';
import { useKeys } from '../../shared/react/useKeys';
import { gameById } from '../../shared/registry';
import { reversiTutorial } from './tutorial';
import { useReversi, loadSavedGame } from './store';
import { BLACK, WHITE, Player, counts, legalMoves, NOTATION } from './engine';
import { Difficulty, DIFFICULTY_LABEL } from './ai';

const meta = gameById('reversi');

const DIFFS: { key: Difficulty; desc: string }[] = [
  { key: 'easy', desc: '1수' },
  { key: 'normal', desc: '3수' },
  { key: 'hard', desc: '6수+종반12' },
  { key: 'expert', desc: '9수+종반16' },
];

function Menu() {
  const startGame = useReversi(s => s.startGame);
  const resumeSaved = useReversi(s => s.resumeSaved);
  const difficulty = useReversi(s => s.difficulty);
  const playerColor = useReversi(s => s.playerColor);
  const showHints = useReversi(s => s.showHints);
  const setPref = useReversi(s => s.setPref);
  const saved = loadSavedGame();

  return (
    <div className="rv-menu">
      <p className="rv-lore">
        {meta.lore.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}
      </p>

      <div className="rv-menu-card">
        {saved && (
          <button className="rv-start resume" onClick={resumeSaved}>
            ▶ 이어하기 ({saved.moves.filter(m => !m.pass).length}수)
          </button>
        )}

        <div className="rv-field">
          <p>AI 난이도</p>
          <div className="rv-options">
            {DIFFS.map(d => (
              <button key={d.key} aria-pressed={difficulty === d.key}
                onClick={() => setPref({ difficulty: d.key })}>
                {DIFFICULTY_LABEL[d.key]}
                <small>{d.desc}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="rv-field">
          <p>내 돌</p>
          <div className="rv-options">
            <button aria-pressed={playerColor === BLACK} onClick={() => setPref({ playerColor: BLACK })}>
              ● 흑<small>선공</small>
            </button>
            <button aria-pressed={playerColor === WHITE} onClick={() => setPref({ playerColor: WHITE })}>
              ○ 백<small>후공</small>
            </button>
          </div>
        </div>

        <div className="rv-field">
          <p>둘 수 있는 자리 표시</p>
          <div className="rv-options">
            <button aria-pressed={showHints} onClick={() => setPref({ showHints: true })}>표시</button>
            <button aria-pressed={!showHints} onClick={() => setPref({ showHints: false })}>숨김</button>
          </div>
        </div>

        <button className="rv-start" onClick={() => startGame('vs-ai')}>🤖 AI와 대국</button>
        <button className="rv-start ghost" onClick={() => startGame('vs-human')}>👥 2인 대국</button>
      </div>
    </div>
  );
}

function Result() {
  const status = useReversi(s => s.status);
  const winner = useReversi(s => s.winner);
  const board = useReversi(s => s.board);
  const mode = useReversi(s => s.mode);
  const playerColor = useReversi(s => s.playerColor);
  const restart = useReversi(s => s.restart);
  const undo = useReversi(s => s.undo);
  const goToMenu = useReversi(s => s.goToMenu);

  if (status !== 'ended') return null;
  const c = counts(board);
  const won = mode === 'vs-ai' && winner === playerColor;

  return (
    <div className="rv-result fade-in" role="dialog" aria-modal="true" aria-label="대국 결과">
      <div className="rv-result-box pop-in">
        <div style={{ fontSize: '2.2rem' }}>{winner === null ? '🤝' : won ? '🏆' : mode === 'vs-ai' ? '😤' : '🎉'}</div>
        <h2>{winner === null ? '무승부' : winner === BLACK ? '흑 승리' : '백 승리'}</h2>
        <p>흑 {c.black} : {c.white} 백</p>
        <button className="rv-start" onClick={restart}>다시 하기</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="rv-start ghost" style={{ flex: 1, fontSize: '0.85rem' }} onClick={undo}>무르기</button>
          <button className="rv-start ghost" style={{ flex: 1, fontSize: '0.85rem' }} onClick={goToMenu}>메뉴로</button>
        </div>
      </div>
    </div>
  );
}

function Game() {
  const board = useReversi(s => s.board);
  const current = useReversi(s => s.current);
  const status = useReversi(s => s.status);
  const mode = useReversi(s => s.mode);
  const playerColor = useReversi(s => s.playerColor);
  const difficulty = useReversi(s => s.difficulty);
  const showHints = useReversi(s => s.showHints);
  const aiThinking = useReversi(s => s.aiThinking);
  const aiInfo = useReversi(s => s.aiInfo);
  const passNotice = useReversi(s => s.passNotice);
  const moves = useReversi(s => s.moves);
  const play = useReversi(s => s.play);
  const undo = useReversi(s => s.undo);
  const restart = useReversi(s => s.restart);
  const setPref = useReversi(s => s.setPref);

  const [cursor, setCursor] = useState(27);
  const [keyboard, setKeyboard] = useState(false);

  const myTurn = status === 'playing' && !aiThinking && (mode === 'vs-human' || current === playerColor);
  const legal = useMemo(
    () => new Set(myTurn ? legalMoves(board, current).map(m => m.index) : []),
    [board, current, myTurn]
  );
  const lastMove = [...moves].reverse().find(m => !m.pass) ?? null;
  const c = counts(board);
  const blackRatio = (c.black / Math.max(1, c.black + c.white)) * 100;

  useKeys({
    ArrowUp: () => { setKeyboard(true); setCursor(i => Math.max(0, i - 8)); },
    ArrowDown: () => { setKeyboard(true); setCursor(i => Math.min(63, i + 8)); },
    ArrowLeft: () => { setKeyboard(true); setCursor(i => (i % 8 === 0 ? i : i - 1)); },
    ArrowRight: () => { setKeyboard(true); setCursor(i => (i % 8 === 7 ? i : i + 1)); },
    Enter: () => play(cursor),
    ' ': () => play(cursor),
    h: () => setPref({ showHints: !showHints }),
  });

  const turnLabel = mode === 'vs-ai'
    ? (myTurn ? '내 차례' : 'AI 차례')
    : (current === BLACK ? '흑 차례' : '백 차례');

  return (
    <div className="rv-root">
      <div className="rv-score">
        <div className="rv-score-side">
          <span className="rv-disc-mini black" aria-hidden />
          <span className="rv-count">{c.black}</span>
        </div>
        <div className="rv-bar" role="img" aria-label={`흑 ${c.black} 대 백 ${c.white}`}>
          <span style={{ width: `${blackRatio}%` }} />
        </div>
        <div className="rv-score-side">
          <span className="rv-count">{c.white}</span>
          <span className="rv-disc-mini white" aria-hidden />
        </div>
      </div>

      <div className="rv-turn" aria-live="polite">
        <span className={`rv-disc-mini ${current === BLACK ? 'black' : 'white'}`} aria-hidden />
        <strong>{turnLabel}</strong>
        {aiThinking && <span style={{ color: '#a08fe0' }}>수읽는 중…</span>}
        {passNotice && <span className="rv-pass">{passNotice}</span>}
        <span className="rv-meta">
          {mode === 'vs-ai' ? `AI · ${DIFFICULTY_LABEL[difficulty]}` : '2인'}
          {lastMove ? ` · 최근 ${NOTATION(lastMove.index)}` : ''}
          {aiInfo && !aiThinking ? ` · ${aiInfo.exact ? '완전탐색' : `${aiInfo.depth}수 앞`}` : ''}
        </span>
      </div>

      <div className="rv-board-wrap">
        <div className="rv-board" role="grid" aria-label="리버시 보드">
          {Array.from({ length: 64 }, (_, i) => {
            const v = board[i] as 0 | Player;
            const playable = showHints && legal.has(i);
            return (
              <button
                key={i}
                className={[
                  'rv-cell',
                  playable ? 'playable' : '',
                  keyboard && cursor === i ? 'cursor' : '',
                  lastMove?.index === i ? 'last' : '',
                ].join(' ').trim()}
                role="gridcell"
                aria-label={`${NOTATION(i)} ${v === BLACK ? '흑' : v === WHITE ? '백' : '빈 칸'}`}
                disabled={!myTurn || !legal.has(i)}
                onClick={() => { setKeyboard(false); setCursor(i); play(i); }}
              >
                {v !== 0 && <span className={`rv-disc ${v === BLACK ? 'black' : 'white'}`} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rv-controls">
        <button onClick={undo} disabled={!moves.length || aiThinking}>↩ 무르기</button>
        <button onClick={restart} disabled={aiThinking}>⟳ 새 대국</button>
        <button onClick={() => setPref({ showHints: !showHints })} aria-pressed={showHints}>
          💡 자리 표시
        </button>
        <button onClick={() => useReversi.getState().goToMenu()}>메뉴</button>
      </div>

      <Result />
    </div>
  );
}

export default function App() {
  const status = useReversi(s => s.status);
  const undo = useReversi(s => s.undo);
  const restart = useReversi(s => s.restart);
  const goToMenu = useReversi(s => s.goToMenu);

  useKeys({
    u: () => { if (status !== 'menu') undo(); },
    n: () => { if (status !== 'menu') restart(); },
    Escape: () => { if (status !== 'menu') goToMenu(); },
  });

  useEffect(() => { document.title = '리버시 · games'; }, []);

  return (
    <GameShell meta={meta} tutorial={reversiTutorial}>
      {status === 'menu' ? <Menu /> : <Game />}
    </GameShell>
  );
}
