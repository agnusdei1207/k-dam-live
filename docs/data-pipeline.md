# 데이터 파이프라인 (Data Pipeline)

K-DAM LIVE 화면에 표시되는 모든 수치는 K-water 물정보포털(MyWater)의 실제 관측 자료입니다.
이 문서는 자료가 어디서 오고, 어떻게 가공되어 화면까지 도달하는지를 기록합니다. 목적·제약은 `intents/00-project.md`, 모듈 경계는 `ARCHITECTURE.md`, 용어는 `GLOSSARY.md` 가 소유합니다.

> v1.x 까지의 사이트는 `js/data.js` 에 박힌 고정값에 난수를 더해 "실시간"처럼 보이게 하는 시뮬레이션이었습니다.
> v2.0 부터는 시뮬레이션 코드가 완전히 제거되었고, 아래 파이프라인이 유일한 데이터 경로입니다.

## 1. 전체 흐름

```
GitHub Actions (main push, 또는 10분마다 cron)
  └─ cron 일 때만: scripts/needs-update.mjs  →  getVers 1회 호출로 포털 기준 시각 확인,
        배포본 data/live.json 의 observedAt 보다 새 시간이 있을 때(또는 배포본이 3시간 이상 묵었을 때)만 계속
  └─ npm run fetch  →  scripts/fetch-dam-data.mjs
        ├─ POST https://www.water.or.kr/kor/realtime/sumun/ajaxProc.do  (약 90회 호출, 15초 내외)
        ├─ data/live.json     (현재 관측값 + 최근 48시간 시간별 자료, 36개 댐)
        └─ data/history.json  (최근 5년 일별 저수율, 36개 댐)
  └─ upload-pages-artifact  →  GitHub Pages 배포 (data/*.json 포함)

브라우저
  └─ js/registry.js  댐 목록·좌표·구분 (정적)
  └─ js/data.js      data/live.json 로드·병합, 10분마다 재조회 (변경분만 하이라이트)
  └─ js/map.js       한반도 외곽선(Natural Earth 1:10m, 공개 도메인)·투영·댐 점 SVG
  └─ js/app.js       지도/요약 카드/수계 요약/테이블/모달 렌더링, history.json 은 모달에서 지연 로드
```

* `data/` 디렉터리는 저장소에 커밋되지 않습니다 (`.gitignore`). 배포 때마다 새로 생성됩니다.
* 수집 스크립트가 실패하면(포털 장애 등) 워크플로가 실패하고 직전 배포본이 그대로 유지됩니다. 빈 데이터가 배포되는 일은 없습니다.
* 로컬에서 확인하려면 `npm run fetch` 후 `npm run serve` 로 정적 서버를 띄웁니다. (`file://` 로는 `fetch()` 가 동작하지 않습니다.)

## 2. 출처 및 엔드포인트

MyWater 실시간 현황 > 댐/보 수문자료 화면이 내부적으로 사용하는 AJAX 엔드포인트를 그대로 호출합니다.
인증키가 필요 없고, `Accept: application/json` 및 `X-Requested-With: XMLHttpRequest` 헤더만 요구합니다.
브라우저에서 직접 호출하면 CORS 로 차단되므로 GitHub Actions 에서 수집합니다. 호출 규칙(엔드포인트·헤더·재시도·시각 해석)은 `scripts/mywater.mjs` 한 곳에 있습니다.

| 모드 (`mode=`) | 화면 | 용도 | 비고 |
| :--- | :--- | :--- | :--- |
| `getVers` | 다목적댐 관리현황 | 21개 다목적댐 현재/전년/예년 저수율, 저수위, 전일 유입·방류량, 유효저수율 (수집하는 컬럼만 아래 표에 적었다) | `versList[]`, `ITEMn` 컬럼 |
| `getYongsu` | 용수댐 관리현황 | 14개 용수댐 동일 항목 + 총저수량 | `yongsuList[]` |
| `getBasic` | 수문자료 > 기본현황 | 댐 제원 (높이·길이·유역면적·계획홍수위·상시만수위·홍수기제한수위·저수위·총/유효/홍수조절 저수용량·형식) | `damCd`, `damGb` |
| `getHydr` | 수문자료 > 수문현황 | 시간별(`param1=H`, 최대 30일) / 일별(`D`, 최대 365일) 수위·저수량·강우·유입·총방류·저수율 | 댐별 호출 |
| `getPeriod` | 기간별 자료 | 댐군(`param2` 1 다목적 / 2 용수) 단위 일별 저수량, 365일 창 | 5개 창 × 2군 = 10회 |

