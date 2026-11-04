# JEPI

J와 P가 함께 쓰는 여행 플래너. GitHub Pages로 배포되는 정적 웹앱(PWA)이에요.

- 폰·아이패드에서 열고 공유 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.
- 더보기 → 설정에서 로그인하면 계획, 취향, 내 장소, AI·지도 키(비밀번호로 암호화)가 기기끼리 맞춰져요.
- AI(Claude·Gemini)와 지도(Google·카카오) 키는 각자 앱 안에서 넣어요. 이 저장소에는 키가 없어요.

---

## 개발자용 안내

Claude Code로 작업할 때는 `CLAUDE.md`(작업 규칙)와 `docs/ROADMAP.md`(다음 할 일·결정)를 먼저 읽어요.

### 구조 한눈에

지금은 예전 코드(`src/`)를 리액트(`app/`)로 조금씩 옮기는 중이에요. 둘이 한 페이지에서 같이 돌아가요.

```
index.html, assets/   ← 빌드 결과물 (직접 고치지 마세요). GitHub Pages가 저장소 맨 위를 그대로 서비스해요.
sw.js, manifest…      ← 오프라인 캐시 · 푸시 알림 수신 · 홈 화면 앱 설정
app/                  ← 새 코드 (React + TypeScript)
  main.tsx            ← 시작점. 예전 코드보다 먼저 실행돼요.
  bridge.ts           ← 예전 코드가 리액트 화면을 부르는 다리 (window.JEPI_UI.mount)
  screens/*.tsx       ← 리액트로 옮긴 화면들
  data/               ← 데이터: 기기 저장·서버 연결·키 암호화·데모 칸막이·데이터 모양(types.ts)
                         예전 코드는 JD(= window.JEPI_DATA)로 써요 (src/js/001-data.js)
src/                  ← 예전 코드
  html/head.html      ← <head> (메타, 폰트, 테마 깜빡임 방지)
  html/body.html      ← 화면 뼈대 (헤더, 일정표, 장소/더보기 패널, 시트, 첫 화면)
  css/NN-*.css        ← 기능별 스타일 (이름 순서대로 붙어요)
  js/NNN-*.js         ← 기능별 코드 (이름 순서대로 하나의 스크립트로 붙어요)
supabase/
  schema.sql          ← 서버 테이블·권한(RLS)·예약 작업. SQL 편집기에서 다시 실행해도 안전해요.
  functions/jepi-push ← 알림 보내는 서버 함수 (Verify JWT 끔)
vite.config.mjs       ← 빌드 설정: src/와 app/을 합쳐 index.html + assets/를 만들어요.
tools/
  legacy.mjs          ← src/js를 하나로 붙여요. 이름 충돌·문법 오류가 있으면 빌드를 멈춰요.
  check.js, checks.js ← 자동 점검 (가짜 서버로 첫 화면·데모·동기화·공유·알림·영업시간·사용 안내를 돌려 봐요)
```

### 고치는 순서

```bash
npm install            # 처음 한 번
npm run dev            # 화면을 보면서 고치기 (고치면 바로 다시 그려져요)
npm run check          # = 타입 검사 + 빌드 + 자동 점검
```

`all checks passed`가 나오면 `index.html`, `assets/`와 바꾼 원본 파일을 올리면 돼요.

### 리액트 화면 만들기 (옮기기)

1. `app/screens/이름.tsx`에 화면을 만들고, 예전 코드에서 받을 값(props)을 타입으로 적어요.
2. `app/bridge.ts`의 `Screens`와 `SCREENS`에 등록해요.
3. 예전 코드에서 `window.JEPI_UI.mount('이름', 요소, {…})`로 그려요. 예: `src/js/387-help.js` → `app/screens/HelpPanel.tsx`
4. id·class 이름은 그대로 둬요. CSS와 자동 점검이 그 이름을 써요.
5. `tools/checks.js`에 그 화면 점검을 추가해요.
6. 예전 화면과 똑같은지: `npm run build` 후 `node tools/compare.js tools/compare/<화면>.js` (시나리오를 하나 만들어요. 예: `tools/compare/settings.js`)

### 꼭 알아야 할 규칙 하나

(예전 코드) `src/js`의 파일들은 **하나의 함수 안에 이름 순서대로** 붙어요. 그래서

- 앞 번호 파일에서 만든 것은 뒤 번호 파일에서 바로 쓸 수 있어요.
- 같은 `const`/`let` 이름을 두 파일에 만들면 앱이 멈춰요 → `tools/legacy.mjs`가 미리 잡아서 빌드를 멈춰요.
- 앱이 켜질 때 실행할 코드는 `390-boot.js`에 넣어요 (모든 파일이 준비된 뒤).
- 리액트로 옮기는 동안 새 기능은 만들지 않아요. 예전 코드를 고칠 때는 아래 연결점을 써요.

