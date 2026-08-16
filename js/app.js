/**
 * ============================================================================
 * K-DAM LIVE — Application Controller & Interactive UI Logic
 * Matching Codey Platform Admin Architecture & Aesthetic Principles
 * ============================================================================
 */

import { telemetryService, BASINS } from './data.js';

// Application State
const state = {
  activeBasin: 'ALL',
  damTypeFilter: 'ALL',
  statusFilter: 'ALL',
  searchQuery: '',
  sortField: 'storageRate',
  sortOrder: 'desc',
  selectedDamId: null,
  refreshCountdown: 15,
  refreshIntervalId: null,
  theme: localStorage.getItem('kdam_theme') || 'dark'
};

// DOM References
const elements = {
  // Live Header
  liveClock: document.getElementById('live-clock'),
  refreshTimer: document.getElementById('refresh-timer'),
  btnManualRefresh: document.getElementById('btn-manual-refresh'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeMoon: document.getElementById('theme-moon'),
  themeSun: document.getElementById('theme-sun'),

  // Search & Filters
  searchInput: document.getElementById('search-input'),
  basinTabs: document.querySelectorAll('.basin-tab'),
  selectDamType: document.getElementById('select-dam-type'),
  selectStatusFilter: document.getElementById('select-status-filter'),

  // Metrics
  valAvgRate: document.getElementById('val-avg-rate'),
  deltaAvgRate: document.getElementById('delta-avg-rate'),
  valTotalStorage: document.getElementById('val-total-storage'),
  valTotalInflow: document.getElementById('val-total-inflow'),
  valTotalOutflow: document.getElementById('val-total-outflow'),
  valDischargeCount: document.getElementById('val-discharge-count'),
  valDroughtCount: document.getElementById('val-drought-count'),
  valFloodCount: document.getElementById('val-flood-count'),
  valSensorHealth: document.getElementById('val-sensor-health'),

  // Map & Basin Overview
  koreaSvgMap: document.getElementById('korea-svg-map'),
  basinBarsContainer: document.getElementById('basin-bars-container'),
  droughtPillsList: document.getElementById('drought-pills-list'),

  // Table
  damsTable: document.getElementById('dams-table'),
  damsTbody: document.getElementById('dams-tbody'),
  tableRecordCount: document.getElementById('table-record-count'),
  tableHeaders: document.querySelectorAll('#dams-table thead th.sortable'),

  // Feeds
  eventsFeedList: document.getElementById('events-feed-list'),

  // Modal
  dialogInspector: document.getElementById('dam-inspector-dialog'),
  modalDamTitle: document.getElementById('modal-dam-title'),
  modalDamBasin: document.getElementById('modal-dam-basin'),
  modalDamContent: document.getElementById('modal-dam-content'),
  btnModalClose: document.getElementById('btn-modal-close'),
  modalBackdropClose: document.getElementById('modal-backdrop-close')
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initSvgMap();
  initEventListeners();
  startRefreshTimer();
  renderAll();

  // Subscribe to telemetry service updates
  telemetryService.subscribe(() => {
    renderAll();
  });
});

/**
 * 1. Theme Management
 */
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcons();
}

function updateThemeIcons() {
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
  renderSvgMap();
}

/**
 * 2. Live Clock & Auto-Refresh Timer
 */
function initLiveClock() {
  const update = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elements.liveClock.textContent = `${hours}:${minutes}:${seconds} KST`;
  };
  update();
  setInterval(update, 1000);
}

function startRefreshTimer() {
  state.refreshCountdown = 15;
  if (state.refreshIntervalId) clearInterval(state.refreshIntervalId);

  state.refreshIntervalId = setInterval(() => {
    state.refreshCountdown -= 1;
    if (state.refreshCountdown <= 0) {
      triggerRefresh(false);
      state.refreshCountdown = 15;
    }
    elements.refreshTimer.textContent = `${state.refreshCountdown}s`;
  }, 1000);
}