### `getVers` (다목적댐) 컬럼 매핑

| ITEM | 의미 | ITEM | 의미 |
| :-- | :-- | :-- | :-- |
| ITEM0 | 댐명 | ITEM12/13/14 | 저수위 현재/전년/예년 (EL.m) |
| ITEM1/2 | 강우량 금일/전일 (mm) | ITEM19/20/21 | 저수량 현재/전년/예년 (백만㎥) |
| ITEM3/4/5 | 강우 누계 금년/전년/예년 | ITEM22/98/99 | 저수율 현재/전년/예년 (%) |
| ITEM7 | 전일 유입량 (㎥/s) | ITEM100 | 유효저수율 (%) |
| ITEM8/9 | 전일 방류량 본댐/조정지 | DAM_CD | 댐코드 |

### `getYongsu` (용수댐) 컬럼 매핑

| ITEM | 의미 | ITEM | 의미 |
| :-- | :-- | :-- | :-- |
| ITEM6 | 전일 유입량 | ITEM15 | 현재 저수량 |
| ITEM7 | 전일 방류량(전체) | ITEM16/17/18 | 저수율 현재/전년/예년 |
| ITEM12/13/14 | 저수위 현재/전년/예년 | ITEM19 | 유효저수율 |
| | | ITEM20 | 총저수량 |

### `getBasic` 컬럼 매핑

DATA1 높이(m) · DATA2 길이(m) · DATA3 정상표고 · DATA5 유역면적(㎢) · DATA6 연간용수공급량 · DATA7 저수면적 ·
DATA8 계획홍수위 · DATA9 상시만수위 · DATA10 홍수기제한수위 · DATA11 월류정표고 · DATA12 저수위 ·
DATA13 총저수용량 · DATA14 유효저수량 · DATA15 홍수조절용량 · DATA16/17 사업기간 · DATA18 댐형식

`DATA17` 은 사업기간 종료일이라 오래된 용수댐에서는 준공연도가 아닙니다(2015-11-18 로 일괄 기록). 준공연도는 `js/registry.js` 의 정적 값을 사용합니다.

### `getHydr` 행 매핑

`SDATE`(yyyymmddHH 또는 yyyymmdd) · DATA1 수위 · DATA2 저수량 · DATA4 유입량 · DATA6 총방류량 · DATA7 저수율 (DATA3 강우량은 화면에 쓰지 않아 수집하지 않는다)

## 3. 산출 파일 스키마

### `data/live.json`

```jsonc
{
  "generatedAt": "2026-09-15T09:30:12.345Z",   // 수집 시각 (UTC)
  "observedAt": "2026-09-15 18:00",            // 가장 최근 관측 시각 (KST)
  "baseDate": "2026-09-15", "baseTime": "18",  // 포털 기준 일시
  "source": { "name": "...", "url": "...", "endpoint": "..." },
  "dams": [
    {
      "id": "jwam", "code": "4007110",
      "specs":     { "damType": "E.C.R.D", "damHeight": 58, "damLength": 330, "catchmentArea": 1010,
                     "floodLevel": 110.5, "normalFullLevel": 108.5, "floodLimitLevel": 108.5, "lowWaterLevel": 85,
                     "totalStorage": 457, "effectiveStorage": 352, "floodControlStorage": 60 },
      "current":   { "observedAt": "2026-09-15 18:00", "waterLevel": 99.572, "storageVolume": 215.389,
                     "storageRate": 47.1, "inflow": 1.354, "outflow": 14.854 },
      "reference": { "rateLastYear": 78.1, "rateNormalYear": 63.4, "effectiveRate": 45.7,
                     "inflowYesterday": 4.3, "outflowYesterday": 14.4 },
      "hourly":    [ { "t": "2026-09-13 19:00", "waterLevel": 99.674, "storageVolume": 217.102,
                       "inflow": 1.368, "outflow": 15.396, "storageRate": 47.5 }, ... ]  // 48행
    }
  ]
}
```

