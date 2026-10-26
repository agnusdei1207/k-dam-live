/**
 * ============================================================================
 * K-DAM LIVE — Telemetry Service
 * Loads the real observation snapshot produced by scripts/fetch-dam-data.mjs
 * (data/live.json, data/history.json) and exposes it to the presentation layer.
 * Nothing in this file invents, simulates or randomises a value.
 * ============================================================================
 */

(function(window) {
  'use strict';

  const REGISTRY = window.KDAM_REGISTRY;
  if (!REGISTRY) {
    console.error('KDAM registry missing — load js/registry.js before js/data.js');
    return;
  }

  const { DAM_TYPES, DAMS } = REGISTRY;

  const LIVE_URL = 'data/live.json';
  const HISTORY_URL = 'data/history.json';

  // Thresholds shared by table badges, status filter and overview metrics
  const THRESHOLDS = Object.freeze({
    DISCHARGE_CMS: 20.0,      // outflow at/above this is shown as "방류 중"
    DROUGHT_ALERT: 40.0,      // storage rate below → 가뭄경계
    DROUGHT_CAUTION: 50.0,    // storage rate below → 가뭄주의
    DROUGHT_ATTENTION: 60.0,  // storage rate below → 가뭄관심
    FLOOD_SURCHARGE_RATIO: 0.5 // ≥ 50 % of the band between 상시만수위 and 계획홍수위 is in use → 홍수주의
  });

  // Live fields compared on refresh so the UI can pulse cells that really changed
  const LIVE_FIELDS = ['storageRate', 'currentWaterLevel', 'currentStorageVolume', 'currentInflow', 'currentOutflow'];

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const round1 = (v) => (isNum(v) ? Math.round(v * 10) / 10 : null);

  /**
   * Spherical Haversine great-circle distance (km)
   */
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    if (![lat1, lon1, lat2, lon2].every(isNum)) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = (
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    );
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }


  function classifyStatus(dam) {
    const rate = dam.storageRate;
    const outflow = dam.currentOutflow;
    const level = dam.currentWaterLevel;
    const floodLevel = dam.floodLevel;

    if (rate === null) {
      return { code: 'NO_DATA', label: '관측값 없음' };
    }
    if (dam.type === DAM_TYPES.FLOOD_CONTROL) {
      // Flood-control dams are kept nearly empty on purpose; a low rate is not drought.
      return { code: 'FLOOD_CONTROL', label: '홍수조절 대기' };
    }
    const nfl = dam.normalFullLevel;
    if (isNum(level) && isNum(floodLevel) && isNum(nfl) && floodLevel > nfl &&
        level >= nfl + (floodLevel - nfl) * THRESHOLDS.FLOOD_SURCHARGE_RATIO) {
      return { code: 'FLOOD', label: '홍수주의' };
    }
    if (isNum(outflow) && outflow >= THRESHOLDS.DISCHARGE_CMS) {
      return { code: 'DISCHARGE', label: '방류 중' };
    }
    if (rate < THRESHOLDS.DROUGHT_ALERT) {
      return { code: 'DROUGHT_ALERT', label: '가뭄경계' };
    }
    if (rate < THRESHOLDS.DROUGHT_CAUTION) {
      return { code: 'DROUGHT_CAUTION', label: '가뭄주의' };
    }
    if (rate < THRESHOLDS.DROUGHT_ATTENTION) {
      return { code: 'DROUGHT_ATTENTION', label: '가뭄관심' };
    }
    return { code: 'NORMAL', label: '정상' };
  }

  function emptyRecord(reg) {
    return {
      ...reg,
      // specs (filled from live.json)
      normalFullLevel: null, floodLevel: null, floodLimitLevel: null, lowWaterLevel: null,
      totalStorage: null, effectiveStorage: null, floodControlStorage: null,
      catchmentArea: null, damHeight: null, damLength: null, damType: null,
      // live observation
      observedAt: null,
      storageRate: null, currentWaterLevel: null, currentStorageVolume: null,
      currentInflow: null, currentOutflow: null,
      // comparison (MyWater 전년/예년)
      rateLastYear: null, rateNormalYear: null, effectiveRate: null,
      inflowYesterday: null, outflowYesterday: null,
      diffNormalYear: null,
      hourly: [],
      distanceKm: null,
      status: null
    };
  }

  function mergeRecord(reg, live, userLocation) {
    const rec = emptyRecord(reg);
    if (live) {
      const s = live.specs || {};
      const c = live.current || {};
      const r = live.reference || {};
      Object.assign(rec, {
        normalFullLevel: s.normalFullLevel > 0 ? s.normalFullLevel : null,
        floodLevel: s.floodLevel > 0 ? s.floodLevel : null,
        floodLimitLevel: s.floodLimitLevel > 0 ? s.floodLimitLevel : null,
        lowWaterLevel: s.lowWaterLevel > 0 ? s.lowWaterLevel : null,
        totalStorage: isNum(s.totalStorage) ? s.totalStorage : null,
        effectiveStorage: isNum(s.effectiveStorage) ? s.effectiveStorage : null,
        floodControlStorage: isNum(s.floodControlStorage) ? s.floodControlStorage : null,
        catchmentArea: isNum(s.catchmentArea) ? s.catchmentArea : null,
        damHeight: isNum(s.damHeight) ? s.damHeight : null,
        damLength: isNum(s.damLength) ? s.damLength : null,
        damType: s.damType || null,

        observedAt: c.observedAt || null,
        storageRate: round1(c.storageRate),
        currentWaterLevel: isNum(c.waterLevel) ? c.waterLevel : null,
        currentStorageVolume: isNum(c.storageVolume) ? c.storageVolume : null,
        currentInflow: isNum(c.inflow) ? c.inflow : null,
        currentOutflow: isNum(c.outflow) ? c.outflow : null,

        rateLastYear: round1(r.rateLastYear),
        rateNormalYear: round1(r.rateNormalYear),
        effectiveRate: round1(r.effectiveRate),
        inflowYesterday: isNum(r.inflowYesterday) ? r.inflowYesterday : null,
        outflowYesterday: isNum(r.outflowYesterday) ? r.outflowYesterday : null,
        hourly: Array.isArray(live.hourly) ? live.hourly : []
      });
      rec.diffNormalYear = (isNum(rec.storageRate) && isNum(rec.rateNormalYear)) ? round1(rec.storageRate - rec.rateNormalYear) : null;
    }
    rec.distanceKm = userLocation ? calcDistanceKm(userLocation.lat, userLocation.lng, rec.lat, rec.lng) : null;
    rec.status = classifyStatus(rec);
    return rec;
  }

  async function fetchJson(url) {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return res.json();
  }

  class TelemetryService {
    constructor() {
      this.currentData = DAMS.map((reg) => emptyRecord(reg));
      this.meta = null;          // { generatedAt, observedAt, source }
      this.history = null;       // { start, end, days, dams: { code: [rate|null] } }
      this.state = 'idle';       // idle | loading | ready | error
      this.error = null;
      this.userLocation = null;
      this.eventListeners = [];
      this.historyPromise = null;
    }

    /**
     * (Re)load data/live.json. Resolves with the list of dams whose live fields changed
     * compared to the previous snapshot, so the UI can highlight real updates only.
     */
    async load() {
      this.state = this.meta ? 'refreshing' : 'loading';
      try {
        const payload = await fetchJson(LIVE_URL);
        if (!payload || !Array.isArray(payload.dams)) throw new Error('live.json has no dams array');

        const unchanged = this.meta && this.meta.generatedAt === payload.generatedAt;
        const byId = new Map(payload.dams.map((d) => [d.id, d]));
        const previous = new Map(this.currentData.map((d) => [d.id, d]));

        this.currentData = DAMS.map((reg) => mergeRecord(reg, byId.get(reg.id) || null, this.userLocation));
        this.meta = {
          generatedAt: payload.generatedAt || null,
          observedAt: payload.observedAt || null,
          source: payload.source || null
        };
        this.state = 'ready';
        this.error = null;

        const changes = [];
        if (!unchanged) {
          for (const dam of this.currentData) {
            const prev = previous.get(dam.id);
            if (!prev || prev.storageRate === null) continue;
            const delta = {};
            let touched = false;
            for (const f of LIVE_FIELDS) {
              if (prev[f] !== dam[f]) { delta[f] = [prev[f], dam[f]]; touched = true; }
            }
            if (touched) changes.push({ id: dam.id, delta });
          }
          this.notifySubscribers();
        }
        return { changed: !unchanged, changes };
      } catch (err) {
        this.state = this.meta ? 'ready' : 'error';
        this.error = err;
        console.error('[KDAM] live data load failed:', err);
        this.notifySubscribers();
        throw err;
      }
    }

    loadHistory() {
      if (this.history) return Promise.resolve(this.history);
      if (!this.historyPromise) {
        this.historyPromise = fetchJson(HISTORY_URL)
          .then((payload) => {
            if (!payload || !payload.dams) throw new Error('history.json malformed');
            this.history = payload;
            return payload;
          })
          .catch((err) => {
            this.historyPromise = null;
            console.error('[KDAM] history load failed:', err);
            throw err;
          });
      }
      return this.historyPromise;
    }

    /**
     * Trend series for the inspector chart.
     * '24h' comes from the hourly rows in live.json; longer periods come from history.json.
     * Returns { points: [{ label, date, rate }], available: boolean }
     */
    getTrend(dam, period) {
      if (period === '24h') {
        const rows = dam.hourly.slice(-25);
        return {
          available: rows.length > 1,
          points: rows.map((r) => ({
            label: r.t ? r.t.slice(11, 16) : '',
            date: r.t || '',
            rate: isNum(r.storageRate) ? r.storageRate : null,
            waterLevel: isNum(r.waterLevel) ? r.waterLevel : null,
            inflow: isNum(r.inflow) ? r.inflow : null,
            outflow: isNum(r.outflow) ? r.outflow : null
          }))
        };
      }
      const h = this.history;
      const series = h && h.dams ? h.dams[dam.code] : null;
      if (!series) return { available: false, points: [] };

      const daysWanted = { '30d': 31, '1y': 366, '3y': 1096, '5y': series.length }[period] || 31;
      const slice = series.slice(-daysWanted);
      const offset = series.length - slice.length;
      const step = Math.max(1, Math.ceil(slice.length / 400));
      const startMs = Date.parse(`${h.start}T00:00:00Z`);
      const point = (i) => {
        const d = new Date(startMs + (offset + i) * 86400000);
        const yy = String(d.getUTCFullYear()).slice(2);
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return {
          label: period === '30d' ? `${mm}/${dd}` : `${yy}.${mm}${period === '1y' ? `.${dd}` : ''}`,
          date: `${d.getUTCFullYear()}-${mm}-${dd}`,
          rate: slice[i]
        };
      };
      const points = [];
      for (let i = 0; i < slice.length; i += step) points.push(point(i));
      // Always end on the most recent day
      const lastIdx = slice.length - 1;
      if ((lastIdx % step) !== 0) points.push(point(lastIdx));
      return { available: points.some((p) => p.rate !== null), points };
    }

    updateUserLocation(userLat, userLng) {
      this.userLocation = (isNum(userLat) && isNum(userLng)) ? { lat: userLat, lng: userLng } : null;
      this.currentData = this.currentData.map((dam) => ({
        ...dam,
        distanceKm: this.userLocation ? calcDistanceKm(userLat, userLng, dam.lat, dam.lng) : null
      }));
      this.notifySubscribers();
      return this.currentData;
    }

    /**
     * National overview. Storage figures exclude flood-control dams (kept empty by design)
     * so that they do not drag the national average down.
     */
    getOverviewMetrics() {
      const observed = this.currentData.filter((d) => d.storageRate !== null);
      const storageDams = observed.filter((d) => d.type !== DAM_TYPES.FLOOD_CONTROL && isNum(d.totalStorage) && isNum(d.currentStorageVolume));

      const totalCapacity = storageDams.reduce((acc, d) => acc + d.totalStorage, 0);
      const totalStorageVolume = storageDams.reduce((acc, d) => acc + d.currentStorageVolume, 0);
      const avgStorageRate = totalCapacity > 0 ? (totalStorageVolume / totalCapacity) * 100 : null;

      const refDams = storageDams.filter((d) => isNum(d.rateNormalYear));
      const refCapacity = refDams.reduce((acc, d) => acc + d.totalStorage, 0);
      const normalYearVolume = refDams.reduce((acc, d) => acc + (d.totalStorage * d.rateNormalYear) / 100, 0);
      const normalYearRate = refCapacity > 0 ? (normalYearVolume / refCapacity) * 100 : null;
      const currentRateOfRefDams = refCapacity > 0
        ? (refDams.reduce((acc, d) => acc + d.currentStorageVolume, 0) / refCapacity) * 100
        : null;
      const diffNormalYear = (isNum(normalYearRate) && isNum(currentRateOfRefDams)) ? currentRateOfRefDams - normalYearRate : null;

      const totalInflow = observed.reduce((acc, d) => acc + (isNum(d.currentInflow) ? d.currentInflow : 0), 0);
      const totalOutflow = observed.reduce((acc, d) => acc + (isNum(d.currentOutflow) ? d.currentOutflow : 0), 0);
      const dischargingCount = observed.filter((d) => isNum(d.currentOutflow) && d.currentOutflow >= THRESHOLDS.DISCHARGE_CMS).length;
      const droughtCount = storageDams.filter((d) => d.storageRate < THRESHOLDS.DROUGHT_CAUTION).length;

      // Same 0.1 rounding as the UI's toFixed(1) so formatting the number later cannot drift
      const fixed1 = (v) => (isNum(v) ? Number(v.toFixed(1)) : null);
      return {
        observedDams: observed.length,
        avgStorageRate: fixed1(avgStorageRate),
        normalYearRate: fixed1(normalYearRate),
        diffNormalYear: fixed1(diffNormalYear),
        totalStorageVolume: fixed1(totalStorageVolume),
        totalCapacity: fixed1(totalCapacity),
        totalInflow: fixed1(totalInflow),
        totalOutflow: fixed1(totalOutflow),
        dischargingCount,
        droughtCount,
        observedAt: this.meta ? this.meta.observedAt : null
      };
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

  const telemetryService = new TelemetryService();

  window.KDAM = { DAM_TYPES, DAMS, THRESHOLDS, telemetryService };

})(typeof window !== 'undefined' ? window : this);
