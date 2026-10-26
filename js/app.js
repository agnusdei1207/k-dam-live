/**
 * ============================================================================
 * K-DAM LIVE — Presentation layer
 * Renders the real K-water observation snapshot loaded by js/data.js: overview map,
 * summary cards, basin summary, the dam table, the detail dialog and the CSV export.
 * Every number shown here is a portal observation or arithmetic on observations.
 * ============================================================================
 */

(function(window) {
  'use strict';

  const { telemetryService, DAM_TYPES, DAMS, RATE_BANDS, rateBand } = window.KDAM || {};
  const MAP = window.KDAM_MAP;

  if (!telemetryService || !MAP) {
    console.error('KDAM telemetry service or map unavailable');
    return;
  }

  // data/live.json is redeployed when the portal publishes a new hour; poll it every 10 minutes.
  const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
  const VISIBLE_REFRESH_MIN_MS = 60 * 1000;
  const GPS_LABEL = '현재 GPS 위치';
  const TABLE_COLUMNS = 9;

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

  const PERIODS = ['24h', '30d', '1y', '3y', '5y'];

  const state = {
    activeBasin: 'ALL',
    damTypeFilter: 'ALL',
    normalFilter: 'ALL',
    searchQuery: '',
    sortField: 'storageRate',
    sortOrder: 'desc',
    userLocation: null,
    locationLabel: null,
    locationSource: null,
    isGeoActive: false,
    theme: readStorage('kdam_theme') || 'dark',
    prevStats: {}
  };

  let elements = {};
  let lastRefreshAt = Date.now();
  let locationAppliedAt = 0;
  let activeModalDamId = null;
  let activeModalPeriod = '24h';
  let modalOpener = null; // selector of the element that opened the dialog, for returning focus

  // Storage can throw (blocked site data, some private modes); the page must still work without it.
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function cacheElements() {
    const $ = (id) => document.getElementById(id);
    elements = {
      dataUpdatedTime: $('data-updated-time'),
      liveBadge: document.querySelector('.live-badge'),
      btnExportCsv: $('btn-export-csv'),
      btnHeaderGps: $('btn-header-gps'),
      btnThemeToggle: $('btn-theme-toggle'),
      themeMoon: $('theme-moon'),
      themeSun: $('theme-sun'),
      langSelect: $('lang-select'),

      overviewMap: $('overview-map'),
      mapLegend: $('map-legend'),
      basinList: $('basin-list'),
      valAvgRate: $('val-avg-rate'),
      deltaAvgRate: $('delta-avg-rate'),
      valTotalStorage: $('val-total-storage'),
      valTotalCapacity: $('val-total-capacity'),
      valBelowNormal: $('val-below-normal'),
      cardLowest: $('card-lowest'),
      valLowestRate: $('val-lowest-rate'),
      valLowestName: $('val-lowest-name'),

      searchInput: $('search-input'),
      geoInfoBar: $('geo-info-bar'),
      geoInfoText: $('geo-info-text'),
      btnGeoReset: $('btn-geo-reset'),

      basinTabs: document.querySelectorAll('.tab-btn'),
      selectDamType: $('select-dam-type'),
      selectNormalFilter: $('select-normal-filter'),

      damsTbody: $('dams-tbody'),
      tableHeaders: document.querySelectorAll('#dams-table thead th.sortable'),

      modalInspector: $('dam-inspector-modal'),
      modalDamTitle: $('modal-dam-title'),
      modalDamSub: $('modal-dam-sub'),
      modalDamContent: $('modal-dam-content'),
      btnModalClose: $('btn-modal-close'),
      modalBackdrop: document.querySelector('.inspector-modal-backdrop')
    };
  }

  // ─── Formatting helpers (every value may be null when the portal has no observation) ───
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const fmt = (v, digits = 1) => (isNum(v) ? v.toFixed(digits) : '-');
  const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString() : '-');
  const fmtNum = (v, digits = 1) => (isNum(v) ? Number(v.toFixed(digits)).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '-');
  const fmtSigned = (v, digits = 1) => (isNum(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}` : '-');
  const trendClass = (v) => (isNum(v) ? (v >= 0 ? 'is-up' : 'is-down') : '');
  // Every visible string comes from js/i18n.js; Korean is its fallback language
  const tr = (key, params) => (window.i18n ? i18n.t(key, params) : key);
  const localizedBasin = (basin) => (window.i18n ? i18n.basin(basin) : basin);
  const localizedType = (type) => (window.i18n ? i18n.damType(type) : type);
  const localizedLocation = (dam) => (window.i18n && i18n.currentLang !== 'ko' && i18n.getLocationEN(dam.id)) || dam.location;
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bandClass = (band) => `band-${band === null ? 'na' : band}`;
  const findDam = (id) => telemetryService.currentData.find((d) => d.id === id);

  function triggerPulse(el, isUp) {
    if (!el) return;
    const pulseClass = isUp ? 'live-pulse-up' : 'live-pulse-down';
    el.classList.remove('live-pulse-up', 'live-pulse-down');
    void el.offsetWidth; // force reflow so the keyframe restarts
    el.classList.add(pulseClass);
    setTimeout(() => el.classList.remove(pulseClass), 2200);
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
    renderAll();
    telemetryService.subscribe(() => renderAll());

    setInterval(refreshLiveData, AUTO_REFRESH_INTERVAL_MS);
    // Background tabs throttle timers; catch up as soon as the page is looked at again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastRefreshAt > VISIBLE_REFRESH_MIN_MS) refreshLiveData();
    });

    // Refresh the GPS fix only on a first visit or when GPS was the saved choice; a saved place
    // or an explicit "off" must survive reloads (AGENTS.md location persistence).
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

  function renderMessageRow(html, color) {
    if (!elements.damsTbody) return;
    elements.damsTbody.innerHTML = `<tr><td colspan="${TABLE_COLUMNS}" class="text-center" style="padding: 30px; color: ${color};">${html}</td></tr>`;
  }

  const renderLoadingRow = () => renderMessageRow(tr('loadingData'), 'var(--text-muted)');
  const renderErrorRow = (err) => renderMessageRow(
    `${tr('loadError')}<br><small style="color: var(--text-muted)">${escapeHtml(err && err.message ? err.message : 'unknown error')}</small>`,
    'var(--badge-red-text)'
  );

  function renderBasinTabCounts() {
    const counts = DAMS.reduce((acc, d) => { acc[d.basin] = (acc[d.basin] || 0) + 1; return acc; }, {});
    elements.basinTabs.forEach((tab) => {
      const basin = tab.getAttribute('data-basin');
      const countEl = tab.querySelector('.tab-count');
      if (countEl) countEl.textContent = `(${basin === 'ALL' ? DAMS.length : (counts[basin] || 0)})`;
    });
  }

  /**
   * Restores the saved location preference and returns its source:
   * 'gps' | 'preset' | 'off', or null when the visitor never chose one.
   * ('preset' entries come from the city buttons of earlier versions and are still honoured.)
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
        const locale = window.i18n ? i18n.currentLang : 'ko';
        const gen = meta.generatedAt ? new Date(meta.generatedAt).toLocaleString(locale, { timeZone: 'Asia/Seoul' }) : '-';
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
    elements.themeMoon.classList.toggle('hidden', state.theme !== 'dark');
    elements.themeSun.classList.toggle('hidden', state.theme === 'dark');
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
      writeStorage('kdam_user_location', JSON.stringify({ lat: latitude, lng: longitude, label: locationLabel, source, updatedAt: Date.now() }));
      writeStorage('kdam_geo_active', 'true');
    }

    telemetryService.updateUserLocation(latitude, longitude);
    renderGeoState();
    renderTable();
    renderMap();
  }

  // GPS button title and the "nearest dam" banner, in the current language
  function renderGeoState() {
    const place = state.locationSource === 'gps' ? tr('gpsLabel') : state.locationLabel;
    if (elements.btnHeaderGps) {
      elements.btnHeaderGps.classList.toggle('active', state.isGeoActive);
      const title = state.isGeoActive ? tr('gpsActiveTitle', { place }) : tr('gpsIdleTitle');
      elements.btnHeaderGps.setAttribute('title', title);
      elements.btnHeaderGps.setAttribute('aria-label', title);
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
        if (!silent) alert(tr(error.code === error.PERMISSION_DENIED ? 'gpsDenied' : 'gpsFailed'));
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
    renderGeoState();
    renderTable();
    renderMap();
  }

  // ─── Filtering & sorting ──────────────────────────────────────────────────────
  function matchesFilters(dam) {
    if (state.activeBasin !== 'ALL' && dam.basin !== state.activeBasin) return false;
    if (state.damTypeFilter !== 'ALL' && dam.type !== state.damTypeFilter) return false;
    if (state.normalFilter === 'BELOW' && !(isNum(dam.diffNormalYear) && dam.diffNormalYear < 0)) return false;
    if (state.normalFilter === 'ABOVE' && !(isNum(dam.diffNormalYear) && dam.diffNormalYear >= 0)) return false;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const en = (window.i18n && i18n.getLocationEN(dam.id)) || '';
      if (!dam.name.toLowerCase().includes(q) && !dam.location.toLowerCase().includes(q) &&
          !dam.basin.toLowerCase().includes(q) && !en.toLowerCase().includes(q) && !dam.id.includes(q)) return false;
    }
    return true;
  }

  function getFilteredDams() {
    const field = SORT_FIELDS[state.sortField] || 'storageRate';
    return telemetryService.currentData.filter(matchesFilters).sort((a, b) => {
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

  function setBasin(basin) {
    state.activeBasin = basin;
    elements.basinTabs.forEach((t) => {
      const on = t.getAttribute('data-basin') === basin;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    renderFiltered();
  }

  // Filters change the table, the dimming on the map and the highlighted basin row
  function renderFiltered() {
    renderTable();
    renderMap();
    renderBasins();
  }

  function renderAll() {
    renderStats();
    renderLegend();
    renderFiltered();
    renderGeoState();
  }

  // ─── Overview: map, cards, basins ─────────────────────────────────────────────
  const dotLabel = (dam) => `${dam.name} · ${isNum(dam.storageRate) ? `${fmt(dam.storageRate)}%` : '-'}`;

  function renderMap() {
    if (!elements.overviewMap || !telemetryService.meta) return;
    const visible = new Set(telemetryService.currentData.filter(matchesFilters).map((d) => d.id));
    const dimmed = new Set(telemetryService.currentData.filter((d) => !visible.has(d.id)).map((d) => d.id));
    elements.overviewMap.innerHTML = MAP.svg({
      dams: telemetryService.currentData,
      bandOf: rateBand,
      label: dotLabel,
      dimmed,
      user: state.userLocation,
      title: tr('mapTitle')
    });
  }

  function renderLegend() {
    if (!elements.mapLegend) return;
    const edges = [0, ...RATE_BANDS];
    const items = edges.map((from, i) => {
      const text = i === edges.length - 1 ? `≥ ${from}%` : `${from}–${edges[i + 1]}%`;
      return `<span class="legend-item ${bandClass(i)}"><span class="legend-swatch"></span>${text}</span>`;
    });
    items.push(`<span class="legend-item band-flood"><span class="legend-swatch"></span>${escapeHtml(tr('legendFlood'))}</span>`);
    elements.mapLegend.innerHTML = items.join('');
  }

  function updateStatCardValue(el, text, numericVal, key) {
    if (!el || el.textContent.trim() === text) return;
    el.textContent = text;
    if (isNum(state.prevStats[key]) && isNum(numericVal)) triggerPulse(el, numericVal >= state.prevStats[key]);
    state.prevStats[key] = numericVal;
  }

  function renderStats() {
    const m = telemetryService.getOverviewMetrics();
    updateStatCardValue(elements.valAvgRate, isNum(m.avgStorageRate) ? `${fmt(m.avgStorageRate)}%` : '--%', m.avgStorageRate, 'avgRate');
    updateStatCardValue(elements.valTotalStorage, `${fmtInt(m.totalStorageVolume)} M㎥`, m.totalStorageVolume, 'totalStorage');

    if (elements.deltaAvgRate) {
      const diff = m.diffNormalYear;
      elements.deltaAvgRate.textContent = isNum(diff)
        ? `${tr('diffNormalYear')} ${fmtSigned(diff)}%p ${tr('statNormalYear', { rate: fmt(m.normalYearRate) })}`
        : `${tr('diffNormalYear')} --`;
      elements.deltaAvgRate.className = `stat-card-desc ${trendClass(diff)}`;
    }
    if (elements.valTotalCapacity) {
      elements.valTotalCapacity.textContent = tr('totalCapacityDesc', { capacity: fmtInt(m.totalCapacity) });
    }
    if (elements.valBelowNormal) {
      elements.valBelowNormal.textContent = m.comparableDams ? `${m.belowNormalCount} / ${m.comparableDams}` : '--';
    }
    const low = m.lowestDam;
    if (elements.valLowestRate) elements.valLowestRate.textContent = low ? `${fmt(low.storageRate)}%` : '--%';
    if (elements.valLowestName) elements.valLowestName.textContent = low ? low.name : '--';
    if (elements.cardLowest) {
      elements.cardLowest.disabled = !low;
      elements.cardLowest.dataset.damId = low ? low.id : '';
    }
  }

  function renderBasins() {
    if (!elements.basinList || !telemetryService.meta) return;
    elements.basinList.innerHTML = telemetryService.getBasinMetrics().map((b) => {
      const band = rateBand({ storageRate: b.storageRate, type: DAM_TYPES.MULTIPURPOSE });
      return `<li><button type="button" class="basin-row ${bandClass(band)}${state.activeBasin === b.basin ? ' active' : ''}" data-basin="${escapeHtml(b.basin)}" aria-pressed="${state.activeBasin === b.basin}">
          <span class="basin-name">${escapeHtml(localizedBasin(b.basin))}</span>
          <span class="basin-bar"><span style="width: ${isNum(b.storageRate) ? Math.min(100, b.storageRate) : 0}%"></span></span>
          <span class="basin-rate">${isNum(b.storageRate) ? `${fmt(b.storageRate)}%` : '-'}</span>
          <span class="basin-diff ${trendClass(b.diffNormalYear)}" title="${escapeHtml(tr('diffNormalYear'))}">${isNum(b.diffNormalYear) ? `${fmtSigned(b.diffNormalYear)}%p` : '-'}</span>
        </button></li>`;
    }).join('');
  }

  // ─── Table ────────────────────────────────────────────────────────────────────
  function renderTable() {
    if (!elements.damsTbody) return;
    if (telemetryService.state === 'error') return;
    if (!telemetryService.meta) { renderLoadingRow(); return; }
    const dams = getFilteredDams();
    if (dams.length === 0) { renderMessageRow(tr('noResults'), 'var(--text-muted)'); return; }

    elements.damsTbody.innerHTML = dams.map((dam) => {
      const distanceHtml = dam.distanceKm !== null ? `<span class="distance-badge">${dam.distanceKm}km</span>` : '';
      const rateWidth = isNum(dam.storageRate) ? Math.min(100, dam.storageRate) : 0;
      return `
        <tr data-dam-id="${dam.id}" tabindex="0" title="${escapeHtml(tr('modalTitle'))}">
          <td>
            <div class="dam-title-cell">${dam.name} ${distanceHtml}</div>
            <div class="dam-loc-sub">${escapeHtml(localizedLocation(dam))}</div>
          </td>
          <td>${localizedBasin(dam.basin)}</td>
          <td><span class="badge ${TYPE_BADGE_CLASSES[dam.type] || ''}">${localizedType(dam.type)}</span></td>
          <td class="text-right">
            <div class="rate-cell-wrap ${bandClass(rateBand(dam))}">
              <span class="rate-val live-num">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</span>
              <div class="rate-bar-track"><div class="rate-bar-fill" style="width: ${rateWidth}%; background: var(--band-color);"></div></div>
            </div>
          </td>
          <td class="text-right num ${trendClass(dam.diffNormalYear)}" title="${escapeHtml(tr('diffCellTitle', { normal: fmt(dam.rateNormalYear), lastYear: fmt(dam.rateLastYear) }))}">${isNum(dam.diffNormalYear) ? `${fmtSigned(dam.diffNormalYear)}%p` : '-'}</td>
          <td class="text-right num">
            <span class="live-num level-val"><strong>${fmt(dam.currentWaterLevel, 2)}</strong></span> <small style="color:var(--text-subtle)">/ ${isNum(dam.normalFullLevel) ? `${dam.normalFullLevel}m` : '-'}</small>
          </td>
          <td class="text-center num"><span class="live-num vol-val">${fmtNum(dam.currentStorageVolume)}</span></td>
          <td class="text-center num"><span class="live-num inflow-val">${fmt(dam.currentInflow)}</span></td>
          <td class="text-center num"><span class="live-num outflow-val">${fmt(dam.currentOutflow)}</span></td>
        </tr>`;
    }).join('');
  }

  // ─── Detail dialog ────────────────────────────────────────────────────────────
  function renderPeriodTabs(period) {
    return PERIODS.map((p) => `<button class="btn-period-tab ${period === p ? 'active' : ''}" data-period="${p}" type="button">${tr(`period${p}`)}</button>`).join('');
  }

  function renderModalTrendChart(dam, period, loading = false) {
    const { points, available } = telemetryService.getTrend(dam, period);
    const valid = points.filter((p) => isNum(p.rate));
    const header = (rangeText) => `
      <div class="modal-chart-header">
        <div class="modal-chart-title-wrap">
          <span class="modal-chart-title">${tr(`trendTitle${period}`)}</span>
          <span class="modal-chart-range">${rangeText}</span>
        </div>
        <div class="modal-period-tabs" role="tablist" aria-label="${tr('periodTabsLabel')}">${renderPeriodTabs(period)}</div>
      </div>`;

    if (loading) return `${header(tr('chartLoadingRange'))}<div class="modal-chart-empty">${tr('chartLoading')}</div>`;
    if (!available || valid.length < 2) return `${header(tr('chartNoDataRange'))}<div class="modal-chart-empty">${tr('chartNoData')}</div>`;

    let minRate = Infinity, maxRate = -Infinity;
    valid.forEach((p) => { if (p.rate < minRate) minRate = p.rate; if (p.rate > maxRate) maxRate = p.rate; });
    const lo = minRate === maxRate ? minRate - 1 : minRate;
    const hi = minRate === maxRate ? maxRate + 1 : maxRate;
    const paddingY = (hi - lo) * 0.2 || 1;
    const yMin = Math.max(0, lo - paddingY);
    const yMax = Math.min(100, hi + paddingY);

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
    const color = 'var(--band-color)';

    const endLabel = period === '24h' ? tr('chartNow', { time: points[n - 1].label }) : points[n - 1].label;
    const rangeText = tr('chartRange', { min: minRate.toFixed(1), max: maxRate.toFixed(1), span: (maxRate - minRate).toFixed(1), count: valid.length });
    const gradId = `chart-grad-${dam.id}-${period}`;

    return `
      ${header(rangeText)}
      <svg class="modal-svg-chart ${bandClass(rateBand(dam))}" viewBox="0 0 ${chartW} ${chartH + 18}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <line x1="12" y1="12" x2="${chartW - 12}" y2="12" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
        <line x1="12" y1="${chartH - 10}" x2="${chartW - 12}" y2="${chartH - 10}" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
        <polygon points="${areaPoints}" fill="url(#${gradId})" />
        <polyline points="${polylinePoints}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2" />
        <text x="14" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)">${points[0].label}</text>
        <text x="${chartW / 2}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="middle">${points[Math.floor(n / 2)].label}</text>
        <text x="${chartW - 14}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="end">${endLabel}</text>
      </svg>`;
  }

  // Long periods need history.json; while it is in flight the chart shows a loading state
  const isTrendLoading = () => activeModalPeriod !== '24h' && !telemetryService.history && Boolean(telemetryService.historyPromise);

  function renderTrendCard() {
    const dam = findDam(activeModalDamId);
    const container = dam && document.getElementById(`modal-trend-card-${dam.id}`);
    if (container) container.innerHTML = renderModalTrendChart(dam, activeModalPeriod, isTrendLoading());
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

  // Fills the dialog for the active dam and period from the current snapshot (also used on refresh)
  function renderInspector() {
    const dam = findDam(activeModalDamId);
    if (!dam) return;

    if (elements.modalDamTitle) elements.modalDamTitle.textContent = dam.name;
    if (elements.modalDamSub) {
      elements.modalDamSub.textContent = `${localizedBasin(dam.basin)} · ${localizedType(dam.type)}${dam.observedAt ? ` · ${tr('modalObserved', { time: dam.observedAt })}` : ''}`;
    }

    const spec = (v, unit = '', digits = 1) => (isNum(v) ? `${fmtNum(v, digits)}${unit}` : '-');
    const band = rateBand(dam);
    const others = new Set(telemetryService.currentData.filter((d) => d.id !== dam.id).map((d) => d.id));
    const miniMap = MAP.svg({ dams: telemetryService.currentData, bandOf: rateBand, label: dotLabel, dimmed: others, selected: dam.id, interactive: false, title: dam.name, ringGap: 12 });

    elements.modalDamContent.innerHTML = `
      <div class="modal-rate-hero ${bandClass(band)}">
        <div class="modal-rate-top">
          <div>
            <span class="modal-rate-label">${tr('modalCurrentRate')}${dam.type === DAM_TYPES.FLOOD_CONTROL ? tr('modalFloodControlNote') : ''}</span>
            <div class="modal-rate-big">${isNum(dam.storageRate) ? `${dam.storageRate.toFixed(1)}%` : '-'}</div>
            <div class="modal-rate-compare">${tr('modalCompare', { lastYear: fmt(dam.rateLastYear), normal: fmt(dam.rateNormalYear), effective: fmt(dam.effectiveRate) })}</div>
            ${isNum(dam.diffNormalYear) ? `<div class="modal-rate-compare ${trendClass(dam.diffNormalYear)}">${tr('diffNormalYear')} ${fmtSigned(dam.diffNormalYear)}%p</div>` : ''}
          </div>
          <div class="modal-mini-map">${miniMap}</div>
        </div>
        <div class="modal-rate-bar-track">
          <div class="modal-rate-bar-fill" style="width: ${isNum(dam.storageRate) ? Math.min(100, dam.storageRate) : 0}%; background: var(--band-color);"></div>
        </div>
      </div>

      <div id="modal-trend-card-${dam.id}" class="modal-chart-card ${bandClass(band)}">
        ${renderModalTrendChart(dam, activeModalPeriod, isTrendLoading())}
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
          <strong>${spec(dam.currentInflow, ' ㎥/s', 2)}</strong>
          <small>${tr('modalInflowSub', { value: spec(dam.inflowYesterday, ' ㎥/s', 1) })}</small>
        </div>
        <div class="modal-stat-box">
          <span>${tr('modalOutflow')}</span>
          <strong>${spec(dam.currentOutflow, ' ㎥/s', 2)}</strong>
          <small>${tr('modalOutflowSub', { value: spec(dam.outflowYesterday, ' ㎥/s', 1) })}</small>
        </div>
      </div>

      <div class="modal-specs-section">
        <table class="modal-specs-table">
          <tbody>
            ${dam.distanceKm !== null ? `<tr><td>${tr('specDistance')}</td><td class="num" style="color: var(--primary); font-weight: 700;">${tr('specDistanceValue', { km: dam.distanceKm })}</td></tr>` : ''}
            <tr><td>${tr('specFloodLevels')}</td><td class="num">${spec(dam.floodLevel, ' EL.m', 2)} / ${spec(dam.floodLimitLevel, ' EL.m', 2)}</td></tr>
            <tr><td>${tr('specFloodStorage')}</td><td class="num">${spec(dam.floodControlStorage, ' M㎥', 1)}</td></tr>
            <tr><td>${tr('specCatchment')}</td><td class="num">${spec(dam.catchmentArea, ' km²', 1)}</td></tr>
            <tr><td>${tr('specDimensions')}</td><td class="num">${spec(dam.damHeight, 'm', 1)} / ${spec(dam.damLength, 'm', 1)} / ${escapeHtml(dam.damType || '-')}</td></tr>
            <tr><td>${tr('specLocation')}</td><td>${escapeHtml(localizedLocation(dam))}</td></tr>
            <tr><td>${tr('specBuilt')}</td><td class="num">${dam.builtYear ? tr('specBuiltValue', { year: dam.builtYear }) : '-'}</td></tr>
            <tr><td>${tr('specCode')}</td><td class="num">${dam.code}</td></tr>
            <tr><td>${tr('specSource')}</td><td><a class="footer-link" href="https://www.water.or.kr/kor/realtime/sumun/index.do?mode=sumun&menuId=13_91_93_94" target="_blank" rel="noopener noreferrer">${tr('specSourceLink')}</a></td></tr>
          </tbody>
        </table>
      </div>`;
  }

  function openInspector(damId, opener = 'tr') {
    const modal = elements.modalInspector;
    if (!modal || !findDam(damId)) return;
    const wasOpen = Boolean(activeModalDamId);
    if (!wasOpen) modalOpener = opener;
    activeModalDamId = damId;
    activeModalPeriod = '24h';
    renderInspector();

    const panel = modal.querySelector('.inspector-modal-panel');
    if (panel) panel.scrollTop = 0;

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

  // A new snapshot arrived while the dialog is open: redraw it in place (same period, same scroll)
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
    // Rows and dots are re-rendered while the dialog is open, so return focus by id
    const origin = document.querySelector(`${modalOpener}[data-dam-id="${damId}"]`) || document.querySelector(`tr[data-dam-id="${damId}"]`);
    if (origin) origin.focus({ preventScroll: true });
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
      '예년대비증감(%p)'
    ];
    const escapeCell = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;
    const cell = (v) => (isNum(v) ? v : '');
    const rows = data.map((d) => [
      escapeCell(d.name), d.code, escapeCell(d.basin), escapeCell(d.type), escapeCell(d.location), escapeCell(d.observedAt),
      cell(d.currentWaterLevel), cell(d.normalFullLevel), cell(d.floodLevel),
      cell(d.storageRate), cell(d.rateLastYear), cell(d.rateNormalYear), cell(d.effectiveRate),
      cell(d.currentStorageVolume), cell(d.totalStorage), cell(d.effectiveStorage),
      cell(d.currentInflow), cell(d.currentOutflow), cell(d.inflowYesterday), cell(d.outflowYesterday),
      cell(d.diffNormalYear)
    ].join(','));

    const csvContent = '﻿' + headers.join(',') + '\r\n' + rows.join('\r\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
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
  // Enter / Space on a focusable element that is not a native button
  const isActivationKey = (e) => e.key === 'Enter' || e.key === ' ';

  function initEvents() {
    const on = (el, type, fn) => { if (el) el.addEventListener(type, fn); };

    on(elements.langSelect, 'change', (e) => {
      if (window.i18n) i18n.setLanguage(e.target.value);
      renderBasinTabCounts();
    });
    on(elements.btnThemeToggle, 'click', toggleTheme);
    on(elements.btnExportCsv, 'click', exportCsv);
    on(elements.btnHeaderGps, 'click', () => (state.isGeoActive ? resetGeoLocation() : requestUserLocation(false)));
    on(elements.btnGeoReset, 'click', resetGeoLocation);
    on(elements.searchInput, 'input', (e) => { state.searchQuery = e.target.value.trim(); renderFiltered(); });
    on(elements.selectDamType, 'change', (e) => { state.damTypeFilter = e.target.value; renderFiltered(); });
    on(elements.selectNormalFilter, 'change', (e) => { state.normalFilter = e.target.value; renderFiltered(); });
    on(elements.cardLowest, 'click', () => { if (elements.cardLowest.dataset.damId) openInspector(elements.cardLowest.dataset.damId, '#card-lowest'); });

    elements.basinTabs.forEach((tab) => on(tab, 'click', () => setBasin(tab.getAttribute('data-basin'))));
    // Basin summary rows toggle the same filter as the tabs
    on(elements.basinList, 'click', (e) => {
      const row = e.target.closest('.basin-row[data-basin]');
      if (row) setBasin(state.activeBasin === row.dataset.basin ? 'ALL' : row.dataset.basin);
    });

    elements.tableHeaders.forEach((th) => on(th, 'click', () => {
      const field = th.getAttribute('data-sort');
      if (state.sortField === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = (field === 'name' || field === 'basin' || field === 'type') ? 'asc' : 'desc';
      }
      renderTable();
    }));

    // Rows, map dots and period tabs are re-rendered often: one delegated listener per container
    const openFrom = (selector) => (e) => {
      if (e.type === 'keydown' && !isActivationKey(e)) return;
      const target = e.target.closest(`${selector}[data-dam-id]`);
      if (!target) return;
      if (e.type === 'keydown') e.preventDefault();
      openInspector(target.getAttribute('data-dam-id'), selector);
    };
    on(elements.damsTbody, 'click', openFrom('tr'));
    on(elements.damsTbody, 'keydown', openFrom('tr'));
    on(elements.overviewMap, 'click', openFrom('#overview-map .map-dot'));
    on(elements.overviewMap, 'keydown', openFrom('#overview-map .map-dot'));
    on(elements.modalDamContent, 'click', (e) => {
      const tab = e.target.closest('.btn-period-tab[data-period]');
      if (tab && activeModalDamId) switchTrendPeriod(tab.getAttribute('data-period'));
    });
    on(elements.btnModalClose, 'click', closeInspector);
    on(elements.modalBackdrop, 'click', closeInspector);

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