* `current` 는 `getHydr` 의 최신 시간행이 우선이며, 없으면 `getVers/getYongsu` 스냅샷으로 대체됩니다.
* 포털에 값이 없으면 `null` 입니다. 화면은 `null` 을 `-` 로 표시하고 정렬 시 맨 아래로 보냅니다.
* 홍수조절댐(평화의댐)은 평시에 비워 두는 댐이라 저수율이 0~1% 로 정상이며, 전국·수계 평균과 예년 비교에서 제외됩니다.

### `data/history.json`

```jsonc
{
  "generatedAt": "...", "source": { ... },
  "start": "2021-09-16", "end": "2026-09-15", "days": 1825,
  "dams": { "4007110": [ 61.7, 61.5, ... ], ... }   // start 부터 하루 1개, 저수율(%) 또는 null
}
```

* 다목적·용수댐은 `getPeriod` 의 일별 저수량 ÷ `getBasic` 총저수용량 × 100 으로 계산합니다(포털 저수율 정의와 동일, 소수 1자리).
* 홍수조절댐은 `getHydr` 일별 저수율을 그대로 사용합니다.

## 4. 화면 지표 정의

| 지표 | 계산 |
| :--- | :--- |
| 저수율 | 포털 `저수율` (총저수용량 기준) |
| 예년 대비 (%p) | 현재 저수율 − 예년 저수율 (`getVers/getYongsu` 예년값) |
| 전국 평균 저수율 | Σ현재저수량 ÷ Σ총저수용량 (홍수조절댐 제외) |
| 전국 예년 대비 | 위 방식으로 계산한 현재 저수율 − 용량 가중 예년 저수율 |
| 예년보다 낮은 댐 | 예년 대비 < 0 인 댐 수 / 예년값이 있는 저수 댐 수 (홍수조절댐 제외) |
| 저수율이 가장 낮은 댐 | 저수 댐 중 현재 저수율 최솟값 |
| 수계 저수율 · 수계 예년 대비 | 수계별로 위 전국 계산을 그대로 적용 |
| 저수율 색 구간 | 0–20 · 20–40 · 40–60 · 60–80 · 80% 이상 (시각 구분일 뿐 판정이 아님), 홍수조절댐은 회색 |

사이트는 포털이 발표하지 않는 판정(가뭄 단계, 홍수 주의, 방류 상태)을 만들지 않습니다. 서로 무관한 댐의 유입·방류량 합계도 의미가 없어 표시하지 않습니다.

## 5. 댐 목록 (36개)

* 다목적댐 21: 소양강, 충주, 횡성, 안동, 임하, 합천, 남강, 밀양, 군위, 김천부항, 영주, 보현산, 성덕, 대청, 용담, 보령, 부안, 주암, 주암조절지, 섬진강, 장흥
* 용수댐 14: 광동, 달방, 영천, 안계, 운문, 감포, 대곡, 사연, 대암, 선암, 연초, 구천, 수어, 평림
* 홍수조절댐 1: 평화의댐

v1.x 목록에 있던 동복댐(광주광역시 상수도사업본부 관할)과 가화댐은 K-water 포털에 관측 자료가 없어 제외했습니다.
대신 포털이 제공하는 안계·대곡·연초·구천댐이 추가되었습니다.

## 6. 운영 시 확인 사항

* Actions 로그의 `Summarize fetched data` 단계에서 댐별 저수율·유입·방류가 출력됩니다.
* 포털이 응답 형식을 바꾸면 `MIN_DAMS_WITH_DATA`(30개) 미만이 되어 수집이 실패하고 배포가 중단됩니다. `scripts/fetch-dam-data.mjs` 의 컬럼 매핑을 이 문서와 대조해 수정하세요.
* 수동 재수집: Actions 탭에서 `Build Data & Deploy GitHub Pages` 워크플로를 `Run workflow` 로 실행합니다.
