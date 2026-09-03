import { create } from 'zustand';
import { BoardState, Difficulty, EndReason, GameMode, GameStatus, PieceColor, Position } from '../game/types';
import { createInitialBoard, BOARD_SIZE } from '../game/board';
import { getWinLine, isBoardFull } from '../game/moves';
import { getBestMove } from '../game/ai';
import { playStone, playUndo, playWin, setSoundEnabled } from '../game/sound';

export interface Move extends Position {
  color: PieceColor;
}

const SAVE_KEY = 'omok:v2:game';
const PREF_KEY = 'omok:v2:pref';

interface Prefs {
  difficulty: Difficulty;
  playerColor: PieceColor;
  sound: boolean;
  showCoords: boolean;
}

const DEFAULT_PREFS: Prefs = {
  difficulty: 'normal',
  playerColor: 'black',
  sound: true,
  showCoords: true,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* 저장 실패는 무시 */ }
}

export interface SavedGame {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: PieceColor;
  moves: Move[];
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as SavedGame;
    if (!Array.isArray(g.moves) || g.moves.length === 0) return null;
    return g;
  } catch {
    return null;
  }
}

function persistGame(g: SavedGame | null) {
  try {
    if (!g || g.moves.length === 0) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(g));
  } catch { /* 저장 실패는 무시 */ }
}

export function boardFromMoves(moves: Move[]): BoardState {
  const b = createInitialBoard();
  for (const m of moves) b[m.row][m.col] = m.color;
  return b;
}

const other = (c: PieceColor): PieceColor => (c === 'black' ? 'white' : 'black');

interface Store extends Prefs {
  board: BoardState;
  moves: Move[];
  currentPlayer: PieceColor;
  status: GameStatus;
  winner: PieceColor | null;
  endReason: EndReason;
  winLine: Position[];
  mode: GameMode;
  aiThinking: boolean;
  hasSave: boolean;

  startGame: (mode: GameMode, opts?: { difficulty?: Difficulty; playerColor?: PieceColor }) => void;
  resumeSaved: () => void;
  place: (row: number, col: number) => void;
  undoMove: () => void;
  restart: () => void;
  goToMenu: () => void;
  setPref: (patch: Partial<Prefs>) => void;
}

function baseState() {
  return {
    board: createInitialBoard(),
    moves: [] as Move[],
    currentPlayer: 'black' as PieceColor,
    status: 'menu' as GameStatus,
    winner: null as PieceColor | null,
    endReason: null as EndReason,
    winLine: [] as Position[],
    mode: 'vs-ai' as GameMode,
    aiThinking: false,
  };
}

