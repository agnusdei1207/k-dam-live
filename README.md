# K-DAM LIVE 💧

<div align="center">
  <img src="favicon.svg" alt="K-DAM LIVE Logo" width="80" />
  <h1>대한민국 댐별 저수율 현황</h1>
  <p>K-water 물정보포털 관측 자료 기반 전국 36개 댐 수문 현황 대시보드</p>

  [![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0284c7.svg)](https://agnusdei1207.github.io/k-dam-live/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
  [![Data: K-water MyWater](https://img.shields.io/badge/Data-K--water%20MyWater-1d4ed8.svg)](https://www.water.or.kr/kor/realtime/sumun/index.do?mode=vers&menuId=13_91_93_96)
  [![Pure Static Edge](https://img.shields.io/badge/Stack-Pure%20HTML%2FCSS%2FJS-f59e0b.svg)](https://github.com/agnusdei1207/k-dam-live)
</div>

---

## 🌐 Live Service

👉 [https://agnusdei1207.github.io/k-dam-live/](https://agnusdei1207.github.io/k-dam-live/)

로그인이나 설치 없이 브라우저에서 대한민국 36개 다목적댐·용수댐·홍수조절댐의 수위, 저수율, 유입량, 방류량과 최근 5년 저수율 추이를 조회하는 미니멀 관측 콘솔입니다.

---

## 📡 데이터 출처 (Data Source)

화면의 모든 수치는 K-water 물정보포털(MyWater) 실시간 현황 › 댐/보 수문자료의 실제 관측값입니다.

- GitHub Actions 가 매시간 포털에서 자료를 수집해 `data/live.json`(현재값 + 48시간 시간별)과 `data/history.json`(5년 일별 저수율)을 생성하고 GitHub Pages 에 함께 배포합니다.
- 브라우저는 배포된 JSON 만 읽으며, 10분마다 재조회해 값이 바뀐 셀만 하이라이트합니다.
- 헤더의 시각은 포털의 관측 시각(KST) 입니다. 시간별 자료이므로 정시 기준으로 갱신됩니다.
- 수집이 실패하면 직전 배포본이 유지되며, 빈 값은 `-` 로 표시됩니다. 임의 값이나 시뮬레이션은 없습니다.

문서: [`docs/data-pipeline.md`](docs/data-pipeline.md)(엔드포인트·컬럼 매핑·스키마·지표 정의), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)(모듈 구조), [`docs/GLOSSARY.md`](docs/GLOSSARY.md)(용어), [`docs/intents/`](docs/intents/)(프로젝트·작업 인텐트와 검증 증거).

---

## ⚡ 주요 기능 (Key Features)

- 전국 36개 댐 수문 데이터 (K-water 관할 댐 전체)
  - 한강 수계 (6): 소양강, 충주, 횡성, 평화의댐, 광동, 달방
  - 낙동강 수계 (20): 안동, 임하, 합천, 남강, 밀양, 군위, 김천부항, 영주, 보현산, 성덕, 영천, 안계, 운문, 감포, 대곡, 사연, 대암, 선암, 연초, 구천
  - 금강 수계 (4): 대청, 용담, 보령, 부안
  - 영산강·섬진강 수계 (6): 주암, 주암조절지, 섬진강, 장흥, 평림, 수어
- 핵심 요약 지표
  - 전국 평균 저수율(용량 가중) 및 예년 대비 증감
  - 전국 총 저수량 vs 총 저수용량
  - 관측 댐 시간 유입량 / 총방류량 합계, 방류 중·가뭄주의 댐 수
- 고밀도 데이터 테이블 & 필터링
  - 4대 수계 탭, 다목적댐 / 용수전용댐 / 홍수조절용 구분 필터
  - 상태 필터 (방류 중, 가뭄주의, 정상), 컬럼별 정렬, 댐명·소재지 검색
  - GPS 또는 지역 프리셋 기반 가까운 댐 순 정렬
- 댐별 상세 모달
  - 현재/전년/예년 저수율, 유효저수율, 시간 유입·총방류량, 전일 평균 유입·방류량
  - 24시간 · 30일 · 1년 · 3년 · 5년 저수율 추이 SVG 차트 (실측 자료)
  - 포털 제원: 계획홍수위, 홍수기제한수위, 홍수조절용량, 유역면적, 댐 높이/길이/형식
- CSV 내보내기: 관측시각·전년/예년 저수율·유효저수량 등 23개 컬럼, Excel 호환 UTF-8 BOM
- 22개 언어 UI, 다크/라이트 테마

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| Frontend | Vanilla HTML5, CSS3, ES6+ | 무의존성, 번들러 없는 즉시 로딩 |
| Data | Node 20 fetch script (`scripts/fetch-dam-data.mjs`) | K-water MyWater AJAX 엔드포인트 수집, 의존성 0 |
| CI/CD | GitHub Actions (push + 매시간 cron) | 수집 → 검증 → Pages 배포 |
| Design System | Minimalist Tokens (shadcn / Geist) | 고밀도 테이블, 테마 토큰, 일관된 모션 |
| Data Viz | Pure SVG | 기간별 저수율 추이 곡선 |
| Hosting | GitHub Pages | 정적 호스팅 |

---

## 🧑‍💻 로컬 실행

```bash
npm run check   # 문법 검증
npm run fetch   # data/live.json, data/history.json 생성 (약 15초)
npm run serve   # http://localhost:4173
```

`data/` 는 빌드 산출물이며 저장소에 커밋되지 않습니다.

---

## 📄 라이선스 (License)

This project is licensed under the [MIT License](LICENSE).
Observation data © K-water (한국수자원공사), 물정보포털 MyWater.