function triggerRefresh(isManual = true) {
  const spinIcon = elements.btnManualRefresh.querySelector('.spin-icon');
  if (spinIcon) spinIcon.classList.add('spinning');

  setTimeout(() => {
    telemetryService.simulateLiveTick();
    if (spinIcon) spinIcon.classList.remove('spinning');
    if (isManual) {
      state.refreshCountdown = 15;
      elements.refreshTimer.textContent = '15s';
    }
  }, 400);
}

/**
 * 3. Interactive SVG Korea Basin Map Rendering
 */
function initSvgMap() {
  renderSvgMap();
}

function renderSvgMap() {
  const isDark = state.theme === 'dark';
  const basinBg = isDark ? '#141c28' : '#e2e8f0';
  const basinStroke = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(51, 65, 85, 0.2)';
  const riverColor = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(2, 132, 199, 0.4)';

  // Simplified stylized polygon paths for the Korean Peninsula river basins
  const svgContent = `
    <!-- Defs for glow effects -->
    <defs>
      <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Background Outline of South Korea Peninsula -->
    <g class="map-peninsula" id="map-peninsula-group">
      <!-- Mainland contour -->
      <path d="M180,40 Q280,30 360,50 Q430,90 410,180 Q460,260 480,380 Q495,470 450,540 Q410,570 330,590 Q220,600 160,570 Q130,510 150,440 Q130,360 160,270 Q150,180 170,110 Z"
            fill="${basinBg}" stroke="${basinStroke}" stroke-width="2.5" />
      
      <!-- Jeju Island -->
      <path d="M120,625 Q160,615 190,630 Q180,650 140,655 Q115,645 120,625 Z"
            fill="${basinBg}" stroke="${basinStroke}" stroke-width="1.8" />
      <!-- Ulleungdo -->
      <circle cx="490" cy="210" r="10" fill="${basinBg}" stroke="${basinStroke}" stroke-width="1.5" />
      <!-- Dokdo -->
      <circle cx="525" cy="225" r="4.5" fill="${basinBg}" stroke="${basinStroke}" stroke-width="1.2" />

      <!-- Major River Arteries -->
      <!-- Han River (한강) -->
      <path d="M370,170 Q300,160 250,175 Q210,170 170,150" class="map-river-line" stroke="${riverColor}" />
      <!-- Nakdong River (낙동강) -->
      <path d="M370,270 Q390,340 370,410 Q370,480 390,560" class="map-river-line" stroke="${riverColor}" />
      <!-- Geum River (금강) -->
      <path d="M250,380 Q250,310 210,320 Q160,350 150,390" class="map-river-line" stroke="${riverColor}" />
      <!-- Seomjin River (섬진강) -->
      <path d="M230,460 Q240,510 270,560" class="map-river-line" stroke="${riverColor}" />
    </g>

    <!-- Basin Text Labels -->
    <g class="map-labels">
      <text x="210" y="145" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="12" font-weight="700" opacity="0.6">한강 수계</text>
      <text x="400" y="300" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="12" font-weight="700" opacity="0.6">낙동강 수계</text>
      <text x="180" y="315" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="12" font-weight="700" opacity="0.6">금강 수계</text>
      <text x="175" y="490" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="12" font-weight="700" opacity="0.6">영산·섬진강</text>
      <text x="480" y="235" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="9" font-weight="600" opacity="0.5">울릉도·독도</text>
      <text x="135" y="643" fill="${isDark ? '#94a3b8' : '#64748b'}" font-size="10" font-weight="600" opacity="0.5">제주도</text>
    </g>

    <!-- Dam Interactive Pins (Dynamically populated) -->
    <g class="map-pins" id="map-pins-group">
      ${renderMapPinsSvg()}
    </g>
  `;

  elements.koreaSvgMap.innerHTML = svgContent;
  bindMapPinEvents();
}

