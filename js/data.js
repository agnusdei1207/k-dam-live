/**
 * ============================================================================
 * K-DAM LIVE — Hydrological Dataset & Real-Time Sensor Stream Engine
 * Comprehensive hydrographic data for 34 major multipurpose and water dams in Korea
 * ============================================================================
 */

export const BASINS = {
  HAN: '한강',
  NAKDONG: '낙동강',
  GEUM: '금강',
  SEOMJIN: '영산·섬진강'
};

export const DAM_TYPES = {
  MULTIPURPOSE: '다목적댐',
  WATER_SUPPLY: '용수전용댐',
  FLOOD_CONTROL: '홍수조절용'
};

/**
 * 34 Major South Korean Dams with Authentic Geographical & Hydrographic Specs
 * Coordinates mapped to SVG 540x680 canvas
 */
export const DAMS_DATABASE = [
  // ─── 1. 한강 수계 (Han River Basin) ───────────────────────────────────────
  {
    id: 'soyang',
    name: '소양강댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '강원특별자치도 춘천시 신북읍',
    mapX: 285,
    mapY: 135,
    normalFullLevel: 193.5,
    floodLevel: 198.0,
    lowWaterLevel: 150.0,
    totalStorage: 2900.0,
    effectiveStorage: 1900.0,
    catchmentArea: 2703.0,
    damHeight: 123.0,
    damLength: 530.0,
    builtYear: 1973,
    agency: 'K-water',
    baseRate: 74.2,
    baseInflow: 45.8,
    baseOutflow: 18.2,
    diffPrevYear: 4.8
  },
  {
    id: 'chungju',
    name: '충주댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '충청북도 충주시 종민동',
    mapX: 295,
    mapY: 220,
    normalFullLevel: 141.0,
    floodLevel: 145.0,
    lowWaterLevel: 110.0,
    totalStorage: 2750.0,
    effectiveStorage: 1780.0,
    catchmentArea: 6648.0,
    damHeight: 97.5,
    damLength: 464.0,
    builtYear: 1985,
    agency: 'K-water',
    baseRate: 68.5,
    baseInflow: 78.4,
    baseOutflow: 62.0,
    diffPrevYear: 2.1
  },
  {
    id: 'hoengseong',
    name: '횡성댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '강원특별자치도 횡성군 갑천면',
    mapX: 305,
    mapY: 175,
    normalFullLevel: 180.0,
    floodLevel: 182.5,
    lowWaterLevel: 150.0,
    totalStorage: 86.9,
    effectiveStorage: 73.8,
    catchmentArea: 209.0,
    damHeight: 48.5,
    damLength: 205.0,
    builtYear: 2000,
    agency: 'K-water',
    baseRate: 72.1,
    baseInflow: 6.8,
    baseOutflow: 4.2,
    diffPrevYear: 3.5
  },
  {
    id: 'peace',
    name: '평화의댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.FLOOD_CONTROL,
    location: '강원특별자치도 화천군 화천읍',
    mapX: 278,
    mapY: 90,
    normalFullLevel: 264.7,
    floodLevel: 264.7,
    lowWaterLevel: 200.0,
    totalStorage: 2630.0,
    effectiveStorage: 2630.0,
    catchmentArea: 3227.0,
    damHeight: 125.0,
    damLength: 601.0,
    builtYear: 2005,
    agency: 'K-water',
    baseRate: 15.4,
    baseInflow: 12.0,
    baseOutflow: 0.0,
    diffPrevYear: 0.0
  },
  {
    id: 'gwangdong',
    name: '광동댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '강원특별자치도 삼척시 하장면',
    mapX: 388,
    mapY: 205,
    normalFullLevel: 674.0,
    floodLevel: 676.2,
    lowWaterLevel: 647.0,
    totalStorage: 13.1,
    effectiveStorage: 11.2,
    catchmentArea: 125.0,
    damHeight: 39.5,
    damLength: 272.0,
    builtYear: 1989,
    agency: 'K-water',
    baseRate: 61.4,
    baseInflow: 1.8,
    baseOutflow: 0.9,
    diffPrevYear: -2.4
  },
  {
    id: 'dalbang',
    name: '달방댐',
    basin: BASINS.HAN,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '강원특별자치도 동해시 삼화동',
    mapX: 412,
    mapY: 185,
    normalFullLevel: 135.0,
    floodLevel: 137.5,
    lowWaterLevel: 105.0,
    totalStorage: 7.1,
    effectiveStorage: 6.2,
    catchmentArea: 48.0,
    damHeight: 54.5,
    damLength: 254.0,
    builtYear: 1988,
    agency: 'K-water',
    baseRate: 78.9,
    baseInflow: 1.2,
    baseOutflow: 0.6,
    diffPrevYear: 6.2
  },

  // ─── 2. 낙동강 수계 (Nakdong River Basin) ──────────────────────────────────
  {
    id: 'andong',
    name: '안동댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 안동시 상아동',
    mapX: 385,
    mapY: 310,
    normalFullLevel: 160.0,
    floodLevel: 161.7,
    lowWaterLevel: 130.0,
    totalStorage: 1248.0,
    effectiveStorage: 1000.0,
    catchmentArea: 1584.0,
    damHeight: 83.0,
    damLength: 612.0,
    builtYear: 1976,
    agency: 'K-water',
    baseRate: 64.8,
    baseInflow: 32.5,
    baseOutflow: 25.0,
    diffPrevYear: 1.8
  },
  {
    id: 'imha',
    name: '임하댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 안동시 임하면',
    mapX: 405,
    mapY: 325,
    normalFullLevel: 163.0,
    floodLevel: 164.7,
    lowWaterLevel: 137.0,
    totalStorage: 595.0,
    effectiveStorage: 424.0,
    catchmentArea: 1361.0,
    damHeight: 73.0,
    damLength: 515.0,
    builtYear: 1993,
    agency: 'K-water',
    baseRate: 59.2,
    baseInflow: 21.0,
    baseOutflow: 15.4,
    diffPrevYear: -1.2
  },
  {
    id: 'hapcheon',
    name: '합천댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상남도 합천군 대병면',
    mapX: 310,
    mapY: 460,
    normalFullLevel: 176.0,
    floodLevel: 179.0,
    lowWaterLevel: 140.0,
    totalStorage: 790.0,
    effectiveStorage: 560.0,
    catchmentArea: 925.0,
    damHeight: 96.0,
    damLength: 472.0,
    builtYear: 1988,
    agency: 'K-water',
    baseRate: 70.4,
    baseInflow: 28.5,
    baseOutflow: 22.0,
    diffPrevYear: 5.4
  },
  {
    id: 'namgang',
    name: '남강댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상남도 진주시 판문동',
    mapX: 315,
    mapY: 510,
    normalFullLevel: 41.0,
    floodLevel: 46.0,
    lowWaterLevel: 34.0,
    totalStorage: 309.2,
    effectiveStorage: 252.0,
    catchmentArea: 2285.0,
    damHeight: 34.0,
    damLength: 1126.0,
    builtYear: 1999,
    agency: 'K-water',
    baseRate: 54.6,
    baseInflow: 42.0,
    baseOutflow: 35.0,
    diffPrevYear: -3.8
  },
  {
    id: 'miryang',
    name: '밀양댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상남도 밀양시 단장면',
    mapX: 415,
    mapY: 485,
    normalFullLevel: 189.5,
    floodLevel: 191.0,
    lowWaterLevel: 155.0,
    totalStorage: 73.6,
    effectiveStorage: 69.8,
    catchmentArea: 107.0,
    damHeight: 89.0,
    damLength: 535.0,
    builtYear: 2001,
    agency: 'K-water',
    baseRate: 76.5,
    baseInflow: 4.5,
    baseOutflow: 2.8,
    diffPrevYear: 8.2
  },
  {
    id: 'gunwi',
    name: '군위댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '대구광역시 군위군 삼국유사면',
    mapX: 365,
    mapY: 365,
    normalFullLevel: 205.0,
    floodLevel: 208.0,
    lowWaterLevel: 165.0,
    totalStorage: 48.7,
    effectiveStorage: 40.8,
    catchmentArea: 89.0,
    damHeight: 45.0,
    damLength: 390.0,
    builtYear: 2010,
    agency: 'K-water',
    baseRate: 66.8,
    baseInflow: 3.2,
    baseOutflow: 1.8,
    diffPrevYear: 2.0
  },
  {
    id: 'buhang',
    name: '김천부항댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 김천시 부항면',
    mapX: 300,
    mapY: 375,
    normalFullLevel: 196.5,
    floodLevel: 199.5,
    lowWaterLevel: 165.0,
    totalStorage: 54.3,
    effectiveStorage: 42.6,
    catchmentArea: 82.0,
    damHeight: 64.0,
    damLength: 472.0,
    builtYear: 2013,
    agency: 'K-water',
    baseRate: 71.0,
    baseInflow: 3.8,
    baseOutflow: 2.1,
    diffPrevYear: 4.1
  },
  {
    id: 'yeongju',
    name: '영주댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 영주시 평은면',
    mapX: 375,
    mapY: 265,
    normalFullLevel: 161.0,
    floodLevel: 163.5,
    lowWaterLevel: 135.0,
    totalStorage: 181.1,
    effectiveStorage: 138.0,
    catchmentArea: 400.0,
    damHeight: 55.5,
    damLength: 400.0,
    builtYear: 2016,
    agency: 'K-water',
    baseRate: 63.5,
    baseInflow: 12.0,
    baseOutflow: 8.5,
    diffPrevYear: 1.5
  },
  {
    id: 'bohyunsan',
    name: '보현산댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 영천시 화북면',
    mapX: 425,
    mapY: 375,
    normalFullLevel: 242.0,
    floodLevel: 244.5,
    lowWaterLevel: 215.0,
    totalStorage: 22.1,
    effectiveStorage: 19.3,
    catchmentArea: 44.0,
    damHeight: 58.5,
    damLength: 250.0,
    builtYear: 2014,
    agency: 'K-water',
    baseRate: 68.2,
    baseInflow: 1.8,
    baseOutflow: 0.9,
    diffPrevYear: 3.0
  },
  {
    id: 'seongdeok',
    name: '성덕댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '경상북도 청송군 안덕면',
    mapX: 420,
    mapY: 345,
    normalFullLevel: 278.0,
    floodLevel: 280.5,
    lowWaterLevel: 240.0,
    totalStorage: 27.9,
    effectiveStorage: 24.2,
    catchmentArea: 41.0,
    damHeight: 58.5,
    damLength: 274.0,
    builtYear: 2015,
    agency: 'K-water',
    baseRate: 75.0,
    baseInflow: 2.1,
    baseOutflow: 1.1,
    diffPrevYear: 5.7
  },
  {
    id: 'yeongcheon',
    name: '영천댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '경상북도 영천시 자양면',
    mapX: 435,
    mapY: 410,
    normalFullLevel: 158.3,
    floodLevel: 160.5,
    lowWaterLevel: 130.0,
    totalStorage: 96.4,
    effectiveStorage: 81.4,
    catchmentArea: 235.0,
    damHeight: 42.0,
    damLength: 300.0,
    builtYear: 1980,
    agency: 'K-water',
    baseRate: 62.4,
    baseInflow: 5.4,
    baseOutflow: 4.2,
    diffPrevYear: -0.8
  },
  {
    id: 'unmun',
    name: '운문댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '경상북도 청도군 운문면',
    mapX: 405,
    mapY: 440,
    normalFullLevel: 150.5,
    floodLevel: 152.8,
    lowWaterLevel: 122.0,
    totalStorage: 135.0,
    effectiveStorage: 126.0,
    catchmentArea: 301.0,
    damHeight: 55.0,
    damLength: 407.0,
    builtYear: 1993,
    agency: 'K-water',
    baseRate: 73.8,
    baseInflow: 8.9,
    baseOutflow: 6.2,
    diffPrevYear: 6.5
  },
  {
    id: 'sayeon',
    name: '사연댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '울산광역시 울주군 범서읍',
    mapX: 460,
    mapY: 465,
    normalFullLevel: 60.0,
    floodLevel: 63.0,
    lowWaterLevel: 45.0,
    totalStorage: 25.0,
    effectiveStorage: 20.0,
    catchmentArea: 128.0,
    damHeight: 46.0,
    damLength: 300.0,
    builtYear: 1965,
    agency: 'K-water',
    baseRate: 58.1,
    baseInflow: 2.4,
    baseOutflow: 1.9,
    diffPrevYear: -1.5
  },
  {
    id: 'daeam',
    name: '대암댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '울산광역시 울주군 삼동면',
    mapX: 465,
    mapY: 485,
    normalFullLevel: 48.5,
    floodLevel: 51.5,
    lowWaterLevel: 32.0,
    totalStorage: 9.5,
    effectiveStorage: 8.5,
    catchmentArea: 76.0,
    damHeight: 27.0,
    damLength: 338.0,
    builtYear: 1969,
    agency: 'K-water',
    baseRate: 69.4,
    baseInflow: 1.1,
    baseOutflow: 0.8,
    diffPrevYear: 2.3
  },

  // ─── 3. 금강 수계 (Geum River Basin) ──────────────────────────────────────
  {
    id: 'daecheong',
    name: '대청댐',
    basin: BASINS.GEUM,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '대전광역시 대덕구 / 충북 청주시',
    mapX: 255,
    mapY: 315,
    normalFullLevel: 76.5,
    floodLevel: 80.0,
    lowWaterLevel: 60.0,
    totalStorage: 1490.0,
    effectiveStorage: 790.0,
    catchmentArea: 4134.0,
    damHeight: 72.0,
    damLength: 495.0,
    builtYear: 1980,
    agency: 'K-water',
    baseRate: 71.8,
    baseInflow: 64.0,
    baseOutflow: 48.0,
    diffPrevYear: 4.2
  },
  {
    id: 'yongdam',
    name: '용담댐',
    basin: BASINS.GEUM,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전북특별자치도 진안군 용담면',
    mapX: 245,
    mapY: 410,
    normalFullLevel: 265.5,
    floodLevel: 268.5,
    lowWaterLevel: 228.0,
    totalStorage: 815.0,
    effectiveStorage: 672.0,
    catchmentArea: 930.0,
    damHeight: 70.0,
    damLength: 498.0,
    builtYear: 2001,
    agency: 'K-water',
    baseRate: 67.2,
    baseInflow: 25.0,
    baseOutflow: 18.0,
    diffPrevYear: 3.1
  },
  {
    id: 'boryeong',
    name: '보령댐',
    basin: BASINS.GEUM,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '충청남도 보령시 미산면',
    mapX: 180,
    mapY: 335,
    normalFullLevel: 75.0,
    floodLevel: 76.5,
    lowWaterLevel: 50.0,
    totalStorage: 116.9,
    effectiveStorage: 108.7,
    catchmentArea: 163.0,
    damHeight: 50.0,
    damLength: 291.0,
    builtYear: 1998,
    agency: 'K-water',
    baseRate: 46.5, // 가뭄 주의
    baseInflow: 3.2,
    baseOutflow: 2.8,
    diffPrevYear: -8.4
  },
  {
    id: 'buan',
    name: '부안댐',
    basin: BASINS.GEUM,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전북특별자치도 부안군 변산면',
    mapX: 165,
    mapY: 450,
    normalFullLevel: 50.0,
    floodLevel: 52.4,
    lowWaterLevel: 30.0,
    totalStorage: 50.7,
    effectiveStorage: 42.0,
    catchmentArea: 59.0,
    damHeight: 50.0,
    damLength: 282.0,
    builtYear: 1996,
    agency: 'K-water',
    baseRate: 79.1,
    baseInflow: 2.1,
    baseOutflow: 1.2,
    diffPrevYear: 7.0
  },

  // ─── 4. 영산강·섬진강 수계 (Yeongsan & Seomjin River Basin) ───────────────
  {
    id: 'jwam',
    name: '주암댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전라남도 순천시 주암면',
    mapX: 240,
    mapY: 535,
    normalFullLevel: 108.5,
    floodLevel: 110.5,
    lowWaterLevel: 85.0,
    totalStorage: 457.0,
    effectiveStorage: 377.0,
    catchmentArea: 1010.0,
    damHeight: 57.0,
    damLength: 330.0,
    builtYear: 1991,
    agency: 'K-water',
    baseRate: 51.2,
    baseInflow: 18.5,
    baseOutflow: 16.0,
    diffPrevYear: -5.2
  },
  {
    id: 'jwam-reg',
    name: '주암조절지댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전라남도 순천시 상사면',
    mapX: 255,
    mapY: 550,
    normalFullLevel: 108.5,
    floodLevel: 110.5,
    lowWaterLevel: 85.0,
    totalStorage: 250.0,
    effectiveStorage: 200.0,
    catchmentArea: 135.0,
    damHeight: 100.0,
    damLength: 563.0,
    builtYear: 1991,
    agency: 'K-water',
    baseRate: 53.8,
    baseInflow: 8.2,
    baseOutflow: 7.0,
    diffPrevYear: -4.0
  },
  {
    id: 'seomjin',
    name: '섬진강댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전북특별자치도 임실군 강진면',
    mapX: 220,
    mapY: 470,
    normalFullLevel: 196.5,
    floodLevel: 197.7,
    lowWaterLevel: 160.0,
    totalStorage: 466.0,
    effectiveStorage: 370.0,
    catchmentArea: 763.0,
    damHeight: 64.0,
    damLength: 344.0,
    builtYear: 1965,
    agency: 'K-water',
    baseRate: 60.5,
    baseInflow: 19.4,
    baseOutflow: 15.2,
    diffPrevYear: 0.5
  },
  {
    id: 'jangheung',
    name: '장흥댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.MULTIPURPOSE,
    location: '전라남도 장흥군 유치면',
    mapX: 185,
    mapY: 580,
    normalFullLevel: 82.0,
    floodLevel: 83.5,
    lowWaterLevel: 55.0,
    totalStorage: 191.0,
    effectiveStorage: 171.0,
    catchmentArea: 193.0,
    damHeight: 53.0,
    damLength: 403.0,
    builtYear: 2006,
    agency: 'K-water',
    baseRate: 72.8,
    baseInflow: 6.5,
    baseOutflow: 4.8,
    diffPrevYear: 4.3
  },
  {
    id: 'pyeongrim',
    name: '평림댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '전라남도 장성군 삼계면',
    mapX: 165,
    mapY: 515,
    normalFullLevel: 110.0,
    floodLevel: 112.5,
    lowWaterLevel: 80.0,
    totalStorage: 8.5,
    effectiveStorage: 7.9,
    catchmentArea: 20.0,
    damHeight: 37.5,
    damLength: 260.0,
    builtYear: 2007,
    agency: 'K-water',
    baseRate: 48.0, // 가뭄 주의
    baseInflow: 0.6,
    baseOutflow: 0.5,
    diffPrevYear: -7.1
  },
  {
    id: 'suo',
    name: '수어댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '전라남도 광양시 진상면',
    mapX: 285,
    mapY: 545,
    normalFullLevel: 67.0,
    floodLevel: 69.5,
    lowWaterLevel: 45.0,
    totalStorage: 31.0,
    effectiveStorage: 28.0,
    catchmentArea: 53.0,
    damHeight: 67.0,
    damLength: 430.0,
    builtYear: 1978,
    agency: 'K-water',
    baseRate: 78.4,
    baseInflow: 2.2,
    baseOutflow: 1.5,
    diffPrevYear: 5.6
  },
  {
    id: 'dongbok',
    name: '동복댐',
    basin: BASINS.SEOMJIN,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '전라남도 화순군 이서면',
    mapX: 205,
    mapY: 530,
    normalFullLevel: 168.2,
    floodLevel: 170.0,
    lowWaterLevel: 140.0,
    totalStorage: 92.0,
    effectiveStorage: 85.0,
    catchmentArea: 187.0,
    damHeight: 44.7,
    damLength: 250.0,
    builtYear: 1985,
    agency: '광주광역시 상수도사업본부',
    baseRate: 58.7,
    baseInflow: 4.8,
    baseOutflow: 3.9,
    diffPrevYear: -2.1
  },
  {
    id: 'seonam',
    name: '선암댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '울산광역시 남구 선암동',
    mapX: 475,
    mapY: 495,
    normalFullLevel: 46.0,
    floodLevel: 48.0,
    lowWaterLevel: 30.0,
    totalStorage: 2.2,
    effectiveStorage: 1.8,
    catchmentArea: 12.0,
    damHeight: 22.0,
    damLength: 185.0,
    builtYear: 1964,
    agency: 'K-water',
    baseRate: 82.0,
    baseInflow: 0.4,
    baseOutflow: 0.2,
    diffPrevYear: 4.0
  },
  {
    id: 'gampo',
    name: '감포댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '경상북도 경주시 문무대왕면',
    mapX: 470,
    mapY: 425,
    normalFullLevel: 74.0,
    floodLevel: 76.5,
    lowWaterLevel: 50.0,
    totalStorage: 2.4,
    effectiveStorage: 2.1,
    catchmentArea: 14.0,
    damHeight: 35.0,
    damLength: 120.0,
    builtYear: 2006,
    agency: 'K-water',
    baseRate: 76.2,
    baseInflow: 0.5,
    baseOutflow: 0.3,
    diffPrevYear: 3.8
  },
  {
    id: 'gahwa',
    name: '가화댐',
    basin: BASINS.NAKDONG,
    type: DAM_TYPES.WATER_SUPPLY,
    location: '경상남도 사천시 축동면',
    mapX: 305,
    mapY: 535,
    normalFullLevel: 17.5,
    floodLevel: 19.0,
    lowWaterLevel: 10.0,
    totalStorage: 12.0,
    effectiveStorage: 10.5,
    catchmentArea: 45.0,
    damHeight: 18.0,
    damLength: 210.0,
    builtYear: 1970,
    agency: 'K-water',
    baseRate: 70.1,
    baseInflow: 1.5,
    baseOutflow: 1.0,
    diffPrevYear: 1.9
  }
];

