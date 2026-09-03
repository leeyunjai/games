# 오목 (Gomoku)

브라우저에서 바로 즐기는 오목 — AI 대전 · 2인 로컬 · 서버 없음

## 게임 모드

- **AI 대전** — 내 돌(흑/백)을 고르고 난이도 3단계 선택
- **2인 대국** — 로컬에서 번갈아 착수

## 난이도

| 레벨 | 알고리즘 | 탐색 깊이 |
|------|----------|----------|
| 쉬움 | 즉승/즉방 + 상위 후보 무작위 | depth 1 |
| 중간 | Minimax + Alpha-Beta (무브 오더링) | depth 2 |
| 어려움 | Minimax + Alpha-Beta (무브 오더링) | depth 4 |

세 난이도 모두 한 수로 이기는 자리와 상대의 즉승 자리를 먼저 확인합니다.
평가 함수는 열린3·열린4 등 양끝 개방 여부를 반영하며, 탐색 전에 후보 수를
가치 순으로 정렬해 폭을 줄입니다. 어려움 난이도의 1수 계산 시간은 보통 100ms 이하입니다.

## 조작

| 입력 | 동작 |
|------|------|
| 클릭 / 탭 | 착수 (교차점에서 많이 벗어난 입력은 무시) |
| 마우스 이동 | 착수 미리보기(고스트 돌) |
| 방향키 | 커서 이동 |
| `Enter` / `Space` | 커서 위치에 착수 |
| `U` | 무르기 (AI 대전은 2수 되돌림) |
| `N` | 새 대국 |
| `Esc` | 메뉴로 |

## 기능

- 15×15 바둑판, 화점(星) 및 좌표(A~O / 1~15) 표시 · 좌표 토글
- 마지막 착수 위치 표시, 승리 5목 라인 하이라이트
- 결과 오버레이 — 다시 하기 / 한 수 무르기 / 메뉴
- 무르기 (수순 로그 기반), 무승부(판 가득 참) 판정
- 진행 중 대국 자동 저장 → 새로고침 후 **이어하기**
- 난이도 · 내 돌 색 · 효과음 · 좌표 표시 설정 저장 (localStorage)
- 착수/무르기/승리 효과음 (WebAudio, 토글 가능)
- 키보드 조작 및 포커스 링, `prefers-reduced-motion` 대응
- 가로로 넓은 화면에서는 보드 옆에 정보 패널 배치
- 모바일 터치 지원 · 100% 오프라인 실행

## 기술 스택

- React 18 + TypeScript
- Zustand (상태 관리)
- Tailwind CSS
- Vite

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포 (gh-pages 브랜치)

이 프로젝트는 `vite.config.ts`에서 프로덕션 `base`를 `./`로 설정해, 저장소 이름이 달라도 정적 파일 경로가 깨지지 않게 구성했습니다.

1. GitHub 저장소의 **Settings → Pages**에서 Source를 **Deploy from a branch**로 선택
2. Branch를 **gh-pages / (root)** 로 지정
3. 기본 브랜치(`main`/`master`) 또는 작업 브랜치(`work`)에 푸시하면 GitHub Actions가 자동 빌드 후 `gh-pages` 브랜치에 배포

직접 수동 배포(빌드 후 gh-pages 브랜치 업로드):

```bash
npm install
npm run deploy
```

`npm run deploy`는 내부적으로 `npm run build`를 먼저 실행한 뒤, `dist` 결과물을 `gh-pages` 브랜치로 푸시합니다.

### 배포 후 화면이 안 보일 때

- GitHub Actions 탭에서 `Deploy to GitHub Pages` 워크플로우가 성공했는지 먼저 확인
- 브라우저 강력 새로고침(Windows/Linux: `Ctrl+Shift+R`, macOS: `Cmd+Shift+R`)으로 캐시 제거
- Pages 설정이 반드시 `gh-pages / root`인지 확인