function renderMapPinsSvg() {
  const filteredDams = getFilteredDams();

  return telemetryService.currentData.map((dam) => {
    const isFiltered = filteredDams.some((d) => d.id === dam.id);
    const opacity = isFiltered ? 1 : 0.2;
    const isDischarging = dam.currentOutflow >= 20.0;

    let pinColor = '#10b981'; // 70%+
    if (dam.storageRate < 50.0) pinColor = '#f97316'; // Warning
    else if (dam.storageRate < 70.0) pinColor = '#06b6d4'; // Mid
    if (isDischarging) pinColor = '#38bdf8';

    const isSelected = state.selectedDamId === dam.id;
    const outerRadius = isSelected ? 9 : 6.5;
    const innerRadius = isSelected ? 5 : 3.5;

    return `
      <g class="dam-map-pin" data-dam-id="${dam.id}" transform="translate(${dam.mapX}, ${dam.mapY})" opacity="${opacity}">
        <circle cx="0" cy="0" r="${outerRadius + 4}" fill="${pinColor}" opacity="0.25" />
        <circle class="pin-outer" cx="0" cy="0" r="${outerRadius}" fill="${pinColor}" />
        <circle cx="0" cy="0" r="${innerRadius}" fill="#ffffff" />
        <text class="pin-label" x="11" y="4">${dam.name}</text>
      </g>
    `;
  }).join('');
}

function bindMapPinEvents() {
  const pins = elements.koreaSvgMap.querySelectorAll('.dam-map-pin');
  pins.forEach((pin) => {
    pin.addEventListener('click', () => {
      const damId = pin.getAttribute('data-dam-id');
      if (damId) openDamInspector(damId);
    });
  });
}

/**
 * 4. Filter, Search & Sorter Engine
 */
function getFilteredDams() {
  return telemetryService.currentData.filter((dam) => {
    // 1. Basin Filter
    if (state.activeBasin !== 'ALL' && dam.basin !== state.activeBasin) {
      return false;
    }
    // 2. Dam Type Filter
    if (state.damTypeFilter !== 'ALL' && dam.type !== state.damTypeFilter) {
      return false;
    }
    // 3. Status Filter
    if (state.statusFilter !== 'ALL') {
      if (state.statusFilter === 'DISCHARGING' && dam.currentOutflow < 15.0) return false;
      if (state.statusFilter === 'DROUGHT' && dam.storageRate >= 60.0) return false;
      if (state.statusFilter === 'NORMAL' && dam.storageRate < 60.0) return false;
      if (state.statusFilter === 'LOW_STORAGE' && dam.storageRate >= 50.0) return false;
    }
    // 4. Search Query (Dam Name or Location)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchName = dam.name.toLowerCase().includes(q);
      const matchLocation = dam.location.toLowerCase().includes(q);
      const matchBasin = dam.basin.toLowerCase().includes(q);
      if (!matchName && !matchLocation && !matchBasin) return false;
    }
    return true;
  }).sort((a, b) => {
    let valA = a[state.sortField];
    let valB = b[state.sortField];

    if (typeof valA === 'string') {
      return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return state.sortOrder === 'asc' ? valA - valB : valB - valA;
  });
}

/**
 * 5. Main Render Loop
 */
function renderAll() {
  renderMetrics();
  renderBasinBars();
  renderDroughtPills();
  renderTable();
  renderEventsFeed();
  renderMapPinsSvg();
}

/**
 * 5.1 Render Summary Metrics (8 Cards)
 */
function renderMetrics() {
  const m = telemetryService.getOverviewMetrics();
  elements.valAvgRate.textContent = `${m.avgStorageRate}%`;
  elements.deltaAvgRate.textContent = `예년 대비 ${m.diffPrevYear}`;
  elements.valTotalStorage.textContent = `${Number(m.totalStorageVolume).toLocaleString()} M㎥`;
  elements.valTotalInflow.textContent = `${Number(m.totalInflow).toLocaleString()} ㎥/s`;
  elements.valTotalOutflow.textContent = `${Number(m.totalOutflow).toLocaleString()} ㎥/s`;
  elements.valDischargeCount.textContent = `${m.dischargingCount} 개소`;
  elements.valDroughtCount.textContent = `${m.droughtCount} 개소`;
  elements.valFloodCount.textContent = `${m.floodRiskCount} 개소`;
}

/**
 * 5.2 Render Basin Bars
 */