/**
 * Real-Time Hydrological Simulation & Dynamic Data Model
 */
class HydrologicalTelemetryService {
  constructor() {
    this.currentData = this.initializeTelemetry();
    this.eventListeners = [];
    this.eventLog = [
      {
        id: 'ev-1',
        time: new Date(Date.now() - 1000 * 60 * 3),
        damId: 'chungju',
        damName: '충주댐',
        type: 'DISCHARGE',
        icon: '🌊',
        title: '충주댐 수문 방류 개방',
        detail: '초당 62.0㎥/s 발전 및 하천유지방류 정상 가동 중'
      },
      {
        id: 'ev-2',
        time: new Date(Date.now() - 1000 * 60 * 8),
        damId: 'soyang',
        damName: '소양강댐',
        type: 'INFLOW',
        icon: '📈',
        title: '소양강댐 상류 강우 유입 감지',
        detail: '유입량 45.8㎥/s 기록, 저수율 74.2% 안정 유지'
      },
      {
        id: 'ev-3',
        time: new Date(Date.now() - 1000 * 60 * 18),
        damId: 'boryeong',
        damName: '보령댐',
        type: 'DROUGHT',
        icon: '⚠️',
        title: '보령댐 가뭄 대응 [관심] 단계 진입',
        detail: '저수율 46.5%로 예년 대비 -8.4%p 하회, 금강 도수로 연계 대기'
      },
      {
        id: 'ev-4',
        time: new Date(Date.now() - 1000 * 60 * 32),
        damId: 'daecheong',
        damName: '대청댐',
        type: 'NORMAL',
        icon: '🟢',
        title: '대청댐 수위 안정화',
        detail: '현재수위 EL.73.4m (상시만수위 76.5m 대비 96%)'
      }
    ];
  }

