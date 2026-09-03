import { KeyboardEvent, PointerEvent, useMemo, useState } from 'react';
import { useGameStore, lastMoveOf } from '../stores/gameStore';
import { Position } from '../game/types';

const CS = 40, PAD = 34, N = 15;
const W = (N - 1) * CS + PAD * 2;
const H = (N - 1) * CS + PAD * 2;
const px = (c: number) => PAD + c * CS;
const py = (r: number) => PAD + r * CS;

const COL_LABEL = 'ABCDEFGHIJKLMNO';
export const coordLabel = (p: Position) => `${COL_LABEL[p.col]}${N - p.row}`;

const STAR: [number, number][] = [
  [3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11],
];

function Stone({ color, x, y, ghost = false, number }: {
  color: 'black' | 'white'; x: number; y: number; ghost?: boolean; number?: number;
}) {
  const R = 17;
  const [fId, rId] = color === 'black' ? ['bFace', 'bRim'] : ['wFace', 'wRim'];
  return (
    <g transform={`translate(${x},${y})`} opacity={ghost ? 0.45 : 1} style={{ pointerEvents: 'none' }}>
      {!ghost && <circle r={R + 2} cx={1} cy={3} fill="rgba(0,0,0,0.35)" />}
      <circle r={R} fill={`url(#${rId})`} stroke={color === 'black' ? '#111' : '#aaa'} strokeWidth={1.5} />
      <circle r={R - 2} fill={`url(#${fId})`} />
      <ellipse cx={-5} cy={-7} rx={6} ry={4} fill="white" opacity={color === 'black' ? 0.5 : 0.7} />
      {number !== undefined && (
        <text textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}
          fill={color === 'black' ? '#f5e7c8' : '#3a2c10'}>{number}</text>
      )}
    </g>
  );
}

