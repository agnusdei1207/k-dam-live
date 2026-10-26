# 구조 지도

한 방향 흐름: 포털 → 수집 스크립트 → JSON 파일 → 브라우저 로더 → 화면. 아래 순서가 의존 방향이다.

| 모듈 | 책임 | 공개 인터페이스 | 근거 |
| :--- | :--- | :--- | :--- |
| `js/registry.js` | 댐 36개의 정적 정보 정본. 브라우저(전역 `KDAM_REGISTRY`)와 Node(CommonJS) 양쪽에서 같은 파일을 읽는다 | `{ BASINS, DAM_TYPES, DAMS[] }` | INTENT-0001 |
| `scripts/fetch-dam-data.mjs` | 배포 시점에 K-water 포털 5개 모드를 호출해 스냅샷·이력 JSON 을 생성. 30개 미만 댐만 채워지면 실패로 종료 | `npm run fetch` → `data/live.json`, `data/history.json` (스키마: `docs/data-pipeline.md`) | INTENT-0001 |
| `js/data.js` | 텔레메트리 서비스. JSON 을 레지스트리와 병합해 화면용 레코드를 만들고, 상태 판정·전국 지표·기간별 추이 계산, 10분 재조회 시 변경분 반환 | `KDAM.telemetryService.load() / loadHistory() / getTrend() / getOverviewMetrics() / updateUserLocation() / subscribe()`, `KDAM.THRESHOLDS` | INTENT-0001 |
| `js/app.js` | 표·요약 카드·티커·상세 모달·필터·정렬·GPS 정렬·CSV·테마. 데이터는 텔레메트리 서비스에서만 읽는다 | `window.appInspectDam / appCloseModal / appSwitchTrendPeriod / appReRenderTable` | INTENT-0001 |
| `js/i18n.js` | 22개 언어의 UI 문구와 댐 소재지 영문 표기. 표 헤더·탭·필터·요약 카드 라벨을 바꾼다 | `i18n.setLanguage / t / getLocationEN` | (v1 유지) |
| `index.html`, `css/` | 마크업과 디자인 토큰. 데이터 문구는 넣지 않고 `--`/빈 값으로 두어 스크립트가 채운다 | — | (v1 유지) |
| `.github/workflows/deploy-pages.yml` | push 와 10분 cron 에 문법 검증 → 신선도 확인(`scripts/needs-update.mjs`) → 수집 → 데이터 검증 → Pages 배포 | GitHub Actions | INTENT-0001 |

데이터 흐름 요약: `getVers/getYongsu`(현재·전년·예년) + `getBasic`(제원) + `getHydr H`(48시간) + `getPeriod`·`getHydr D`(5년 일별) → `live.json`/`history.json` → 브라우저가 `live.json` 을 즉시, `history.json` 을 모달에서 지연 로드.
