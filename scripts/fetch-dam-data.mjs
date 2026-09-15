#!/usr/bin/env node
/**
 * K-DAM LIVE — Build-time data fetcher
 *
 * Pulls real observation data for every dam in js/registry.js from the K-water MyWater
 * portal (https://www.water.or.kr, 실시간 현황 > 댐/보 수문자료) and writes two static JSON
 * files that the site loads in the browser:
 *
 *   data/live.json     current snapshot + last 48 hourly observations per dam (~80 KB)
 *   data/history.json  daily storage-rate history for the last 5 years per dam (~300 KB)
 *
 * Endpoints used (all POST https://www.water.or.kr/kor/realtime/sumun/ajaxProc.do, no API key):
 *   mode=getVers    다목적댐 관리현황 (21 dams, 현재/전년/예년 저수율 등)
 *   mode=getYongsu  용수댐 관리현황   (14 dams)
 *   mode=getBasic   댐 기본현황 제원  (높이·길이·유역면적·홍수위·만수위·저수위·총/유효저수량 …)
 *   mode=getHydr    수문현황 시계열   (param1=H 시간별 / D 일별: 수위·저수량·강우·유입·방류·저수율)
 *   mode=getPeriod  기간별 자료       (댐군 단위 일별 저수량, 최대 365일 창)
 *
 * Runs on Node 20+ with no dependencies:  node scripts/fetch-dam-data.mjs
 * Exits non-zero if the primary snapshot cannot be fetched so a failed run never
 * overwrites the previous deployment with empty data.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REGISTRY = require('../js/registry.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data');

const ENDPOINT = 'https://www.water.or.kr/kor/realtime/sumun/ajaxProc.do';
const REFERER = 'https://www.water.or.kr/kor/realtime/sumun/index.do?mode=vers&menuId=13_91_93_96';
const USER_AGENT = 'k-dam-live/2.0 (+https://github.com/agnusdei1207/k-dam-live)';

const HOURLY_ROWS = 48;         // hours kept in live.json per dam
const HISTORY_YEARS = 5;        // 365-day windows fetched for history.json
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 60_000;
const RETRIES = 3;
const MIN_DAMS_WITH_DATA = 30;  // sanity floor before writing output

// ───────────────────────────────────────────────────────────────────────────────
// Time helpers (all MyWater dates are KST)
// ───────────────────────────────────────────────────────────────────────────────
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const kstNow = () => new Date(Date.now() + KST_OFFSET_MS);
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);
const daysBetween = (a, b) => Math.round((Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / 86_400_000);
const parseYmd = (s) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));

// ───────────────────────────────────────────────────────────────────────────────
// HTTP
// ───────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(params, attempt = 1) {
  const body = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      body,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': REFERER,
        'User-Agent': USER_AGENT
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errorChk && json.errorChk !== 'N') throw new Error(`MyWater error: ${json.errorTitle || json.errorChk}`);
    return json;
  } catch (err) {
    if (attempt >= RETRIES) throw new Error(`${params.mode} failed after ${attempt} attempts: ${err.message}`);
    await sleep(1500 * attempt);
    return call(params, attempt + 1);
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const num = (v) => (v === null || v === undefined || v === '' ? null : (Number.isFinite(+v) ? +v : null));
const round = (v, d = 1) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

// ───────────────────────────────────────────────────────────────────────────────
// Fetchers
// ───────────────────────────────────────────────────────────────────────────────
async function fetchSnapshots() {
  const [vers, yongsu] = await Promise.all([
    call({ mode: 'getVers', baseDate: '', baseTime: '' }),
    call({ mode: 'getYongsu', baseDate: '', baseTime: '' })
  ]);

  const byCode = new Map();
  // 다목적댐: ITEM index meaning documented in MyWater drawVersTable()
  for (const r of vers.versList || []) {
    byCode.set(String(r.DAM_CD), {
      inflowYesterday: num(r.ITEM7), outflowYesterday: round((num(r.ITEM8) ?? 0) + (num(r.ITEM9) ?? 0), 3),
      waterLevel: num(r.ITEM12), storageVolume: num(r.ITEM19),
      storageRate: num(r.ITEM22), rateLastYear: num(r.ITEM98), rateNormalYear: num(r.ITEM99),
      effectiveRate: num(r.ITEM100)
    });
  }
  // 용수댐: ITEM index meaning documented in MyWater 용수댐 drawVersTable()
  for (const r of yongsu.yongsuList || []) {
    byCode.set(String(r.DAM_CD), {
      inflowYesterday: num(r.ITEM6), outflowYesterday: num(r.ITEM7),
      waterLevel: num(r.ITEM12), storageVolume: num(r.ITEM15),
      storageRate: num(r.ITEM16), rateLastYear: num(r.ITEM17), rateNormalYear: num(r.ITEM18),
      effectiveRate: num(r.ITEM19), totalStorage: num(r.ITEM20)
    });
  }
  const p = vers.params || {};
  return { byCode, baseDate: p.baseDate || null, baseTime: p.baseTime || null };
}

async function fetchSpecs(dam) {
  const json = await call({ mode: 'getBasic', damCd: dam.code, damGb: dam.group });
  const b = (json.list && json.list[0]) || {};
  // DATA16/17 (사업기간) are not completion dates for older 용수댐 — 준공연도 lives in js/registry.js
  return {
    damType: b.DATA18 || null,
    damHeight: num(b.DATA1),
    damLength: num(b.DATA2),
    catchmentArea: num(b.DATA5),
    floodLevel: num(b.DATA8),
    normalFullLevel: num(b.DATA9),
    floodLimitLevel: num(b.DATA10),
    lowWaterLevel: num(b.DATA12),
    totalStorage: num(b.DATA13),
    effectiveStorage: num(b.DATA14),
    floodControlStorage: num(b.DATA15)
  };
}

// getHydr H → rows newest first: SDATE=yyyymmddHH, DATA1 수위, DATA2 저수량, DATA4 유입, DATA6 총방류, DATA7 저수율
async function fetchHourly(dam, today) {
  const json = await call({
    mode: 'getHydr', damCd: dam.code, param1: 'H',
    startDate: ymd(addDays(today, -3)), endDate: ymd(today), page: ''
  });
  const rows = (json.list || [])
    .filter((r) => r.SDATE && r.DATA7 !== null && r.DATA7 !== undefined)
    .sort((a, b) => (a.SDATE < b.SDATE ? -1 : 1))
    .slice(-HOURLY_ROWS)
    .map((r) => ({
      t: `${r.SDATE.slice(0, 4)}-${r.SDATE.slice(4, 6)}-${r.SDATE.slice(6, 8)} ${r.SDATE.slice(8, 10)}:00`,
      waterLevel: round(num(r.DATA1), 3),
      storageVolume: round(num(r.DATA2), 3),
      inflow: round(num(r.DATA4), 3),
      outflow: round(num(r.DATA6), 3),
      storageRate: round(num(r.DATA7), 1)
    }));
  return rows;
}

// getHydr D → daily rows for one dam (used for dams that are not part of a getPeriod group)
async function fetchDailyByDam(dam, start, end) {
  const json = await call({
    mode: 'getHydr', damCd: dam.code, param1: 'D',
    startDate: ymd(start), endDate: ymd(end), page: ''
  });
  const out = new Map();
  for (const r of json.list || []) {
    if (!r.SDATE) continue;
    const s = String(r.SDATE);
    const date = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    out.set(date, { rate: num(r.DATA7), volume: num(r.DATA2) });
  }
  return out;
}

// getPeriod → one call returns 365 daily rows for every dam in the group (param2 1 다목적 / 2 용수)
async function fetchDailyByGroup(group, start, end) {
  const json = await call({
    mode: 'getPeriod', param1: 'DATA2', param2: group, param3: 'D1',
    startDate: ymd(start), endDate: ymd(end)
  });
  const colByCode = new Map((json.damList || []).map((d) => [String(d.DAM_CD), `COL${d.RNUM}`]));
  const byCode = new Map();
  for (const [code, col] of colByCode) byCode.set(code, new Map());
  for (const row of json.periodList || []) {
    if (!row.SDATE) continue;
    for (const [code, col] of colByCode) {
      const v = num(row[col]);
      if (v !== null) byCode.get(code).set(row.SDATE, v);
    }
  }
  return byCode;
}

// ───────────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now();
  const today = kstNow();
  const dams = REGISTRY.DAMS;
  console.log(`[fetch] ${dams.length} dams · KST ${ymd(today)} ${pad2(today.getUTCHours())}:${pad2(today.getUTCMinutes())}`);

  // 1. Snapshot (required)
  const snapshot = await fetchSnapshots();
  console.log(`[fetch] snapshot ok · ${snapshot.byCode.size} dams · base ${snapshot.baseDate} ${snapshot.baseTime}시`);

  // 2. Specs + hourly series per dam (best effort per dam)
  const perDam = await mapLimit(dams, CONCURRENCY, async (dam) => {
    const [specs, hourly] = await Promise.all([
      fetchSpecs(dam).catch((e) => { console.warn(`[warn] specs ${dam.name}: ${e.message}`); return null; }),
      fetchHourly(dam, today).catch((e) => { console.warn(`[warn] hourly ${dam.name}: ${e.message}`); return []; })
    ]);
    return { dam, specs, hourly };
  });

  // 3. Daily history: 5 × 365-day windows, group calls for 다목적/용수, per-dam calls for the rest
  const historyStart = addDays(today, -(HISTORY_YEARS * 365 - 1));
  const totalDays = daysBetween(historyStart, today) + 1;
  const windows = [];
  for (let k = 0; k < HISTORY_YEARS; k++) {
    const end = addDays(today, -365 * k);
    windows.push({ start: addDays(end, -364), end });
  }
  const dailyVolume = new Map(dams.map((d) => [d.code, new Map()]));
  const dailyRate = new Map(dams.map((d) => [d.code, new Map()]));

  const groupJobs = [];
  for (const group of ['1', '2']) {
    for (const w of windows) groupJobs.push({ group, ...w });
  }
  const groupResults = await mapLimit(groupJobs, 2, async (job) => {
    try {
      return await fetchDailyByGroup(job.group, job.start, job.end);
    } catch (e) {
      console.warn(`[warn] period group ${job.group} ${ymd(job.start)}~${ymd(job.end)}: ${e.message}`);
      return new Map();
    }
  });
  for (const res of groupResults) {
    for (const [code, series] of res) {
      if (!dailyVolume.has(code)) continue;
      for (const [date, v] of series) dailyVolume.get(code).set(date, v);
    }
  }
  const ungrouped = dams.filter((d) => d.group !== '1' && d.group !== '2');
  await mapLimit(ungrouped, 2, async (dam) => {
    for (const w of windows) {
      try {
        const rows = await fetchDailyByDam(dam, w.start, w.end);
        for (const [date, r] of rows) {
          if (r.rate !== null) dailyRate.get(dam.code).set(date, r.rate);
          if (r.volume !== null) dailyVolume.get(dam.code).set(date, r.volume);
        }
      } catch (e) {
        console.warn(`[warn] daily ${dam.name} ${ymd(w.start)}~${ymd(w.end)}: ${e.message}`);
      }
    }
  });

  // 4. Assemble
  let damsWithData = 0;
  const liveDams = [];
  const historyDams = {};

  for (const { dam, specs, hourly } of perDam) {
    const snap = snapshot.byCode.get(dam.code) || null;
    const latest = hourly.length ? hourly[hourly.length - 1] : null;
    const totalStorage = specs?.totalStorage ?? snap?.totalStorage ?? null;

    const current = {
      observedAt: latest?.t ?? (snapshot.baseDate ? `${snapshot.baseDate} ${pad2(snapshot.baseTime)}:00` : null),
      waterLevel: latest?.waterLevel ?? snap?.waterLevel ?? null,
      storageVolume: latest?.storageVolume ?? snap?.storageVolume ?? null,
      storageRate: latest?.storageRate ?? snap?.storageRate ?? null,
      inflow: latest?.inflow ?? snap?.inflowYesterday ?? null,
      outflow: latest?.outflow ?? snap?.outflowYesterday ?? null
    };
    if (current.storageRate !== null) damsWithData++;

    liveDams.push({
      id: dam.id,
      code: dam.code,
      specs: specs || {},
      current,
      reference: snap ? {
        rateLastYear: snap.rateLastYear, rateNormalYear: snap.rateNormalYear, effectiveRate: snap.effectiveRate,
        inflowYesterday: snap.inflowYesterday, outflowYesterday: snap.outflowYesterday
      } : null,
      hourly
    });

    // Daily rate series aligned to [historyStart .. today]; null where the portal has no value
    const rates = new Array(totalDays).fill(null);
    const volSeries = dailyVolume.get(dam.code);
    const rateSeries = dailyRate.get(dam.code);
    for (let i = 0; i < totalDays; i++) {
      const date = ymd(addDays(historyStart, i));
      if (rateSeries.has(date)) rates[i] = round(rateSeries.get(date), 1);
      else if (volSeries.has(date) && totalStorage) rates[i] = round((volSeries.get(date) / totalStorage) * 100, 1);
    }
    historyDams[dam.code] = rates;
  }

  if (damsWithData < MIN_DAMS_WITH_DATA) {
    throw new Error(`only ${damsWithData} dams have a current storage rate (need ≥ ${MIN_DAMS_WITH_DATA}); refusing to write output`);
  }

  const observedAt = liveDams.map((d) => d.current.observedAt).filter(Boolean).sort().pop() || null;
  const generatedAt = new Date().toISOString();
  const source = {
    name: 'K-water 물정보포털 (MyWater) 실시간 현황 · 댐/보 수문자료',
    url: 'https://www.water.or.kr/kor/realtime/sumun/index.do?mode=vers&menuId=13_91_93_96',
    endpoint: ENDPOINT
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'live.json'), JSON.stringify({
    generatedAt, observedAt, baseDate: snapshot.baseDate, baseTime: snapshot.baseTime, source, dams: liveDams
  }));
  await writeFile(path.join(OUT_DIR, 'history.json'), JSON.stringify({
    generatedAt, source, start: ymd(historyStart), end: ymd(today), days: totalDays, dams: historyDams
  }));

  const filled = Object.values(historyDams).map((r) => r.filter((v) => v !== null).length);
  console.log(`[fetch] live.json: ${damsWithData}/${dams.length} dams with current data · observed ${observedAt}`);
  console.log(`[fetch] history.json: ${totalDays} days · filled min ${Math.min(...filled)} / max ${Math.max(...filled)}`);
  console.log(`[fetch] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(`[fetch] FAILED: ${err.message}`);
  process.exit(1);
});
