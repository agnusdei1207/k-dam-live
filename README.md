# K-DAM LIVE 💧

<div align="center">
  <img src="favicon.svg" alt="K-DAM LIVE Logo" width="80" />
  <h1>대한민국 댐별 저수율 실시간 현황</h1>
  <p>National Hydrological Observation & Real-Time Dam Water Level Telemetry Console</p>

  [![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0284c7.svg)](https://agnusdei1207.github.io/k-dam-live/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
  [![UI Style](https://img.shields.io/badge/UI-shadcn%20%2F%20Geist%20Minimalist-38bdf8.svg)](https://github.com/agnusdei1207/k-dam-live)
  [![Pure Static Edge](https://img.shields.io/badge/Stack-Pure%20HTML%2FCSS%2FJS-f59e0b.svg)](https://github.com/agnusdei1207/k-dam-live)
</div>

---

## 🌐 Live Service

👉 **[https://agnusdei1207.github.io/k-dam-live/](https://agnusdei1207.github.io/k-dam-live/)**

별도의 로그인이나 설치 없이 브라우저에서 대한민국 34개 주요 다목적댐 및 용수전용댐의 실시간 수위, 저수율, 유입량, 방류량 데이터를 즉시 조회할 수 있는 미니멀 관측 콘솔입니다.

---

## ⚡ 주요 기능 (Key Features)

- **전국 34개 댐 종합 수문 데이터**:
  - **한강 수계 (6개소)**: 소양강댐, 충주댐, 횡성댐, 평화의댐, 광동댐, 달방댐
  - **낙동강 수계 (14개소)**: 안동댐, 임하댐, 합천댐, 남강댐, 밀양댐, 군위댐, 김천부항댐, 영주댐, 보현산댐, 성덕댐, 영천댐, 운문댐, 사연댐, 대암댐, 선암댐, 감포댐, 가화댐
  - **금강 수계 (4개소)**: 대청댐, 용담댐, 보령댐, 부안댐
  - **영산강·섬진강 수계 (10개소)**: 주암댐, 주암조절지댐, 섬진강댐, 장흥댐, 평림댐, 수어댐, 동복댐 등
- **핵심 요약 지표 (4대 메트릭)**:
  - 전국 평균 저수율 및 예년 대비 증감율
  - 전국 총 저수량 vs 총 유효저수용량 밸런스
  - 초당 실시간 총 유입량 / 총 방류량
  - 수문 방류 중인 댐 및 가뭄 주의 댐 현황
- **고밀도 데이터 테이블 & 필터링**:
  - 4대 수계 탭 (한강, 낙동강, 금강, 영산·섬진강)
  - 다목적댐 / 용수전용댐 / 홍수조절용 댐 구분 필터
  - 수문 상태별 필터 (수문방류, 가뭄주의, 정상수위)
  - 컬럼별 즉시 정렬 (저수율, 수위, 유입량, 방류량, 저수용량)
  - 실시간 댐명·소재지 검색
- **댐별 상세 제원 & 24시간 변동 추이 모달**:
  - 테이블 행 클릭 시 부드러운 애니메이션 모달 오픈
  - 최근 24시간 저수율(%) 변동 추이 SVG 벡터 차트
  - 계획홍수위, 상시만수위, 유역면적, 댐 높이/길이, 준공연도 상세 제원
- **자동 동기화 및 엑셀 호환 CSV 내보내기**:
  - 1시간 주기 백그라운드 자동 갱신 및 최신 데이터 기준 시각 표시
  - Excel 한글 깨짐 방지(UTF-8 BOM) 지원 관측 데이터 CSV 다운로드

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3, ES6+ | 무의존성, 초경량, 번들러 없는 즉시 로딩 |
| **Design System** | Minimalist Tokens (shadcn / Geist) | 고밀도 테이블, 정밀 테마 토큰, 일관된 모션 커브 |
| **Data Viz** | Pure SVG Vector Charts | 최근 24시간 저수율 변동 곡선 및 그라데이션 차트 |
| **Hosting** | GitHub Pages Static Edge | 정적 웹 호스팅으로 영구 무료 및 무중단 서빙 |
| **SEO** | Semantic HTML, OpenGraph, JSON-LD | 검색엔진 최적화 및 메타 태그 완비 |

---

## 📄 라이선스 (License)

This project is licensed under the [MIT License](LICENSE).
