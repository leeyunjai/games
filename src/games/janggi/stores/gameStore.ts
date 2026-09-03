import { create } from 'zustand';
import {
  BoardState, Difficulty, EndReason, GameMode, GameStatus,
  MoveRecord, Piece, Player, Position, Setup,
} from '../game/types';
import { createInitialBoard } from '../game/board';
import { getLegalMoves, applyMove, hasLegalMoves, isInCheck } from '../game/moves';
import { getBestMove, getLastSearchInfo, SearchInfo } from '../game/ai';
import { sfx } from '../../../shared/sound';
import { createStore } from '../../../shared/storage';
import { setProgress, clearProgress } from '../../../shared/progress';
import { bumpStat } from '../../../shared/stats';

const store = createStore('janggi');
const SAVE_KEY = 'game';
const PREF_KEY = 'pref';

/** AI가 즉답하지 않도록 두는 최소 사고 시간 */
const MIN_THINK_MS = 420;

interface Prefs {
  difficulty: Difficulty;
  playerSide: Player;
  setupCho: Setup;
  setupHan: Setup;
  flipBoard: boolean;
}

const DEFAULT_PREFS: Prefs = {
  difficulty: 'normal',
  playerSide: 'cho',
  setupCho: 'msms',
  setupHan: 'smsm',
  flipBoard: false,
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
  playerSide: Player;
  setupCho: Setup;
  setupHan: Setup;
  moves: MoveRecord[];
}

export function loadSavedGame(): SavedGame | null {
  const g = store.get<SavedGame | null>(SAVE_KEY, null);
  if (!g || !Array.isArray(g.moves) || g.moves.length === 0) return null;
  return g;
}

function persistGame(g: SavedGame | null) {
  if (!g || g.moves.length === 0) {
    store.remove(SAVE_KEY);
    clearProgress('janggi');
    return;
  }
  store.set(SAVE_KEY, g);
  setProgress('janggi', `${g.moves.length}수 진행 중 · ${g.mode === 'vs-ai' ? 'AI 대전' : '2인 대국'}`);
}

/** 수순 로그를 처음부터 다시 두어 현재 판을 만든다. */
export function replay(setupCho: Setup, setupHan: Setup, moves: MoveRecord[]): BoardState {
  let board = createInitialBoard(setupCho, setupHan);
  for (const m of moves) {
    if (m.pass) continue;
    board = applyMove(board, m.from, m.to).board;
  }
  return board;
}

export function capturesFrom(moves: MoveRecord[]): { han: Piece['type'][]; cho: Piece['type'][] } {
  const out = { han: [] as Piece['type'][], cho: [] as Piece['type'][] };
  for (const m of moves) if (m.captured) out[m.player].push(m.captured);
  return out;
}

const other = (p: Player): Player => (p === 'han' ? 'cho' : 'han');

interface Store extends Prefs {
  aiInfo: SearchInfo | null;
  board: BoardState;
  moves: MoveRecord[];
  currentPlayer: Player;
  selected: Position | null;
  validMoves: Position[];
  status: GameStatus;
  winner: Player | null;
  endReason: EndReason;
  mode: GameMode;
  aiThinking: boolean;
  error: string | null;

  startGame: (mode: GameMode) => void;
  resumeSaved: () => void;
  selectCell: (row: number, col: number) => void;
  passTurn: () => void;
  undoMove: () => void;
  restart: () => void;
  goToMenu: () => void;
  setPref: (patch: Partial<Prefs>) => void;
}

