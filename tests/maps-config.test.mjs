import assert from 'node:assert/strict';
import test from 'node:test';
import { publicMapsConfig } from '../src/server/publicMapsConfig.ts';

test('server-only configuration never exposes the REST key', async () => {
  const response = publicMapsConfig({ GOOGLE_REST_API_KEY: 'server-secret' });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!(await response.text()).includes('server-secret'));
});

test('using the REST key as the browser key is rejected', async () => {
  const response = publicMapsConfig({ GOOGLE_MAPS_BROWSER_API_KEY: ' shared-secret ', GOOGLE_REST_API_KEY: 'shared-secret' });
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('shared-secret'));
});

test('only a distinct browser key is returned', async () => {
  const response = publicMapsConfig({ GOOGLE_MAPS_BROWSER_API_KEY: 'browser-only', GOOGLE_REST_API_KEY: 'server-secret' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { googleMapsApiKey: 'browser-only' });
});
