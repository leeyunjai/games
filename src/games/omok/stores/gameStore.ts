import { create } from 'zustand';
import { BoardState, Difficulty, EndReason, GameMode, GameStatus, PieceColor, Position } from '../game/types';
import { createInitialBoard, BOARD_SIZE } from '../game/board';
import { getWinLine, isBoardFull } from '../game/moves';
import { getBestMove, getLastSearchInfo, SearchInfo } from '../game/ai';
import { sfx } from '../../../shared/sound';
import { createStore } from '../../../shared/storage';
import { setProgress, clearProgress } from '../../../shared/progress';
import { bumpStat } from '../../../shared/stats';

export interface Move extends Position {
  color: PieceColor;
}

const store = createStore('omok');
const SAVE_KEY = 'game';
const PREF_KEY = 'pref';

interface Prefs {
  difficulty: Difficulty;
  playerColor: PieceColor;
  showCoords: boolean;
}

const DEFAULT_PREFS: Prefs = {
  difficulty: 'normal',
  playerColor: 'black',
  showCoords: true,
};

function loadPrefs(): Prefs {
  return { ...DEFAULT_PREFS, ...store.get<Partial<Prefs>>(PREF_KEY, {}) };
}

function savePrefs(p: Prefs) {
  store.set(PREF_KEY, p);
}

export interface SavedGame {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: PieceColor;
  moves: Move[];
}

export function loadSavedGame(): SavedGame | null {
  const g = store.get<SavedGame | null>(SAVE_KEY, null);
  if (!g || !Array.isArray(g.moves) || g.moves.length === 0) return null;
  return g;
}

function persistGame(g: SavedGame | null) {
  if (!g || g.moves.length === 0) {
    store.remove(SAVE_KEY);
    clearProgress('omok');
    return;
  }
  store.set(SAVE_KEY, g);
  setProgress('omok', `${g.moves.length}수 진행 중 · ${g.mode === 'vs-ai' ? 'AI 대전' : '2인 대국'}`);
}

export function boardFromMoves(moves: Move[]): BoardState {
  const b = createInitialBoard();
  for (const m of moves) b[m.row][m.col] = m.color;
  return b;
}

const other = (c: PieceColor): PieceColor => (c === 'black' ? 'white' : 'black');

/** AI가 즉답하면 기계처럼 느껴져서 최소 사고 시간을 둔다 */
const MIN_THINK_MS = 380;

interface Store extends Prefs {
  aiInfo: SearchInfo | null;
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
    aiInfo: null as SearchInfo | null,
  };
}

export const useGameStore = create<Store>()((set, get) => {
  const prefs = loadPrefs();

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

    if (line) sfx.win(); else sfx.place();
    if (line || full) recordResult(line ? move.color : null);
    if (!line && !full) maybeRunAi();
  }

  /** AI 대전 전적을 남긴다(2인 대국은 집계하지 않는다). */
  function recordResult(winner: PieceColor | null) {
    const s = get();
    if (s.mode !== 'vs-ai') return;
    bumpStat('omok', winner === null ? 'draws' : winner === s.playerColor ? 'wins' : 'losses');
  }

  /** vs-ai에서 AI 차례라면 화면을 먼저 그리고 나서 계산한다(입력 잠금 표시 목적). */
  function maybeRunAi() {
    const s = get();
    if (s.status !== 'playing' || s.mode !== 'vs-ai') return;
    if (s.currentPlayer === s.playerColor) return;
    set({ aiThinking: true });
    const aiColor = s.currentPlayer;
    const startedAt = performance.now();
    /* rAF 두 번 → "AI 생각 중" 표시가 실제로 그려진 뒤 동기 계산에 들어간다 */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const st = get();
      if (st.status !== 'playing' || !st.aiThinking) return;
      const mv = getBestMove(st.board, aiColor, st.difficulty);
      const info = getLastSearchInfo();
      const wait = Math.max(0, MIN_THINK_MS - (performance.now() - startedAt));
      setTimeout(() => {
        const cur = get();
        if (cur.status !== 'playing' || !cur.aiThinking) return;
        set({ aiThinking: false, aiInfo: info });
        if (!mv) {
          set({ status: 'ended', winner: null, endReason: 'draw' });
          return;
        }
        commit({ ...mv, color: aiColor });
      }, wait);
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
        showCoords: patch.showCoords ?? s.showCoords,
      };
      savePrefs(next);
      set(next);
    },

    startGame: (mode, opts) => {
      const s = get();
      const difficulty = opts?.difficulty ?? s.difficulty;
      const playerColor = opts?.playerColor ?? s.playerColor;
      savePrefs({ difficulty, playerColor, showCoords: s.showCoords });
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
      sfx.undo();
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
