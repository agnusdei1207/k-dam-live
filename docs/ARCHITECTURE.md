# 구조 지도

한 방향 흐름: 포털 → 수집 스크립트 → JSON 파일 → 브라우저 로더 → 화면. 아래 순서가 의존 방향이다.

| 모듈 | 책임 | 공개 인터페이스 | 근거 |
| :--- | :--- | :--- | :--- |
| `js/registry.js` | 댐 36개의 정적 정보 정본. 브라우저(전역 `KDAM_REGISTRY`)와 Node(CommonJS) 양쪽에서 같은 파일을 읽는다 | `{ BASINS, DAM_TYPES, DAMS[] }` | INTENT-0001 |
| `scripts/mywater.mjs` | 포털 클라이언트 정본. 엔드포인트·필수 헤더·재시도와 KST 관측 시각 해석(24시 = 다음 날 0시)을 한 곳에 둔다 | `call(params, { retries, timeoutMs })`, `kstStampMs(stamp)` | INTENT-0002 |
| `scripts/fetch-dam-data.mjs` | 배포 시점에 K-water 포털 5개 모드를 호출해 스냅샷·이력 JSON 을 생성. 30개 미만 댐만 채워지면 실패로 종료 | `npm run fetch` → `data/live.json`, `data/history.json` (스키마: `docs/data-pipeline.md`) | INTENT-0001 |
| `scripts/needs-update.mjs` | 신선도 게이트. 포털 기준 시각이 배포본보다 새롭거나 배포본이 3시간 이상 묵었을 때만 재수집을 허용 | `decide(portal, site, now)`, CLI → `$GITHUB_OUTPUT update=` | INTENT-0002 |
| `scripts/check-live-data.mjs` | 배포 직전 스냅샷 검증: 댐 수·코드 일치, 6시간 이내 관측, 저수율·저수량 정합 | `npm run check:data` | INTENT-0001 |
| `js/data.js` | 텔레메트리 서비스. JSON 을 레지스트리와 병합해 화면용 레코드를 만들고, 상태 판정·전국 지표(숫자)·기간별 추이 계산, 재조회 시 새 스냅샷일 때만 구독자에게 알리고 변경분 반환 | `KDAM.telemetryService.load() / loadHistory() / getTrend() / getOverviewMetrics() / updateUserLocation() / subscribe()`, `KDAM.THRESHOLDS` | INTENT-0001, 0002 |
| `js/app.js` | 표·요약 카드·티커·상세 모달·필터·정렬·위치 정렬(출처 gps/preset 저장)·CSV·테마. 데이터는 텔레메트리 서비스에서만 읽고, 행·기간 탭은 위임 리스너로 처리 | `window.appReRenderTable` (i18n 이 호출) | INTENT-0001, 0002 |
| `js/i18n.js` | 22개 언어의 UI 문구, 수계·댐 구분 라벨 조회, 댐 소재지 영문 표기 | `i18n.setLanguage / t / basin / damType / getLocationEN` | INTENT-0002 |
| `tests/` | 의존성 없는 `node:test`. 브라우저 스크립트를 vm 에서 그대로 실행해 텔레메트리 계약을, 신선도 판정을 순수 함수로 검증 | `npm test` | INTENT-0002 |
| `index.html`, `css/` | 마크업과 디자인 토큰. 데이터 문구는 넣지 않고 `--`/빈 값으로 두어 스크립트가 채운다 | — | (v1 유지) |
| `.github/workflows/deploy-pages.yml` | push 와 10분 cron 에 문법 검증 → 신선도 확인(`scripts/needs-update.mjs`) → 수집 → 데이터 검증 → Pages 배포 | GitHub Actions | INTENT-0001 |

데이터 흐름 요약: `getVers/getYongsu`(현재·전년·예년) + `getBasic`(제원) + `getHydr H`(48시간) + `getPeriod`·`getHydr D`(5년 일별) → `live.json`/`history.json` → 브라우저가 `live.json` 을 즉시, `history.json` 을 모달에서 지연 로드.
