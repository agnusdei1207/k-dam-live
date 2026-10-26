// Freshness gate: a scheduled run rebuilds only when MyWater is ahead of the deployed snapshot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, MAX_SITE_AGE_MS } from '../scripts/needs-update.mjs';
import { kstStampMs } from '../scripts/mywater.mjs';

const now = Date.parse('2026-10-26T06:40:00Z'); // 15:40 KST
const site = { observedAt: '2026-10-26 15:00', generatedAt: '2026-10-26T06:17:04Z' };

test('same hour on both sides → skip', () => {
  assert.equal(decide({ hour: '2026-10-26 15:00' }, site, now).update, false);
});

test('portal published a newer hour → rebuild', () => {
  assert.equal(decide({ hour: '2026-10-26 16:00' }, site, now).update, true);
});

test('midnight written as hour 24 is the same instant as 00:00 of the next day', () => {
  assert.equal(kstStampMs('2026-10-25 24:00'), kstStampMs('2026-10-26 00:00'));
  assert.equal(decide({ hour: '2026-10-26 00:00' }, { ...site, observedAt: '2026-10-25 24:00' }, now).update, false);
});

test('a stale deployment is rebuilt even when the portal has not moved', () => {
  const old = { ...site, generatedAt: new Date(now - MAX_SITE_AGE_MS - 1).toISOString() };
  assert.equal(decide({ hour: '2026-10-26 15:00' }, old, now).update, true);
});

test('portal down → keep the deployment; site unreadable or malformed → rebuild', () => {
  assert.equal(decide({ error: 'HTTP 503' }, site, now).update, false);
  assert.equal(decide({ hour: '2026-10-26 15:00' }, { error: 'HTTP 404' }, now).update, true);
  assert.equal(decide({ hour: '2026-10-26 15:00' }, { observedAt: null, generatedAt: null }, now).update, true);
});

test('stamps are read as KST', () => {
  assert.equal(kstStampMs('2026-10-26 15:00'), Date.parse('2026-10-26T06:00:00Z'));
  assert.ok(Number.isNaN(kstStampMs('2026-10-26')));
});
