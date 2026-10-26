# 용어집

인텐트·코드·화면·문서가 같은 말을 쓰기 위한 정본. 코드 식별자는 괄호에 병기한다.

| 용어 | 뜻 | 코드 |
| :--- | :--- | :--- |
| 댐코드 | K-water 가 댐마다 부여한 7자리 식별자. 포털의 모든 엔드포인트가 이 값으로 댐을 지정한다 | `code` (예 `4007110` 주암댐) |
| 댐 구분 | 다목적댐 · 용수전용댐 · 홍수조절용. 포털의 `damGb` 1·2·4 에 대응 | `type`, `group` |
| 수계 | 한강 · 낙동강 · 금강 · 영산·섬진강. 표의 탭 단위. 포털의 "기타" 는 사이트 기준으로 재분류 | `basin` |
| 관측 시각 | 포털이 해당 값을 관측한 KST 시각. 시간별 자료이므로 정시 | `observedAt` |
| 저수율 | 현재 저수량 ÷ 총저수용량 × 100 (%) | `storageRate` |
| 유효저수율 | 유효저수량 기준 저수율. 모달 참고값 | `effectiveRate` |
| 전년 / 예년 저수율 | 같은 날짜의 작년 값 / 다년 평균값. 포털이 제공 | `rateLastYear`, `rateNormalYear` |
| 예년 대비 | 현재 저수율 − 예년 저수율 (%p). 표의 열과 요약 카드. 전년(작년) 대비가 아니다 | `diffNormalYear` |
| 현재 수위 | 저수지 수위 (EL.m) | `currentWaterLevel` |
| 상시만수위 · 저수위 · 계획홍수위 · 홍수기제한수위 | 댐 운영 기준 수위 (EL.m). 포털 제원 | `normalFullLevel`, `lowWaterLevel`, `floodLevel`, `floodLimitLevel` |
| 총저수용량 · 유효저수량 · 홍수조절용량 | 댐 저수 용량 (백만㎥). 포털 제원 | `totalStorage`, `effectiveStorage`, `floodControlStorage` |
| 유입량 · 총방류량 | 최신 관측 시각의 시간 유입량과 총방류량 (㎥/s) | `currentInflow`, `currentOutflow` |
| 전일 유입량 · 전일 방류량 | 전날 하루 평균 (㎥/s). 모달 참고값 | `inflowYesterday`, `outflowYesterday` |
| 저수율 구간 | 지도 점·막대·차트 색에 쓰는 20%p 단위 시각 구간(0–20 · 20–40 · 40–60 · 60–80 · 80% 이상). 판정이 아니다. 홍수조절댐은 별도 회색 | `RATE_BANDS`, `rateBand()` |
| 예년보다 낮은 댐 | 예년 대비가 음수인 댐(홍수조절댐 제외). 요약 카드와 필터 | `belowNormalCount`, 필터 `BELOW` |
| 수계 저수율 | 수계에 속한 저수 댐의 Σ현재저수량 ÷ Σ총저수용량 | `getBasinMetrics()` |
| 스냅샷 | 배포 시점에 생성한 현재값 파일 | `data/live.json` |
| 이력 | 최근 5년 일별 저수율 파일. 모달에서 지연 로드 | `data/history.json` |
| 레지스트리 | 댐 36개의 정적 정보(코드·이름·수계·구분·소재지·좌표·준공연도) 정본 | `js/registry.js` |
| 텔레메트리 서비스 | 스냅샷·이력을 읽어 화면용 레코드로 합치는 브라우저 모듈 | `js/data.js` `telemetryService` |
| 포털 기준 시각 | 포털 관리현황(getVers)이 가리키는 최신 시각. 시간별 수문자료보다 먼저 넘어갈 수 있다 | `params.baseDate/baseTime`, `live.json` `baseDate/baseTime` |
| 신선도 게이트 | 예약 실행마다 포털 기준 시각과 배포본 관측 시각을 비교해 재수집 여부를 정하는 단계 | `scripts/needs-update.mjs` `decide()` |
| 위치 출처 | 저장된 위치 정렬 기준이 GPS인지, 이전 버전의 도시 프리셋인지 | `kdam_user_location.source` (`gps` / `preset`) |
