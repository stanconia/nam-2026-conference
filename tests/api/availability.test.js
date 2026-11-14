import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** Availability — `PUT /api/users/:id/availability`, read back on `GET /api/users/:id`. */

let api;
let close;
let days;

before(async () => {
  ({ api, close } = await startApi());
  days = (await api.json('/bootstrap')).days.map((d) => d.date);
});
after(() => close());

const saved = async (id) => (await api.json(`/users/${id}`)).availability;

describe('Availability', () => {
  test('a fresh attendee has stated nothing', async () => {
    assert.deepEqual(await saved(5), []);
  });

  test('saves ticked days and windows, and reads them back', async () => {
    const body = { days: [{ day: days[1], from: '09:00', to: '12:00' }, { day: days[0], from: null, to: null }] };
    const res = await api.put('/users/5/availability', body);
    assert.equal(res.status, 200);
    const want = [{ day: days[0], from: null, to: null }, { day: days[1], from: '09:00', to: '12:00' }];
    assert.deepEqual(res.body, want);
    assert.deepEqual(await saved(5), want);
  });

  test('is per attendee', async () => {
    assert.deepEqual(await saved(3), []);
  });

  test('a later save drops a day or clears its window', async () => {
    await api.put('/users/5/availability', { days: [{ day: days[0] }, { day: days[1], from: '09:00', to: '12:00' }] });
    await api.put('/users/5/availability', { days: [{ day: days[1] }] });
    assert.deepEqual(await saved(5), [{ day: days[1], from: null, to: null }]);
    await api.put('/users/5/availability', { days: [] });
    assert.deepEqual(await saved(5), []);
  });

  test('refuses an end not after the start, and stores nothing', async () => {
    await api.put('/users/5/availability', { days: [{ day: days[0] }] });
    const res = await api.put('/users/5/availability', { days: [{ day: days[1], from: '14:00', to: '13:00' }] });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /after/i);
    assert.deepEqual(await saved(5), [{ day: days[0], from: null, to: null }]);
  });

  test('refuses one-sided windows, unknown days and a missing list', async () => {
    assert.equal((await api.put('/users/5/availability', { days: [{ day: days[0], from: '09:00' }] })).status, 400);
    assert.equal((await api.put('/users/5/availability', { days: [{ day: '2020-01-01' }] })).status, 400);
    assert.equal((await api.put('/users/5/availability', {})).status, 400);
  });

  test('404 for an unknown attendee', async () => {
    assert.equal((await api.put('/users/9999/availability', { days: [] })).status, 404);
  });
});
