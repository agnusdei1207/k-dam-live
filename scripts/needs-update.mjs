#!/usr/bin/env node
/**
 * Cheap freshness gate for scheduled builds: one MyWater call (getVers) tells which hour the
 * portal has published; the deployed data/live.json tells which hour the site shows. A full
 * fetch + deploy is only needed when the portal is ahead (or the deployed snapshot is unreadable).
 * Writes `update=true|false` to $GITHUB_OUTPUT when present.
 */
import { appendFile } from 'node:fs/promises';

const ENDPOINT = 'https://www.water.or.kr/kor/realtime/sumun/ajaxProc.do';
const DEPLOYED = process.env.DEPLOYED_LIVE_URL || 'https://agnusdei1207.github.io/k-dam-live/data/live.json';
const MAX_SITE_AGE_MS = 3 * 3600000; // rebuild regardless once the deployed snapshot is this old

async function portalHour() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: 'mode=getVers&baseDate=&baseTime=',
    signal: AbortSignal.timeout(30000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.water.or.kr/kor/realtime/sumun/index.do?mode=vers&menuId=13_91_93_96'
    }
  });
  if (!res.ok) throw new Error(`portal HTTP ${res.status}`);
  const { baseDate, baseTime } = (await res.json()).params || {};
  if (!baseDate || !baseTime) throw new Error('portal returned no base hour');
  return `${baseDate} ${String(baseTime).padStart(2, '0')}:00`;
}

async function deployedSnapshot() {
  const res = await fetch(`${DEPLOYED}?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`site HTTP ${res.status}`);
  return res.json();
}

const [portal, site] = await Promise.allSettled([portalHour(), deployedSnapshot()]);
let update = true;
let reason;
if (portal.status === 'rejected') {
  // A full fetch would fail as well; keep the current deployment and try again next tick.
  update = false;
  reason = `portal unavailable (${portal.reason.message})`;
} else if (site.status === 'rejected') {
  reason = `deployed snapshot unreadable (${site.reason.message})`;
} else {
  const { observedAt, generatedAt } = site.value;
  if (portal.value > (observedAt || '')) reason = `portal ${portal.value} is newer than site ${observedAt}`;
  else if (!(Date.now() - Date.parse(generatedAt) < MAX_SITE_AGE_MS)) reason = `site snapshot from ${generatedAt} is too old`;
  else { update = false; reason = `site already shows ${observedAt} (portal ${portal.value})`; }
}

console.log(`[needs-update] ${update} · ${reason}`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `update=${update}\n`);
