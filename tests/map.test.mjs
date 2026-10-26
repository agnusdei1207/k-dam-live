// Peninsula map: every dam projects inside the frame, geography keeps its order, markup is accessible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['registry.js', 'map.js']) vm.runInContext(readFileSync(new URL(`../js/${file}`, import.meta.url), 'utf8'), context);
const { KDAM_MAP: MAP, KDAM_REGISTRY: { DAMS } } = context;
const [, W, H] = MAP.svg({ dams: [], bandOf: () => null, label: () => '' }).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
const byId = Object.fromEntries(DAMS.map((d) => [d.id, MAP.project(d.lat, d.lng)]));

test('all 36 dams project inside the map frame', () => {
  assert.equal(DAMS.length, 36);
  for (const dam of DAMS) {
    const [x, y] = byId[dam.id];
    assert.ok(x > 0 && x < W && y > 0 && y < H, `${dam.id} at ${x},${y}`);
  }
});

test('projection keeps geography: north is up, east is right', () => {
  const ys = Object.entries(byId).sort((a, b) => a[1][1] - b[1][1]);
  assert.equal(ys[0][0], 'peace');                       // 평화의댐 is the northernmost dam
  assert.ok(byId.soyang[1] < byId.chungju[1]);            // 춘천 is north of 충주
  assert.ok(byId.boryeong[0] < byId.daecheong[0]);        // 보령 (west coast) is west of 대청
  assert.ok(byId.gampo[0] > byId.andong[0]);              // 감포 (east coast) is east of 안동
  assert.ok(byId.jangheung[1] > byId.jwam[1]);            // 장흥 is south of 주암
});

test('Ulleungdo and Dokdo are drawn inside the dashed inset box', () => {
  const markup = MAP.svg({ dams: [], bandOf: () => null, label: () => '' });
  const [bx, by, bw, bh] = markup.match(/class="map-inset" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
  for (const [lat, lng] of [[37.241, 131.865], [37.5, 130.87]]) {
    const [x, y] = MAP.project(lat, lng);
    assert.ok(x >= bx && x <= bx + bw && y >= by && y <= by + bh, `${lat},${lng} → ${x},${y}`);
  }
});

test('dots carry band, dimming, selection and accessible labels', () => {
  const dams = DAMS.slice(0, 3).map((d, i) => ({ ...d, totalStorage: 100 * (i + 1), storageRate: 30 + i }));
  const markup = MAP.svg({
    dams,
    bandOf: (d) => (d.id === dams[2].id ? null : 1),
    label: (d) => `${d.name} label`,
    dimmed: new Set([dams[1].id]),
    selected: dams[0].id
  });
  assert.equal((markup.match(/class="map-dot /g) || []).length, 3);
  assert.match(markup, new RegExp(`class="map-dot band-1 is-selected" data-dam-id="${dams[0].id}" tabindex="0" role="button" aria-label="${dams[0].name} label"`));
  assert.match(markup, new RegExp(`class="map-dot band-1 is-dimmed" data-dam-id="${dams[1].id}"`));
  assert.match(markup, new RegExp(`class="map-dot band-na" data-dam-id="${dams[2].id}"`));
  assert.equal((markup.match(/map-dot-ring/g) || []).length, 1);
  const still = MAP.svg({ dams, bandOf: () => 1, label: () => 'x', interactive: false });
  assert.doesNotMatch(still, /tabindex/);
});

test('dot area grows with capacity and stays within 3.2–10 units', () => {
  assert.equal(MAP.radius({ totalStorage: 0 }), 3.2);
  assert.ok(Math.abs(MAP.radius({ totalStorage: 2900 }) - 10) < 1e-9);
  assert.ok(MAP.radius({ totalStorage: 1000 }) < MAP.radius({ totalStorage: 2000 }));
  assert.equal(MAP.radius({ totalStorage: 99999 }), MAP.radius({ totalStorage: 2900 }));
});