  initializeTelemetry() {
    return DAMS_DATABASE.map((dam) => {
      // Calculate derived levels
      const rate = dam.baseRate;
      const waterLevel = (
        dam.lowWaterLevel +
        ((dam.normalFullLevel - dam.lowWaterLevel) * (rate / 100))
      ).toFixed(2);
      const storageVolume = ((dam.totalStorage * rate) / 100).toFixed(1);

      return {
        ...dam,
        storageRate: rate,
        currentWaterLevel: parseFloat(waterLevel),
        currentStorageVolume: parseFloat(storageVolume),
        currentInflow: dam.baseInflow,
        currentOutflow: dam.baseOutflow,
        status: this.classifyStatus(rate, dam.baseOutflow, parseFloat(waterLevel), dam.floodLevel),
        hourlyTrend: this.generateHourlyTrend(rate, dam.normalFullLevel, dam.lowWaterLevel)
      };
    });
  }

  classifyStatus(rate, outflow, currentLevel, floodLevel) {
    if (currentLevel >= floodLevel * 0.98) {
      return { code: 'FLOOD', label: '홍수주의 ⚠️', class: 'status-tag-flood' };
    }
    if (outflow >= 20.0) {
      return { code: 'DISCHARGE', label: '수문방류 🌊', class: 'status-tag-discharge' };
    }
    if (rate < 40.0) {
      return { code: 'DROUGHT_ALERT', label: '가뭄경계 🔴', class: 'status-tag-alert' };
    }
    if (rate < 50.0) {
      return { code: 'DROUGHT_CAUTION', label: '가뭄주의 🟡', class: 'status-tag-caution' };
    }
    if (rate < 60.0) {
      return { code: 'DROUGHT_ATTENTION', label: '가뭄관심 🔵', class: 'status-tag-caution' };
    }
    return { code: 'NORMAL', label: '정상 🟢', class: 'status-tag-normal' };
  }

