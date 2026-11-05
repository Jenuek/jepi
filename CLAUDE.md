# JEPI — 작업 안내 (Claude가 매 세션 처음에 읽는 파일)

JEPI는 "J와 P가 함께 쓰는 여행 플래너"예요. 정적 웹앱(PWA)이고 GitHub Pages(https://jenuek.github.io/jepi/)로 배포돼요.
서버는 Supabase 프로젝트 `qjzxhcvneorbskpebvca`(동기화·친구 공유·알림·여행자 추천)예요.

**세션을 시작하면 먼저 `docs/ROADMAP.md`를 읽으세요.** 지금까지 만든 것, 다음 할 일, 정해 둔 결정이 거기 있어요.
README의 "무엇이 어디 있나" 표가 파일 지도예요.

## 사용자에 대해

- 앱 주인은 개발자가 아니에요. **한국어**로, 전문 용어 없이 결과 위주로 설명하세요. 코드 줄 번호·함수 이름 나열은 필요할 때만.
- 디자인·화면 구조가 크게 바뀌는 일은 **먼저 시안(시뮬레이션)을 보여 주고** 확인받은 뒤 반영해요. 작은 수정·버그는 바로 고쳐요.
- 실제 폰(안드로이드·아이패드 미니)과 PC 브라우저에서 써요. 터치·키보드·작은 화면을 늘 생각하세요.
- 앱 안의 모든 문구는 한국어, 친근한 존댓말("~해요"), 짧게.

## 구조와 규칙 (자세한 건 README)

- **지금은 리액트(React + TypeScript)로 옮기는 중이에요.** 계획·진행 상황은 `docs/ROADMAP.md`의 "리액트로 옮기기"에 있어요. 옮기는 동안 새 기능은 만들지 않아요(작은 버그 수정은 괜찮아요).
- 새 코드(리액트): `app/`. 화면은 `app/screens/*.tsx`에 만들고 `app/bridge.ts`의 `SCREENS`에 등록해요. 예전 코드는 `window.JEPI_UI.mount('이름', 요소, props)`로 그 화면을 그려요. 화면 속 id·class 이름은 바꾸지 않아요(자동 점검이 그 이름으로 확인해요). **예전 코드가 리액트 화면 안의 요소를 직접 고치면 안 돼요**(`textContent=`, `disabled=`, `innerHTML=` 등) — "한 번 눌렀음"·"작업 중"·"이름 고치는 중" 같은 건 상태값으로 만들어 props로 넘겨요. 옮기기 전에 그 화면을 건드리는 클릭 처리(`380-events.js` 포함)를 꼭 찾아봐요.
- 데이터(`app/data/`): 기기 저장(`storage.ts`), 서버 연결(`server.ts`), 키 암호화(`vault.ts`), 동기화 엔진(`sync.ts`), 데모 칸막이(`demo.ts`), 데이터 모양(`types.ts`). 예전 코드는 `JD`(= `window.JEPI_DATA`)로 써요. **localStorage는 `storage.ts`로만** 읽고 써요. 여행 데이터(계획·블록·♥·체크·취향 등)는 그 위의 `trip.ts`(예전 코드는 `TRIP`)로만 저장해요. 키 암호화 설정(`vault.ts`)은 바꾸면 저장된 키를 못 열어요 — 절대 바꾸지 않아요.
- 예전 코드: `src/js/NNN-*.js`는 **이름 순서대로 하나의 스크립트 범위**로 합쳐져요. 같은 `const/let`·`function` 이름을 두 파일에 만들면 빌드가 멈춰요. 연결점은 `007-panels.js`(PANELS, BLOCK_BADGES·CARD_EXTRAS·SHEET_EXTRAS — HTML 대신 조각 값, SYNC_AFTER_PUSH/PULL). 앱 시작 시 실행할 코드는 `390-boot.js`.
- 스타일은 `src/css/NN-*.css`, 화면 뼈대는 `src/html/body.html`.
- `index.html`과 `assets/`는 **빌드 결과물**이에요. 직접 고치지 말고 `npm run build`로 다시 만들어요(`vite.config.mjs` + `tools/legacy.mjs`가 조립해요).
- 디자인 언어: 여행마다 테마 색(`--theme`), 접히는 헤더(여행 제목은 명조, 날짜 제목은 굵은 고딕), 아래 고정 탭, 스타일 2종(컬러 블록 / 여행 수첩), 손글씨 메모. 새 화면도 이 언어를 따라요.

## 고칠 때마다

1. `npm install` (처음 한 번) → 고치기
2. `npm run check` = 타입 검사 + 빌드 + 자동 점검(가짜 서버로 첫 화면·데모·동기화·공유·알림·영업시간·찾기·꾸미기·사용 안내를 돌려 봐요). **`all checks passed`가 아니면 올리지 마세요.**
   - 화면을 리액트로 옮기거나 새로 만들면 `tools/checks.js`에 점검을 하나 추가해요.
   - 브라우저는 Playwright 것을 먼저 쓰고, 없으면 클라우드 작업 환경에 설치된 `/opt/pw-browsers/chromium`을 써요.
   - 브라우저를 쓸 수 없는 환경이면 최소한 `npm run build`(타입·이름·문법 검사 포함)는 통과시키고, 점검을 못 돌렸다고 사용자에게 말해요.
   - 화면을 직접 보며 고칠 때는 `npm run dev`(고치면 바로 다시 그려져요).
3. 끝나면 `docs/ROADMAP.md`(한 일·다음 할 일·결정)와 필요하면 README 표를 고쳐요.
4. 커밋 메시지는 한국어로 무엇이 바뀌었는지 한 줄.

## 배포

- `main` 브랜치의 루트가 그대로 웹사이트예요. `main`에 들어가면 1~2분 뒤 GitHub Pages에 반영돼요.
- 작업은 브랜치에서 하고, 사용자가 "배포해 줘"라고 하면 PR을 만들어 `main`에 합쳐요. 합치는 권한이 없으면 PR 링크를 주고 "GitHub에서 Merge 버튼을 눌러 주세요"라고 안내해요.
- 사용자는 앱을 완전히 닫았다 열면 새 버전을 받아요(서비스 워커는 네트워크 우선).

## 서버 (Supabase)

- 테이블·권한 변경은 `supabase/schema.sql`에 쓰고(다시 실행해도 안전하게), 사용자에게 **Supabase → SQL Editor에 붙여 넣고 Run** 하라고 안내해요. 이 저장소의 작업 환경에서는 대시보드에 직접 접근하지 않아요.
- 알림 함수는 `supabase/functions/jepi-push` (Verify JWT 꺼짐, pg_cron이 1분마다 호출).

## 절대 지킬 것 (보안)

- 앱에는 Supabase **publishable(공개용) 키만** 넣어요. service_role / secret 키는 어디에도 넣지 않아요.
- AI·지도 API 키는 저장소에 넣지 않아요. 사용자가 앱에서 넣고, 서버에는 비밀번호로 암호화한 값만 올라가요.
- 비밀번호·키를 대신 입력하거나 파일에 적지 않아요.
- 공유 링크·노트 링크에는 집 위치 같은 개인 정보가 들어가지 않게 해요. 모든 테이블은 RLS로 "본인 것" 또는 "내가 멤버인 여행 것"만 보이게 해요(여행자 추천 `jepi_recs`만 공개 읽기).