| 연결점 (`007-panels.js`) | 쓰는 법 |
|---|---|
| `PANELS.name={render(){…}}` | 더보기 아래 새 화면. `body.html`에 `<div id="side-name" hidden>`을 두고, 버튼에 `data-tab="name"` |
| `BLOCK_BADGES` / `CARD_EXTRAS` / `SHEET_EXTRAS` | 일정 블록·장소 카드·블록 상세 시트에 작은 표시 추가. HTML이 아니라 조각 값을 돌려줘요(`{k:'badge',…}` 등, 종류는 `app/screens/Extras.tsx`). 설정 화면 섹션은 `SettingsScreen.tsx`에 리액트로 |
| `SYNC_AFTER_PUSH` / `SYNC_AFTER_PULL` | 계정 동기화 직후에 할 일 |

### 무엇이 어디 있나

| 하고 싶은 일 | 파일 |
|---|---|
| 여행 데이터 저장 (계획 목록·계획 사본·일정 블록·♥·체크·취향 키워드), 저장 이름과 모양 | `app/data/trip.ts` (예전 코드는 `TRIP`) |
| 첫 화면(새 여행·로그인·데모), 데모 시작/끝 | 화면 `app/screens/Welcome.tsx` (리액트), 동작 `381-welcome-demo.js`, 데모 칸막이 `app/data/demo.ts`, 데모 일정 `066-demo-osaka.js` |
| 일정표 그리기 / 장소 탭 카드·필터 | `340-render.js` / 화면 `app/screens/Tray.tsx` (리액트, 카드에 넣을 값은 `340-render.js`의 `cardInfo`) |
| 직접 블록 만들기 / 예약 도우미 / 계획 메뉴 / 여행 단계 띠 | `app/screens/CustomSheet.tsx` (`040-manual-blocks.js`, 같은 장소 제안 `388-dedup.js`) / `HelperBody.tsx` (`100-booking.js`·`150-lodging.js`) / `PlanMenu.tsx` (`300-intro-header.js`) / `Phase.tsx` (`250-phase-strip.js`) |
| 일정표 시트 (블록 누름·빈 시간 누름) / P모드 보드게임판 | 화면 `app/screens/BlockSheet.tsx` / `PView.tsx` (리액트), 값은 `350-actions.js`(openSheet·altsInfo)·`080-todos.js`(marksInfo)·`340-render.js`(openFill) / `170-quick-start-pview.js`, 모양 `src/css/19-pmode.css` |
| 일정표 본체 (시간 줄·블록·이동·권역 띠·일몰 선) | 화면 `app/screens/DayGrid.tsx` (리액트), 값은 `340-render.js`의 renderTimeline, 끌어다 놓기 `380-events.js` |
| 일정표 위쪽 (날짜 버튼·요약 줄·동선·예산) | 화면 `app/screens/DayTop.tsx` (리액트), 값은 `340-render.js`(renderDays·renderBudget·renderRoute)·`382-tidy.js`(요약 줄) |
| 🎲 DICE 시트, 지도 아래 카드 | 화면 `app/screens/Dice.tsx` (리액트), 값은 `280-dice-eat.js`(뭐 먹지·diceMount)·`290-dice-do.js`(뭐 하지)·`160-modes-roll.js`(일정 빈 시간)·`210-map.js`(지도는 Leaflet 그대로) |
| 준비하기 (일정 경고·준비할 것·이 시기 여행 팁·초기화) | 화면 `app/screens/Checks.tsx` (리액트), 값은 `340-render.js`의 `renderChecks`, 시즌 팁 `110-season.js` |
| 일정 화면 요약 줄(이동·비용·확인할 것·빈 시간) | `382-tidy.js` |
| 장소 찾기 화면 (모든 "찾기" 버튼이 여기로) | 화면 `app/screens/FindSheet.tsx` (리액트), 동작 `385-find.js` |
| 같은 장소 묶기, 직접 추가할 때 기존 장소 제안 | `388-dedup.js` (장소 탭의 카드는 `Tray.tsx`) |
| 날짜별 제목 바꾸기 | `389-titles.js` |
| 여행 꾸미기(테마 색·커버·스타일·손글씨 글꼴), 접히는 헤더, 아래 탭 | 꾸미기 시트 `app/screens/LookSheet.tsx` (리액트), 동작 `389a-look.js`, 스타일 `17-look.css` |
| 누를 때 반응(모든 버튼) | `18-press.css` |
| 손글씨 메모 (일정 블록별·날짜별) | `389b-memo.js` (블록 시트의 메모 칸은 `app/screens/Extras.tsx`) |
| 여행 노트 보기 (PDF 저장·링크) | 화면 `app/screens/Notebook.tsx` (리액트), 값 `389c-notebook.js` |
| 👍 모든 여행자의 추천 (서버 `jepi_recs`), 👍 많은 순 | `070-shared-recs.js` |
| 블록 누르면 나오는 시트, 옮기기·길이 | `350-actions.js` |
| 경고 계산(영업시간·이동시간) | `330-helpers.js` (`analyze`) |
| 이동 시간·경로 (해외 Google, 국내는 거리로 어림 + 카카오맵 연결) | `200-routes.js` |
| 영업시간 확인 (Google Places, 월 900곳 한도) | `383-hours.js` |
| 지도 | `210-map.js` |
| AI 연결·모델 선택 | `190-keys-ai-router.js`, 실제 호출 `360-ai.js`, 채팅 `050-chat.js` (화면 `app/screens/ChatLog.tsx`), 빈 시간 추천 상자 `app/screens/AiBox.tsx` |
| 🎲 뭐 먹지 / 뭐 하지 | `280-dice-eat.js`, `290-dice-do.js` |
| 내 계획 목록, 새 계획 | 화면 `app/screens/PlansScreen.tsx` (리액트), 동작 `180-plans.js` |
| 로그인·기기 간 동기화·키 암호화 | 로그인 화면 `310-sync.js`, 무엇을 보내고 어떻게 합칠지 `app/data/sync.ts`, 서버와 대화 `app/data/server.ts`, 암호화 `app/data/vault.ts` |
| 기기에 저장 (localStorage) | `app/data/storage.ts` (여기로만 읽고 써요) |
| 친구와 함께 (초대·합치기·가고 싶어요) | 화면 `app/screens/FriendsPanel.tsx` (리액트), 서버 주고받기 `app/data/trips.ts`, 합치기 규칙 `app/data/merge.ts`, 화면 쪽 동작 `384-trips.js` |
| 알림 (일정별 🔔, 서버로 예약) | 화면 `app/screens/NotifyPanel.tsx` (리액트), 동작 `386-notify.js`, 서버 `supabase/functions/jepi-push` |
| 더보기 메뉴 / 설정 / 사용 안내 | `app/screens/MoreMenu.tsx` (리액트, 숫자는 `220-more-menu.js`) / `app/screens/SettingsScreen.tsx`+`SyncSection`·`MyPlacesSection`·`AiKeysSection` (리액트, 값과 동작은 `230-settings.js`·`310-sync.js`·`270-my-places.js`·`250-phase-strip.js`) / `app/screens/HelpPanel.tsx` (리액트) |
| 더보기 → 이번 여행 (줄 목록과 입력 폼) | 줄 `app/screens/MeRows.tsx`, 폼 `app/screens/TripForms.tsx` (리액트: 누구와·예약 상태·기간·오가는 길·출발지·숙소·예약한 일정·예산). 폼에 넣을 값은 `030-forms.js`·`130-style-budget.js`의 `part…`, 줄 목록은 `220-more-menu.js`. 여행지·하루 코스 폼도 리액트 |
| 처음 설정 (#onb 안의 본문) | 화면 `app/screens/OnbBody.tsx`·`OnbTalk.tsx`(이야기하며 정하기, 대화는 `140-direction-chat.js`)·`OnbFinder.tsx`(여행지 추천, AI는 `120-destination-finder.js`) (리액트), 넣을 값 `030-forms.js`의 ONB·`partQuick`·`partJP`, 틀은 `body.html` |
| 예전 코드가 바꾸는 안내 줄·버튼 (준비하는 중…) | `app/ui/live.tsx` (LiveLine·LiveButton·LiveChip), 예전 쪽 도우미 `060-destination-pack.js`의 setSt·progStart·progStop·setBusy |
| 취향 탭 → 어떤 여행을 원하나요 (속도·아침·여행 스타일 더) | 화면 `app/screens/TasteStyle.tsx` (리액트), 값은 `220-more-menu.js`의 `renderTasteStyle`, 스타일 항목 `130-style-budget.js`(STYLE_ROWS) |

### 서버 (Supabase)

- 앱에는 공개용(publishable) 키만 들어 있어요. 데이터는 테이블마다 RLS로 "본인 것" 또는 "내가 멤버인 여행 것"만 읽고 쓸 수 있어요.
- 테이블을 바꿨으면 `supabase/schema.sql`도 같이 고치고 SQL 편집기에서 다시 실행해요.
- 알림: 앱이 `jepi_alerts`에 "언제 무엇을 보낼지"를 써 두면, `pg_cron`이 1분마다 `jepi-push`를 불러 때가 된 알림을 보내요. 알림용 키(VAPID)는 함수가 처음 실행될 때 만들어 `jepi_secrets`에 둬요.
