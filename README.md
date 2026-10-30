# JEPI

J와 P가 함께 쓰는 여행 플래너. GitHub Pages로 배포되는 정적 웹앱(PWA)이에요.

- 폰·아이패드에서 열고 공유 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.
- 더보기 → 설정에서 로그인하면 계획, 취향, 내 장소, AI·지도 키(비밀번호로 암호화)가 기기끼리 맞춰져요.
- AI(Claude·Gemini)와 지도(Google·카카오) 키는 각자 앱 안에서 넣어요. 이 저장소에는 키가 없어요.

---

## 개발자용 안내

### 구조 한눈에

```
index.html            ← 빌드 결과물 (직접 고치지 마세요). GitHub Pages가 이 파일을 그대로 서비스해요.
sw.js, manifest…      ← 오프라인 캐시 · 푸시 알림 수신 · 홈 화면 앱 설정
src/
  html/head.html      ← <head> (메타, 폰트, 테마 깜빡임 방지)
  html/body.html      ← 화면 뼈대 (헤더, 일정표, 장소/더보기 패널, 시트, 첫 화면)
  html/tail.html      ← 닫는 태그
  css/NN-*.css        ← 기능별 스타일 (이름 순서대로 붙어요)
  js/NNN-*.js         ← 기능별 코드 (이름 순서대로 하나의 스크립트로 붙어요)
supabase/
  schema.sql          ← 서버 테이블·권한(RLS)·예약 작업. SQL 편집기에서 다시 실행해도 안전해요.
  functions/jepi-push ← 알림 보내는 서버 함수 (Verify JWT 끔)
tools/
  build.py            ← src → index.html. 이름 충돌·문법 오류가 있으면 빌드를 멈춰요.
  check.js, checks.js ← 자동 점검 (가짜 서버로 첫 화면·데모·동기화·공유·알림·영업시간을 돌려 봐요)
```

### 고치는 순서

```bash
npm install            # playwright, leaflet (점검용, 한 번만)
npm run check          # = python3 tools/build.py && node tools/check.js
```

`all checks passed`가 나오면 `index.html`(과 바꾼 `src/` 파일)을 올리면 돼요.

### 꼭 알아야 할 규칙 하나

`src/js`의 파일들은 **하나의 함수 안에 이름 순서대로** 붙어요. 그래서

- 앞 번호 파일에서 만든 것은 뒤 번호 파일에서 바로 쓸 수 있어요.
- 같은 `const`/`let` 이름을 두 파일에 만들면 앱이 멈춰요 → `build.py`가 미리 잡아서 빌드를 멈춰요.
- 앱이 켜질 때 실행할 코드는 `390-boot.js`에 넣어요 (모든 파일이 준비된 뒤).
- 새 기능은 뒤쪽 번호(381~389)에 파일 하나로 추가하고, 아래 연결점만 써요. 기존 파일을 고칠 일이 거의 없어요.

| 연결점 (`007-panels.js`) | 쓰는 법 |
|---|---|
| `PANELS.name={render(){…}}` | 더보기 아래 새 화면. `body.html`에 `<div id="side-name" hidden>`을 두고, 버튼에 `data-tab="name"` |
| `SETTINGS_EXTRA.push(()=>html)` | 설정 화면에 섹션 추가 |
| `BLOCK_BADGES` / `CARD_EXTRAS` / `SHEET_EXTRAS` | 일정 블록·장소 카드·블록 상세 시트에 작은 표시 추가 |
| `SYNC_AFTER_PUSH` / `SYNC_AFTER_PULL` | 계정 동기화 직후에 할 일 |

### 무엇이 어디 있나

| 하고 싶은 일 | 파일 |
|---|---|
| 첫 화면(새 여행·로그인·데모), 데모 시작/끝 | `381-welcome-demo.js`, 데모 격리 `005-demo-guard.js`, 데모 일정 `066-demo-osaka.js` |
| 일정표 그리기, 장소 카드 | `340-render.js` |
| 일정 화면 요약 줄(이동·비용·확인할 것·빈 시간) | `382-tidy.js` |
| 장소 찾기 화면 (모든 "찾기" 버튼이 여기로) | `385-find.js` |
| 같은 장소 묶기, 직접 추가할 때 기존 장소 제안 | `388-dedup.js` |
| 날짜별 제목 바꾸기 | `389-titles.js` |
| 여행 꾸미기(테마 색·커버·스타일·손글씨 글꼴), 접히는 헤더, 아래 탭 | `389a-look.js`, 스타일 `17-look.css` |
| 손글씨 메모 (일정 블록별·날짜별) | `389b-memo.js` |
| 여행 노트 보기 (PDF 저장·링크) | `389c-notebook.js` |
| 👍 모든 여행자의 추천 (서버 `jepi_recs`), 👍 많은 순 | `070-shared-recs.js` |
| 블록 누르면 나오는 시트, 옮기기·길이 | `350-actions.js` |
| 경고 계산(영업시간·이동시간) | `330-helpers.js` (`analyze`) |
| 이동 시간·경로 (Google/카카오) | `200-routes.js` |
| 영업시간 확인 (Google Places, 월 900곳 한도) | `383-hours.js` |
| 지도 | `210-map.js` |
| AI 연결·모델 선택 | `190-keys-ai-router.js`, 실제 호출 `360-ai.js`, 채팅 `050-chat.js` |
| 🎲 뭐 먹지 / 뭐 하지 | `280-dice-eat.js`, `290-dice-do.js` |
| 내 계획 목록, 새 계획 | `180-plans.js` |
| 로그인·기기 간 동기화·키 암호화 | `310-sync.js` |
| 친구와 함께 (초대·합치기·가고 싶어요) | `384-trips.js` |
| 알림 (일정별 🔔, 서버로 예약) | `386-notify.js`, 서버 `supabase/functions/jepi-push` |
| 더보기 메뉴 / 설정 / 사용 안내 | `220-more-menu.js` / `230-settings.js` / `387-help.js` |

### 서버 (Supabase)

- 앱에는 공개용(publishable) 키만 들어 있어요. 데이터는 테이블마다 RLS로 "본인 것" 또는 "내가 멤버인 여행 것"만 읽고 쓸 수 있어요.
- 테이블을 바꿨으면 `supabase/schema.sql`도 같이 고치고 SQL 편집기에서 다시 실행해요.
- 알림: 앱이 `jepi_alerts`에 "언제 무엇을 보낼지"를 써 두면, `pg_cron`이 1분마다 `jepi-push`를 불러 때가 된 알림을 보내요. 알림용 키(VAPID)는 함수가 처음 실행될 때 만들어 `jepi_secrets`에 둬요.
