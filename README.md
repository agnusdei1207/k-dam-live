# K-DAM LIVE 💧

<div align="center">
  <img src="favicon.svg" alt="K-DAM LIVE Logo" width="96" />
  <h1>대한민국 댐별 저수율 실시간 종합 관제 시스템</h1>
  <p>National Hydrological Observation & Real-Time Dam Water Level Telemetry Console</p>

  [![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0284c7.svg)](https://agnusdei1207.github.io/k-dam-live/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
  [![Platform Admin](https://img.shields.io/badge/UI-Codey%20Admin%20Design%20System-38bdf8.svg)](https://github.com/agnusdei1207/k-dam-live)
  [![Pure Static Edge](https://img.shields.io/badge/Stack-Pure%20HTML%2FCSS%2FJS-f59e0b.svg)](https://github.com/agnusdei1207/k-dam-live)
</div>

---

## 🌐 Live Service

👉 **[https://agnusdei1207.github.io/k-dam-live/](https://agnusdei1207.github.io/k-dam-live/)**

별도의 로그인이나 서버 설치 없이 브라우저에서 바로 전국 34개 주요 댐의 실시간 수문 데이터를 인터랙티브 어드민 콘솔 형태로 조회할 수 있습니다.

---

## ⚡ 주요 기능 (Key Features)

- **전국 34개 댐 종합 수문 관제**:
  - **한강 수계 (6개소)**: 소양강댐, 충주댐, 횡성댐, 평화의댐, 광동댐, 달방댐
  - **낙동강 수계 (14개소)**: 안동댐, 임하댐, 합천댐, 남강댐, 밀양댐, 군위댐, 김천부항댐, 영주댐, 보현산댐, 성덕댐, 영천댐, 운문댐, 사연댐, 대암댐, 선암댐, 감포댐, 가화댐
  - **금강 수계 (4개소)**: 대청댐, 용담댐, 보령댐, 부안댐
  - **영산강·섬진강 수계 (10개소)**: 주암댐, 주암조절지댐, 섬진강댐, 장흥댐, 평림댐, 수어댐, 동복댐 등
- **실시간 지표 대시보드 (8 핵심 지표)**:
  - 전국 평균 저수율 및 예년 대비 증감율
  - 전국 총 저수량 vs 총 유효저수용량 밸런스
  - 초당 실시간 총 유입량 / 총 방류량
  - 방류 중인 댐 개소 및 가뭄 대응 단계별 현황
- **인터랙티브 4대 수계 SVG 지도**:
  - 수계별 하천 유로 및 댐 위치 실시간 인터랙티브 핀
  - 저수율 및 방류 상태별 시각적 색상 코딩 (🟢 70% 이상, 🔵 50~70%, 🟠 50% 미만, 🌊 수문방류)
- **고성능 데이터 테이블 & 필터링**:
  - 수계별 탭 (한강, 낙동강, 금강, 영산·섬진강)
  - 다목적댐 / 용수전용댐 / 홍수조절용 댐 구분 필터
  - 컬럼별 즉시 정렬 (저수율, 수위, 유입량, 방류량, 저수용량)
  - 단축키 `/` 지원 실시간 댐명·소재지 검색
- **댐별 상세 제원 모달 (Inspector Drawer)**:
  - 원형 워터 게이지 애니메이션
  - 24시간 실시간 저수율(%) 변동 추이 차트
  - 유역면적, 상시만수위, 계획홍수위, 댐 높이/길이, 준공연도 상세 제원
- **Codey Admin 디자인 시스템 계승**:
  - 다크 / 라이트 테마 완벽 지원 (시스템 및 사용자 설정 저장)
  - 실시간 KST 시계 및 15초 주기 자동 갱신 카운트다운
  - 데이터 CSV 다운로드 지원

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3, ES Modules | 무의존성, 초경량, 번들러 없는 즉시 로딩 |
| **Design System** | Codey Platform Tokens | Glassmorphism 헤더, 정밀 테마 변수, 탭·모달 인터랙션 |
| **Visualization** | Pure SVG Map & Charts | 반응형 벡터 지도 및 24시간 추이 곡선 렌더링 |
| **Hosting** | GitHub Pages Static Edge | 정적 웹 호스팅으로 영구 무료 및 무중단 서빙 |
| **SEO** | Semantic HTML, OpenGraph, JSON-LD | 검색엔진 최적화 및 메타 태그 완비 |

---

## 📄 라이선스 (License)

This project is licensed under the [MIT License](LICENSE).
