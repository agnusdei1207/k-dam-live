// Telemetry service contract: how data/live.json and data/history.json become screen records.
// Runs the browser scripts unchanged inside a vm context (no DOM, no dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = (file) => readFileSync(new URL(`../js/${file}`, import.meta.url), 'utf8');

function boot(responses) {
  const queue = [...responses];
  const context = vm.createContext({
    console: { ...console, error() {} }, // load failures are asserted, not printed
    fetch: async (url) => {
      const body = typeof queue[0] === 'function' ? queue.shift()(url) : queue.shift();
      return { ok: true, status: 200, json: async () => structuredClone(body) };
    }
  });
  context.window = context;
  vm.runInContext(source('registry.js'), context);
  vm.runInContext(source('data.js'), context);
  return context.KDAM;
}

const SPECS = {
  soyang: { normalFullLevel: 193.5, floodLevel: 198, totalStorage: 2900, effectiveStorage: 1900 },
  peace: { normalFullLevel: 0, floodLevel: 264.6, totalStorage: 2630, effectiveStorage: 0 },
  andong: { normalFullLevel: 160, floodLevel: 161.7, totalStorage: 1248 },
  jwam: { normalFullLevel: 108.5, floodLevel: 110.5, totalStorage: 457 }
};

function live({ generatedAt = '2026-10-26T06:17:04Z', current = {} } = {}) {
  const base = {
    soyang: { waterLevel: 182.799, storageVolume: 1827.553, storageRate: 63.04, inflow: 29.972, outflow: 0 },
    peace: { waterLevel: 170.932, storageVolume: 15.551, storageRate: 0.6, inflow: 29.485, outflow: 28.068 },
    andong: { waterLevel: 144.101, storageVolume: 528.953, storageRate: 42.4, inflow: 10.194, outflow: 0 },
    jwam: { waterLevel: 98.374, storageVolume: 195.947, storageRate: 42.9, inflow: 77.195, outflow: 12.223 }
  };
  const codes = { soyang: '1012110', peace: '1009710', andong: '2001110', jwam: '4007110' };
  return {
    generatedAt,
    observedAt: '2026-10-26 15:00',
    source: { name: 'MyWater' },
    dams: Object.keys(base).map((id) => ({
      id,
      code: codes[id],
      specs: SPECS[id],
      current: { observedAt: '2026-10-26 15:00', ...base[id], ...(current[id] || {}) },
      reference: { rateLastYear: 83.7, rateNormalYear: 60.9, effectiveRate: 40.2, inflowYesterday: 49.4, outflowYesterday: 12.3 },
      hourly: Array.from({ length: 48 }, (_, i) => ({ t: `2026-10-${24 + Math.floor((i + 16) / 24)} ${String((i + 16) % 24).padStart(2, '0')}:00`, storageRate: 41 + i / 20, waterLevel: 98, inflow: 50, outflow: 12 }))
    }))
  };
}

const find = (service, id) => service.currentData.find((d) => d.id === id);

test('every registry dam gets a record; dams missing from the snapshot show no data instead of invented values', async () => {
  const { telemetryService, DAMS } = boot([live()]);
  await telemetryService.load();
  assert.equal(telemetryService.currentData.length, DAMS.length);
  const missing = find(telemetryService, 'chungju');
  assert.equal(missing.storageRate, null);
  assert.equal(missing.currentWaterLevel, null);
  assert.equal(missing.status.code, 'NO_DATA');
  assert.equal(telemetryService.meta.observedAt, '2026-10-26 15:00');
});

test('observations are merged as-is, storage rate rounded to 0.1 and non-positive spec levels dropped', async () => {
  const { telemetryService } = boot([live()]);
  await telemetryService.load();
  const soyang = find(telemetryService, 'soyang');
  assert.equal(soyang.storageRate, 63);
  assert.equal(soyang.currentWaterLevel, 182.799);
  assert.equal(soyang.diffNormalYear, 2.1); // 63.0 − 예년 60.9
  const peace = find(telemetryService, 'peace');
  assert.equal(peace.normalFullLevel, null);
  assert.equal(peace.effectiveStorage, 0);
});

test('status follows the documented thresholds', async () => {
  const { telemetryService } = boot([live({
    current: {
      andong: { waterLevel: 161 },          // ≥ 50 % of the 160→161.7 surcharge band
      jwam: { outflow: 20 }                 // at the discharge threshold
    }
  })]);
  await telemetryService.load();
  const code = (id) => find(telemetryService, id).status.code;
  assert.equal(code('peace'), 'FLOOD_CONTROL');
  assert.equal(code('andong'), 'FLOOD');
  assert.equal(code('jwam'), 'DISCHARGE');
  assert.equal(code('soyang'), 'NORMAL');
});

test('drought bands: <40 alert, <50 caution, <60 attention', async () => {
  for (const [rate, expected] of [[39.9, 'DROUGHT_ALERT'], [40, 'DROUGHT_CAUTION'], [49.9, 'DROUGHT_CAUTION'], [50, 'DROUGHT_ATTENTION'], [59.9, 'DROUGHT_ATTENTION'], [60, 'NORMAL']]) {
    const { telemetryService } = boot([live({ current: { soyang: { storageRate: rate } } })]);
    await telemetryService.load();
    assert.equal(find(telemetryService, 'soyang').status.code, expected, `rate ${rate}`);
  }
});

