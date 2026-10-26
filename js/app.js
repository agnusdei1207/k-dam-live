/**
 * ============================================================================
 * K-DAM LIVE — Core Application Orchestration & Presentation Layer
 * Renders the real K-water observation snapshot loaded by js/data.js,
 * handles GPS proximity sorting, filtering, the inspector modal and CSV export.
 * ============================================================================
 */

(function(window) {
  'use strict';

  const { telemetryService, DAM_TYPES, THRESHOLDS, DAMS } = window.KDAM || {};

  if (!telemetryService) {
    console.error('KDAM telemetry service unavailable');
    return;
  }

  // data/live.json is regenerated hourly by the GitHub Actions deploy; poll it every 10 minutes.
  const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
  const VISIBLE_REFRESH_MIN_MS = 60 * 1000;
  const TICKER_ROTATE_MS = 4200;
  const GPS_LABEL = '현재 GPS 위치';

  // Live record field → table cell that pulses when a new observation changes it
  const PULSE_TARGETS = {
    storageRate: '.rate-val',
    currentWaterLevel: '.level-val',
    currentStorageVolume: '.vol-val',
    currentInflow: '.inflow-val',
    currentOutflow: '.outflow-val'
  };

  const TYPE_BADGE_CLASSES = {
    [DAM_TYPES.MULTIPURPOSE]: 'badge-type-multi',
    [DAM_TYPES.WATER_SUPPLY]: 'badge-type-water',
    [DAM_TYPES.FLOOD_CONTROL]: 'badge-type-flood'
  };

  // Table sort keys (data-sort attribute) → record fields
  const SORT_FIELDS = {
    name: 'name',
    basin: 'basin',
    type: 'type',
    storageRate: 'storageRate',
    diffNormalYear: 'diffNormalYear',
    waterLevel: 'currentWaterLevel',
    storageVolume: 'currentStorageVolume',
    inflow: 'currentInflow',
    outflow: 'currentOutflow',
    distanceKm: 'distanceKm'
  };

  const state = {
    activeBasin: 'ALL',
    damTypeFilter: 'ALL',
    statusFilter: 'ALL',
    searchQuery: '',
    sortField: 'storageRate',
    sortOrder: 'desc',
    userLocation: null,
    isGeoActive: false,
    theme: readStorage('kdam_theme') || 'dark',
    prevStats: null,
    tickerItems: [],
    tickerIdx: 0
  };

  let elements = {};
  let lastRefreshAt = Date.now();
  let locationAppliedAt = 0;

  // Storage can throw (blocked site data, some private modes); the page must still work without it.
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function cacheElements() {
    elements = {
      dataUpdatedTime: document.getElementById('data-updated-time'),
      liveBadge: document.querySelector('.live-badge'),
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
      valTotalCapacity: document.getElementById('val-total-capacity'),
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
      btnModalClose: document.getElementById('btn-modal-close'),
      modalBackdrop: document.querySelector('.inspector-modal-backdrop')
    };
  }

  // ─── Formatting helpers (every value may be null when the portal has no observation) ───
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const fmt = (v, digits = 1) => (isNum(v) ? v.toFixed(digits) : '-');
  const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString() : '-');
  const fmtNum = (v, digits = 1) => (isNum(v) ? Number(v.toFixed(digits)).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '-');
  const fmtSigned = (v, digits = 1) => (isNum(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}` : '-');
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function triggerPulse(el, isUp) {
    if (!el) return;
    const pulseClass = isUp ? 'live-pulse-up' : 'live-pulse-down';
    el.classList.remove('live-pulse-up', 'live-pulse-down');
    void el.offsetWidth; // force reflow so the keyframe restarts
    el.classList.add(pulseClass);
    setTimeout(() => el.classList.remove(pulseClass), 2200);
  }

  // ─── Ticker: headlines derived from the real snapshot ─────────────────────────
  function buildTickerItems() {
    const data = telemetryService.currentData.filter((d) => d.storageRate !== null);
    const m = telemetryService.getOverviewMetrics();
    const items = [];
    if (!data.length) return items;

    if (m.observedAt) {
      items.push(`📡 K-water 물정보포털 ${m.observedAt} 관측 기준 · 전국 ${m.observedDams}개 댐 수문자료 동기화 완료`);
    }
    if (isNum(m.avgStorageRate)) {
      const diff = isNum(m.diffNormalYear) ? ` (예년 ${fmt(m.normalYearRate)}% 대비 ${fmtSigned(m.diffNormalYear)}%p)` : '';
      items.push(`💧 전국 다목적·용수댐 평균 저수율 ${fmt(m.avgStorageRate)}%${diff}`);
    }

    const storageDams = data.filter((d) => d.type !== DAM_TYPES.FLOOD_CONTROL);
    const byInflow = [...data].filter((d) => isNum(d.currentInflow)).sort((a, b) => b.currentInflow - a.currentInflow);
    const byOutflow = [...data].filter((d) => isNum(d.currentOutflow)).sort((a, b) => b.currentOutflow - a.currentOutflow);
    const lowest = [...storageDams].sort((a, b) => a.storageRate - b.storageRate);
    const highest = [...storageDams].sort((a, b) => b.storageRate - a.storageRate);

    if (byInflow[0]) {
      items.push(`🌊 ${byInflow[0].basin} ${byInflow[0].name} 시간 유입량 ${fmt(byInflow[0].currentInflow)} ㎥/s 전국 최대 (저수율 ${fmt(byInflow[0].storageRate)}%)`);
    }
    if (byOutflow[0]) {
      items.push(`⚡ ${byOutflow[0].basin} ${byOutflow[0].name} 총방류량 ${fmt(byOutflow[0].currentOutflow)} ㎥/s 전국 최대 · 방류 ${THRESHOLDS.DISCHARGE_CMS}㎥/s 이상 ${m.dischargingCount}개소`);
    }
    if (lowest[0]) {
      const l = lowest.slice(0, 3).map((d) => `${d.name} ${fmt(d.storageRate)}%`).join(' · ');
      items.push(`🌾 저수율 하위 댐: ${l} (가뭄주의 ${THRESHOLDS.DROUGHT_CAUTION}% 미만 ${m.droughtCount}개소)`);
    }
    if (highest[0]) {
      items.push(`🛡️ ${highest[0].basin} ${highest[0].name} 저수율 ${fmt(highest[0].storageRate)}% 전국 최고 (예년 대비 ${fmtSigned(highest[0].diffNormalYear)}%p)`);
    }
    const jwam = data.find((d) => d.id === 'jwam');
    if (jwam && isNum(jwam.rateLastYear)) {
      items.push(`📉 영산·섬진강 주암댐 저수율 ${fmt(jwam.storageRate)}% · 전년 동일 ${fmt(jwam.rateLastYear)}% · 예년 ${fmt(jwam.rateNormalYear)}%`);
    }
    return items;
  }

  function rotateTickerFeed() {
    if (!elements.tickerContent || state.tickerItems.length === 0) return;
    state.tickerIdx = (state.tickerIdx + 1) % state.tickerItems.length;
    elements.tickerContent.style.opacity = '0';
    elements.tickerContent.style.transform = 'translateY(4px)';
    setTimeout(() => {
      elements.tickerContent.textContent = state.tickerItems[state.tickerIdx];
      elements.tickerContent.style.opacity = '1';
      elements.tickerContent.style.transform = 'translateY(0)';
    }, 250);
  }

  function refreshTicker() {
    state.tickerItems = buildTickerItems();
    state.tickerIdx = 0;
    if (elements.tickerContent && state.tickerItems.length) {
      elements.tickerContent.textContent = state.tickerItems[0];
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  async function init() {
    cacheElements();
    initTheme();
    initEvents();
    renderBasinTabCounts();

    if (window.i18n) {
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      const initialLang = (urlLang && i18n.LANGUAGES[urlLang]) ? urlLang : i18n.getStoredLang();
      i18n.setLanguage(initialLang);
      if (elements.langSelect) elements.langSelect.value = initialLang;
    }

    const savedLocationSource = loadCachedLocation();
    renderLoadingRow();

    try {
      await telemetryService.load();
    } catch (err) {
      renderErrorRow(err);
      updateTimestamp();
      return;
    }

    updateTimestamp();
    refreshTicker();
    renderAll();

    telemetryService.subscribe(() => renderAll());

    setInterval(refreshLiveData, AUTO_REFRESH_INTERVAL_MS);
    setInterval(rotateTickerFeed, TICKER_ROTATE_MS);
    // Background tabs throttle timers; catch up as soon as the page is looked at again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastRefreshAt > VISIBLE_REFRESH_MIN_MS) refreshLiveData();
    });

    // Refresh the GPS fix only on a first visit or when GPS was the saved choice; a chosen city
    // preset or an explicit "off" must survive reloads (AGENTS.md location persistence).
    if (savedLocationSource === null || savedLocationSource === 'gps') {
      setTimeout(() => requestUserLocation(true), 400);
    }
  }

  async function refreshLiveData() {
    lastRefreshAt = Date.now();
    let result;
    try {
      result = await telemetryService.load();
    } catch (err) {
      return; // keep showing the last good snapshot
    }
    updateTimestamp();
    if (!result.changed) return; // subscribers already re-rendered the new snapshot
    refreshTicker();
    refreshInspector();
    // Highlight the cells whose observed values actually changed
    result.changes.forEach(({ id, delta }) => {
      const row = document.querySelector(`tr[data-dam-id="${id}"]`);
      if (!row) return;
      Object.entries(delta).forEach(([field, [prev, next]]) => {
        const el = row.querySelector(PULSE_TARGETS[field]);
        if (el && isNum(prev) && isNum(next)) triggerPulse(el, next >= prev);
      });
    });
  }

  function renderLoadingRow() {
    if (!elements.damsTbody) return;
    elements.damsTbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 30px; color: var(--text-muted);">
          K-water 물정보포털 관측 자료를 불러오는 중…
        </td>
      </tr>`;
  }

  function renderErrorRow(err) {
    if (!elements.damsTbody) return;
    elements.damsTbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 30px; color: var(--badge-red-text);">
          관측 자료(data/live.json)를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.<br>
          <small style="color: var(--text-muted)">${escapeHtml(err && err.message ? err.message : 'unknown error')}</small>
        </td>
      </tr>`;
  }

  function renderBasinTabCounts() {
    const counts = DAMS.reduce((acc, d) => { acc[d.basin] = (acc[d.basin] || 0) + 1; return acc; }, {});
    elements.basinTabs.forEach((tab) => {
      const basin = tab.getAttribute('data-basin');
      const countEl = tab.querySelector('.tab-count');
      if (!countEl) return;
      countEl.textContent = `(${basin === 'ALL' ? DAMS.length : (counts[basin] || 0)})`;
    });
  }

  /**
   * Restores the saved location preference and returns its source:
   * 'gps' | 'preset' | 'off', or null when the visitor never chose one.
   */
  function loadCachedLocation() {
    const active = readStorage('kdam_geo_active');
    if (active === 'false') return 'off';
    if (active !== 'true') return null;
    try {
      const { lat, lng, label, source } = JSON.parse(readStorage('kdam_user_location'));
      if (!isNum(lat) || !isNum(lng)) return null;
      // Entries saved before the source field existed: only the GPS label meant GPS
      const resolved = source || (label === GPS_LABEL ? 'gps' : 'preset');
      applyLocation(lat, lng, label || GPS_LABEL, resolved, false);
      return resolved;
    } catch (e) {
      return null;
    }
  }

  function updateTimestamp() {
    if (!elements.dataUpdatedTime) return;
    const meta = telemetryService.meta;
    if (meta && meta.observedAt) {
      // observedAt is "YYYY-MM-DD HH:MM" in KST straight from the portal
      elements.dataUpdatedTime.textContent = meta.observedAt.replace(/-/g, '.');
      if (elements.liveBadge) {
        const gen = meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('ko-KR') : '-';
        elements.liveBadge.setAttribute('title', `K-water 물정보포털 관측 시각 ${meta.observedAt} (KST) · 자료 수집 ${gen} · 매시간 자동 갱신`);
      }
    } else {
      elements.dataUpdatedTime.textContent = '--:--';
    }
  }

  // ─── Theme ────────────────────────────────────────────────────────────────────
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
    writeStorage('kdam_theme', state.theme);
    updateThemeIcons();
  }

  // ─── Geolocation ──────────────────────────────────────────────────────────────
  function applyLocation(latitude, longitude, locationLabel, source, saveToStorage = true) {
    state.userLocation = { lat: latitude, lng: longitude };
    state.isGeoActive = true;
    state.sortField = 'distanceKm';
    state.sortOrder = 'asc';
    locationAppliedAt = Date.now();

    if (saveToStorage) {
      writeStorage('kdam_user_location', JSON.stringify({
        lat: latitude,
        lng: longitude,
        label: locationLabel,
        source,
        updatedAt: Date.now()
      }));
      writeStorage('kdam_geo_active', 'true');
    }

    telemetryService.updateUserLocation(latitude, longitude);

    const sorted = [...telemetryService.currentData].sort(
      (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
    );
    const nearest = sorted[0];

    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.add('active');
      elements.btnHeaderGps.setAttribute('title', `${locationLabel} 기준 정렬 활성화됨 (클릭 시 해제)`);
    }

    document.querySelectorAll('.btn-city-preset').forEach((btn) => {
      const bLat = parseFloat(btn.getAttribute('data-lat'));
      const bLng = parseFloat(btn.getAttribute('data-lng'));
      btn.classList.toggle('active', Math.abs(bLat - latitude) < 0.05 && Math.abs(bLng - longitude) < 0.05);
    });

    if (elements.geoInfoBar) {
      elements.geoInfoBar.classList.remove('hidden');
      if (elements.geoInfoText && nearest) {
        elements.geoInfoText.innerHTML = `<strong>${escapeHtml(locationLabel)}</strong>에서 가장 가까운 댐은 <strong>${nearest.name}</strong>(약 <span class="num">${nearest.distanceKm}km</span>)입니다. 가까운 순으로 정렬되었습니다.`;
      }
    }

    renderTable();
  }

  function requestUserLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) alert('사용 중인 브라우저 환경에서 GPS 위치 정보를 지원하지 않습니다.');
      return;
    }

    const requestedAt = Date.now();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // A background refresh must not override a choice the visitor made while it was pending
        if (silent && (locationAppliedAt > requestedAt || readStorage('kdam_geo_active') === 'false')) return;
        const { latitude, longitude } = position.coords;
        applyLocation(latitude, longitude, GPS_LABEL, 'gps', true);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function resetGeoLocation() {
    state.isGeoActive = false;
    state.userLocation = null;
    state.sortField = 'storageRate';
    state.sortOrder = 'desc';

    writeStorage('kdam_geo_active', 'false');

    telemetryService.updateUserLocation(null, null);

    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.remove('active');
      elements.btnHeaderGps.setAttribute('title', '내 위치 기준 가까운 댐 순으로 정렬 (GPS)');
    }

    document.querySelectorAll('.btn-city-preset').forEach((btn) => btn.classList.remove('active'));

    if (elements.geoInfoBar) {
      elements.geoInfoBar.classList.add('hidden');
    }

    renderTable();
  }

  // ─── Filtering & sorting ──────────────────────────────────────────────────────
  function getFilteredDams() {
    const field = SORT_FIELDS[state.sortField] || 'storageRate';
    return telemetryService.currentData.filter((dam) => {
      if (state.activeBasin !== 'ALL' && dam.basin !== state.activeBasin) return false;
      if (state.damTypeFilter !== 'ALL' && dam.type !== state.damTypeFilter) return false;
      if (state.statusFilter !== 'ALL') {
        const code = dam.status ? dam.status.code : 'NO_DATA';
        if (state.statusFilter === 'DISCHARGING' && !(isNum(dam.currentOutflow) && dam.currentOutflow >= THRESHOLDS.DISCHARGE_CMS)) return false;
        if (state.statusFilter === 'DROUGHT' && !(code === 'DROUGHT_ALERT' || code === 'DROUGHT_CAUTION')) return false;
        if (state.statusFilter === 'NORMAL' && !(isNum(dam.storageRate) && dam.storageRate >= THRESHOLDS.DROUGHT_ATTENTION && dam.type !== DAM_TYPES.FLOOD_CONTROL)) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const en = (window.i18n && i18n.getLocationEN(dam.id)) || '';
        if (!dam.name.toLowerCase().includes(q) && !dam.location.toLowerCase().includes(q) &&
            !dam.basin.toLowerCase().includes(q) && !en.toLowerCase().includes(q) && !dam.id.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      // null / missing observations always sink to the bottom regardless of direction
      const aNull = valA === null || valA === undefined;
      const bNull = valB === null || valB === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (typeof valA === 'string') {
        return state.sortOrder === 'asc' ? valA.localeCompare(valB, 'ko') : valB.localeCompare(valA, 'ko');
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
      if (state.prevStats && isNum(state.prevStats[prevKey]) && isNum(numericVal)) {
        triggerPulse(el, numericVal >= state.prevStats[prevKey]);
      }
      if (!state.prevStats) state.prevStats = {};
      state.prevStats[prevKey] = numericVal;
    }
  }

  function renderStats() {
    const isI18n = Boolean(window.i18n);
    const m = telemetryService.getOverviewMetrics();

    updateStatCardValue(elements.valAvgRate, isNum(m.avgStorageRate) ? `${fmt(m.avgStorageRate)}%` : '--%', m.avgStorageRate, 'avgRate');
    updateStatCardValue(elements.valTotalStorage, `${fmtInt(m.totalStorageVolume)} M㎥`, m.totalStorageVolume, 'totalStorage');
    updateStatCardValue(elements.valTotalInflow, `${fmtNum(m.totalInflow)} ㎥/s`, m.totalInflow, 'totalInflow');
    updateStatCardValue(elements.valTotalOutflow, `${fmtNum(m.totalOutflow)} ㎥/s`, m.totalOutflow, 'totalOutflow');

    if (elements.deltaAvgRate) {
      const diffLabel = isI18n ? i18n.t('diffNormalYear') : '예년 대비';
      const diff = m.diffNormalYear;
      elements.deltaAvgRate.textContent = isNum(diff)
        ? `${diffLabel} ${fmtSigned(diff)}%p (예년 ${fmt(m.normalYearRate)}%)`
        : `${diffLabel} --`;
      elements.deltaAvgRate.style.color = isNum(diff) ? (diff >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)') : '';
    }
    if (elements.valTotalCapacity) {
      elements.valTotalCapacity.textContent = `총 저수용량 ${fmtInt(m.totalCapacity)} M㎥ (홍수조절댐 제외)`;
    }
    if (elements.valDischargeCount) {
      if (isI18n && i18n.currentLang !== 'ko') {
        elements.valDischargeCount.textContent = i18n.t('dischargingCount', { count: m.dischargingCount });
      } else {
        elements.valDischargeCount.textContent = `방류 ${THRESHOLDS.DISCHARGE_CMS}㎥/s 이상 ${m.dischargingCount}개소 / 가뭄주의 ${m.droughtCount}개소`;
      }
    }
  }

  function getStatusPresentation(dam) {
    const translated = Boolean(window.i18n) && i18n.currentLang !== 'ko';
    const code = dam.status ? dam.status.code : 'NO_DATA';
    const koLabel = dam.status ? dam.status.label : '관측값 없음';
    switch (code) {
      case 'FLOOD':
        return { badgeClass: 'badge-red', label: `⚠️ ${koLabel}`, barColor: 'var(--bar-fill-red)' };
      case 'DISCHARGE':
        return { badgeClass: 'badge-blue live-discharge', label: `🌊 ${translated ? i18n.t('statusDischarge') : koLabel}`, barColor: 'var(--bar-fill-blue)' };
      case 'DROUGHT_ALERT':
        return { badgeClass: 'badge-red', label: translated ? i18n.t('statusDrought') : koLabel, barColor: 'var(--bar-fill-red)' };
      case 'DROUGHT_CAUTION':
      case 'DROUGHT_ATTENTION':
        return { badgeClass: 'badge-yellow', label: translated ? i18n.t('statusDrought') : koLabel, barColor: 'var(--bar-fill-yellow)' };
      case 'FLOOD_CONTROL':
        return { badgeClass: 'badge-muted', label: translated ? i18n.t('floodControl') : koLabel, barColor: 'var(--bar-fill-blue)' };
      case 'NO_DATA':
        return { badgeClass: 'badge-muted', label: koLabel, barColor: 'var(--border-subtle)' };
      default:
        return { badgeClass: 'badge-green', label: translated ? i18n.t('statusNormal') : koLabel, barColor: 'var(--bar-fill-green)' };
    }
  }

  function renderTable() {
    if (!elements.damsTbody) return;
    if (telemetryService.state === 'error') return;
    if (!telemetryService.meta) { renderLoadingRow(); return; }
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

    const isI18n = Boolean(window.i18n);
    elements.damsTbody.innerHTML = dams.map((dam) => {
      const { badgeClass, label: badgeLabel, barColor } = getStatusPresentation(dam);

      const localizedType = isI18n ? i18n.damType(dam.type) : dam.type;
      const localizedBasin = isI18n ? i18n.basin(dam.basin) : dam.basin;
      const diffColor = isNum(dam.diffNormalYear) ? (dam.diffNormalYear >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)') : 'var(--text-subtle)';
      const diffText = isNum(dam.diffNormalYear) ? `${fmtSigned(dam.diffNormalYear)}%p` : '-';
      const distanceHtml = dam.distanceKm !== null ? `<span class="distance-badge">${dam.distanceKm}km</span>` : '';
      const typeClass = TYPE_BADGE_CLASSES[dam.type] || 'badge-muted';
      const rateWidth = isNum(dam.storageRate) ? Math.min(100, dam.storageRate) : 0;
      const locText = (isI18n && i18n.currentLang !== 'ko' && i18n.getLocationEN(dam.id)) ? i18n.getLocationEN(dam.id) : dam.location;

      return `
        <tr data-dam-id="${dam.id}" tabindex="0" title="${isI18n ? i18n.t('modalTitle') : dam.name + ' 상세 제원 보기'}">
          <td>
            <div class="dam-title-cell">${dam.name} ${distanceHtml}</div>
            <div class="dam-loc-sub">${escapeHtml(locText)}</div>
          </td>
          <td>${localizedBasin}</td>
          <td><span class="badge ${typeClass}">${localizedType}</span></td>
          <td class="text-right">
            <div class="rate-cell-wrap">
              <span class="rate-val live-num">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</span>
              <div class="rate-bar-track">
                <div class="rate-bar-fill" style="width: ${rateWidth}%; background: ${barColor};"></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="text-right num" style="color: ${diffColor}" title="예년 저수율 ${fmt(dam.rateNormalYear)}% · 전년 ${fmt(dam.rateLastYear)}%">${diffText}</td>
          <td class="text-right num">
            <span class="live-num level-val"><strong>${fmt(dam.currentWaterLevel, 2)}</strong></span> <small style="color:var(--text-subtle)">/ ${isNum(dam.normalFullLevel) ? `${dam.normalFullLevel}m` : '-'}</small>
          </td>
          <td class="text-center num"><span class="live-num vol-val">${fmtNum(dam.currentStorageVolume)}</span></td>
          <td class="text-center num"><span class="live-num inflow-val">${fmt(dam.currentInflow)}</span></td>
          <td class="text-center num"><span class="live-num outflow-val font-weight-600">${fmt(dam.currentOutflow)}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ─── Inspector modal ──────────────────────────────────────────────────────────
  let activeModalDamId = null;
  let activeModalPeriod = '24h';

  const PERIOD_TITLES = {
    '24h': '최근 24시간 시간별 저수율(%) 추이',
    '30d': '최근 30일 일별 저수율(%) 추이',
    '1y': '최근 1년 일별 저수율(%) 추이',
    '3y': '최근 3년 저수율(%) 추이',
    '5y': '최근 5년 저수율(%) 추이'
  };

  function renderPeriodTabs(damId, period) {
    return ['24h', '30d', '1y', '3y', '5y'].map((p) => {
      const label = { '24h': '24시간', '30d': '30일', '1y': '1년', '3y': '3년', '5y': '5년' }[p];
      return `<button class="btn-period-tab ${period === p ? 'active' : ''}" data-period="${p}" type="button">${label}</button>`;
    }).join('');
  }

  function renderModalTrendChart(dam, period = '24h', barColor = 'var(--bar-fill-green)', loading = false) {
    const { points, available } = telemetryService.getTrend(dam, period);
    const valid = points.filter((p) => isNum(p.rate));
    const header = (rangeText) => `
      <div class="modal-chart-header">
        <div class="modal-chart-title-wrap">
          <span class="modal-chart-title">${PERIOD_TITLES[period]}</span>
          <span class="modal-chart-range">${rangeText}</span>
        </div>
        <div class="modal-period-tabs" role="tablist" aria-label="추이 기간 선택">${renderPeriodTabs(dam.id, period)}</div>
      </div>`;

    if (loading) {
      return `${header('장기 관측 이력을 불러오는 중…')}<div class="modal-chart-empty">데이터 로딩 중</div>`;
    }
    if (!available || valid.length < 2) {
      return `${header('해당 기간 관측 자료 없음')}<div class="modal-chart-empty">K-water 물정보포털에 이 기간의 자료가 없습니다.</div>`;
    }

    let minRate = Infinity, maxRate = -Infinity;
    valid.forEach((p) => { if (p.rate < minRate) minRate = p.rate; if (p.rate > maxRate) maxRate = p.rate; });
    if (minRate === maxRate) { minRate -= 1; maxRate += 1; }
    const paddingY = (maxRate - minRate) * 0.2 || 1;
    const yMin = Math.max(0, minRate - paddingY);
    const yMax = Math.min(100, maxRate + paddingY);

    const chartW = 500;
    const chartH = 75;
    const n = points.length;
    const coords = [];
    points.forEach((p, idx) => {
      if (!isNum(p.rate)) return;
      const x = (idx / (n - 1 || 1)) * (chartW - 24) + 12;
      const y = chartH - ((p.rate - yMin) / (yMax - yMin || 1)) * (chartH - 20) - 10;
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    const polylinePoints = coords.join(' ');
    const first = coords[0].split(',');
    const last = coords[coords.length - 1].split(',');
    const areaPoints = `${first[0]},${chartH} ${polylinePoints} ${last[0]},${chartH}`;

    const startLabel = points[0].label;
    const midLabel = points[Math.floor(n / 2)].label;
    const endLabel = period === '24h' ? `${points[n - 1].label} 현재` : points[n - 1].label;
    const rangeText = `${minRate.toFixed(1)}% ~ ${maxRate.toFixed(1)}% (변동폭 ${(maxRate - minRate).toFixed(1)}%p · ${valid.length}개 관측값)`;

    return `
      ${header(rangeText)}
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
        <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${barColor}" stroke="var(--surface)" stroke-width="2" />
        <text x="14" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)">${startLabel}</text>
        <text x="${chartW / 2}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="middle">${midLabel}</text>
        <text x="${chartW - 14}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="end">${endLabel}</text>
      </svg>
    `;
  }

  // Long periods need history.json; while it is in flight the chart shows a loading state
  const isTrendLoading = () => activeModalPeriod !== '24h' && !telemetryService.history && Boolean(telemetryService.historyPromise);

  function renderTrendCard() {
    const dam = telemetryService.currentData.find((d) => d.id === activeModalDamId);
    const container = dam && document.getElementById(`modal-trend-card-${dam.id}`);
    if (!container) return;
    container.innerHTML = renderModalTrendChart(dam, activeModalPeriod, getStatusPresentation(dam).barColor, isTrendLoading());
  }

  function switchTrendPeriod(period) {
    activeModalPeriod = period;
    if (period !== '24h' && !telemetryService.history) {
      const damId = activeModalDamId;
      const done = () => { if (activeModalDamId === damId && activeModalPeriod === period) renderTrendCard(); };
      telemetryService.loadHistory().then(done, done);
    }
    renderTrendCard();
  }

  // Fills the modal for the active dam and period from the current snapshot (also used on refresh)
  function renderInspector() {
    const dam = telemetryService.currentData.find((d) => d.id === activeModalDamId);
    if (!dam) return;

    if (elements.modalDamTitle) elements.modalDamTitle.textContent = dam.name;
    if (elements.modalDamSub) elements.modalDamSub.textContent = `${dam.basin} · ${dam.type} · ${dam.agency}${dam.observedAt ? ` · ${dam.observedAt} 관측` : ''}`;

    const { badgeClass, label: badgeLabel, barColor } = getStatusPresentation(dam);

    const chartHtml = renderModalTrendChart(dam, activeModalPeriod, barColor, isTrendLoading());
    const spec = (v, unit = '', digits = 1) => (isNum(v) ? `${fmtNum(v, digits)}${unit}` : '-');
    const isFloodControl = dam.type === DAM_TYPES.FLOOD_CONTROL;

    elements.modalDamContent.innerHTML = `
      <div class="modal-rate-hero">
        <div class="modal-rate-top">
          <div>
            <span class="modal-rate-label">현재 저수율${isFloodControl ? ' (홍수조절댐 · 평시 비움)' : ''}</span>
            <div class="modal-rate-big">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</div>
            <div class="modal-rate-compare">전년 ${fmt(dam.rateLastYear)}% · 예년 ${fmt(dam.rateNormalYear)}% · 유효저수율 ${fmt(dam.effectiveRate)}%</div>
          </div>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="modal-rate-bar-track">
          <div class="modal-rate-bar-fill" style="width: ${isNum(dam.storageRate) ? Math.min(100, dam.storageRate) : 0}%; background: ${barColor};"></div>
        </div>
      </div>

      <div id="modal-trend-card-${dam.id}" class="modal-chart-card">
        ${chartHtml}
      </div>

      <div class="modal-grid-4">
        <div class="modal-stat-box">
          <span>현재 수위</span>
          <strong>${spec(dam.currentWaterLevel, ' EL.m', 2)}</strong>
          <small>상시만수위 ${spec(dam.normalFullLevel, 'm', 1)} · 저수위 ${spec(dam.lowWaterLevel, 'm', 1)}</small>
        </div>
        <div class="modal-stat-box">
          <span>현재 저수량</span>
          <strong>${spec(dam.currentStorageVolume, ' M㎥', 1)}</strong>
          <small>총 저수용량 ${spec(dam.totalStorage, ' M㎥', 1)} · 유효 ${spec(dam.effectiveStorage, ' M㎥', 1)}</small>
        </div>
        <div class="modal-stat-box">
          <span>유입량 (시간 관측)</span>
          <strong style="color: var(--badge-blue-text)">${spec(dam.currentInflow, ' ㎥/s', 2)}</strong>
          <small>전일 평균 유입 ${spec(dam.inflowYesterday, ' ㎥/s', 1)}</small>
        </div>
        <div class="modal-stat-box">
          <span>총방류량 (시간 관측)</span>
          <strong style="color: ${isNum(dam.currentOutflow) && dam.currentOutflow >= THRESHOLDS.DISCHARGE_CMS ? 'var(--badge-blue-text)' : 'inherit'}">${spec(dam.currentOutflow, ' ㎥/s', 2)}</strong>
          <small>전일 평균 방류 ${spec(dam.outflowYesterday, ' ㎥/s', 1)}</small>
        </div>
      </div>

      <div class="modal-specs-section">
        <table class="modal-specs-table">
          <tbody>
            ${dam.distanceKm !== null ? `
            <tr>
              <td>내 위치와의 거리</td>
              <td class="num" style="color: var(--primary); font-weight: 700;">약 ${dam.distanceKm} km</td>
            </tr>` : ''}
            <tr>
              <td>계획홍수위 / 홍수기제한수위</td>
              <td class="num">${spec(dam.floodLevel, ' EL.m', 2)} / ${spec(dam.floodLimitLevel, ' EL.m', 2)}</td>
            </tr>
            <tr>
              <td>홍수조절용량</td>
              <td class="num">${spec(dam.floodControlStorage, ' M㎥', 1)}</td>
            </tr>
            <tr>
              <td>유역면적</td>
              <td class="num">${spec(dam.catchmentArea, ' km²', 1)}</td>
            </tr>
            <tr>
              <td>댐 높이 / 길이 / 형식</td>
              <td class="num">${spec(dam.damHeight, 'm', 1)} / ${spec(dam.damLength, 'm', 1)} / ${escapeHtml(dam.damType || '-')}</td>
            </tr>
            <tr>
              <td>소재지</td>
              <td>${escapeHtml(dam.location)}</td>
            </tr>
            <tr>
              <td>준공연도</td>
              <td class="num">${dam.builtYear ? `${dam.builtYear}년` : '-'}</td>
            </tr>
            <tr>
              <td>관리기관 / 댐코드</td>
              <td>${escapeHtml(dam.agency)} / <span class="num">${dam.code}</span></td>
            </tr>
            <tr>
              <td>자료 출처</td>
              <td><a class="footer-link" href="https://www.water.or.kr/kor/realtime/sumun/index.do?mode=sumun&menuId=13_91_93_94" target="_blank" rel="noopener noreferrer">K-water 물정보포털 수문자료</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

  }

  function openInspector(damId) {
    const modal = elements.modalInspector;
    if (!modal || !telemetryService.currentData.some((d) => d.id === damId)) return;
    const wasOpen = Boolean(activeModalDamId);
    activeModalDamId = damId;
    activeModalPeriod = '24h';
    renderInspector();

    const panel = modal.querySelector('.inspector-modal-panel');
    if (panel) panel.scrollTop = 0;
    const body = modal.querySelector('.modal-body');
    if (body) body.scrollTop = 0;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!wasOpen) focusWhenVisible(elements.btnModalClose);
  }

  // The overlay may refuse focus on the very frame it becomes visible; retry for a few frames
  function focusWhenVisible(el, attempts = 10) {
    if (!el || !activeModalDamId) return;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el && attempts > 1) setTimeout(() => focusWhenVisible(el, attempts - 1), 16);
  }

  // A new snapshot arrived while the modal is open: redraw it in place (same period, same scroll)
  function refreshInspector() {
    if (!activeModalDamId || !elements.modalInspector) return;
    const panel = elements.modalInspector.querySelector('.inspector-modal-panel');
    const scrollTop = panel ? panel.scrollTop : 0;
    renderInspector();
    if (panel) panel.scrollTop = scrollTop;
  }

  function closeInspector() {
    const modal = elements.modalInspector;
    if (!modal || !activeModalDamId) return;
    const damId = activeModalDamId;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activeModalDamId = null;
    // Rows are re-rendered while the modal is open, so return focus to the row by id
    const row = document.querySelector(`tr[data-dam-id="${damId}"]`);
    if (row) row.focus({ preventScroll: true });
  }

  // Keep Tab / Shift+Tab inside the open dialog
  function trapFocus(e) {
    if (e.key !== 'Tab' || !activeModalDamId) return;
    const focusables = [...elements.modalInspector.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!elements.modalInspector.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  // i18n.js re-renders after a language switch
  window.appReRenderTable = renderAll;

  // ─── CSV export (UTF-8 BOM for Excel) ─────────────────────────────────────────
  function exportCsv() {
    const data = getFilteredDams();
    const headers = [
      '댐명', '댐코드', '수계', '구분', '소재지', '관측시각(KST)',
      '현재수위(EL.m)', '상시만수위(EL.m)', '계획홍수위(EL.m)',
      '저수율(%)', '전년저수율(%)', '예년저수율(%)', '유효저수율(%)',
      '현재저수량(백만㎥)', '총저수용량(백만㎥)', '유효저수용량(백만㎥)',
      '유입량(㎥/s)', '총방류량(㎥/s)', '전일유입량(㎥/s)', '전일방류량(㎥/s)',
      '예년대비증감(%p)', '수문상태', '관리기관'
    ];

    const escapeCell = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;
    const cell = (v) => (isNum(v) ? v : '');

    const rows = data.map((d) => [
      escapeCell(d.name), d.code, escapeCell(d.basin), escapeCell(d.type), escapeCell(d.location), escapeCell(d.observedAt),
      cell(d.currentWaterLevel), cell(d.normalFullLevel), cell(d.floodLevel),
      cell(d.storageRate), cell(d.rateLastYear), cell(d.rateNormalYear), cell(d.effectiveRate),
      cell(d.currentStorageVolume), cell(d.totalStorage), cell(d.effectiveStorage),
      cell(d.currentInflow), cell(d.currentOutflow), cell(d.inflowYesterday), cell(d.outflowYesterday),
      cell(d.diffNormalYear), escapeCell(d.status ? d.status.label : ''), escapeCell(d.agency)
    ].join(','));

    const csvContent = '﻿' + headers.join(',') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;

    const stamp = (telemetryService.meta && telemetryService.meta.observedAt ? telemetryService.meta.observedAt : new Date().toISOString().slice(0, 16))
      .replace(/[-: T]/g, '');
    link.download = `대한민국_댐_저수율_${stamp}.csv`;

    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────
  function initEvents() {
    if (elements.langSelect) {
      elements.langSelect.addEventListener('change', (e) => {
        if (window.i18n) i18n.setLanguage(e.target.value);
        renderBasinTabCounts();
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
        if (state.isGeoActive) resetGeoLocation();
        else requestUserLocation(false);
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
        applyLocation(lat, lng, city, 'preset', true);
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
        elements.basinTabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
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
          state.sortOrder = (field === 'name' || field === 'basin' || field === 'type') ? 'asc' : 'desc';
        }
        renderTable();
      });
    });

    // Rows and period tabs are re-rendered often: one delegated listener each instead of inline handlers
    if (elements.damsTbody) {
      elements.damsTbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-dam-id]');
        if (row) openInspector(row.getAttribute('data-dam-id'));
      });
      elements.damsTbody.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const row = e.target.closest('tr[data-dam-id]');
        if (!row) return;
        e.preventDefault();
        openInspector(row.getAttribute('data-dam-id'));
      });
    }
    if (elements.modalDamContent) {
      elements.modalDamContent.addEventListener('click', (e) => {
        const tab = e.target.closest('.btn-period-tab[data-period]');
        if (tab && activeModalDamId) switchTrendPeriod(tab.getAttribute('data-period'));
      });
    }
    if (elements.btnModalClose) elements.btnModalClose.addEventListener('click', closeInspector);
    if (elements.modalBackdrop) elements.modalBackdrop.addEventListener('click', closeInspector);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') closeInspector();
      trapFocus(e);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
