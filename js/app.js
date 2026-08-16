/**
 * ============================================================================
 * K-DAM LIVE — Minimalist Application Controller
 * Clean, fast, zero-fluff data rendering & filtering
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

  const state = {
    activeBasin: 'ALL',
    damTypeFilter: 'ALL',
    statusFilter: 'ALL',
    searchQuery: '',
    sortField: 'storageRate',
    sortOrder: 'desc',
    theme: localStorage.getItem('kdam_theme') || 'dark'
  };

  let elements = {};

  function cacheElements() {
    elements = {
      liveClock: document.getElementById('live-clock'),
      btnManualRefresh: document.getElementById('btn-manual-refresh'),
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
      modalDamContent: document.getElementById('modal-dam-content'),
      btnModalClose: document.getElementById('btn-modal-close')
    };
  }

  function init() {
    cacheElements();
    initTheme();
    initClock();
    initEvents();
    renderAll();

    telemetryService.subscribe(() => {
      renderAll();
    });

    // Background live tick every 15s
    setInterval(() => {
      telemetryService.simulateLiveTick();
    }, 15000);
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

  function initClock() {
    const update = () => {
      if (!elements.liveClock) return;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      elements.liveClock.textContent = `${h}:${m}:${s} KST`;
    };
    update();
    setInterval(update, 1000);
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
          <td colspan="11" class="text-center" style="padding: 30px; color: var(--text-muted);">
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
        badgeLabel = '방류중';
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
        <tr>
          <td>
            <div class="dam-title-cell" onclick="window.appInspectDam('${dam.id}')">${dam.name}</div>
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
          <td class="text-right num">
            <strong>${dam.currentWaterLevel.toFixed(1)}</strong> <small style="color:var(--text-subtle)">/ ${dam.normalFullLevel}m</small>
          </td>
          <td class="text-right num">${dam.currentStorageVolume.toLocaleString()}</td>
          <td class="text-right num">${dam.currentInflow.toFixed(1)}</td>
          <td class="text-right num font-weight-600">${dam.currentOutflow.toFixed(1)}</td>
          <td class="text-right num" style="color: ${diffColor}">${diffSign}${dam.diffPrevYear}%p</td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="text-center">
            <button class="btn-view" onclick="window.appInspectDam('${dam.id}')" type="button">상세</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openInspector(damId) {
    const dam = telemetryService.currentData.find((d) => d.id === damId);
    if (!dam) return;

    elements.modalDamTitle.textContent = `${dam.name} (${dam.basin} · ${dam.agency})`;

    elements.modalDamContent.innerHTML = `
      <div class="modal-grid-2">
        <div class="modal-card-item">
          <span>현재 저수율</span>
          <strong>${dam.storageRate}%</strong>
        </div>
        <div class="modal-card-item">
          <span>현재 저수량</span>
          <strong>${dam.currentStorageVolume.toLocaleString()} M㎥</strong>
        </div>
        <div class="modal-card-item">
          <span>현재 수위</span>
          <strong>${dam.currentWaterLevel} EL.m</strong>
        </div>
        <div class="modal-card-item">
          <span>실시간 유입 / 방류</span>
          <strong>${dam.currentInflow} / ${dam.currentOutflow} ㎥/s</strong>
        </div>
      </div>

      <table class="modal-specs-table">
        <tbody>
          <tr>
            <td>상시만수위</td>
            <td>${dam.normalFullLevel} EL.m</td>
          </tr>
          <tr>
            <td>계획홍수위</td>
            <td>${dam.floodLevel} EL.m</td>
          </tr>
          <tr>
            <td>총 저수용량</td>
            <td>${dam.totalStorage.toLocaleString()} M㎥</td>
          </tr>
          <tr>
            <td>유역면적</td>
            <td>${dam.catchmentArea.toLocaleString()} km²</td>
          </tr>
          <tr>
            <td>댐 높이 / 길이</td>
            <td>${dam.damHeight}m / ${dam.damLength}m</td>
          </tr>
          <tr>
            <td>소재지</td>
            <td>${dam.location}</td>
          </tr>
          <tr>
            <td>준공연도</td>
            <td>${dam.builtYear}년</td>
          </tr>
        </tbody>
      </table>
    `;

    elements.dialogInspector.showModal();
  }

  function closeInspector() {
    if (elements.dialogInspector) elements.dialogInspector.close();
  }

  window.appInspectDam = openInspector;

  function exportCsv() {
    const data = getFilteredDams();
    const headers = ['댐이름', '수계', '구분', '소재지', '현재수위(EL.m)', '상시만수위(EL.m)', '저수율(%)', '저수량(M㎥)', '유입량(㎥/s)', '방류량(㎥/s)', '예년대비(%p)', '관리기관'];
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

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `k-dam-water-level-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function initEvents() {
    if (elements.btnManualRefresh) {
      elements.btnManualRefresh.addEventListener('click', () => {
        telemetryService.simulateLiveTick();
      });
    }
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
      elements.dialogInspector.addEventListener('click', (e) => {
        if (e.target === elements.dialogInspector) closeInspector();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
