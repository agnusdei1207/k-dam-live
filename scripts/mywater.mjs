/**
 * K-water MyWater portal client shared by the build scripts: the one place that knows the
 * AJAX endpoint, the headers it requires and how its KST observation stamps are written.
 * Endpoint and column contracts are documented in docs/data-pipeline.md.
 */

export const ENDPOINT = 'https://www.water.or.kr/kor/realtime/sumun/ajaxProc.do';
export const PAGE_URL = 'https://www.water.or.kr/kor/realtime/sumun/index.do?mode=vers&menuId=13_91_93_96';
const USER_AGENT = 'k-dam-live/2.0 (+https://github.com/agnusdei1207/k-dam-live)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST one `mode=` request. Retries with linear back-off; throws once `retries` attempts failed
 * or the portal reports an error flag.
 */
export async function call(params, { retries = 3, timeoutMs = 60_000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': PAGE_URL,
          'User-Agent': USER_AGENT
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errorChk && json.errorChk !== 'N') throw new Error(`MyWater error: ${json.errorTitle || json.errorChk}`);
      return json;
    } catch (err) {
      if (attempt >= retries) throw new Error(`${params.mode} failed after ${attempt} attempts: ${err.message}`);
      await sleep(1500 * attempt);
    }
  }
}

/**
 * "YYYY-MM-DD HH:MM" (KST) → epoch ms, or NaN. MyWater writes midnight as hour 24 of the
 * previous day ("2026-10-25 24:00"), which this maps to the same instant as "2026-10-26 00:00".
 */
export function kstStampMs(stamp) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/.exec(stamp || '');
  if (!m) return NaN;
  return Date.parse(`${m[1]}T00:00:00+09:00`) + Number(m[2]) * 3_600_000 + Number(m[3]) * 60_000;
}
