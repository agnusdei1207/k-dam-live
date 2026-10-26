#!/usr/bin/env node
/** Reject stale or internally inconsistent MyWater snapshots before deployment. */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { kstStampMs } from './mywater.mjs';

const { DAMS } = createRequire(import.meta.url)('../js/registry.js');
const file = new URL('../data/live.json', import.meta.url);
const snapshot = JSON.parse(await readFile(file, 'utf8'));
const byId = new Map(snapshot.dams.map((dam) => [dam.id, dam]));
const now = Date.now();
let fresh = 0;
const errors = [];

if (byId.size !== snapshot.dams.length) errors.push('duplicate dam ID');
if (snapshot.dams.length !== DAMS.length) errors.push('dam count differs from registry');

for (const reg of DAMS) {
  const dam = byId.get(reg.id);
  if (!dam || dam.code !== reg.code) {
    errors.push(`${reg.id}: missing or mismatched dam code`);
    continue;
  }
  const { current, specs } = dam;
  const stamp = current?.observedAt;
  const age = now - kstStampMs(stamp);
  if (!Number.isFinite(age) || age < -3600000 || age > 6 * 3600000) {
    errors.push(`${reg.id}: stale or invalid observation time ${stamp}`);
    continue;
  }
  const { storageRate: rate, storageVolume: volume, waterLevel, inflow, outflow } = current;
  if (![rate, volume, waterLevel, inflow, outflow].every(Number.isFinite) ||
      rate < 0 || rate > 100 || volume < 0 || inflow < 0 || outflow < 0) {
    errors.push(`${reg.id}: missing or invalid observation`);
    continue;
  }
  const capacity = specs?.totalStorage;
  if (Number.isFinite(capacity) && capacity > 0 && Math.abs(rate - volume / capacity * 100) > 0.2) {
    errors.push(`${reg.id}: storage rate disagrees with observed volume`);
    continue;
  }
  fresh++;
}

if (fresh < 30) errors.push(`only ${fresh}/${DAMS.length} dams have valid fresh observations`);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Validated ${fresh}/${DAMS.length} fresh MyWater dam observations`);
}
