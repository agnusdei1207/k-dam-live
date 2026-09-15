/**
 * K-DAM LIVE — Dam Registry (single source of truth shared by the browser and the fetch script)
 *
 * Only static identity fields live here. Every hydrological number (specs, levels, storage,
 * inflow/outflow, trends) is fetched from K-water MyWater at build time — see scripts/fetch-dam-data.mjs.
 *
 * code   : K-water dam code (DAM_CD) used by every MyWater endpoint
 * group  : MyWater damGb — 1 다목적댐, 2 용수댐, 4 홍수조절용댐
 * lat/lng: WGS84, used only for proximity sorting
 * builtYear: 준공연도 (MyWater DATA17 is a project-period date, not usable for older 용수댐)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KDAM_REGISTRY = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const BASINS = Object.freeze({
    HAN: '한강',
    NAKDONG: '낙동강',
    GEUM: '금강',
    SEOMJIN: '영산·섬진강'
  });

  const DAM_TYPES = Object.freeze({
    MULTIPURPOSE: '다목적댐',
    WATER_SUPPLY: '용수전용댐',
    FLOOD_CONTROL: '홍수조절용'
  });

  const GROUP = Object.freeze({
    [DAM_TYPES.MULTIPURPOSE]: '1',
    [DAM_TYPES.WATER_SUPPLY]: '2',
    [DAM_TYPES.FLOOD_CONTROL]: '4'
  });

  const dam = (id, code, name, basin, type, location, lat, lng, builtYear) => ({
    id, code, name, basin, type, location, lat, lng, builtYear, agency: 'K-water', group: GROUP[type]
  });

  const DAMS = [
    // ─── 한강 수계 ─────────────────────────────────────────────────────────
    dam('soyang',     '1012110', '소양강댐',    BASINS.HAN, DAM_TYPES.MULTIPURPOSE,  '강원특별자치도 춘천시 신북읍', 37.9486, 127.8181, 1973),
    dam('chungju',    '1003110', '충주댐',      BASINS.HAN, DAM_TYPES.MULTIPURPOSE,  '충청북도 충주시 종민동',       36.9997, 127.9944, 1985),
    dam('hoengseong', '1006110', '횡성댐',      BASINS.HAN, DAM_TYPES.MULTIPURPOSE,  '강원특별자치도 횡성군 갑천면', 37.5458, 128.0286, 2000),
    dam('peace',      '1009710', '평화의댐',    BASINS.HAN, DAM_TYPES.FLOOD_CONTROL, '강원특별자치도 화천군 화천읍', 38.2436, 127.7942, 2005),
    dam('gwangdong',  '1001210', '광동댐',      BASINS.HAN, DAM_TYPES.WATER_SUPPLY,  '강원특별자치도 삼척시 하장면', 37.3883, 128.9389, 1989),
    dam('dalbang',    '1302210', '달방댐',      BASINS.HAN, DAM_TYPES.WATER_SUPPLY,  '강원특별자치도 동해시 삼화동', 37.4739, 129.0436, 1988),

    // ─── 낙동강 수계 ───────────────────────────────────────────────────────
    dam('andong',     '2001110', '안동댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 안동시 상아동',       36.5861, 128.7758, 1976),
    dam('imha',       '2002110', '임하댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 안동시 임하면',       36.5369, 128.8925, 1993),
    dam('hapcheon',   '2015110', '합천댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상남도 합천군 대병면',       35.5342, 128.0281, 1988),
    dam('namgang',    '2018110', '남강댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상남도 진주시 판문동',       35.1633, 128.0336, 1999),
    dam('miryang',    '2021110', '밀양댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상남도 밀양시 단장면',       35.5350, 128.9367, 2001),
    dam('gunwi',      '2008101', '군위댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '대구광역시 군위군 삼국유사면', 36.1436, 128.7667, 2010),
    dam('buhang',     '2010101', '김천부항댐',  BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 김천시 부항면',       35.9867, 127.9733, 2013),
    dam('yeongju',    '2004101', '영주댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 영주시 평은면',       36.7583, 128.6750, 2016),
    dam('bohyunsan',  '2012101', '보현산댐',    BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 영천시 화북면',       36.0833, 128.9833, 2014),
    dam('seongdeok',  '2002111', '성덕댐',      BASINS.NAKDONG, DAM_TYPES.MULTIPURPOSE, '경상북도 청송군 안덕면',       36.2167, 128.9833, 2015),
    dam('yeongcheon', '2012210', '영천댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상북도 영천시 자양면',       36.0667, 129.0333, 1980),
    dam('angye',      '2101210', '안계댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상북도 경주시 강동면',       36.0162, 129.2648, 1971),
    dam('unmun',      '2021210', '운문댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상북도 청도군 운문면',       35.6833, 128.9333, 1993),
    dam('gampo',      '2403201', '감포댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상북도 경주시 문무대왕면',   35.7833, 129.4833, 2006),
    dam('daegok',     '2201231', '대곡댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '울산광역시 울주군 두동면',     35.6360, 129.1748, 2005),
    dam('sayeon',     '2201220', '사연댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '울산광역시 울주군 범서읍',     35.5783, 129.2133, 1965),
    dam('daeam',      '2201230', '대암댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '울산광역시 울주군 삼동면',     35.5167, 129.1833, 1969),
    dam('seonam',     '2301210', '선암댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '울산광역시 남구 선암동',       35.5167, 129.3167, 1964),
    dam('yeoncho',    '2503210', '연초댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상남도 거제시 연초면',       34.9402, 128.6717, 1979),
    dam('gucheon',    '2503220', '구천댐',      BASINS.NAKDONG, DAM_TYPES.WATER_SUPPLY, '경상남도 거제시 동부면',       34.8271, 128.6365, 1987),

    // ─── 금강 수계 ─────────────────────────────────────────────────────────
    dam('daecheong',  '3008110', '대청댐',      BASINS.GEUM, DAM_TYPES.MULTIPURPOSE, '대전광역시 대덕구 / 충북 청주시', 36.4783, 127.4817, 1980),
    dam('yongdam',    '3001110', '용담댐',      BASINS.GEUM, DAM_TYPES.MULTIPURPOSE, '전북특별자치도 진안군 용담면',   35.9450, 127.5250, 2001),
    dam('boryeong',   '3203110', '보령댐',      BASINS.GEUM, DAM_TYPES.MULTIPURPOSE, '충청남도 보령시 미산면',         36.2617, 126.6333, 1998),
    dam('buan',       '3303110', '부안댐',      BASINS.GEUM, DAM_TYPES.MULTIPURPOSE, '전북특별자치도 부안군 변산면',   35.6883, 126.5783, 1996),

    // ─── 영산강·섬진강 수계 ────────────────────────────────────────────────
    dam('jwam',       '4007110', '주암댐',      BASINS.SEOMJIN, DAM_TYPES.MULTIPURPOSE, '전라남도 순천시 주암면', 35.0567, 127.2383, 1991),
    dam('jwam-reg',   '4104610', '주암조절지댐', BASINS.SEOMJIN, DAM_TYPES.MULTIPURPOSE, '전라남도 순천시 상사면', 34.9667, 127.4167, 1991),
    dam('seomjin',    '4001110', '섬진강댐',    BASINS.SEOMJIN, DAM_TYPES.MULTIPURPOSE, '전북특별자치도 임실군 강진면', 35.5417, 127.1333, 1965),
    dam('jangheung',  '5101110', '장흥댐',      BASINS.SEOMJIN, DAM_TYPES.MULTIPURPOSE, '전라남도 장흥군 유치면', 34.7550, 126.9167, 2006),
    dam('pyeongrim',  '5002201', '평림댐',      BASINS.SEOMJIN, DAM_TYPES.WATER_SUPPLY, '전라남도 장성군 삼계면', 35.3333, 126.7167, 2007),
    dam('suo',        '4105210', '수어댐',      BASINS.SEOMJIN, DAM_TYPES.WATER_SUPPLY, '전라남도 광양시 진상면', 35.0333, 127.7333, 1978)
  ];

  return Object.freeze({ BASINS, DAM_TYPES, DAMS });
});
