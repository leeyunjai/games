import { create } from 'zustand';
import {
  BLACK, Board, Player, WHITE, applyMove, counts, createBoard,
  hasMove, legalMoves, opponent, winnerOf,
} from './engine';
import { Difficulty, getBestMove, getLastSearchInfo, SearchInfo } from './ai';
import { sfx } from '../../shared/sound';
import { createStore } from '../../shared/storage';
import { setProgress, clearProgress } from '../../shared/progress';
import { bumpStat } from '../../shared/stats';

const store = createStore('reversi');
const SAVE_KEY = 'game';
const PREF_KEY = 'pref';
const MIN_THINK_MS = 420;

export type Status = 'menu' | 'playing' | 'ended';
export type Mode = 'vs-ai' | 'vs-human';

interface Prefs {
  difficulty: Difficulty;
  playerColor: Player;
  showHints: boolean;
}

const DEFAULT_PREFS: Prefs = { difficulty: 'normal', playerColor: BLACK, showHints: true };

export interface MoveRecord {
  index: number;
  player: Player;
  /** 둘 곳이 없어 넘어간 차례 */
  pass?: boolean;
}

export interface SavedGame {
  mode: Mode;
  difficulty: Difficulty;
  playerColor: Player;
  moves: MoveRecord[];
}

export function loadSavedGame(): SavedGame | null {
  const g = store.get<SavedGame | null>(SAVE_KEY, null);
  if (!g || !Array.isArray(g.moves) || g.moves.length === 0) return null;
  return g;
}

/** 수순을 처음부터 다시 두어 현재 판을 만든다. */
export function replay(moves: MoveRecord[]): Board {
  let board = createBoard();
  for (const m of moves) {
    if (m.pass) continue;
    board = applyMove(board, m.index, m.player);
  }
  return board;
}

interface State extends Prefs {
  board: Board;
  moves: MoveRecord[];
  current: Player;
  status: Status;
  mode: Mode;
  aiThinking: boolean;
  aiInfo: SearchInfo | null;
  /** 방금 상대가 둘 곳이 없어 넘어갔음을 알리는 문구 */
  passNotice: string | null;
  winner: Player | null;

  startGame: (mode: Mode) => void;
  resumeSaved: () => void;
  play: (index: number) => void;
  undo: () => void;
  restart: () => void;
  goToMenu: () => void;
  setPref: (patch: Partial<Prefs>) => void;
}

function persist(state: { mode: Mode; difficulty: Difficulty; playerColor: Player; moves: MoveRecord[] }) {
  const real = state.moves.filter((m) => !m.pass).length;
  if (real === 0) {
    store.remove(SAVE_KEY);
    clearProgress('reversi');
    return;
  }
  store.set(SAVE_KEY, state);
  setProgress('reversi', `${real}수 진행 중 · ${state.mode === 'vs-ai' ? 'AI 대전' : '2인 대국'}`);
}

