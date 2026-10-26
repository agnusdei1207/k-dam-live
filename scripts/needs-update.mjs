#!/usr/bin/env node
/**
 * Cheap freshness gate for scheduled builds: one MyWater call (getVers) tells which hour the
 * portal has published; the deployed data/live.json tells which hour the site shows. A full
 * fetch + deploy is only needed when the portal is ahead (or the deployed snapshot is unreadable).
 * Writes `update=true|false` to $GITHUB_OUTPUT when present.
 */
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { call, kstStampMs } from './mywater.mjs';

const DEPLOYED = process.env.DEPLOYED_LIVE_URL || 'https://agnusdei1207.github.io/k-dam-live/data/live.json';
export const MAX_SITE_AGE_MS = 3 * 3_600_000; // rebuild regardless once the deployed snapshot is this old

/**
 * portal: { hour } | { error }, site: { observedAt, generatedAt } | { error } → { update, reason }
 */
export function decide(portal, site, now = Date.now()) {
  // A full fetch would fail as well; keep the current deployment and try again next tick.
  if (portal.error) return { update: false, reason: `portal unavailable (${portal.error})` };
  if (site.error) return { update: true, reason: `deployed snapshot unreadable (${site.error})` };
  const siteHour = kstStampMs(site.observedAt);
  if (!(kstStampMs(portal.hour) <= siteHour)) return { update: true, reason: `portal ${portal.hour} is newer than site ${site.observedAt}` };
  if (!(now - Date.parse(site.generatedAt) < MAX_SITE_AGE_MS)) return { update: true, reason: `site snapshot from ${site.generatedAt} is too old` };
  return { update: false, reason: `site already shows ${site.observedAt} (portal ${portal.hour})` };
}

async function portalHour() {
  const { params = {} } = await call({ mode: 'getVers', baseDate: '', baseTime: '' }, { retries: 1, timeoutMs: 30_000 });
  if (!params.baseDate || !params.baseTime) throw new Error('portal returned no base hour');
  return `${params.baseDate} ${String(params.baseTime).padStart(2, '0')}:00`;
}

async function deployedSnapshot() {
  const res = await fetch(`${DEPLOYED}?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`site HTTP ${res.status}`);
  return res.json();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failed = (err) => ({ error: err.message });
  const [portal, site] = await Promise.all([portalHour().then((hour) => ({ hour }), failed), deployedSnapshot().catch(failed)]);
  const { update, reason } = decide(portal, site);
  console.log(`[needs-update] ${update} · ${reason}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `update=${update}\n`);
}
