/** 허브와 각 게임이 함께 쓰는 게임 목록(메타데이터) */
export interface GameMeta {
  id: string;
  title: string;
  /** 부제 (원어/영문) */
  subtitle: string;
  emoji: string;
  /** 허브 카드에 쓰는 한 줄 설명 */
  desc: string;
  /** 조작 요약 */
  controls: string;
  /** 게임을 소개하는 짧은 서사 (2~3줄) */
  lore: string[];
  tags: string[];
  /** 카드/헤더 강조색 (CSS 색상) */
  accent: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'omok',
    title: '오목',
    subtitle: 'GOMOKU · 五目',
    emoji: '⚫',
    desc: '15×15 바둑판에서 다섯 개를 먼저 잇는 쪽이 승리. 3단계 AI와 2인 대국.',
    controls: '클릭 · 방향키 + Enter',
    tags: ['보드', 'AI 대전', '2인'],
    accent: '#d9a43c',
    lore: [
      '한 점을 놓는 데 걸리는 시간은 몇 초.',
      '그 몇 초가 열 수 뒤의 판을 통째로 바꾼다.',
      '다섯을 잇는 일은 언제나 그 전에 결정된다.',
    ],
  },
  {
    id: 'janggi',
    title: '장기',
    subtitle: 'JANGGI · 楚漢之爭',
    emoji: '🀄',
    desc: '차림 선택과 점수제를 갖춘 한국 장기. 궁·차·포·마·상 전부 구현.',
    controls: '클릭 · 방향키 + Enter',
    tags: ['보드', 'AI 대전', '2인'],
    accent: '#e05a4a',
    lore: [
      '초와 한이 강 하나를 사이에 두고 마주 선다.',
      '궁은 궁성을 떠나지 못하고, 병졸은 뒤로 돌아오지 못한다.',
      '모두가 제 자리에서 할 수 있는 일만 하며 판이 기운다.',
    ],
  },
  {
    id: 'sudoku',
    title: '스도쿠',
    subtitle: 'SUDOKU · 數獨',
    emoji: '🔢',
    desc: '유일해가 보장된 퍼즐 생성기, 메모·되돌리기·힌트·기록까지.',
    controls: '숫자키 · 방향키',
    tags: ['퍼즐', '싱글'],
    accent: '#4361ee',
    lore: [
      '빈 칸은 아홉 개의 가능성을 품고 있다.',
      '하나씩 지워 나가면 남는 것은 언제나 하나.',
      '운이 아니라 순서의 문제다.',
    ],
  },
  {
    id: 'tetris',
    title: '테트리스',
    subtitle: 'TETRIS · 落下物',
    emoji: '🧱',
    desc: 'SRS 회전과 월킥, 7-bag, 홀드, 고스트, T-스핀과 백투백 보너스까지.',
    controls: '방향키 · Space · Shift',
    tags: ['액션', '싱글', '점수'],
    accent: '#22c1a4',
    lore: [
      '한 번 내려온 조각은 되돌릴 수 없다.',
      '판에 남는 건 쌓아 올린 판단의 흔적뿐.',
      '지워지는 순간에만 자리가 생긴다.',
    ],
  },
  {
    id: 'reversi',
    title: '리버시',
    subtitle: 'REVERSI · 오델로',
    emoji: '⚪',
    desc: '착수 가능 위치 표시와 종반 완전탐색을 갖춘 8×8 오델로.',
    controls: '클릭 · 방향키 + Enter',
    tags: ['보드', 'AI 대전', '2인'],
    accent: '#7048e8',
    lore: [
      '같은 돌이 흑이 되었다가 백이 된다.',
      '많이 가진 쪽이 곧 잃을 자리가 많은 쪽이다.',
      '마지막 한 수까지 판은 누구의 것도 아니다.',
    ],
  },
];

export function gameById(id: string): GameMeta {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) throw new Error(`알 수 없는 게임: ${id}`);
  return meta;
}

/** 허브(루트)에서 게임 페이지로 가는 상대 경로 */
export const gameHref = (id: string) => `games/${id}/`;
/** 게임 페이지(games/<id>/)에서 허브로 돌아가는 상대 경로 */
export const HUB_HREF = '../../';
