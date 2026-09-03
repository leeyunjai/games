import { KeyboardEvent, PointerEvent, useState } from 'react';
import { useGameStore, lastMoveOf } from '../stores/gameStore';
import { Piece, Position } from '../game/types';
import { isInCheck } from '../game/moves';

const CS = 58;
const PAD = 40;
const COLS = 9;
const ROWS = 10;
const W = (COLS - 1) * CS + PAD * 2;
const H = (ROWS - 1) * CS + PAD * 2;

const CHARS: Record<string, { han: string; cho: string }> = {
  general: { han: '漢', cho: '楚' },
  guard: { han: '士', cho: '士' },
  elephant: { han: '象', cho: '象' },
  horse: { han: '馬', cho: '馬' },
  chariot: { han: '車', cho: '車' },
  cannon: { han: '包', cho: '包' },
  soldier: { han: '卒', cho: '兵' },
};

const BASE_NAME: Record<string, string> = {
  general: '궁', guard: '사', elephant: '상', horse: '마',
  chariot: '차', cannon: '포', soldier: '졸',
};

/** 기보 표기용 이름. 졸(卒)은 한, 병(兵)은 초를 가리킨다. */
export function pieceName(type: string, player?: 'han' | 'cho'): string {
  if (type === 'soldier') return player === 'cho' ? '병' : '졸';
  return BASE_NAME[type] ?? type;
}

function px(col: number) { return PAD + col * CS; }
function py(row: number) { return PAD + row * CS; }

function PieceCircle({ piece, x, y, selected }: {
  piece: Piece; x: number; y: number; selected: boolean;
}) {
  const isHan = piece.player === 'han';
  const gradId = isHan ? 'hanFaceGrad' : 'choFaceGrad';
  const rimId = isHan ? 'hanRimGrad' : 'choRimGrad';
  const stroke = isHan ? '#0e2552' : '#52100e';
  const textFill = isHan ? '#09183a' : '#3a0909';
  const char = CHARS[piece.type]?.[piece.player] ?? '?';
  const R = 21;

  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      {selected && (
        <>
          <circle r={33} fill="rgba(255,220,0,0.10)" />
          <circle r={29} fill="rgba(255,220,0,0.22)" />
          <circle r={26} fill="none" stroke="rgba(255,220,0,0.7)" strokeWidth={1.5} />
        </>
      )}
      <circle r={R + 4} cx={1.5} cy={5.5} fill="rgba(0,0,0,0.14)" />
      <circle r={R + 1} cx={2} cy={4.5} fill="rgba(0,0,0,0.28)" />
      <circle r={R} cx={2.5} cy={3.5} fill="rgba(0,0,0,0.45)" />
      <circle r={R} fill={`url(#${rimId})`} stroke={stroke} strokeWidth={selected ? 2.8 : 2} />
      <circle r={R - 2.5} fill={`url(#${gradId})`} />
      <circle r={R - 2} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={2.5} />
      <circle r={10} fill="none" stroke={stroke} strokeWidth={0.8} opacity={0.35} />
      <ellipse cx={-7} cy={-9.5} rx={9} ry={5.5} fill="white" opacity={0.55} />
      <ellipse cx={-6} cy={-11} rx={4.5} ry={2.5} fill="white" opacity={0.5} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={14}
        fontFamily="'Noto Serif SC','Noto Serif KR',serif" fontWeight="bold"
        fill="rgba(0,0,0,0.25)" dx={0.8} dy={1}>{char}</text>
      <text textAnchor="middle" dominantBaseline="central" fontSize={14}
        fontFamily="'Noto Serif SC','Noto Serif KR',serif" fontWeight="bold"
        fill={textFill}>{char}</text>
    </g>
  );
}