test('reload reports only real changes and does not notify when the snapshot is the same', async () => {
  const { telemetryService } = boot([
    live(),
    live(),
    live({ generatedAt: '2026-10-26T07:17:04Z', current: { jwam: { storageRate: 43, waterLevel: 98.39 } } })
  ]);
  await telemetryService.load();
  let notified = 0;
  telemetryService.subscribe(() => notified++);

  const same = await telemetryService.load();
  assert.equal(same.changed, false);
  assert.equal(same.changes.length, 0);
  assert.equal(notified, 0);

  const next = await telemetryService.load();
  assert.equal(next.changed, true);
  assert.equal(notified, 1);
  const changes = JSON.parse(JSON.stringify(next.changes)); // vm realm → plain objects
  assert.deepEqual(changes, [{ id: 'jwam', delta: { storageRate: [42.9, 43], currentWaterLevel: [98.374, 98.39] } }]);
});

test('a failed reload keeps the last good snapshot', async () => {
  const { telemetryService } = boot([live(), () => { throw new Error('offline'); }]);
  await telemetryService.load();
  await assert.rejects(telemetryService.load(), /offline/);
  assert.equal(telemetryService.state, 'ready');
  assert.equal(find(telemetryService, 'jwam').storageRate, 42.9);
});

test('national overview is capacity-weighted and excludes the flood-control dam', async () => {
  const { telemetryService } = boot([live()]);
  await telemetryService.load();
  const m = telemetryService.getOverviewMetrics();
  const volume = 1827.553 + 528.953 + 195.947;
  const capacity = 2900 + 1248 + 457;
  assert.equal(Number(m.avgStorageRate), Number(((volume / capacity) * 100).toFixed(1)));
  assert.equal(Number(m.totalCapacity), Number(capacity.toFixed(1)));
  assert.equal(Number(m.totalInflow), Number((29.972 + 29.485 + 10.194 + 77.195).toFixed(1)));
  assert.equal(m.dischargingCount, 1);   // peace 28.068 ㎥/s
  assert.equal(m.droughtCount, 2);       // andong 42.4, jwam 42.9
  assert.equal(m.observedDams, 4);
  assert.equal(Number(m.diffNormalYear), Number(((volume / capacity) * 100 - 60.9).toFixed(1)));
});

test('24h trend uses the last 25 hourly rows', async () => {
  const { telemetryService } = boot([live()]);
  await telemetryService.load();
  const trend = telemetryService.getTrend(find(telemetryService, 'jwam'), '24h');
  assert.equal(trend.available, true);
  assert.equal(trend.points.length, 25);
  assert.equal(trend.points.at(-1).label, '15:00');
});

test('long trends come from history.json, end on the latest day and stay under ~400 points', async () => {
  const days = 1825;
  const series = Array.from({ length: days }, (_, i) => (i === 10 ? null : 30 + (i % 50)));
  const { telemetryService } = boot([live(), { start: '2021-10-28', end: '2026-10-26', days, dams: { 4007110: series } }]);
  await telemetryService.load();
  await telemetryService.loadHistory();
  const jwam = find(telemetryService, 'jwam');

  const month = telemetryService.getTrend(jwam, '30d');
  assert.equal(month.points.length, 31);
  assert.equal(month.points.at(-1).date, '2026-10-26');
  assert.equal(month.points.at(-1).label, '10/26');

  const fiveYears = telemetryService.getTrend(jwam, '5y');
  assert.ok(fiveYears.points.length <= 401);
  assert.equal(fiveYears.points.at(-1).date, '2026-10-26');
  assert.equal(fiveYears.points.at(-1).rate, series.at(-1));
  assert.equal(fiveYears.points[0].date, '2021-10-28');

  assert.equal(telemetryService.getTrend(find(telemetryService, 'soyang'), '1y').available, false);
});

test('distance is the Haversine great circle on a 6371 km sphere', async () => {
  const { telemetryService } = boot([live()]);
  await telemetryService.load();
  const rad = (d) => (d * Math.PI) / 180;
  const haversine = (a, b, c, d) => 2 * 6371 * Math.asin(Math.sqrt(Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2));

  telemetryService.updateUserLocation(37.5665, 126.978); // Seoul City Hall
  for (const dam of telemetryService.currentData) {
    assert.equal(dam.distanceKm, Number(haversine(37.5665, 126.978, dam.lat, dam.lng).toFixed(1)), dam.id);
  }
  const jwam = find(telemetryService, 'jwam');
  telemetryService.updateUserLocation(jwam.lat, jwam.lng);
  assert.equal(find(telemetryService, 'jwam').distanceKm, 0);
  telemetryService.updateUserLocation(null, null);
  assert.equal(find(telemetryService, 'jwam').distanceKm, null);
});