export const useReversi = create<State>()((set, get) => {
  const prefs: Prefs = { ...DEFAULT_PREFS, ...store.get<Partial<Prefs>>(PREF_KEY, {}) };

  /** 다음 차례를 정한다. 둘 곳이 없으면 패스, 양쪽 다 없으면 종료. */
  function advance(board: Board, justPlayed: Player, moves: MoveRecord[]) {
    const s = get();
    const next = opponent(justPlayed);
    if (hasMove(board, next)) {
      set({ board, moves, current: next, passNotice: null });
      persist({ mode: s.mode, difficulty: s.difficulty, playerColor: s.playerColor, moves });
      maybeRunAi();
      return;
    }
    if (hasMove(board, justPlayed)) {
      const passed = [...moves, { index: -1, player: next, pass: true }];
      const label = next === BLACK ? '흑' : '백';
      set({ board, moves: passed, current: justPlayed, passNotice: `${label}은 둘 곳이 없어 넘어갑니다` });
      sfx.alert();
      persist({ mode: s.mode, difficulty: s.difficulty, playerColor: s.playerColor, moves: passed });
      maybeRunAi();
      return;
    }
    /* 양쪽 모두 둘 곳 없음 → 종료 */
    const winner = winnerOf(board);
    set({ board, moves, status: 'ended', winner, passNotice: null, aiThinking: false });
    store.remove(SAVE_KEY);
    clearProgress('reversi');
    sfx.win();
    if (s.mode === 'vs-ai') {
      bumpStat('reversi', winner === null ? 'draws' : winner === s.playerColor ? 'wins' : 'losses');
    }
  }

  function maybeRunAi() {
    const s = get();
    if (s.status !== 'playing' || s.mode !== 'vs-ai') return;
    if (s.current === s.playerColor) return;
    const aiColor = s.current;
    set({ aiThinking: true });
    const startedAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const st = get();
      if (st.status !== 'playing' || !st.aiThinking) return;
      const idx = getBestMove(st.board, aiColor, st.difficulty);
      const info = getLastSearchInfo();
      const wait = Math.max(0, MIN_THINK_MS - (performance.now() - startedAt));
      setTimeout(() => {
        const cur = get();
        if (cur.status !== 'playing' || !cur.aiThinking) return;
        set({ aiThinking: false, aiInfo: info });
        if (idx === null) return;
        const board = applyMove(cur.board, idx, aiColor);
        sfx.place();
        advance(board, aiColor, [...cur.moves, { index: idx, player: aiColor }]);
      }, wait);
    }));
  }

  return {
    ...prefs,
    board: createBoard(),
    moves: [],
    current: BLACK,
    status: 'menu',
    mode: 'vs-ai',
    aiThinking: false,
    aiInfo: null,
    passNotice: null,
    winner: null,

    setPref: (patch) => {
      const next: Prefs = {
        difficulty: patch.difficulty ?? get().difficulty,
        playerColor: patch.playerColor ?? get().playerColor,
        showHints: patch.showHints ?? get().showHints,
      };
      store.set(PREF_KEY, next);
      set(next);
    },

    startGame: (mode) => {
      store.remove(SAVE_KEY);
      clearProgress('reversi');
      set({
        board: createBoard(), moves: [], current: BLACK, status: 'playing',
        mode, winner: null, aiThinking: false, aiInfo: null, passNotice: null,
      });
      maybeRunAi();
    },

    resumeSaved: () => {
      const g = loadSavedGame();
      if (!g) return;
      const board = replay(g.moves);
      const last = g.moves[g.moves.length - 1];
      const next = opponent(last.player);
      set({
        board, moves: g.moves, mode: g.mode, difficulty: g.difficulty, playerColor: g.playerColor,
        current: hasMove(board, next) ? next : last.player,
        status: 'playing', winner: null, aiThinking: false, aiInfo: null, passNotice: null,
      });
      maybeRunAi();
    },

    play: (index) => {
      const s = get();
      if (s.status !== 'playing' || s.aiThinking) return;
      if (s.mode === 'vs-ai' && s.current !== s.playerColor) return;
      const move = legalMoves(s.board, s.current).find((m) => m.index === index);
      if (!move) return;
      const board = applyMove(s.board, index, s.current, move.flips);
      sfx.place();
      advance(board, s.current, [...s.moves, { index, player: s.current }]);
    },

    undo: () => {
      const s = get();
      if (s.aiThinking || s.moves.length === 0) return;
      const moves = [...s.moves];
      /* 사람 차례로 돌아갈 때까지 되돌린다 */
      do { moves.pop(); }
      while (
        moves.length > 0 &&
        s.mode === 'vs-ai' &&
        (moves[moves.length - 1].pass || moves[moves.length - 1].player !== s.playerColor)
      );
      const board = replay(moves);
      const last = moves[moves.length - 1];
      const current: Player = last ? (hasMove(board, opponent(last.player)) ? opponent(last.player) : last.player) : BLACK;
      sfx.undo();
      set({ board, moves, current, status: 'playing', winner: null, passNotice: null });
      persist({ mode: s.mode, difficulty: s.difficulty, playerColor: s.playerColor, moves });
    },

    restart: () => {
      const s = get();
      store.remove(SAVE_KEY);
      clearProgress('reversi');
      set({
        board: createBoard(), moves: [], current: BLACK, status: 'playing',
        winner: null, aiThinking: false, aiInfo: null, passNotice: null, mode: s.mode,
      });
      maybeRunAi();
    },

    goToMenu: () => set({ status: 'menu', aiThinking: false }),
  };
});

export const score = (board: Board) => counts(board);
export { BLACK, WHITE };