export const useGameStore = create<Store>()((set, get) => {
  const prefs = loadPrefs();
  setSoundEnabled(prefs.sound);

  /** 수를 하나 적용하고 승/무를 판정한다. AI 차례면 이어서 예약한다. */
  function commit(move: Move) {
    const s = get();
    const moves = [...s.moves, move];
    const board = boardFromMoves(moves);
    const line = getWinLine(board, move.row, move.col, move.color);
    const full = !line && isBoardFull(board);

    persistGame(line || full ? null : { mode: s.mode, difficulty: s.difficulty, playerColor: s.playerColor, moves });

    set({
      board,
      moves,
      currentPlayer: other(move.color),
      winLine: line ?? [],
      winner: line ? move.color : null,
      status: line || full ? 'ended' : 'playing',
      endReason: line ? 'five' : full ? 'draw' : null,
      hasSave: !(line || full),
    });

    if (line) playWin(); else playStone();
    if (!line && !full) maybeRunAi();
  }

  /** vs-ai에서 AI 차례라면 화면을 먼저 그리고 나서 계산한다(입력 잠금 표시 목적). */
  function maybeRunAi() {
    const s = get();
    if (s.status !== 'playing' || s.mode !== 'vs-ai') return;
    if (s.currentPlayer === s.playerColor) return;
    set({ aiThinking: true });
    const aiColor = s.currentPlayer;
    /* rAF 두 번 → "AI 생각 중" 표시가 실제로 그려진 뒤 동기 계산에 들어간다 */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const st = get();
      if (st.status !== 'playing' || !st.aiThinking) return;
      const mv = getBestMove(st.board, aiColor, st.difficulty);
      set({ aiThinking: false });
      if (!mv) {
        set({ status: 'ended', winner: null, endReason: 'draw' });
        return;
      }
      commit({ ...mv, color: aiColor });
    }));
  }

  return {
    ...baseState(),
    ...prefs,
    hasSave: loadSavedGame() !== null,

    setPref: (patch) => {
      const s = get();
      const next: Prefs = {
        difficulty: patch.difficulty ?? s.difficulty,
        playerColor: patch.playerColor ?? s.playerColor,
        sound: patch.sound ?? s.sound,
        showCoords: patch.showCoords ?? s.showCoords,
      };
      setSoundEnabled(next.sound);
      savePrefs(next);
      set(next);
    },

    startGame: (mode, opts) => {
      const s = get();
      const difficulty = opts?.difficulty ?? s.difficulty;
      const playerColor = opts?.playerColor ?? s.playerColor;
      savePrefs({ difficulty, playerColor, sound: s.sound, showCoords: s.showCoords });
      persistGame(null);
      set({ ...baseState(), status: 'playing', mode, difficulty, playerColor, hasSave: false });
      if (mode === 'vs-ai' && playerColor === 'white') maybeRunAi();
    },

    resumeSaved: () => {
      const g = loadSavedGame();
      if (!g) return;
      const board = boardFromMoves(g.moves);
      const last = g.moves[g.moves.length - 1];
      const line = getWinLine(board, last.row, last.col, last.color);
      set({
        ...baseState(),
        board,
        moves: g.moves,
        mode: g.mode,
        difficulty: g.difficulty,
        playerColor: g.playerColor,
        currentPlayer: other(last.color),
        status: line ? 'ended' : 'playing',
        winner: line ? last.color : null,
        winLine: line ?? [],
        endReason: line ? 'five' : null,
        hasSave: true,
      });
      if (!line) maybeRunAi();
    },

    place: (row, col) => {
      const s = get();
      if (s.status !== 'playing' || s.aiThinking) return;
      if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return;
      if (s.board[row][col] !== null) return;
      if (s.mode === 'vs-ai' && s.currentPlayer !== s.playerColor) return;
      commit({ row, col, color: s.currentPlayer });
    },

    /** 사람 차례로 돌아갈 때까지 되돌린다(vs-ai면 AI 수까지 함께). */
    undoMove: () => {
      const s = get();
      if (s.aiThinking || s.moves.length === 0) return;
      const moves = [...s.moves];
      moves.pop();
      if (s.mode === 'vs-ai' && moves.length > 0 && moves[moves.length - 1].color !== s.playerColor) {
        moves.pop();
      }
      const board = boardFromMoves(moves);
      const last = moves[moves.length - 1];
      persistGame(moves.length ? { mode: s.mode, difficulty: s.difficulty, playerColor: s.playerColor, moves } : null);
      playUndo();
      set({
        board,
        moves,
        currentPlayer: last ? other(last.color) : 'black',
        status: 'playing',
        winner: null,
        endReason: null,
        winLine: [],
        hasSave: moves.length > 0,
      });
    },

    restart: () => {
      const s = get();
      persistGame(null);
      set({ ...baseState(), status: 'playing', mode: s.mode, hasSave: false });
      if (s.mode === 'vs-ai' && s.playerColor === 'white') maybeRunAi();
    },

    goToMenu: () => set({ status: 'menu', hasSave: loadSavedGame() !== null }),
  };
});

export const lastMoveOf = (moves: Move[]): Move | null => moves[moves.length - 1] ?? null;
