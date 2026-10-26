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
  // Every visible string comes from js/i18n.js; Korean is its fallback language
  const tr = (key, params) => (window.i18n ? i18n.t(key, params) : key);
  const localizedBasin = (basin) => (window.i18n ? i18n.basin(basin) : basin);
  const localizedType = (type) => (window.i18n ? i18n.damType(type) : type);
  const localizedLocation = (dam) => (window.i18n && i18n.currentLang !== 'ko' && i18n.getLocationEN(dam.id)) || dam.location;
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
      items.push(tr('tickerSync', { time: m.observedAt, count: m.observedDams }));
    }
    if (isNum(m.avgStorageRate)) {
      const diff = isNum(m.diffNormalYear) ? tr('tickerAvgDiff', { normal: fmt(m.normalYearRate), diff: fmtSigned(m.diffNormalYear) }) : '';
      items.push(tr('tickerAvg', { rate: fmt(m.avgStorageRate) }) + diff);
    }

    const storageDams = data.filter((d) => d.type !== DAM_TYPES.FLOOD_CONTROL);
    const byInflow = [...data].filter((d) => isNum(d.currentInflow)).sort((a, b) => b.currentInflow - a.currentInflow);
    const byOutflow = [...data].filter((d) => isNum(d.currentOutflow)).sort((a, b) => b.currentOutflow - a.currentOutflow);
    const lowest = [...storageDams].sort((a, b) => a.storageRate - b.storageRate);
    const highest = [...storageDams].sort((a, b) => b.storageRate - a.storageRate);

    if (byInflow[0]) {
      const d = byInflow[0];
      items.push(tr('tickerInflow', { basin: localizedBasin(d.basin), name: d.name, inflow: fmt(d.currentInflow), rate: fmt(d.storageRate) }));
    }
    if (byOutflow[0]) {
      const d = byOutflow[0];
      items.push(tr('tickerOutflow', { basin: localizedBasin(d.basin), name: d.name, outflow: fmt(d.currentOutflow), cms: THRESHOLDS.DISCHARGE_CMS, count: m.dischargingCount }));
    }
    if (lowest[0]) {
      const l = lowest.slice(0, 3).map((d) => `${d.name} ${fmt(d.storageRate)}%`).join(' · ');
      items.push(tr('tickerLowest', { list: l, threshold: THRESHOLDS.DROUGHT_CAUTION, count: m.droughtCount }));
    }
    if (highest[0]) {
      const d = highest[0];
      items.push(tr('tickerHighest', { basin: localizedBasin(d.basin), name: d.name, rate: fmt(d.storageRate), diff: fmtSigned(d.diffNormalYear) }));
    }
    const jwam = data.find((d) => d.id === 'jwam');
    if (jwam && isNum(jwam.rateLastYear)) {
      items.push(tr('tickerFocus', { basin: localizedBasin(jwam.basin), name: jwam.name, rate: fmt(jwam.storageRate), lastYear: fmt(jwam.rateLastYear), normal: fmt(jwam.rateNormalYear) }));
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
          ${tr('loadingData')}
        </td>
      </tr>`;
  }

  function renderErrorRow(err) {
    if (!elements.damsTbody) return;
    elements.damsTbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 30px; color: var(--badge-red-text);">
          ${tr('loadError')}<br>
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
        elements.liveBadge.setAttribute('title', tr('liveBadgeTitle', { time: meta.observedAt, collected: gen }));
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
    state.locationLabel = locationLabel;
    state.locationSource = source;
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

    document.querySelectorAll('.btn-city-preset').forEach((btn) => {
      const bLat = parseFloat(btn.getAttribute('data-lat'));
      const bLng = parseFloat(btn.getAttribute('data-lng'));
      btn.classList.toggle('active', Math.abs(bLat - latitude) < 0.05 && Math.abs(bLng - longitude) < 0.05);
    });

    renderGeoState();
    renderTable();
  }

  // GPS button title and the "nearest dam" banner, in the current language
  function renderGeoState() {
    const place = state.locationSource === 'gps' ? tr('gpsLabel') : state.locationLabel;
    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.toggle('active', state.isGeoActive);
      elements.btnHeaderGps.setAttribute('title', state.isGeoActive ? tr('gpsActiveTitle', { place }) : tr('gpsIdleTitle'));
    }
    if (!elements.geoInfoBar) return;
    elements.geoInfoBar.classList.toggle('hidden', !state.isGeoActive);
    const nearest = state.isGeoActive && [...telemetryService.currentData]
      .filter((d) => d.distanceKm !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
    if (elements.geoInfoText && nearest) {
      elements.geoInfoText.innerHTML = tr('geoNearest', { place: escapeHtml(place), name: nearest.name, km: nearest.distanceKm });
    }
  }

  function requestUserLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) alert(tr('gpsUnsupported'));
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
          alert(tr(error.code === error.PERMISSION_DENIED ? 'gpsDenied' : 'gpsFailed'));
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
    document.querySelectorAll('.btn-city-preset').forEach((btn) => btn.classList.remove('active'));
    renderGeoState();
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
    renderGeoState();
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
    const m = telemetryService.getOverviewMetrics();

    updateStatCardValue(elements.valAvgRate, isNum(m.avgStorageRate) ? `${fmt(m.avgStorageRate)}%` : '--%', m.avgStorageRate, 'avgRate');
    updateStatCardValue(elements.valTotalStorage, `${fmtInt(m.totalStorageVolume)} M㎥`, m.totalStorageVolume, 'totalStorage');
    updateStatCardValue(elements.valTotalInflow, `${fmtNum(m.totalInflow)} ㎥/s`, m.totalInflow, 'totalInflow');
    updateStatCardValue(elements.valTotalOutflow, `${fmtNum(m.totalOutflow)} ㎥/s`, m.totalOutflow, 'totalOutflow');

    if (elements.deltaAvgRate) {
      const diffLabel = tr('diffNormalYear');
      const diff = m.diffNormalYear;
      elements.deltaAvgRate.textContent = isNum(diff)
        ? `${diffLabel} ${fmtSigned(diff)}%p ${tr('statNormalYear', { rate: fmt(m.normalYearRate) })}`
        : `${diffLabel} --`;
      elements.deltaAvgRate.style.color = isNum(diff) ? (diff >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)') : '';
    }
    if (elements.valTotalCapacity) {
      elements.valTotalCapacity.textContent = tr('totalCapacityDesc', { capacity: fmtInt(m.totalCapacity) });
    }
    if (elements.valDischargeCount) {
      elements.valDischargeCount.textContent = tr('statusSummary', { cms: THRESHOLDS.DISCHARGE_CMS, count: m.dischargingCount, drought: m.droughtCount });
    }
  }

  // status.code → badge look and translation key (Korean labels equal data.js status.label)
  const STATUS_PRESENTATION = {
    FLOOD: { badgeClass: 'badge-red', key: 'badgeFlood', icon: '⚠️ ', barColor: 'var(--bar-fill-red)' },
    DISCHARGE: { badgeClass: 'badge-blue live-discharge', key: 'badgeDischarge', icon: '🌊 ', barColor: 'var(--bar-fill-blue)' },
    DROUGHT_ALERT: { badgeClass: 'badge-red', key: 'badgeDroughtAlert', barColor: 'var(--bar-fill-red)' },
    DROUGHT_CAUTION: { badgeClass: 'badge-yellow', key: 'badgeDroughtCaution', barColor: 'var(--bar-fill-yellow)' },
    DROUGHT_ATTENTION: { badgeClass: 'badge-yellow', key: 'badgeDroughtAttention', barColor: 'var(--bar-fill-yellow)' },
    FLOOD_CONTROL: { badgeClass: 'badge-muted', key: 'badgeFloodControl', barColor: 'var(--bar-fill-blue)' },
    NO_DATA: { badgeClass: 'badge-muted', key: 'badgeNoData', barColor: 'var(--border-subtle)' },
    NORMAL: { badgeClass: 'badge-green', key: 'badgeNormal', barColor: 'var(--bar-fill-green)' }
  };

  function getStatusPresentation(dam) {
    const p = STATUS_PRESENTATION[dam.status ? dam.status.code : 'NO_DATA'] || STATUS_PRESENTATION.NORMAL;
    return { badgeClass: p.badgeClass, label: `${p.icon || ''}${tr(p.key)}`, barColor: p.barColor };
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
            ${tr('noResults')}
          </td>
        </tr>
      `;
      return;
    }

    elements.damsTbody.innerHTML = dams.map((dam) => {
      const { badgeClass, label: badgeLabel, barColor } = getStatusPresentation(dam);

      const diffColor = isNum(dam.diffNormalYear) ? (dam.diffNormalYear >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)') : 'var(--text-subtle)';
      const diffText = isNum(dam.diffNormalYear) ? `${fmtSigned(dam.diffNormalYear)}%p` : '-';
      const distanceHtml = dam.distanceKm !== null ? `<span class="distance-badge">${dam.distanceKm}km</span>` : '';
      const typeClass = TYPE_BADGE_CLASSES[dam.type] || 'badge-muted';
      const rateWidth = isNum(dam.storageRate) ? Math.min(100, dam.storageRate) : 0;

      return `
        <tr data-dam-id="${dam.id}" tabindex="0" title="${tr('modalTitle')}">
          <td>
            <div class="dam-title-cell">${dam.name} ${distanceHtml}</div>
            <div class="dam-loc-sub">${escapeHtml(localizedLocation(dam))}</div>
          </td>
          <td>${localizedBasin(dam.basin)}</td>
          <td><span class="badge ${typeClass}">${localizedType(dam.type)}</span></td>
          <td class="text-right">
            <div class="rate-cell-wrap">
              <span class="rate-val live-num">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</span>
              <div class="rate-bar-track">
                <div class="rate-bar-fill" style="width: ${rateWidth}%; background: ${barColor};"></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="text-right num" style="color: ${diffColor}" title="${tr('diffCellTitle', { normal: fmt(dam.rateNormalYear), lastYear: fmt(dam.rateLastYear) })}">${diffText}</td>
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

  const PERIODS = ['24h', '30d', '1y', '3y', '5y'];

  function renderPeriodTabs(damId, period) {
    return PERIODS.map((p) => {
      return `<button class="btn-period-tab ${period === p ? 'active' : ''}" data-period="${p}" type="button">${tr(`period${p}`)}</button>`;
    }).join('');
  }

  function renderModalTrendChart(dam, period = '24h', barColor = 'var(--bar-fill-green)', loading = false) {
    const { points, available } = telemetryService.getTrend(dam, period);
    const valid = points.filter((p) => isNum(p.rate));
    const header = (rangeText) => `
      <div class="modal-chart-header">
        <div class="modal-chart-title-wrap">
          <span class="modal-chart-title">${tr(`trendTitle${period}`)}</span>
          <span class="modal-chart-range">${rangeText}</span>
        </div>
        <div class="modal-period-tabs" role="tablist" aria-label="${tr('periodTabsLabel')}">${renderPeriodTabs(dam.id, period)}</div>
      </div>`;

    if (loading) {
      return `${header(tr('chartLoadingRange'))}<div class="modal-chart-empty">${tr('chartLoading')}</div>`;
    }
    if (!available || valid.length < 2) {
      return `${header(tr('chartNoDataRange'))}<div class="modal-chart-empty">${tr('chartNoData')}</div>`;
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
    const endLabel = period === '24h' ? tr('chartNow', { time: points[n - 1].label }) : points[n - 1].label;
    const rangeText = tr('chartRange', { min: minRate.toFixed(1), max: maxRate.toFixed(1), span: (maxRate - minRate).toFixed(1), count: valid.length });

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
    if (elements.modalDamSub) elements.modalDamSub.textContent = `${localizedBasin(dam.basin)} · ${localizedType(dam.type)} · ${dam.agency}${dam.observedAt ? ` · ${tr('modalObserved', { time: dam.observedAt })}` : ''}`;

    const { badgeClass, label: badgeLabel, barColor } = getStatusPresentation(dam);

    const chartHtml = renderModalTrendChart(dam, activeModalPeriod, barColor, isTrendLoading());
    const spec = (v, unit = '', digits = 1) => (isNum(v) ? `${fmtNum(v, digits)}${unit}` : '-');
    const isFloodControl = dam.type === DAM_TYPES.FLOOD_CONTROL;

    elements.modalDamContent.innerHTML = `
      <div class="modal-rate-hero">
        <div class="modal-rate-top">
          <div>
            <span class="modal-rate-label">${tr('modalCurrentRate')}${isFloodControl ? tr('modalFloodControlNote') : ''}</span>
            <div class="modal-rate-big">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</div>
            <div class="modal-rate-compare">${tr('modalCompare', { lastYear: fmt(dam.rateLastYear), normal: fmt(dam.rateNormalYear), effective: fmt(dam.effectiveRate) })}</div>
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
          <span>${tr('modalLevel')}</span>
          <strong>${spec(dam.currentWaterLevel, ' EL.m', 2)}</strong>
          <small>${tr('modalLevelSub', { normalFull: spec(dam.normalFullLevel, 'm', 1), low: spec(dam.lowWaterLevel, 'm', 1) })}</small>
        </div>
        <div class="modal-stat-box">
          <span>${tr('modalVolume')}</span>
          <strong>${spec(dam.currentStorageVolume, ' M㎥', 1)}</strong>
          <small>${tr('modalVolumeSub', { total: spec(dam.totalStorage, ' M㎥', 1), effective: spec(dam.effectiveStorage, ' M㎥', 1) })}</small>
        </div>
        <div class="modal-stat-box">
          <span>${tr('modalInflow')}</span>
          <strong style="color: var(--badge-blue-text)">${spec(dam.currentInflow, ' ㎥/s', 2)}</strong>
          <small>${tr('modalInflowSub', { value: spec(dam.inflowYesterday, ' ㎥/s', 1) })}</small>
        </div>
        <div class="modal-stat-box">
          <span>${tr('modalOutflow')}</span>
          <strong style="color: ${isNum(dam.currentOutflow) && dam.currentOutflow >= THRESHOLDS.DISCHARGE_CMS ? 'var(--badge-blue-text)' : 'inherit'}">${spec(dam.currentOutflow, ' ㎥/s', 2)}</strong>
          <small>${tr('modalOutflowSub', { value: spec(dam.outflowYesterday, ' ㎥/s', 1) })}</small>
        </div>
      </div>

      <div class="modal-specs-section">
        <table class="modal-specs-table">
          <tbody>
            ${dam.distanceKm !== null ? `
            <tr>
              <td>${tr('specDistance')}</td>
              <td class="num" style="color: var(--primary); font-weight: 700;">${tr('specDistanceValue', { km: dam.distanceKm })}</td>
            </tr>` : ''}
            <tr>
              <td>${tr('specFloodLevels')}</td>
              <td class="num">${spec(dam.floodLevel, ' EL.m', 2)} / ${spec(dam.floodLimitLevel, ' EL.m', 2)}</td>
            </tr>
            <tr>
              <td>${tr('specFloodStorage')}</td>
              <td class="num">${spec(dam.floodControlStorage, ' M㎥', 1)}</td>
            </tr>
            <tr>
              <td>${tr('specCatchment')}</td>
              <td class="num">${spec(dam.catchmentArea, ' km²', 1)}</td>
            </tr>
            <tr>
              <td>${tr('specDimensions')}</td>
              <td class="num">${spec(dam.damHeight, 'm', 1)} / ${spec(dam.damLength, 'm', 1)} / ${escapeHtml(dam.damType || '-')}</td>
            </tr>
            <tr>
              <td>${tr('specLocation')}</td>
              <td>${escapeHtml(localizedLocation(dam))}</td>
            </tr>
            <tr>
              <td>${tr('specBuilt')}</td>
              <td class="num">${dam.builtYear ? tr('specBuiltValue', { year: dam.builtYear }) : '-'}</td>
            </tr>
            <tr>
              <td>${tr('specAgency')}</td>
              <td>${escapeHtml(dam.agency)} / <span class="num">${dam.code}</span></td>
            </tr>
            <tr>
              <td>${tr('specSource')}</td>
              <td><a class="footer-link" href="https://www.water.or.kr/kor/realtime/sumun/index.do?mode=sumun&menuId=13_91_93_94" target="_blank" rel="noopener noreferrer">${tr('specSourceLink')}</a></td>
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
  window.appReRenderTable = () => {
    renderAll();
    if (!telemetryService.meta) return;
    refreshTicker();
    updateTimestamp();
    refreshInspector();
  };

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