function renderBasinBars() {
  const summaries = telemetryService.getBasinSummaries();
  elements.basinBarsContainer.innerHTML = summaries.map((s) => {
    let color = 'var(--success)';
    if (s.storageRate < 50) color = 'var(--orange)';
    else if (s.storageRate < 70) color = 'var(--accent-cyan)';

    return `
      <div class="basin-bar-item">
        <div class="basin-bar-meta">
          <span class="basin-name">${s.basin} (${s.damCount}개 댐)</span>
          <span class="basin-storage-val">${s.storageRate}% · ${Number(s.currentStorage).toLocaleString()} M㎥</span>
        </div>
        <div class="basin-progress-track">
          <div class="basin-progress-fill" style="width: ${Math.min(100, s.storageRate)}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 5.3 Render Drought Stages Pills
 */
function renderDroughtPills() {
  const d = telemetryService.getDroughtStages();
  elements.droughtPillsList.innerHTML = `
    <div class="drought-pill-stage stage-normal">
      <span>정상 (60%+)</span>
      <strong>${d.normal}</strong>
    </div>
    <div class="drought-pill-stage stage-attention">
      <span>관심 (50~60%)</span>
      <strong>${d.attention}</strong>
    </div>
    <div class="drought-pill-stage stage-caution">
      <span>주의 (40~50%)</span>
      <strong>${d.caution}</strong>
    </div>
    <div class="drought-pill-stage stage-alert">
      <span>경계 (40%미만)</span>
      <strong>${d.alert}</strong>
    </div>
  `;
}

/**
 * 5.4 Render Main Data Table
 */
function renderTable() {
  const filtered = getFilteredDams();
  elements.tableRecordCount.textContent = `총 ${filtered.length}개 관측소 실시간 수문 데이터 표시 중`;

  if (filtered.length === 0) {
    elements.damsTbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center" style="padding: 40px; color: var(--muted);">
          검색 조건에 일치하는 댐 관측소 정보가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  elements.damsTbody.innerHTML = filtered.map((dam) => {
    let basinClass = 'basin-han';
    if (dam.basin === BASINS.NAKDONG) basinClass = 'basin-nakdong';
    else if (dam.basin === BASINS.GEUM) basinClass = 'basin-geum';
    else if (dam.basin === BASINS.SEOMJIN) basinClass = 'basin-seomjin';

    let barColor = 'var(--success)';
    if (dam.storageRate < 50) barColor = 'var(--orange)';
    else if (dam.storageRate < 70) barColor = 'var(--accent-cyan)';
    if (dam.currentOutflow >= 20) barColor = '#38bdf8';

    const diffClass = dam.diffPrevYear >= 0 ? 'text-success' : 'text-danger';
    const diffSign = dam.diffPrevYear > 0 ? '+' : '';

    return `
      <tr data-dam-id="${dam.id}">
        <td>
          <div class="dam-name-cell">
            <div>
              <div class="dam-name-title" onclick="window.appOpenDam('${dam.id}')">${dam.name}</div>
              <div class="dam-location-tag">${dam.location}</div>
            </div>
          </div>
        </td>
        <td><span class="basin-badge ${basinClass}">${dam.basin}</span></td>
        <td><span class="dam-type-badge">${dam.type}</span></td>
        <td class="text-right tabular-num">
          <strong>${dam.currentWaterLevel.toFixed(1)}</strong> <small style="color:var(--muted)">/ ${dam.normalFullLevel}m</small>
        </td>
        <td class="text-right">
          <div class="storage-rate-cell">
            <span class="storage-rate-pct">${dam.storageRate.toFixed(1)}%</span>
            <div class="storage-mini-bar">
              <div class="storage-mini-fill" style="width: ${Math.min(100, dam.storageRate)}%; background: ${barColor};"></div>
            </div>
          </div>
        </td>
        <td class="text-right tabular-num">${dam.currentStorageVolume.toLocaleString()} M㎥</td>
        <td class="text-right tabular-num font-weight-600 text-info">${dam.currentInflow.toFixed(1)}</td>
        <td class="text-right tabular-num font-weight-600 ${dam.currentOutflow >= 20 ? 'text-accent' : ''}">
          ${dam.currentOutflow.toFixed(1)}
        </td>
        <td class="text-right tabular-num ${diffClass}">
          ${diffSign}${dam.diffPrevYear}%p
        </td>
        <td>
          <span class="status-tag ${dam.status.class}">
            ${dam.status.label}
          </span>
        </td>
        <td class="text-center">
          <button class="btn-table-inspect" onclick="window.appOpenDam('${dam.id}')" type="button">
            조회
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 5.5 Render Event Feed
 */
function renderEventsFeed() {
  const events = telemetryService.eventLog.slice(0, 10);
  elements.eventsFeedList.innerHTML = events.map((ev) => {
    const timeStr = `${ev.time.getHours().toString().padStart(2, '0')}:${ev.time.getMinutes().toString().padStart(2, '0')}:${ev.time.getSeconds().toString().padStart(2, '0')}`;
    return `
      <li>
        <div class="event-content">
          <span class="event-icon">${ev.icon}</span>
          <div class="event-text">
            <strong>${ev.title}</strong>
            <small>${ev.detail}</small>
          </div>
        </div>
        <time>${timeStr}</time>
      </li>
    `;
  }).join('');
}

/**
 * 6. Dam Detail Modal Inspector
 */
export function openDamInspector(damId) {
  const dam = telemetryService.currentData.find((d) => d.id === damId);
  if (!dam) return;

  state.selectedDamId = damId;
  elements.modalDamTitle.textContent = `${dam.name} 실시간 수문 분석`;
  elements.modalDamBasin.textContent = `${dam.basin} · ${dam.type} · ${dam.agency}`;

  // Calculate circular SVG progress
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, dam.storageRate) / 100) * circumference;

  let gaugeColor = '#10b981';
  if (dam.storageRate < 50) gaugeColor = '#f97316';
  else if (dam.storageRate < 70) gaugeColor = '#06b6d4';

  // Render 24hr SVG Trend Chart
  const trend = dam.hourlyTrend || [];
  const minRate = Math.min(...trend.map((t) => t.rate)) - 1;
  const maxRate = Math.max(...trend.map((t) => t.rate)) + 1;
  const chartPoints = trend.map((t, idx) => {
    const x = 30 + (idx / (trend.length - 1)) * 540;
    const y = 140 - ((t.rate - minRate) / (maxRate - minRate || 1)) * 100;
    return `${x},${y}`;
  }).join(' ');

  elements.modalDamContent.innerHTML = `
    <!-- Top Hero Metric with Circular Water Gauge -->
    <div class="modal-stats-hero">
      <div class="modal-circle-gauge">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--surface-raised)" stroke-width="9" />
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${gaugeColor}" stroke-width="9"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" />
        </svg>
        <div class="gauge-center-text">
          <span class="gauge-pct">${dam.storageRate}%</span>
          <span class="gauge-lbl">저수율</span>
        </div>
      </div>

      <div class="modal-quick-metrics">
        <div class="modal-metric-item">
          <span>현재 수위</span>
          <strong>${dam.currentWaterLevel} EL.m</strong>
        </div>
        <div class="modal-metric-item">
          <span>상시만수위</span>
          <strong>${dam.normalFullLevel} EL.m</strong>
        </div>
        <div class="modal-metric-item">
          <span>실시간 유입량</span>
          <strong class="text-info">${dam.currentInflow} ㎥/s</strong>
        </div>
        <div class="modal-metric-item">
          <span>실시간 방류량</span>
          <strong class="${dam.currentOutflow >= 20 ? 'text-accent' : ''}">${dam.currentOutflow} ㎥/s</strong>
        </div>
      </div>
    </div>

    <!-- 24-Hour Trend Chart -->
    <div class="modal-chart-box">
      <div class="modal-chart-header">
        <span>최근 24시간 저수율(%) 변동 추이</span>
        <span class="badge-live">LIVE TELEMETRY</span>
      </div>
      <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
        <polyline fill="none" stroke="${gaugeColor}" stroke-width="2.5" points="${chartPoints}" />
        <!-- Area fill under line -->
        <polygon fill="${gaugeColor}" fill-opacity="0.12" points="30,150 ${chartPoints} 570,150" />
      </svg>
    </div>

    <!-- Technical Specifications Grid -->
    <div class="modal-specs-grid">
      <div class="spec-item">
        <span>총 저수용량</span>
        <strong>${dam.totalStorage.toLocaleString()} M㎥</strong>
      </div>
      <div class="spec-item">
        <span>유효저수용량</span>
        <strong>${dam.effectiveStorage.toLocaleString()} M㎥</strong>
      </div>
      <div class="spec-item">
        <span>계획홍수위</span>
        <strong>${dam.floodLevel} EL.m</strong>
      </div>
      <div class="spec-item">
        <span>유역면적</span>
        <strong>${dam.catchmentArea.toLocaleString()} km²</strong>
      </div>
      <div class="spec-item">
        <span>댐 높이 / 길이</span>
        <strong>${dam.damHeight}m / ${dam.damLength}m</strong>
      </div>
      <div class="spec-item">
        <span>준공연도</span>
        <strong>${dam.builtYear}년</strong>
      </div>
    </div>
  `;

  elements.dialogInspector.showModal();
  renderMapPinsSvg();
}

function closeDamInspector() {
  state.selectedDamId = null;
  elements.dialogInspector.close();
  renderMapPinsSvg();
}

// Window global helper for inline HTML onclick handlers
window.appOpenDam = openDamInspector;

/**
 * 7. CSV Export Engine
 */
function exportDataToCsv() {
  const data = getFilteredDams();
  const headers = ['댐이름', '수계', '구분', '소재지', '현재수위(EL.m)', '상시만수위(EL.m)', '저수율(%)', '현재저수량(M㎥)', '유입량(㎥/s)', '방류량(㎥/s)', '예년대비(%p)', '관리기관'];

  const rows = data.map((d) => [
    `"${d.name}"`,
    `"${d.basin}"`,
    `"${d.type}"`,
    `"${d.location}"`,
    d.currentWaterLevel,
    d.normalFullLevel,
    d.storageRate,
    d.currentStorageVolume,
    d.currentInflow,
    d.currentOutflow,
    d.diffPrevYear,
    `"${d.agency}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `k-dam-live-telemetry-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 8. Event Listeners Setup
 */
function initEventListeners() {
  // Manual Refresh
  elements.btnManualRefresh.addEventListener('click', () => triggerRefresh(true));

  // Theme Toggle
  elements.btnThemeToggle.addEventListener('click', toggleTheme);

  // CSV Export
  elements.btnExportCsv.addEventListener('click', exportDataToCsv);

  // Search Input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderTable();
    renderMapPinsSvg();
  });

  // Shortcut key '/' to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== elements.searchInput) {
      e.preventDefault();
      elements.searchInput.focus();
    }
    if (e.key === 'Escape' && elements.dialogInspector.open) {
      closeDamInspector();
    }
  });

  // Basin Tabs
  elements.basinTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      elements.basinTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeBasin = tab.getAttribute('data-basin');
      renderTable();
      renderMapPinsSvg();
    });
  });

  // Dam Type Select Filter
  elements.selectDamType.addEventListener('change', (e) => {
    state.damTypeFilter = e.target.value;
    renderTable();
    renderMapPinsSvg();
  });

  // Status Select Filter
  elements.selectStatusFilter.addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    renderTable();
    renderMapPinsSvg();
  });

  // Table Column Sort
  elements.tableHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (state.sortField === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = 'desc';
      }

      elements.tableHeaders.forEach((h) => {
        h.classList.remove('sorted-asc', 'sorted-desc');
        const arrow = h.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = '↕';
      });

      th.classList.add(state.sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
      const currentArrow = th.querySelector('.sort-arrow');
      if (currentArrow) currentArrow.textContent = state.sortOrder === 'asc' ? '↑' : '↓';

      renderTable();
    });
  });

  // Modal Close
  elements.btnModalClose.addEventListener('click', closeDamInspector);
  elements.modalBackdropClose.addEventListener('click', closeDamInspector);
}