  generateHourlyTrend(currentRate, normalLevel, lowLevel) {
    const trend = [];
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600 * 1000);
      const delta = (Math.sin(i / 3) * 0.4 + (Math.random() * 0.2 - 0.1)).toFixed(2);
      const rate = Math.max(10, Math.min(99, currentRate - parseFloat(delta)));
      const level = (lowLevel + ((normalLevel - lowLevel) * (rate / 100))).toFixed(2);
      trend.push({
        hour: `${time.getHours().toString().padStart(2, '0')}:00`,
        rate: parseFloat(rate.toFixed(1)),
        waterLevel: parseFloat(level)
      });
    }
    return trend;
  }

  /**
   * Periodic real-time micro updates simulating live hydrographic sensor fluctuations
   */
  simulateLiveTick() {
    this.currentData = this.currentData.map((dam) => {
      // Small fluctuation
      const inflowJitter = (Math.random() * 0.6 - 0.3).toFixed(1);
      const outflowJitter = (Math.random() * 0.4 - 0.2).toFixed(1);
      const newInflow = Math.max(0, parseFloat((dam.currentInflow + parseFloat(inflowJitter)).toFixed(1)));
      const newOutflow = Math.max(0, parseFloat((dam.currentOutflow + parseFloat(outflowJitter)).toFixed(1)));

      const rateJitter = (Math.random() * 0.08 - 0.04).toFixed(2);
      const newRate = parseFloat(Math.max(5, Math.min(99.5, dam.storageRate + parseFloat(rateJitter))).toFixed(1));

      const newLevel = parseFloat((
        dam.lowWaterLevel +
        ((dam.normalFullLevel - dam.lowWaterLevel) * (newRate / 100))
      ).toFixed(2));
      const newVolume = parseFloat(((dam.totalStorage * newRate) / 100).toFixed(1));

      return {
        ...dam,
        storageRate: newRate,
        currentWaterLevel: newLevel,
        currentStorageVolume: newVolume,
        currentInflow: newInflow,
        currentOutflow: newOutflow,
        status: this.classifyStatus(newRate, newOutflow, newLevel, dam.floodLevel)
      };
    });

    // Occasionally generate an event
    if (Math.random() > 0.65) {
      const randomDam = this.currentData[Math.floor(Math.random() * this.currentData.length)];
      const eventTypes = [
        {
          type: 'TELEMETRY',
          icon: '📡',
          title: `${randomDam.name} 실시간 수문 데이터 수신`,
          detail: `수위 ${randomDam.currentWaterLevel}m · 저수율 ${randomDam.storageRate}% 갱신 완료`
        },
        {
          type: 'DISCHARGE',
          icon: '💧',
          title: `${randomDam.name} 방류량 변동 관측`,
          detail: `현재 방류량 ${randomDam.currentOutflow}㎥/s (유입량 ${randomDam.currentInflow}㎥/s)`
        }
      ];
      const evChoice = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      this.eventLog.unshift({
        id: `ev-${Date.now()}`,
        time: new Date(),
        damId: randomDam.id,
        damName: randomDam.name,
        type: evChoice.type,
        icon: evChoice.icon,
        title: evChoice.title,
        detail: evChoice.detail
      });

      if (this.eventLog.length > 25) {
        this.eventLog.pop();
      }
    }

    this.notifySubscribers();
    return this.currentData;
  }

  getOverviewMetrics() {
    const totalDams = this.currentData.length;
    const totalStorageVolume = this.currentData.reduce((acc, d) => acc + d.currentStorageVolume, 0);
    const totalCapacity = this.currentData.reduce((acc, d) => acc + d.totalStorage, 0);
    const avgStorageRate = totalCapacity > 0 ? (totalStorageVolume / totalCapacity) * 100 : 0;

    const totalInflow = this.currentData.reduce((acc, d) => acc + d.currentInflow, 0);
    const totalOutflow = this.currentData.reduce((acc, d) => acc + d.currentOutflow, 0);
    const dischargingCount = this.currentData.filter((d) => d.currentOutflow >= 15.0).length;

    const droughtCount = this.currentData.filter((d) => d.storageRate < 55.0).length;
    const floodRiskCount = this.currentData.filter((d) => d.currentWaterLevel >= d.floodLevel * 0.95).length;

    return {
      avgStorageRate: avgStorageRate.toFixed(1),
      diffPrevYear: '+3.4%p',
      totalStorageVolume: totalStorageVolume.toFixed(1),
      totalCapacity: totalCapacity.toFixed(1),
      totalInflow: totalInflow.toFixed(1),
      totalOutflow: totalOutflow.toFixed(1),
      dischargingCount,
      totalDams,
      droughtCount,
      floodRiskCount,
      sensorHealth: '100%'
    };
  }

  getBasinSummaries() {
    const basins = [BASINS.HAN, BASINS.NAKDONG, BASINS.GEUM, BASINS.SEOMJIN];
    return basins.map((basinName) => {
      const dams = this.currentData.filter((d) => d.basin === basinName);
      const currentStorage = dams.reduce((acc, d) => acc + d.currentStorageVolume, 0);
      const totalCapacity = dams.reduce((acc, d) => acc + d.totalStorage, 0);
      const avgRate = totalCapacity > 0 ? (currentStorage / totalCapacity) * 100 : 0;

      return {
        basin: basinName,
        damCount: dams.length,
        currentStorage: currentStorage.toFixed(1),
        totalCapacity: totalCapacity.toFixed(1),
        storageRate: avgRate.toFixed(1)
      };
    });
  }

  getDroughtStages() {
    const normal = this.currentData.filter((d) => d.storageRate >= 60.0).length;
    const attention = this.currentData.filter((d) => d.storageRate >= 50.0 && d.storageRate < 60.0).length;
    const caution = this.currentData.filter((d) => d.storageRate >= 40.0 && d.storageRate < 50.0).length;
    const alert = this.currentData.filter((d) => d.storageRate < 40.0).length;

    return { normal, attention, caution, alert };
  }

  subscribe(callback) {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter((cb) => cb !== callback);
    };
  }

  notifySubscribers() {
    this.eventListeners.forEach((cb) => cb(this.currentData));
  }
}

export const telemetryService = new HydrologicalTelemetryService();
