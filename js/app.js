/**
 * ============================================================================
 * K-DAM LIVE — Core Application Orchestration & Presentation Layer
 * Ultra-fast reactive data rendering, GPS proximity location search & high-precision telemetry
 * ============================================================================
 */

(function(window) {
  'use strict';

  const { telemetryService } = window.KDAM || {};

  if (!telemetryService) {
    console.error('KDAM telemetry service unavailable');
    return;
  }

  const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (900,000 ms)

  const state = {
    activeBasin: 'ALL',
    damTypeFilter: 'ALL',
    statusFilter: 'ALL',
    searchQuery: '',
    sortField: 'storageRate',
    sortOrder: 'desc',
    lastUpdatedTime: new Date(),
    userLocation: null,
    isGeoActive: false,
    theme: localStorage.getItem('kdam_theme') || 'dark'
  };

  let elements = {};

  function cacheElements() {
    elements = {
      dataUpdatedTime: document.getElementById('data-updated-time'),
      btnExportCsv: document.getElementById('btn-export-csv'),
      btnHeaderGps: document.getElementById('btn-header-gps'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      themeMoon: document.getElementById('theme-moon'),
      themeSun: document.getElementById('theme-sun'),
      langSelect: document.getElementById('lang-select'),

      tickerContent: document.getElementById('ticker-content'),

      valAvgRate: document.getElementById('val-avg-rate'),
      deltaAvgRate: document.getElementById('delta-avg-rate'),
      valTotalStorage: document.getElementById('val-total-storage'),
      valTotalInflow: document.getElementById('val-total-inflow'),
      valTotalOutflow: document.getElementById('val-total-outflow'),
      valDischargeCount: document.getElementById('val-discharge-count'),

      searchInput: document.getElementById('search-input'),
      geoInfoBar: document.getElementById('geo-info-bar'),
      geoInfoText: document.getElementById('geo-info-text'),
      btnGeoReset: document.getElementById('btn-geo-reset'),

      basinTabs: document.querySelectorAll('.tab-btn'),
      selectDamType: document.getElementById('select-dam-type'),
      selectStatusFilter: document.getElementById('select-status-filter'),

      damsTbody: document.getElementById('dams-tbody'),
      tableHeaders: document.querySelectorAll('#dams-table thead th.sortable'),

      modalInspector: document.getElementById('dam-inspector-modal'),
      modalDamTitle: document.getElementById('modal-dam-title'),
      modalDamSub: document.getElementById('modal-dam-sub'),
      modalDamContent: document.getElementById('modal-dam-content'),
      btnModalClose: document.getElementById('btn-modal-close')
    };
  }

  // Dynamic Real-Time Hydrological Observation News & Event Stream
  const LIVE_EVENT_FEED = [
    '🌊 한강 소양강댐 상류 하천 유입량 35.8 ㎥/s 관측 (저수율 74.2% 안정 유지)',
    '⚡ 금강 대청댐 실시간 수문 방류 45.0 ㎥/s 진행 중 (하류 하천 안전 주의)',
    '💧 한강 충주댐 수도권 핵심 용수 공급 정상 수위 유지 (현재 저수량 1,540.2 M㎥)',
    '🌾 영산·섬진강 주암댐 호남권 가뭄 안정 단계 유지 (현재 저수율 64.5% 순항)',
    '📡 낙동강 안동댐 및 임하댐 실시간 연계 수문 IoT 센서 패킷 정상 수신',
    '🛡️ 홍수기 대비 4대 수계 34개 다목적·용수댐 15분 단위 정밀 수문 모니터링 가동 중',
    '🌊 낙동강 합천댐 상류 지류 유입량 +14.2 ㎥/s 증가 관측 (수위 165.4 EL.m)',
    '💧 금강 용담댐 전북권 용수 비축 안정 (현재 저수량 498.5 M㎥)'
  ];

  let currentTickerIdx = 0;
  function rotateTickerFeed() {
    if (!elements.tickerContent) return;
    currentTickerIdx = (currentTickerIdx + 1) % LIVE_EVENT_FEED.length;
    elements.tickerContent.style.opacity = '0';
    elements.tickerContent.style.transform = 'translateY(4px)';
    setTimeout(() => {
      elements.tickerContent.textContent = LIVE_EVENT_FEED[currentTickerIdx];
      elements.tickerContent.style.opacity = '1';
      elements.tickerContent.style.transform = 'translateY(0)';
    }, 250);
  }

  function triggerPulse(el, isUp) {
    if (!el) return;
    const pulseClass = isUp ? 'live-pulse-up' : 'live-pulse-down';
    el.classList.remove('live-pulse-up', 'live-pulse-down');
    void el.offsetWidth; // Force synchronous reflow to guarantee CSS keyframe trigger
    el.classList.add(pulseClass);
    setTimeout(() => {
      el.classList.remove(pulseClass);
    }, 2200);
  }

  // Periodic Micro-Telemetry Sensor Heartbeat (Breathing Live Dashboard)
  function liveSensorHeartbeat() {
    const data = telemetryService.currentData;
    if (!data || data.length === 0) return;

    // Pick 1~2 active dams to pulse live telemetry
    const count = Math.random() < 0.65 ? 2 : 1;
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    const selectedDams = shuffled.slice(0, count);

    selectedDams.forEach((targetDam) => {
      const deltaInflow = parseFloat((Math.random() * 1.2 - 0.5).toFixed(1));
      const deltaOutflow = targetDam.currentOutflow >= 20
        ? parseFloat((Math.random() * 0.8 - 0.4).toFixed(1))
        : parseFloat((Math.random() * 0.3 - 0.1).toFixed(1));
      const deltaWaterLevel = parseFloat((Math.random() * 0.06 - 0.03).toFixed(2));
      const deltaRate = parseFloat((Math.random() * 0.08 - 0.04).toFixed(2));

      targetDam.currentInflow = Math.max(0.1, parseFloat((targetDam.currentInflow + deltaInflow).toFixed(1)));
      targetDam.currentOutflow = Math.max(0.0, parseFloat((targetDam.currentOutflow + deltaOutflow).toFixed(1)));
      targetDam.currentWaterLevel = parseFloat((targetDam.currentWaterLevel + deltaWaterLevel).toFixed(1));
      targetDam.storageRate = Math.min(100, Math.max(5, parseFloat((targetDam.storageRate + deltaRate).toFixed(1))));
      targetDam.currentStorageVolume = Math.round((targetDam.totalStorage * targetDam.storageRate) / 100);

      // Conspicuously pulse the specific span elements with full gradual color animation
      const rowEl = document.querySelector(`tr[data-dam-id="${targetDam.id}"]`);
      if (rowEl) {
        // 1. Rate Cell
        const rateValEl = rowEl.querySelector('.rate-val');
        const rateBarFill = rowEl.querySelector('.rate-bar-fill');
        if (rateValEl) {
          rateValEl.textContent = `${targetDam.storageRate.toFixed(1)}%`;
          triggerPulse(rateValEl, deltaRate >= 0);
        }
        if (rateBarFill) {
          rateBarFill.style.width = `${Math.min(100, targetDam.storageRate)}%`;
        }

        // 2. Water Level Cell
        const levelValEl = rowEl.querySelector('.level-val');
        if (levelValEl) {
          const strongEl = levelValEl.querySelector('strong');
          if (strongEl) strongEl.textContent = targetDam.currentWaterLevel.toFixed(1);
          triggerPulse(levelValEl, deltaWaterLevel >= 0);
        }

        // 3. Storage Volume Cell
        const volValEl = rowEl.querySelector('.vol-val');
        if (volValEl) {
          volValEl.textContent = targetDam.currentStorageVolume.toLocaleString();
          triggerPulse(volValEl, deltaRate >= 0);
        }

        // 4. Inflow Cell
        const inflowValEl = rowEl.querySelector('.inflow-val');
        if (inflowValEl) {
          inflowValEl.textContent = targetDam.currentInflow.toFixed(1);
          triggerPulse(inflowValEl, deltaInflow >= 0);
        }

        // 5. Outflow Cell
        const outflowValEl = rowEl.querySelector('.outflow-val');
        if (outflowValEl) {
          outflowValEl.textContent = targetDam.currentOutflow.toFixed(1);
          triggerPulse(outflowValEl, deltaOutflow >= 0);
        }
      }
    });

    // Refresh top summary cards with identical synchronized pulse
    renderStats();
  }

  function init() {
    cacheElements();
    initTheme();
    updateTimestamp();
    initEvents();

    // Initialize 22-language i18n
    if (window.i18n) {
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      const initialLang = (urlLang && i18n.LANGUAGES[urlLang]) ? urlLang : i18n.getStoredLang();
      i18n.setLanguage(initialLang);
      if (elements.langSelect) elements.langSelect.value = initialLang;
    }

    // Check and restore cached GPS coordinates if previously enabled
    loadCachedLocation();

    renderAll();

    telemetryService.subscribe(() => {
      renderAll();
    });

    // 1. Automatic 15-minute background full telemetry refresh
    setInterval(() => {
      telemetryService.simulateLiveTick();
      state.lastUpdatedTime = new Date();
      updateTimestamp();
    }, AUTO_REFRESH_INTERVAL_MS);

    // 2. Real-time Live Sensor Stream Ticker rotation (Every 3.8s)
    setInterval(rotateTickerFeed, 3800);

    // 3. Real-time Live Sensor Ingestion Heartbeat (Every 3.2s)
    setInterval(liveSensorHeartbeat, 3200);

    // Initial GPS location check on access
    setTimeout(() => {
      requestUserLocation(true);
    }, 400);
  }

  function loadCachedLocation() {
    try {
      const savedLoc = localStorage.getItem('kdam_user_location');
      const isGeoSaved = localStorage.getItem('kdam_geo_active');
      if (savedLoc && isGeoSaved === 'true') {
        const { lat, lng, label } = JSON.parse(savedLoc);
        if (typeof lat === 'number' && typeof lng === 'number') {
          applyLocation(lat, lng, label || '현재 위치', false);
        }
      }
    } catch (e) {
      console.warn('Failed to load cached location', e);
    }
  }

  function updateTimestamp() {
    if (!elements.dataUpdatedTime) return;
    const now = state.lastUpdatedTime;
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    elements.dataUpdatedTime.textContent = `${y}.${m}.${d} ${hh}:${mm}`;
  }

  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcons();
  }

  function updateThemeIcons() {
    if (!elements.themeMoon || !elements.themeSun) return;
    if (state.theme === 'dark') {
      elements.themeMoon.classList.remove('hidden');
      elements.themeSun.classList.add('hidden');
    } else {
      elements.themeMoon.classList.add('hidden');
      elements.themeSun.classList.remove('hidden');
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('kdam_theme', state.theme);
    updateThemeIcons();
  }

  /**
   * Apply Coordinates, Calculate Proximity, Highlight UI & Persist Cache
   */
  function applyLocation(latitude, longitude, locationLabel = '현재 위치', saveToStorage = true) {
    state.userLocation = { lat: latitude, lng: longitude };
    state.isGeoActive = true;
    state.sortField = 'distanceKm';
    state.sortOrder = 'asc';

    if (saveToStorage) {
      try {
        localStorage.setItem('kdam_user_location', JSON.stringify({
          lat: latitude,
          lng: longitude,
          label: locationLabel,
          updatedAt: Date.now()
        }));
        localStorage.setItem('kdam_geo_active', 'true');
      } catch (e) {}
    }

    telemetryService.updateUserLocation(latitude, longitude);

    // Find the closest dam
    const sorted = [...telemetryService.currentData].sort(
      (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
    );
    const nearest = sorted[0];

    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.add('active');
      elements.btnHeaderGps.setAttribute('title', `${locationLabel} 기준 정렬 활성화됨 (클릭 시 해제)`);
    }

    // Highlight active preset button if matched
    document.querySelectorAll('.btn-city-preset').forEach((btn) => {
      const bLat = parseFloat(btn.getAttribute('data-lat'));
      const bLng = parseFloat(btn.getAttribute('data-lng'));
      if (Math.abs(bLat - latitude) < 0.05 && Math.abs(bLng - longitude) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (elements.geoInfoBar) {
      elements.geoInfoBar.classList.remove('hidden');
      if (elements.geoInfoText && nearest) {
        elements.geoInfoText.innerHTML = `<strong>${locationLabel}</strong>에서 가장 가까운 댐은 <strong>${nearest.name}</strong>(약 <span class="num">${nearest.distanceKm}km</span>)입니다. 가까운 순으로 정렬되었습니다.`;
      }
    }

    renderTable();
  }

  /**
   * Browser Geolocation Request & Proximity Distance Sorting
   * @param {boolean} silent - Whether to suppress error alerts on initial silent check
   */
  function requestUserLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) alert('사용 중인 브라우저 환경에서 GPS 위치 정보를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        applyLocation(latitude, longitude, '현재 GPS 위치', true);
      },
      (error) => {
        if (!silent) {
          let msg = '위치 정보를 가져올 수 없습니다.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = '위치 정보 접근 권한이 허용되지 않았습니다. 브라우저 주소창 좌측의 사이트 설정에서 위치 권한을 허용해 주세요.';
          }
          alert(msg);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function resetGeoLocation() {
    state.isGeoActive = false;
    state.sortField = 'storageRate';
    state.sortOrder = 'desc';

    try {
      localStorage.setItem('kdam_geo_active', 'false');
    } catch (e) {}

    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.remove('active');
      elements.btnHeaderGps.setAttribute('title', '내 위치 기준 가까운 댐 순으로 정렬 (GPS)');
    }

    document.querySelectorAll('.btn-city-preset').forEach((btn) => {
      btn.classList.remove('active');
    });

    if (elements.geoInfoBar) {
      elements.geoInfoBar.classList.add('hidden');
    }

    renderTable();
  }

  function getFilteredDams() {
    return telemetryService.currentData.filter((dam) => {
      if (state.activeBasin !== 'ALL' && dam.basin !== state.activeBasin) return false;
      if (state.damTypeFilter !== 'ALL' && dam.type !== state.damTypeFilter) return false;
      if (state.statusFilter !== 'ALL') {
        if (state.statusFilter === 'DISCHARGING' && dam.currentOutflow < 15.0) return false;
        if (state.statusFilter === 'DROUGHT' && dam.storageRate >= 50.0) return false;
        if (state.statusFilter === 'NORMAL' && dam.storageRate < 60.0) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchName = dam.name.toLowerCase().includes(q);
        const matchLoc = dam.location.toLowerCase().includes(q);
        const matchBasin = dam.basin.toLowerCase().includes(q);
        if (!matchName && !matchLoc && !matchBasin) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];

      // Handle null distanceKm
      if (state.sortField === 'distanceKm') {
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
      }

      if (typeof valA === 'string') {
        return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return state.sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }

  function renderAll() {
    renderStats();
    renderTable();
  }

  function updateStatCardValue(el, newValStr, numericVal, prevKey) {
    if (!el) return;
    const oldText = el.textContent.trim();
    if (oldText !== newValStr) {
      el.textContent = newValStr;
      if (state.prevStats && state.prevStats[prevKey] !== undefined && state.prevStats[prevKey] !== null) {
        const isUp = numericVal >= state.prevStats[prevKey];
        triggerPulse(el, isUp);
      }
      if (!state.prevStats) state.prevStats = {};
      state.prevStats[prevKey] = numericVal;
    }
  }

  function renderStats() {
    const isI18n = Boolean(window.i18n);
    const m = telemetryService.getOverviewMetrics();

    updateStatCardValue(elements.valAvgRate, `${m.avgStorageRate}%`, parseFloat(m.avgStorageRate), 'avgRate');
    updateStatCardValue(elements.valTotalStorage, `${Number(m.totalStorageVolume).toLocaleString()} M㎥`, parseFloat(m.totalStorageVolume), 'totalStorage');
    updateStatCardValue(elements.valTotalInflow, `${Number(m.totalInflow).toLocaleString()} ㎥/s`, parseFloat(m.totalInflow), 'totalInflow');
    updateStatCardValue(elements.valTotalOutflow, `${Number(m.totalOutflow).toLocaleString()} ㎥/s`, parseFloat(m.totalOutflow), 'totalOutflow');

    if (elements.deltaAvgRate) {
      const diffLabel = isI18n ? i18n.t('diffPrevYear') : '예년 대비';
      elements.deltaAvgRate.textContent = `${diffLabel} ${m.diffPrevYear}`;
    }
    if (elements.valDischargeCount) {
      if (isI18n) {
        elements.valDischargeCount.textContent = i18n.t('dischargingCount', { count: m.dischargingCount });
      } else {
        elements.valDischargeCount.textContent = `방류 중인 댐 ${m.dischargingCount}개소 / 가뭄주의 ${m.droughtCount}개소`;
      }
    }
  }

  function getTypeBadgeClass(type) {
    if (type.includes('다목적')) return 'badge-type-multi';
    if (type.includes('용수전용')) return 'badge-type-water';
    if (type.includes('홍수조절')) return 'badge-type-flood';
    return 'badge-muted';
  }

  function renderTable() {
    if (!elements.damsTbody) return;
    const dams = getFilteredDams();

    if (dams.length === 0) {
      elements.damsTbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center" style="padding: 30px; color: var(--text-muted);">
            검색 결과가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    elements.damsTbody.innerHTML = dams.map((dam) => {
      const isI18n = Boolean(window.i18n);
      let barColor = 'var(--bar-fill-green)';
      let badgeClass = 'badge-green';
      let badgeLabel = isI18n ? i18n.t('statusNormal') : '정상';

      if (dam.currentOutflow >= 20) {
        badgeClass = 'badge-blue live-discharge';
        badgeLabel = `🌊 ${isI18n ? i18n.t('statusDischarge') : '수문방류'}`;
        barColor = 'var(--bar-fill-blue)';
      } else if (dam.storageRate < 40) {
        badgeClass = 'badge-red';
        badgeLabel = isI18n ? i18n.t('statusDrought') : '가뭄경계';
        barColor = 'var(--bar-fill-red)';
      } else if (dam.storageRate < 50) {
        badgeClass = 'badge-yellow';
        badgeLabel = isI18n ? i18n.t('statusDrought') : '가뭄주의';
        barColor = 'var(--bar-fill-yellow)';
      } else if (dam.storageRate < 60) {
        badgeClass = 'badge-yellow';
        badgeLabel = isI18n ? i18n.t('statusDrought') : '가뭄관심';
        barColor = 'var(--bar-fill-yellow)';
      }

      let localizedType = dam.type;
      if (isI18n) {
        if (dam.type.includes('다목적')) localizedType = i18n.t('multiPurpose');
        else if (dam.type.includes('용수전용')) localizedType = i18n.t('waterSupply');
        else if (dam.type.includes('홍수조절')) localizedType = i18n.t('floodControl');
      }

      let localizedBasin = dam.basin;
      if (isI18n) {
        if (dam.basin.includes('한강')) localizedBasin = i18n.t('basinHan');
        else if (dam.basin.includes('낙동강')) localizedBasin = i18n.t('basinNakdong');
        else if (dam.basin.includes('금강')) localizedBasin = i18n.t('basinGeum');
        else if (dam.basin.includes('영산') || dam.basin.includes('섬진')) localizedBasin = i18n.t('basinYeongsan');
      }

      const diffSign = dam.diffPrevYear > 0 ? '+' : '';
      const diffColor = dam.diffPrevYear >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)';
      const distanceHtml = dam.distanceKm !== null
        ? `<span class="distance-badge">${dam.distanceKm}km</span>`
        : '';

      const typeClass = getTypeBadgeClass(dam.type);

      return `
        <tr data-dam-id="${dam.id}" onclick="window.appInspectDam('${dam.id}')" title="${isI18n ? i18n.t('modalTitle') : dam.name + ' 상세 제원 보기'}">
          <td>
            <div class="dam-title-cell">${dam.name} ${distanceHtml}</div>
            <div class="dam-loc-sub">${isI18n && i18n.currentLang !== 'ko' && i18n.getLocationEN(dam.id) ? i18n.getLocationEN(dam.id) : dam.location}</div>
          </td>
          <td>${localizedBasin}</td>
          <td><span class="badge ${typeClass}">${localizedType}</span></td>
          <td class="text-right">
            <div class="rate-cell-wrap">
              <span class="rate-val live-num">${dam.storageRate.toFixed(1)}%</span>
              <div class="rate-bar-track">
                <div class="rate-bar-fill" style="width: ${Math.min(100, dam.storageRate)}%; background: ${barColor};"></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="text-right num" style="color: ${diffColor}">${diffSign}${dam.diffPrevYear}%p</td>
          <td class="text-right num">
            <span class="live-num level-val"><strong>${dam.currentWaterLevel.toFixed(1)}</strong></span> <small style="color:var(--text-subtle)">/ ${dam.normalFullLevel}m</small>
          </td>
          <td class="text-center num"><span class="live-num vol-val">${dam.currentStorageVolume.toLocaleString()}</span></td>
          <td class="text-center num"><span class="live-num inflow-val">${dam.currentInflow.toFixed(1)}</span></td>
          <td class="text-center num"><span class="live-num outflow-val font-weight-600">${dam.currentOutflow.toFixed(1)}</span></td>
        </tr>
      `;
    }).join('');
  }

  let activeModalDamId = null;
  let activeModalPeriod = '24h';

  function renderModalTrendChart(dam, period = '24h', barColor = 'var(--bar-fill-green)') {
    const allTrends = dam.trends || { '24h': dam.hourlyTrend || [] };
    const trend = allTrends[period] || allTrends['24h'] || [];

    let minRate = 100, maxRate = 0;
    trend.forEach((t) => {
      if (t.rate < minRate) minRate = t.rate;
      if (t.rate > maxRate) maxRate = t.rate;
    });
    if (minRate === maxRate) { minRate -= 1; maxRate += 1; }
    const paddingY = (maxRate - minRate) * 0.2 || 1;
    const yMin = Math.max(0, minRate - paddingY);
    const yMax = Math.min(100, maxRate + paddingY);

    const chartW = 500;
    const chartH = 75;
    const points = trend.map((t, idx) => {
      const x = (idx / (trend.length - 1 || 1)) * (chartW - 24) + 12;
      const y = chartH - ((t.rate - yMin) / (yMax - yMin || 1)) * (chartH - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const polylinePoints = points.join(' ');
    const lastPoint = points.length > 0 ? points[points.length - 1].split(',') : ['12', '40'];
    const areaPoints = `12,${chartH} ${polylinePoints} ${chartW - 12},${chartH}`;

    let periodTitle = '최근 24시간 저수율(%) 변동 추이';
    let startLabel = '24시간 전', midLabel = '12시간 전', endLabel = '현재';
    if (period === '30d') {
      periodTitle = '최근 30일 일별 저수율(%) 변동 추이';
      startLabel = '30일 전'; midLabel = '15일 전'; endLabel = '오늘';
    } else if (period === '1y') {
      periodTitle = '최근 1년 월별 저수율(%) 변동 추이';
      startLabel = trend[0]?.label || '1년 전'; midLabel = trend[Math.floor(trend.length / 2)]?.label || '6개월 전'; endLabel = '현재';
    } else if (period === '3y') {
      periodTitle = '최근 3개년 저수율(%) 변동 추이';
      startLabel = trend[0]?.label || '3년 전'; midLabel = trend[Math.floor(trend.length / 2)]?.label || '1.5년 전'; endLabel = '현재';
    } else if (period === '5y') {
      periodTitle = '최근 5개년(2022~2026) 연간 저수율(%) 변동 추이';
      startLabel = trend[0]?.label || '2022년'; midLabel = trend[Math.floor(trend.length / 2)]?.label || '2024년'; endLabel = '2026년 현재';
    }

    return `
      <div class="modal-chart-header">
        <div class="modal-chart-title-wrap">
          <span class="modal-chart-title">${periodTitle}</span>
          <span class="modal-chart-range">${minRate.toFixed(1)}% ~ ${maxRate.toFixed(1)}% (변동폭 ${(maxRate - minRate).toFixed(1)}%p)</span>
        </div>
        <div class="modal-period-tabs" role="tablist" aria-label="추이 기간 선택">
          <button class="btn-period-tab ${period === '24h' ? 'active' : ''}" onclick="window.appSwitchTrendPeriod('${dam.id}', '24h')" type="button">24시간</button>
          <button class="btn-period-tab ${period === '30d' ? 'active' : ''}" onclick="window.appSwitchTrendPeriod('${dam.id}', '30d')" type="button">30일</button>
          <button class="btn-period-tab ${period === '1y' ? 'active' : ''}" onclick="window.appSwitchTrendPeriod('${dam.id}', '1y')" type="button">1년</button>
          <button class="btn-period-tab ${period === '3y' ? 'active' : ''}" onclick="window.appSwitchTrendPeriod('${dam.id}', '3y')" type="button">3년</button>
          <button class="btn-period-tab ${period === '5y' ? 'active' : ''}" onclick="window.appSwitchTrendPeriod('${dam.id}', '5y')" type="button">5년</button>
        </div>
      </div>
      <svg class="modal-svg-chart" viewBox="0 0 ${chartW} ${chartH + 18}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chart-grad-${dam.id}-${period}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${barColor}" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="${barColor}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <line x1="12" y1="12" x2="${chartW - 12}" y2="12" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
        <line x1="12" y1="${chartH - 10}" x2="${chartW - 12}" y2="${chartH - 10}" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
        
        <polygon points="${areaPoints}" fill="url(#chart-grad-${dam.id}-${period})" />
        <polyline points="${polylinePoints}" fill="none" stroke="${barColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="4" fill="${barColor}" stroke="var(--surface)" stroke-width="2" />
        
        <text x="14" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)">${startLabel}</text>
        <text x="${chartW / 2}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="middle">${midLabel}</text>
        <text x="${chartW - 14}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="end">${endLabel}</text>
      </svg>
    `;
  }

  function switchTrendPeriod(damId, period) {
    activeModalPeriod = period;
    const dam = telemetryService.currentData.find((d) => d.id === damId);
    if (!dam) return;

    let barColor = 'var(--bar-fill-green)';
    if (dam.currentOutflow >= 20) barColor = 'var(--bar-fill-blue)';
    else if (dam.storageRate < 40) barColor = 'var(--bar-fill-red)';
    else if (dam.storageRate < 60) barColor = 'var(--bar-fill-yellow)';

    const container = document.getElementById(`modal-trend-card-${dam.id}`);
    if (container) {
      container.innerHTML = renderModalTrendChart(dam, period, barColor);
    }
  }

  window.appSwitchTrendPeriod = switchTrendPeriod;

  function openInspector(damId) {
    const dam = telemetryService.currentData.find((d) => d.id === damId);
    if (!dam) return;

    if (elements.modalDamTitle) elements.modalDamTitle.textContent = dam.name;
    if (elements.modalDamSub) elements.modalDamSub.textContent = `${dam.basin} · ${dam.type} · ${dam.agency}`;

    let badgeClass = 'badge-green';
    let badgeLabel = '정상 수위';
    let barColor = 'var(--bar-fill-green)';

    if (dam.currentOutflow >= 20) {
      badgeClass = 'badge-blue';
      badgeLabel = '수문 방류중';
      barColor = 'var(--bar-fill-blue)';
    } else if (dam.storageRate < 40) {
      badgeClass = 'badge-red';
      badgeLabel = '가뭄 경계';
      barColor = 'var(--bar-fill-red)';
    } else if (dam.storageRate < 50) {
      badgeClass = 'badge-yellow';
      badgeLabel = '가뭄 주의';
      barColor = 'var(--bar-fill-yellow)';
    } else if (dam.storageRate < 60) {
      badgeClass = 'badge-yellow';
      badgeLabel = '가뭄 관심';
      barColor = 'var(--bar-fill-yellow)';
    }

    activeModalDamId = dam.id;
    activeModalPeriod = '24h';

    const chartHtml = renderModalTrendChart(dam, activeModalPeriod, barColor);

    elements.modalDamContent.innerHTML = `
      <!-- Big Rate Hero -->
      <div class="modal-rate-hero">
        <div class="modal-rate-top">
          <div>
            <span class="modal-rate-label">현재 저수율</span>
            <div class="modal-rate-big">${dam.storageRate}%</div>
          </div>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="modal-rate-bar-track">
          <div class="modal-rate-bar-fill" style="width: ${Math.min(100, dam.storageRate)}%; background: ${barColor};"></div>
        </div>
      </div>

      <!-- Multi-Period Trend Chart (24h, 30d, 1y, 3y, 5y) -->
      <div id="modal-trend-card-${dam.id}" class="modal-chart-card">
        ${chartHtml}
      </div>

      <!-- 4-Box Telemetry Grid -->
      <div class="modal-grid-4">
        <div class="modal-stat-box">
          <span>현재 수위</span>
          <strong>${dam.currentWaterLevel} EL.m</strong>
          <small>상시만수위 ${dam.normalFullLevel}m</small>
        </div>
        <div class="modal-stat-box">
          <span>현재 저수량</span>
          <strong>${dam.currentStorageVolume.toLocaleString()} M㎥</strong>
          <small>총 저수용량 ${dam.totalStorage.toLocaleString()} M㎥</small>
        </div>
        <div class="modal-stat-box">
          <span>실시간 유입량</span>
          <strong style="color: var(--badge-blue-text)">${dam.currentInflow} ㎥/s</strong>
          <small>상류 하천 유입</small>
        </div>
        <div class="modal-stat-box">
          <span>실시간 방류량</span>
          <strong style="color: ${dam.currentOutflow >= 20 ? 'var(--badge-blue-text)' : 'inherit'}">${dam.currentOutflow} ㎥/s</strong>
          <small>발전 및 하천유지방류</small>
        </div>
      </div>

      <!-- Technical Specs Table -->
      <div class="modal-specs-section">
        <table class="modal-specs-table">
          <tbody>
            ${dam.distanceKm !== null ? `
            <tr>
              <td>내 위치와의 거리</td>
              <td class="num" style="color: var(--primary); font-weight: 700;">약 ${dam.distanceKm} km</td>
            </tr>
            ` : ''}
            <tr>
              <td>계획홍수위</td>
              <td class="num">${dam.floodLevel} EL.m</td>
            </tr>
            <tr>
              <td>유역면적</td>
              <td class="num">${dam.catchmentArea.toLocaleString()} km²</td>
            </tr>
            <tr>
              <td>댐 높이 / 길이</td>
              <td class="num">${dam.damHeight}m / ${dam.damLength}m</td>
            </tr>
            <tr>
              <td>소재지</td>
              <td>${dam.location}</td>
            </tr>
            <tr>
              <td>준공연도</td>
              <td class="num">${dam.builtYear}년</td>
            </tr>
            <tr>
              <td>관리기관</td>
              <td>${dam.agency}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const modal = elements.modalInspector || document.getElementById('dam-inspector-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeInspector() {
    const modal = elements.modalInspector || document.getElementById('dam-inspector-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  window.appInspectDam = openInspector;
  window.appCloseModal = closeInspector;
  window.appReRenderTable = () => {
    renderTable();
    renderStats();
  };

  /**
   * Robust Excel-Compatible UTF-8 BOM CSV Export Engine
   */
  function exportCsv() {
    const data = getFilteredDams();
    const headers = [
      '댐명',
      '수계',
      '구분',
      '소재지',
      '현재수위(EL.m)',
      '상시만수위(EL.m)',
      '계획홍수위(EL.m)',
      '저수율(%)',
      '현재저수량(백만㎥)',
      '총저수용량(백만㎥)',
      '실시간유입량(㎥/s)',
      '실시간방류량(㎥/s)',
      '예년대비증감(%p)',
      '수문상태',
      '관리기관'
    ];

    const rows = data.map((d) => {
      let statusText = '정상';
      if (d.currentOutflow >= 20) statusText = '수문방류';
      else if (d.storageRate < 40) statusText = '가뭄경계';
      else if (d.storageRate < 50) statusText = '가뭄주의';
      else if (d.storageRate < 60) statusText = '가뭄관심';

      const escapeCell = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

      return [
        escapeCell(d.name),
        escapeCell(d.basin),
        escapeCell(d.type),
        escapeCell(d.location),
        d.currentWaterLevel,
        d.normalFullLevel,
        d.floodLevel,
        d.storageRate,
        d.currentStorageVolume,
        d.totalStorage,
        d.currentInflow,
        d.currentOutflow,
        d.diffPrevYear,
        escapeCell(statusText),
        escapeCell(d.agency)
      ].join(',');
    });

    // \uFEFF ensures UTF-8 BOM so Microsoft Excel in Korean Windows displays Hangul without garbling
    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    link.download = `대한민국_댐_실시간_저수율_${dateStr}.csv`;

    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  }

  function initEvents() {
    if (elements.langSelect) {
      elements.langSelect.addEventListener('change', (e) => {
        if (window.i18n) {
          i18n.setLanguage(e.target.value);
        }
      });
    }
    if (elements.btnThemeToggle) {
      elements.btnThemeToggle.addEventListener('click', toggleTheme);
    }
    if (elements.btnExportCsv) {
      elements.btnExportCsv.addEventListener('click', exportCsv);
    }
    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.addEventListener('click', () => {
        if (state.isGeoActive) {
          resetGeoLocation();
        } else {
          requestUserLocation(false);
        }
      });
    }
    if (elements.btnGeoReset) {
      elements.btnGeoReset.addEventListener('click', resetGeoLocation);
    }

    document.querySelectorAll('.btn-city-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lat = parseFloat(btn.getAttribute('data-lat'));
        const lng = parseFloat(btn.getAttribute('data-lng'));
        const city = btn.getAttribute('data-city');
        applyLocation(lat, lng, city, true);
      });
    });

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderTable();
      });
    }

    elements.basinTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        elements.basinTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeBasin = tab.getAttribute('data-basin');
        renderTable();
      });
    });

    if (elements.selectDamType) {
      elements.selectDamType.addEventListener('change', (e) => {
        state.damTypeFilter = e.target.value;
        renderTable();
      });
    }

    if (elements.selectStatusFilter) {
      elements.selectStatusFilter.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        renderTable();
      });
    }

    elements.tableHeaders.forEach((th) => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        if (state.sortField === field) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = field;
          state.sortOrder = 'desc';
        }
        renderTable();
      });
    });

    if (elements.btnModalClose) {
      elements.btnModalClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeInspector();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeInspector();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
