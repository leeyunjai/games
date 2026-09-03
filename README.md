# games

브라우저에서 바로 실행되는 게임 모음 — **오목 · 장기 · 스도쿠 · 테트리스 · 리버시**

서버도 계정도 없습니다. 진행 상황과 기록은 브라우저(localStorage)에만 저장되고,
한 번 열어 본 뒤에는 네트워크 없이도 실행됩니다(PWA).

```
/                       게임 네비게이터(허브)
/games/omok/            오목
/games/janggi/          장기
/games/sudoku/          스도쿠
/games/tetris/          테트리스
/games/reversi/         리버시
```

## 게임

| 게임 | 특징 | AI |
|------|------|-----|
| 오목 | 15×15, 좌표 표시, 착수 미리보기, 승리 라인 강조 | 즉승/즉방 + 열린형태 평가, 반복 심화(최대 10수, 1.6초) |
| 장기 | 차림 4종 선택, 진영 선택, 점수제(한 덤 1.5), 기보 | MVV-LVA 정렬 + 정지탐색, 반복 심화(최대 5수, 2.5초) |
| 스도쿠 | 유일해 보장 생성, 메모·자동메모·되돌리기·힌트, 실수 제한 | — |
| 테트리스 | SRS 회전 + 월킥, 7-bag, 홀드, 고스트, 락 딜레이, T-스핀/백투백/콤보 | — |
| 리버시 | 착수 가능 위치 표시, 모서리·기동력·확정석 평가, 종반 완전탐색 | 최대 9수 + 종반 16칸 완전탐색(2.5초) |

모든 게임에 **튜토리얼(첫 방문 자동 · 이후 `?` 키)** 과 **서사**가 있고,
진행 중인 대국은 자동 저장되어 허브에서 “이어하기”로 돌아갈 수 있습니다.

## 설계

모바일 퍼스트로 만들었습니다. 기본 레이아웃이 세로 화면 기준이고, 넓은 화면에서 사이드 패널이 열립니다.
터치 목표는 최소 44~52px, 하단 조작부는 `env(safe-area-inset-bottom)`을 반영합니다.

게임끼리 공유하는 코드는 `src/shared/`(공통 레이어)에 모여 있습니다.

| 모듈 | 역할 |
|------|------|
| `registry.ts` | 게임 목록·메타데이터·서사. 허브와 각 게임이 같은 정의를 참조 |
| `storage.ts` | `games:<gameId>:<key>` 네임스페이스 localStorage 래퍼 (저장 실패해도 게임은 계속 동작) |
| `progress.ts` | “이어하기” 요약 — 허브 카드에 표시 |
| `records.ts` | 최고 기록 (점수형/시간형 모두 지원) |
| `stats.ts` | AI 대전 전적 |
| `prefs.ts` | 전역 설정(효과음) — 모든 게임이 공유 |
| `sound.ts` | WebAudio 합성 효과음. 오디오 파일 없음 |
| `tutorial.ts` | 튜토리얼 자료형 + 최초 1회 자동 표시 여부 |
| `react/GameShell.tsx` | 공통 상단바(허브 링크·제목·도움말·효과음) + 튜토리얼 |
| `react/useKeys.ts` | 전역 단축키 |
| `dom/shell.ts`, `dom/tutorial.ts` | React를 쓰지 않는 게임(스도쿠)용 같은 기능 |
| `pwa.ts` | 서비스 워커 등록 |

게임을 새로 추가하는 방법은 [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md),
외부 라이브러리(MediaPipe 등) 반입 규칙은 [docs/THIRD_PARTY_ASSETS.md](docs/THIRD_PARTY_ASSETS.md)를 보세요.

## 개발

```bash
npm install
npm run dev        # 개발 서버 (허브: /, 게임: /games/<id>/)
npm test           # 규칙 엔진 테스트 (vitest)
npm run typecheck
npm run build      # dist/ 생성 (허브 + 게임 5개 + 서비스 워커)
npm run preview
```

## 배포

`main`에 푸시하면 GitHub Actions가 빌드해 `gh-pages` 브랜치로 배포합니다.
`base`가 상대 경로(`./`)라서 저장소 이름이나 배포 경로가 바뀌어도 그대로 동작합니다.

## 오프라인

- 서비스 워커가 빌드 산출물 전체를 미리 캐시합니다(`vite.config.ts`의 `pwaPlugin`).
- 두 번째 방문부터는 네트워크 없이 실행되고, 홈 화면에 설치하면 앱처럼 열립니다.
- 외부 CDN을 쓰지 않습니다. 폰트·아이콘·효과음까지 전부 저장소 안에 있습니다.
