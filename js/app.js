/**
 * ============================================================================
 * K-DAM LIVE — Minimalist Application Controller
 * Clean, automatic 5-minute background refresh & smooth modal inspection
 * ============================================================================
 */

(function(window) {
  'use strict';

  const KDAM = window.KDAM || {};
  const telemetryService = KDAM.telemetryService;
  const BASINS = KDAM.BASINS || {
    HAN: '한강',
    NAKDONG: '낙동강',
    GEUM: '금강',
    SEOMJIN: '영산·섬진강'
  };

  if (!telemetryService) {
    console.error('KDAM telemetry service unavailable');
    return;
  }

  const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour (3,600,000 ms)

  const state = {
    activeBasin: 'ALL',
    damTypeFilter: 'ALL',
    statusFilter: 'ALL',
    searchQuery: '',
    sortField: 'storageRate',
    sortOrder: 'desc',
    lastUpdatedTime: new Date(),
    theme: localStorage.getItem('kdam_theme') || 'dark'
  };

  let elements = {};

  function cacheElements() {
    elements = {
      dataUpdatedTime: document.getElementById('data-updated-time'),
      btnExportCsv: document.getElementById('btn-export-csv'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      themeMoon: document.getElementById('theme-moon'),
      themeSun: document.getElementById('theme-sun'),

      valAvgRate: document.getElementById('val-avg-rate'),
      deltaAvgRate: document.getElementById('delta-avg-rate'),
      valTotalStorage: document.getElementById('val-total-storage'),
      valTotalInflow: document.getElementById('val-total-inflow'),
      valTotalOutflow: document.getElementById('val-total-outflow'),
      valDischargeCount: document.getElementById('val-discharge-count'),

      searchInput: document.getElementById('search-input'),
      basinTabs: document.querySelectorAll('.tab-btn'),
      selectDamType: document.getElementById('select-dam-type'),
      selectStatusFilter: document.getElementById('select-status-filter'),

      damsTbody: document.getElementById('dams-tbody'),
      tableHeaders: document.querySelectorAll('#dams-table thead th.sortable'),

      dialogInspector: document.getElementById('dam-inspector-dialog'),
      modalDamTitle: document.getElementById('modal-dam-title'),
      modalDamSub: document.getElementById('modal-dam-sub'),
      modalDamContent: document.getElementById('modal-dam-content'),
      btnModalClose: document.getElementById('btn-modal-close')
    };
  }

  function init() {
    cacheElements();
    initTheme();
    updateTimestamp();
    initEvents();
    renderAll();

    telemetryService.subscribe(() => {
      renderAll();
    });

    // Automatic 1-hour background refresh
    setInterval(() => {
      telemetryService.simulateLiveTick();
      state.lastUpdatedTime = new Date();
      updateTimestamp();
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  function updateTimestamp() {
    if (!elements.dataUpdatedTime) return;
    const now = state.lastUpdatedTime;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elements.dataUpdatedTime.textContent = `최신 기준: ${hours}:${minutes}:${seconds}`;
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

  function renderStats() {
    const m = telemetryService.getOverviewMetrics();
    if (elements.valAvgRate) elements.valAvgRate.textContent = `${m.avgStorageRate}%`;
    if (elements.deltaAvgRate) elements.deltaAvgRate.textContent = `예년 대비 ${m.diffPrevYear}`;
    if (elements.valTotalStorage) elements.valTotalStorage.textContent = `${Number(m.totalStorageVolume).toLocaleString()} M㎥`;
    if (elements.valTotalInflow) elements.valTotalInflow.textContent = `${Number(m.totalInflow).toLocaleString()} ㎥/s`;
    if (elements.valTotalOutflow) elements.valTotalOutflow.textContent = `${Number(m.totalOutflow).toLocaleString()} ㎥/s`;
    if (elements.valDischargeCount) elements.valDischargeCount.textContent = `방류 중인 댐 ${m.dischargingCount}개소 / 가뭄주의 ${m.droughtCount}개소`;
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
      let barColor = 'var(--badge-green-text)';
      let badgeClass = 'badge-green';
      let badgeLabel = '정상';

      if (dam.currentOutflow >= 20) {
        badgeClass = 'badge-blue';
        badgeLabel = '수문방류';
        barColor = 'var(--badge-blue-text)';
      } else if (dam.storageRate < 40) {
        badgeClass = 'badge-red';
        badgeLabel = '가뭄경계';
        barColor = 'var(--badge-red-text)';
      } else if (dam.storageRate < 50) {
        badgeClass = 'badge-yellow';
        badgeLabel = '가뭄주의';
        barColor = 'var(--badge-yellow-text)';
      } else if (dam.storageRate < 60) {
        badgeClass = 'badge-yellow';
        badgeLabel = '가뭄관심';
        barColor = 'var(--badge-yellow-text)';
      }

      const diffSign = dam.diffPrevYear > 0 ? '+' : '';
      const diffColor = dam.diffPrevYear >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)';

      return `
        <tr data-dam-id="${dam.id}" onclick="window.appInspectDam('${dam.id}')" title="${dam.name} 상세 제원 보기">
          <td>
            <div class="dam-title-cell">${dam.name}</div>
            <div class="dam-loc-sub">${dam.location}</div>
          </td>
          <td><span class="badge badge-muted">${dam.basin}</span></td>
          <td><span class="badge badge-muted">${dam.type}</span></td>
          <td class="text-right">
            <div class="rate-cell-wrap">
              <span class="rate-val">${dam.storageRate.toFixed(1)}%</span>
              <div class="rate-bar-track">
                <div class="rate-bar-fill" style="width: ${Math.min(100, dam.storageRate)}%; background: ${barColor};"></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${badgeLabel}</span></td>
          <td class="text-right num" style="color: ${diffColor}">${diffSign}${dam.diffPrevYear}%p</td>
          <td class="text-right num">
            <strong>${dam.currentWaterLevel.toFixed(1)}</strong> <small style="color:var(--text-subtle)">/ ${dam.normalFullLevel}m</small>
          </td>
          <td class="text-right num">${dam.currentStorageVolume.toLocaleString()}</td>
          <td class="text-right num">${dam.currentInflow.toFixed(1)}</td>
          <td class="text-right num font-weight-600">${dam.currentOutflow.toFixed(1)}</td>
        </tr>
      `;
    }).join('');
  }

  function openInspector(damId) {
    const dam = telemetryService.currentData.find((d) => d.id === damId);
    if (!dam) return;

    if (elements.modalDamTitle) elements.modalDamTitle.textContent = dam.name;
    if (elements.modalDamSub) elements.modalDamSub.textContent = `${dam.basin} · ${dam.type} · ${dam.agency}`;

    let badgeClass = 'badge-green';
    let badgeLabel = '정상 수위';
    let barColor = 'var(--badge-green-text)';

    if (dam.currentOutflow >= 20) {
      badgeClass = 'badge-blue';
      badgeLabel = '수문 방류중';
      barColor = 'var(--badge-blue-text)';
    } else if (dam.storageRate < 40) {
      badgeClass = 'badge-red';
      badgeLabel = '가뭄 경계';
      barColor = 'var(--badge-red-text)';
    } else if (dam.storageRate < 50) {
      badgeClass = 'badge-yellow';
      badgeLabel = '가뭄 주의';
      barColor = 'var(--badge-yellow-text)';
    } else if (dam.storageRate < 60) {
      badgeClass = 'badge-yellow';
      badgeLabel = '가뭄 관심';
      barColor = 'var(--badge-yellow-text)';
    }

    const trend = dam.hourlyTrend || [];
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

    elements.modalDamContent.innerHTML = `
      <!-- Big Rate Hero -->
      <div class="modal-rate-hero">
        <div class="modal-rate-top">
          <div>
            <span class="modal-rate-label">현재 저수율</span>
            <div class="modal-rate-big">${dam.storageRate}%</div>
          </div>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${badgeLabel}</span>
        </div>
        <div class="modal-rate-bar-track">
          <div class="modal-rate-bar-fill" style="width: ${Math.min(100, dam.storageRate)}%; background: ${barColor};"></div>
        </div>
      </div>

      <!-- 24-Hour Trend Chart -->
      <div class="modal-chart-card">
        <div class="modal-chart-header">
          <span>최근 24시간 저수율(%) 변동 추이</span>
          <span class="modal-chart-range">${minRate.toFixed(1)}% ~ ${maxRate.toFixed(1)}%</span>
        </div>
        <svg class="modal-svg-chart" viewBox="0 0 ${chartW} ${chartH + 18}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-grad-${dam.id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${barColor}" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="${barColor}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <line x1="12" y1="12" x2="${chartW - 12}" y2="12" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
          <line x1="12" y1="${chartH - 10}" x2="${chartW - 12}" y2="${chartH - 10}" stroke="var(--border-subtle)" stroke-dasharray="2 3" stroke-width="1" />
          
          <polygon points="${areaPoints}" fill="url(#chart-grad-${dam.id})" />
          <polyline points="${polylinePoints}" fill="none" stroke="${barColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="4" fill="${barColor}" stroke="var(--surface)" stroke-width="2" />
          
          <text x="14" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)">24시간 전</text>
          <text x="${chartW / 2}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="middle">12시간 전</text>
          <text x="${chartW - 14}" y="${chartH + 13}" fill="var(--text-subtle)" font-size="9" font-family="var(--font-mono)" text-anchor="end">현재</text>
        </svg>
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

    if (elements.dialogInspector) {
      elements.dialogInspector.classList.remove('closing');
      isModalClosing = false;
      if (!elements.dialogInspector.open) {
        elements.dialogInspector.showModal();
      }
    }
  }

  let isModalClosing = false;

  function closeInspector() {
    if (!elements.dialogInspector || isModalClosing) return;
    if (!elements.dialogInspector.open) return;

    isModalClosing = true;
    elements.dialogInspector.classList.add('closing');

    setTimeout(() => {
      if (elements.dialogInspector) {
        elements.dialogInspector.close();
        elements.dialogInspector.classList.remove('closing');
      }
      isModalClosing = false;
    }, 180);
  }

  window.appInspectDam = openInspector;

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
    if (elements.btnThemeToggle) {
      elements.btnThemeToggle.addEventListener('click', toggleTheme);
    }
    if (elements.btnExportCsv) {
      elements.btnExportCsv.addEventListener('click', exportCsv);
    }
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
      elements.btnModalClose.addEventListener('click', closeInspector);
    }
    if (elements.dialogInspector) {
      elements.dialogInspector.addEventListener('cancel', (e) => {
        e.preventDefault();
        closeInspector();
      });

      elements.dialogInspector.addEventListener('click', (e) => {
        const panel = elements.dialogInspector.querySelector('.inspector-modal-panel');
        if (panel) {
          const rect = panel.getBoundingClientRect();
          const isInside = (
            rect.top <= e.clientY && e.clientY <= rect.bottom &&
            rect.left <= e.clientX && e.clientX <= rect.right
          );
          if (!isInside) closeInspector();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
