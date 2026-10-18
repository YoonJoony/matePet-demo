import assert from 'node:assert/strict';
import test from 'node:test';
import { API_LIMITS, guardApi } from '../src/server/apiGuard.ts';

const NOON = Date.UTC(2026, 9, 18, 3); // 2026-10-18 12:00 KST
const request = (ip, headers = {}) => new Request('https://demo.example/api/places', { headers: { 'cf-connecting-ip': ip, ...headers } });

test('requests sent from another site are rejected', async () => {
  const crossSite = guardApi(request('10.0.0.1', { 'sec-fetch-site': 'cross-site' }), 'placesSearch', NOON);
  assert.equal(crossSite?.status, 403);
  const otherOrigin = guardApi(request('10.0.0.2', { origin: 'https://other.example' }), 'placesSearch', NOON);
  assert.equal(otherOrigin?.status, 403);
  assert.equal(guardApi(request('10.0.0.3', { 'sec-fetch-site': 'same-origin' }), 'placesSearch', NOON), null);
  assert.equal(guardApi(request('10.0.0.4', { origin: 'https://demo.example' }), 'placesSearch', NOON), null);
  // 호스팅이 내부 주소로 넘기고 원래 호스트를 X-Forwarded-Host로 알려 주는 경우
  const proxied = new Request('https://internal.worker/api/places', { headers: { 'x-real-ip': '10.0.0.5', origin: 'https://demo.example', 'x-forwarded-host': 'demo.example' } });
  assert.equal(guardApi(proxied, 'placesSearch', NOON), null);
});

test('each client is limited per minute and the window resets', async () => {
  const { perMinute } = API_LIMITS.placePhoto;
  for (let i = 0; i < perMinute; i += 1) assert.equal(guardApi(request('10.0.1.1'), 'placePhoto', NOON), null);
  const limited = guardApi(request('10.0.1.1'), 'placePhoto', NOON + 1_000);
  assert.equal(limited?.status, 429);
  assert.equal(limited?.headers.get('retry-after'), '59');
  assert.equal(guardApi(request('10.0.1.2'), 'placePhoto', NOON + 1_000), null, 'other clients are not affected');
  assert.equal(guardApi(request('10.0.1.1'), 'placePhoto', NOON + 60_000), null, 'next minute is allowed');
});

test('Expo hosting X-Real-IP identifies clients separately', async () => {
  const viaRealIp = (ip) => new Request('https://demo.example/api/places', { headers: { 'x-real-ip': ip, 'x-forwarded-for': '198.51.100.1' } });
  const { perMinute } = API_LIMITS.placesSearch;
  for (let i = 0; i < perMinute; i += 1) assert.equal(guardApi(viaRealIp('10.3.0.1'), 'placesSearch', NOON), null);
  assert.equal(guardApi(viaRealIp('10.3.0.1'), 'placesSearch', NOON)?.status, 429);
  assert.equal(guardApi(viaRealIp('10.3.0.2'), 'placesSearch', NOON), null, 'same proxy, different real IP');
});

test('the whole site stops at the daily cap until the next Korean day', async () => {
  const { perDay } = API_LIMITS.placeDetails;
  for (let i = 0; i < perDay; i += 1) assert.equal(guardApi(request(`10.1.${Math.floor(i / 200)}.${i % 200}`), 'placeDetails', NOON), null);
  const capped = guardApi(request('10.2.0.1'), 'placeDetails', NOON);
  assert.equal(capped?.status, 429);
  assert.match((await capped.json()).error, /오늘 시설 상세/);
  const nextDay = NOON + 12 * 3_600_000; // 다음 날 00:00 KST
  assert.equal(guardApi(request('10.2.0.1'), 'placeDetails', nextDay), null);
});
