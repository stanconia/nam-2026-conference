import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** PUT /users/:id/preferred-venue — the My Agenda venue section saves through it. */

let api;
let close;
let venues;

before(async () => {
  ({ api, close } = await startApi());
  ({ venues } = await api.json('/bootstrap'));
});
after(() => close());

describe('PUT /users/:id/preferred-venue', () => {
  test('an attendee who has never chosen has no preference (either)', async () => {
    assert.equal((await api.json('/users/3')).preferredVenueId, null);
  });

  test('stores a venue id and GET returns it; null clears it', async () => {
    const put = await api.put('/users/3/preferred-venue', { venueId: venues[0].id });
    assert.equal(put.status, 200);
    assert.equal(put.body.preferredVenueId, venues[0].id);
    assert.equal((await api.json('/users/3')).preferredVenueId, venues[0].id);

    const cleared = await api.put('/users/3/preferred-venue', { venueId: null });
    assert.equal(cleared.status, 200);
    assert.equal((await api.json('/users/3')).preferredVenueId, null);
  });

  test('saving one attendee leaves another alone', async () => {
    await api.put('/users/4/preferred-venue', { venueId: venues[1].id });
    assert.equal((await api.json('/users/5')).preferredVenueId, null);
    await api.put('/users/4/preferred-venue', { venueId: null });
  });

  test('an unknown venue or a non-integer is a 400 and nothing is saved', async () => {
    await api.put('/users/6/preferred-venue', { venueId: venues[0].id });
    for (const bad of [9999, '1', 1.5, 'either', undefined]) {
      const res = await api.put('/users/6/preferred-venue', { venueId: bad });
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
    assert.equal((await api.json('/users/6')).preferredVenueId, venues[0].id);
    await api.put('/users/6/preferred-venue', { venueId: null });
  });

  test('an unknown attendee is a 404', async () => {
    const res = await api.put('/users/9999/preferred-venue', { venueId: null });
    assert.equal(res.status, 404);
  });
});