export function Board() {
  const board = useGameStore(s => s.board);
  const moves = useGameStore(s => s.moves);
  const place = useGameStore(s => s.place);
  const status = useGameStore(s => s.status);
  const winLine = useGameStore(s => s.winLine);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const mode = useGameStore(s => s.mode);
  const playerColor = useGameStore(s => s.playerColor);
  const aiThinking = useGameStore(s => s.aiThinking);
  const showCoords = useGameStore(s => s.showCoords);

  const [hover, setHover] = useState<Position | null>(null);
  const [cursor, setCursor] = useState<Position>({ row: 7, col: 7 });
  const [keyboardMode, setKeyboardMode] = useState(false);

  const myTurn = status === 'playing' && !aiThinking &&
    (mode === 'vs-human' || currentPlayer === playerColor);
  const lastMove = lastMoveOf(moves);
  const winSet = useMemo(() => new Set(winLine.map(p => `${p.row},${p.col}`)), [winLine]);

  const toCell = (e: PointerEvent<SVGSVGElement>): Position | null => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(ctm.inverse());
    const col = Math.round((sp.x - PAD) / CS);
    const row = Math.round((sp.y - PAD) / CS);
    if (row < 0 || row >= N || col < 0 || col >= N) return null;
    /* 교차점에서 너무 먼 클릭은 무시해 오입력을 줄인다 */
    if (Math.hypot(sp.x - px(col), sp.y - py(row)) > CS * 0.62) return null;
    return { row, col };
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!myTurn) return;
    const cell = toCell(e);
    if (!cell) return;
    setKeyboardMode(false);
    setCursor(cell);
    place(cell.row, cell.col);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return;
    setHover(myTurn ? toCell(e) : null);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (step[e.key]) {
      e.preventDefault();
      setKeyboardMode(true);
      setCursor(c => ({
        row: Math.min(N - 1, Math.max(0, c.row + step[e.key][0])),
        col: Math.min(N - 1, Math.max(0, c.col + step[e.key][1])),
      }));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKeyboardMode(true);
      if (myTurn) place(cursor.row, cursor.col);
    }
  };

  const preview = keyboardMode ? cursor : hover;
  const showPreview = myTurn && preview && !board[preview.row][preview.col];

  const gridLines = [];
  for (let i = 0; i < N; i++) {
    gridLines.push(
      <line key={`v${i}`} x1={px(i)} y1={py(0)} x2={px(i)} y2={py(N - 1)} stroke="rgba(60,35,0,0.55)" strokeWidth={i === 0 || i === N - 1 ? 1.8 : 1} />,
      <line key={`h${i}`} x1={px(0)} y1={py(i)} x2={px(N - 1)} y2={py(i)} stroke="rgba(60,35,0,0.55)" strokeWidth={i === 0 || i === N - 1 ? 1.8 : 1} />
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center"
      style={{ filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.85))' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="application"
        tabIndex={0}
        aria-label={`오목판. 방향키로 이동하고 엔터로 착수합니다. 현재 커서 ${coordLabel(cursor)}`}
        className="board-svg"
        style={{
          width: '100%', height: '100%', maxWidth: W, maxHeight: H,
          display: 'block', touchAction: 'manipulation',
          cursor: myTurn ? 'pointer' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <radialGradient id="bFace" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#555" />
            <stop offset="60%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <radialGradient id="bRim" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#666" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <radialGradient id="wFace" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="50%" stopColor="#f0ede0" />
            <stop offset="100%" stopColor="#d0c8b0" />
          </radialGradient>
          <radialGradient id="wRim" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f8f5e8" />
            <stop offset="100%" stopColor="#b0a888" />
          </radialGradient>
          <linearGradient id="board" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f2d258" />
            <stop offset="50%" stopColor="#d4a020" />
            <stop offset="100%" stopColor="#a07808" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="#8a6010" rx={8} />
        <rect x={4} y={4} width={W - 8} height={H - 8} fill="url(#board)" rx={6} />

        {gridLines}

        {STAR.map(([r, c]) => (
          <circle key={`s${r}${c}`} cx={px(c)} cy={py(r)} r={3.2} fill="rgba(50,30,0,0.6)" />
        ))}

        {showCoords && (
          <g fill="rgba(70,45,5,0.75)" fontSize={12} fontWeight={600} style={{ pointerEvents: 'none' }}>
            {Array.from({ length: N }, (_, i) => (
              <text key={`cl${i}`} x={px(i)} y={PAD - 14} textAnchor="middle">{COL_LABEL[i]}</text>
            ))}
            {Array.from({ length: N }, (_, i) => (
              <text key={`rl${i}`} x={PAD - 20} y={py(i)} textAnchor="middle" dominantBaseline="central">{N - i}</text>
            ))}
          </g>
        )}

        {/* 마지막 착수 위치 표시 */}
        {lastMove && (
          <rect
            x={px(lastMove.col) - 21} y={py(lastMove.row) - 21} width={42} height={42} rx={6}
            fill="none" stroke="rgba(220,40,40,0.85)" strokeWidth={2} style={{ pointerEvents: 'none' }}
          />
        )}

        {/* 돌 */}
        {board.map((row, r) => row.map((color, c) => {
          if (!color) return null;
          const win = winSet.has(`${r},${c}`);
          return (
            <g key={`${r}-${c}`} className="stone-in">
              {win && <circle cx={px(c)} cy={py(r)} r={22} fill="rgba(255,215,60,0.45)" className="win-pulse" />}
              <Stone color={color} x={px(c)} y={py(r)} />
            </g>
          );
        }))}

        {/* 5목 라인 */}
        {winLine.length >= 2 && (
          <line
            x1={px(winLine[0].col)} y1={py(winLine[0].row)}
            x2={px(winLine[winLine.length - 1].col)} y2={py(winLine[winLine.length - 1].row)}
            stroke="rgba(255,60,60,0.9)" strokeWidth={4} strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* 착수 미리보기 */}
        {showPreview && preview && (
          <>
            <Stone color={currentPlayer} x={px(preview.col)} y={py(preview.row)} ghost />
            <circle cx={px(preview.col)} cy={py(preview.row)} r={20}
              fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.5}
              strokeDasharray="4 3" style={{ pointerEvents: 'none' }} />
          </>
        )}
      </svg>
    </div>
  );
}