export function Board() {
  const board = useGameStore(s => s.board);
  const selected = useGameStore(s => s.selected);
  const validMoves = useGameStore(s => s.validMoves);
  const selectCell = useGameStore(s => s.selectCell);
  const status = useGameStore(s => s.status);
  const moves = useGameStore(s => s.moves);
  const flip = useGameStore(s => s.flipBoard);
  const aiThinking = useGameStore(s => s.aiThinking);
  const mode = useGameStore(s => s.mode);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const playerSide = useGameStore(s => s.playerSide);

  const [cursor, setCursor] = useState<Position>({ row: 8, col: 4 });
  const [keyboardMode, setKeyboardMode] = useState(false);

  const myTurn = status === 'playing' && !aiThinking &&
    (mode === 'vs-human' || currentPlayer === playerSide);
  const disabled = !myTurn;

  /* 논리 좌표 → 화면 좌표 (판 뒤집기 반영) */
  const X = (col: number) => px(flip ? COLS - 1 - col : col);
  const Y = (row: number) => py(flip ? ROWS - 1 - row : row);

  const hanInCheck = status === 'playing' && isInCheck(board, 'han');
  const choInCheck = status === 'playing' && isInCheck(board, 'cho');
  const last = lastMoveOf(moves);

  const toCell = (e: PointerEvent<SVGSVGElement>): Position | null => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sp = pt.matrixTransform(ctm.inverse());
    let col = Math.round((sp.x - PAD) / CS);
    let row = Math.round((sp.y - PAD) / CS);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    if (Math.hypot(sp.x - px(col), sp.y - py(row)) > CS * 0.62) return null;
    if (flip) { row = ROWS - 1 - row; col = COLS - 1 - col; }
    return { row, col };
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const cell = toCell(e);
    if (!cell) return;
    setKeyboardMode(false);
    setCursor(cell);
    selectCell(cell.row, cell.col);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const raw: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (raw[e.key]) {
      e.preventDefault();
      setKeyboardMode(true);
      const [dr, dc] = raw[e.key];
      const sign = flip ? -1 : 1;
      setCursor(c => ({
        row: Math.min(ROWS - 1, Math.max(0, c.row + dr * sign)),
        col: Math.min(COLS - 1, Math.max(0, c.col + dc * sign)),
      }));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKeyboardMode(true);
      if (!disabled) selectCell(cursor.row, cursor.col);
    }
  };

  const gridLines = [];
  for (let c = 0; c < COLS; c++) {
    gridLines.push(
      <line key={`v${c}`} x1={px(c)} y1={py(0)} x2={px(c)} y2={py(ROWS - 1)}
        stroke="#8a6828" strokeWidth="1.2" />
    );
  }
  for (let r = 0; r < ROWS; r++) {
    gridLines.push(
      <line key={`h${r}`} x1={px(0)} y1={py(r)} x2={px(COLS - 1)} y2={py(r)}
        stroke="#8a6828" strokeWidth="1.2" />
    );
  }

  const riverY = (py(4) + py(5)) / 2;

  const intersectionDots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      intersectionDots.push(
        <circle key={`id-${r}-${c}`} cx={px(c)} cy={py(r)} r={2.2} fill="rgba(80,50,5,0.5)" />
      );
    }
  }

  return (
    <div className="w-full h-full flex justify-center items-center select-none"
      style={{ filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.85)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="application"
        tabIndex={0}
        aria-label="장기판. 방향키로 이동하고 엔터로 기물 선택 및 착수합니다."
        className="board-svg"
        style={{
          width: '100%', height: '100%',
          maxWidth: W, maxHeight: H,
          display: 'block', touchAction: 'manipulation',
          cursor: disabled ? 'default' : 'pointer',
        }}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <radialGradient id="hanFaceGrad" cx="38%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#eef6ff" />
            <stop offset="30%" stopColor="#cde0ff" />
            <stop offset="70%" stopColor="#84aee8" />
            <stop offset="100%" stopColor="#3a66b8" />
          </radialGradient>
          <radialGradient id="hanRimGrad" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#b8d0f8" />
            <stop offset="55%" stopColor="#5880c8" />
            <stop offset="100%" stopColor="#1a3060" />
          </radialGradient>
          <radialGradient id="choFaceGrad" cx="38%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#fff2f0" />
            <stop offset="30%" stopColor="#ffcccc" />
            <stop offset="70%" stopColor="#e87878" />
            <stop offset="100%" stopColor="#b83030" />
          </radialGradient>
          <radialGradient id="choRimGrad" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f8b8b8" />
            <stop offset="55%" stopColor="#c85858" />
            <stop offset="100%" stopColor="#601818" />
          </radialGradient>
          <linearGradient id="surfaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f2d258" />
            <stop offset="25%" stopColor="#e8c03a" />
            <stop offset="60%" stopColor="#d0a020" />
            <stop offset="100%" stopColor="#a87c08" />
          </linearGradient>
          <radialGradient id="vignetteGrad" cx="50%" cy="50%" r="70%">
            <stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b06828" />
            <stop offset="40%" stopColor="#7a4014" />
            <stop offset="100%" stopColor="#301608" />
          </linearGradient>
          <linearGradient id="frameTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,210,80,0.55)" />
            <stop offset="100%" stopColor="rgba(255,210,80,0)" />
          </linearGradient>
          <linearGradient id="frameLeftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,210,80,0.3)" />
            <stop offset="100%" stopColor="rgba(255,210,80,0)" />
          </linearGradient>
          <linearGradient id="frameBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
          </linearGradient>
          <linearGradient id="frameRightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </linearGradient>
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(60,100,180,0.08)" />
            <stop offset="50%" stopColor="rgba(60,100,180,0.14)" />
            <stop offset="100%" stopColor="rgba(60,100,180,0.08)" />
          </linearGradient>
        </defs>

        {/* 나무 프레임 */}
        <rect width={W} height={H} fill="url(#frameGrad)" rx={10} />
        <rect x={0} y={0} width={W} height={14} fill="url(#frameTopGrad)" rx={10} />
        <rect x={0} y={0} width={14} height={H} fill="url(#frameLeftGrad)" />
        <rect x={0} y={H - 13} width={W} height={13} fill="url(#frameBottomGrad)" rx={4} />
        <rect x={W - 13} y={0} width={13} height={H} fill="url(#frameRightGrad)" />
        <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={2} rx={6} />
        <rect x={9} y={9} width={W - 18} height={H - 18} fill="none" stroke="rgba(255,200,80,0.25)" strokeWidth={1} rx={5} />

        {/* 판면 */}
        <rect x={12} y={12} width={W - 24} height={H - 24} fill="url(#surfaceGrad)" rx={6} />
        <rect x={12} y={py(4) + 8} width={W - 24} height={py(5) - py(4) - 16} fill="url(#riverGrad)" />
        <rect x={12} y={12} width={W - 24} height={8} fill="rgba(0,0,0,0.22)" rx={6} />
        <rect x={12} y={12} width={8} height={H - 24} fill="rgba(0,0,0,0.14)" />
        <rect x={12} y={12} width={W - 24} height={H - 24} fill="url(#vignetteGrad)" rx={6} />
        <rect x={12} y={12} width={W - 24} height={H - 24} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={2.5} rx={6} />

        {gridLines}

        <line x1={px(0)} y1={riverY} x2={px(COLS - 1)} y2={riverY}
          stroke="rgba(60,100,200,0.25)" strokeWidth={2} strokeDasharray="6 4" />

        {intersectionDots}

        {/* 궁성 */}
        {[0, 7].map(top => (
          <g key={`palace${top}`}>
            <rect x={px(3)} y={py(top)} width={px(5) - px(3)} height={py(top + 2) - py(top)}
              fill="rgba(120,100,40,0.12)" stroke="rgba(120,90,20,0.35)" strokeWidth={1} />
            <line x1={px(3)} y1={py(top)} x2={px(5)} y2={py(top + 2)} stroke="#8a6828" strokeWidth="1.4" />
            <line x1={px(5)} y1={py(top)} x2={px(3)} y2={py(top + 2)} stroke="#8a6828" strokeWidth="1.4" />
          </g>
        ))}

        <text x={px(2)} y={riverY + 1} textAnchor="middle" dominantBaseline="middle"
          fill="#6a4a18" fontSize={15} fontFamily="serif" fontWeight="bold" opacity={0.85}>楚河</text>
        <text x={px(6)} y={riverY + 1} textAnchor="middle" dominantBaseline="middle"
          fill="#6a4a18" fontSize={15} fontFamily="serif" fontWeight="bold" opacity={0.85}>漢界</text>

        {/* 마지막 수: 출발 → 도착 */}
        {last && (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={X(last.from.col) - 24} y={Y(last.from.row) - 24} width={48} height={48} rx={7}
              fill="none" stroke="rgba(255,235,120,0.45)" strokeWidth={2} strokeDasharray="5 4" />
            <rect x={X(last.to.col) - 24} y={Y(last.to.row) - 24} width={48} height={48} rx={7}
              fill="none" stroke="rgba(255,225,60,0.9)" strokeWidth={2.5} />
          </g>
        )}

        {/* 이동 가능 위치 */}
        {validMoves.map(({ row, col }) =>
          board[row][col] ? (
            <circle key={`cap-${row}-${col}`} cx={X(col)} cy={Y(row)} r={24}
              fill="rgba(220,50,30,0.15)" stroke="rgba(220,60,40,0.85)" strokeWidth={2.4}
              style={{ pointerEvents: 'none' }} />
          ) : (
            <circle key={`dot-${row}-${col}`} cx={X(col)} cy={Y(row)} r={7}
              fill="#1a9e50" opacity={0.9} style={{ pointerEvents: 'none' }} />
          )
        )}

        {/* 장군 표시 */}
        {board.map((rowArr, r) =>
          rowArr.map((piece, c) => {
            if (!piece || piece.type !== 'general') return null;
            const inCheck = piece.player === 'han' ? hanInCheck : choInCheck;
            if (!inCheck) return null;
            return (
              <circle key={`chk-${r}-${c}`} cx={X(c)} cy={Y(r)} r={28}
                fill="rgba(255,20,20,0.15)" stroke="rgba(255,50,50,0.9)" strokeWidth={2.5}
                style={{ pointerEvents: 'none' }}>
                <animate attributeName="opacity" values="1;0.3;1" dur="0.85s" repeatCount="indefinite" />
              </circle>
            );
          })
        )}

        {/* 기물 */}
        {board.map((rowArr, r) =>
          rowArr.map((piece, c) => piece ? (
            <PieceCircle key={piece.id} piece={piece} x={X(c)} y={Y(r)}
              selected={selected?.row === r && selected?.col === c} />
          ) : null)
        )}

        {/* 키보드 커서 */}
        {keyboardMode && (
          <rect x={X(cursor.col) - 26} y={Y(cursor.row) - 26} width={52} height={52} rx={8}
            fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }} />
        )}
      </svg>
    </div>
  );
}