export const useGameStore = create<Store>()((set, get) => {
  const prefs = loadPrefs();

  function baseState(p: Prefs) {
    return {
      board: createInitialBoard(p.setupCho, p.setupHan),
      moves: [] as MoveRecord[],
      currentPlayer: 'cho' as Player,
      selected: null as Position | null,
      validMoves: [] as Position[],
      status: 'menu' as GameStatus,
      winner: null as Player | null,
      endReason: null as EndReason,
      aiThinking: false,
      aiInfo: null as SearchInfo | null,
      error: null as string | null,
    };
  }

  function save(moves: MoveRecord[]) {
    const s = get();
    persistGame(moves.length
      ? { mode: s.mode, difficulty: s.difficulty, playerSide: s.playerSide, setupCho: s.setupCho, setupHan: s.setupHan, moves }
      : null);
  }

  function commit(record: MoveRecord) {
    const s = get();
    const moves = [...s.moves, record];
    const board = record.pass ? s.board : applyMove(s.board, record.from, record.to).board;
    const next = other(record.player);
    const over = !hasLegalMoves(board, next);
    const check = !over && isInCheck(board, next);

    save(over ? [] : moves);
    set({
      board,
      moves,
      currentPlayer: next,
      selected: null,
      validMoves: [],
      status: over ? 'ended' : 'playing',
      winner: over ? record.player : null,
      endReason: over ? (isInCheck(board, next) ? 'checkmate' : 'stalemate') : null,
    });

    if (over) sfx.win();
    else if (check) sfx.alert();
    else if (record.captured) sfx.capture();
    else sfx.move();

    if (over && s.mode === 'vs-ai') {
      bumpStat('janggi', record.player === s.playerSide ? 'wins' : 'losses');
    }
    if (!over) maybeRunAi();
  }

  function maybeRunAi() {
    const s = get();
    if (s.status !== 'playing' || s.mode !== 'vs-ai') return;
    if (s.currentPlayer === s.playerSide) return;
    const aiSide = s.currentPlayer;
    set({ aiThinking: true, selected: null, validMoves: [] });
    const startedAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        const st = get();
        if (st.status !== 'playing' || !st.aiThinking) return;
        const mv = getBestMove(st.board, aiSide, st.difficulty);
        const info = getLastSearchInfo();
        const wait = Math.max(0, MIN_THINK_MS - (performance.now() - startedAt));
        setTimeout(() => {
          const cur = get();
          if (cur.status !== 'playing' || !cur.aiThinking) return;
          set({ aiThinking: false, aiInfo: info });
          if (!mv) {
            set({ status: 'ended', winner: other(aiSide), endReason: 'stalemate' });
            return;
          }
          const piece = cur.board[mv.from.row][mv.from.col];
          if (!piece) return;
          const target = cur.board[mv.to.row][mv.to.col];
          commit({
            from: mv.from, to: mv.to, player: aiSide,
            type: piece.type, captured: target ? target.type : null,
          });
        }, wait);
      } catch (e) {
        console.error('[AI Error]', e);
        set({ aiThinking: false, error: String(e) });
      }
    }));
  }

  return {
    ...baseState(prefs),
    ...prefs,
    mode: 'vs-ai' as GameMode,

    setPref: (patch) => {
      const s = get();
      const next: Prefs = {
        difficulty: patch.difficulty ?? s.difficulty,
        playerSide: patch.playerSide ?? s.playerSide,
        setupCho: patch.setupCho ?? s.setupCho,
        setupHan: patch.setupHan ?? s.setupHan,
        flipBoard: patch.flipBoard ?? s.flipBoard,
      };
      savePrefs(next);
      set(next);
      /* 대국 시작 전이면 차림 변경을 판에 바로 반영한다 */
      if (get().status === 'menu' && (patch.setupCho || patch.setupHan)) {
        set({ board: createInitialBoard(next.setupCho, next.setupHan) });
      }
    },

    startGame: (mode) => {
      const s = get();
      const p: Prefs = {
        difficulty: s.difficulty, playerSide: s.playerSide, setupCho: s.setupCho,
        setupHan: s.setupHan,
        /* 한(漢)을 잡으면 내 진영이 아래로 오도록 판을 뒤집는다 */
        flipBoard: mode === 'vs-ai' ? s.playerSide === 'han' : s.flipBoard,
      };
      savePrefs(p);
      persistGame(null);
      set({ ...baseState(p), ...p, status: 'playing', mode });
      maybeRunAi();
    },

    resumeSaved: () => {
      const g = loadSavedGame();
      if (!g) return;
      const board = replay(g.setupCho, g.setupHan, g.moves);
      const last = g.moves[g.moves.length - 1];
      const next = other(last.player);
      const over = !hasLegalMoves(board, next);
      const s = get();
      set({
        ...baseState({ ...s, ...g }),
        board,
        moves: g.moves,
        mode: g.mode,
        difficulty: g.difficulty,
        playerSide: g.playerSide,
        setupCho: g.setupCho,
        setupHan: g.setupHan,
        flipBoard: g.mode === 'vs-ai' ? g.playerSide === 'han' : s.flipBoard,
        currentPlayer: next,
        status: over ? 'ended' : 'playing',
        winner: over ? last.player : null,
        endReason: over ? 'checkmate' : null,
      });
      if (!over) maybeRunAi();
    },

    selectCell: (row, col) => {
      try {
        const s = get();
        if (s.status !== 'playing' || s.aiThinking) return;
        if (s.mode === 'vs-ai' && s.currentPlayer !== s.playerSide) return;

        const piece = s.board[row]?.[col];

        /* 이미 고른 기물의 이동 가능 위치를 눌렀다면 이동 */
        if (s.selected && s.validMoves.some(m => m.row === row && m.col === col)) {
          const moving = s.board[s.selected.row][s.selected.col]!;
          commit({
            from: s.selected, to: { row, col }, player: s.currentPlayer,
            type: moving.type, captured: piece ? piece.type : null,
          });
          return;
        }

        /* 같은 기물을 다시 누르면 선택 해제 */
        if (s.selected && s.selected.row === row && s.selected.col === col) {
          set({ selected: null, validMoves: [] });
          return;
        }

        if (piece && piece.player === s.currentPlayer) {
          set({ selected: { row, col }, validMoves: getLegalMoves(s.board, row, col) });
        } else {
          set({ selected: null, validMoves: [] });
        }
      } catch (e) {
        console.error('[selectCell Error]', e);
        set({ error: String(e) });
      }
    },

    /** 한 수 쉼 — 장군을 받고 있을 때는 쉴 수 없다. */
    passTurn: () => {
      const s = get();
      if (s.status !== 'playing' || s.aiThinking) return;
      if (s.mode === 'vs-ai' && s.currentPlayer !== s.playerSide) return;
      if (isInCheck(s.board, s.currentPlayer)) return;
      commit({
        from: { row: -1, col: -1 }, to: { row: -1, col: -1 },
        player: s.currentPlayer, type: 'general', captured: null, pass: true,
      });
    },

    undoMove: () => {
      const s = get();
      if (s.aiThinking || s.moves.length === 0) return;
      const moves = [...s.moves];
      moves.pop();
      if (s.mode === 'vs-ai' && moves.length > 0 && moves[moves.length - 1].player !== s.playerSide) {
        moves.pop();
      }
      const board = replay(s.setupCho, s.setupHan, moves);
      const last = moves[moves.length - 1];
      save(moves);
      sfx.undo();
      set({
        board,
        moves,
        currentPlayer: last ? other(last.player) : 'cho',
        selected: null,
        validMoves: [],
        status: 'playing',
        winner: null,
        endReason: null,
        error: null,
      });
    },

    restart: () => {
      const s = get();
      persistGame(null);
      set({
        board: createInitialBoard(s.setupCho, s.setupHan),
        moves: [],
        currentPlayer: 'cho',
        selected: null,
        validMoves: [],
        status: 'playing',
        winner: null,
        endReason: null,
        aiThinking: false,
        aiInfo: null,
        error: null,
      });
      maybeRunAi();
    },

    goToMenu: () => set({ status: 'menu', error: null, selected: null, validMoves: [] }),
  };
});

export const lastMoveOf = (moves: MoveRecord[]): MoveRecord | null => {
  for (let i = moves.length - 1; i >= 0; i--) if (!moves[i].pass) return moves[i];
  return null;
};
