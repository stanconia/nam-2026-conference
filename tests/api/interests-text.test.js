import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** PUT /users/:id/interests-text — the My Agenda free-text section saves through it. */

let api;
let close;

before(async () => {
  ({ api, close } = await startApi());
});
after(() => close());

describe('PUT /users/:id/interests-text', () => {
  test('sets, replaces and clears the text, and GET agrees each time', async () => {
    for (const text of ['Evals and agents', 'Only the keynote', '']) {
      const put = await api.put('/users/3/interests-text', { text });
      assert.equal(put.status, 200);
      assert.equal(put.body.interestsText, text);
      assert.equal((await api.json('/users/3')).interestsText, text);
    }
  });

  test('trims, and whitespace-only text is stored as empty', async () => {
    assert.equal((await api.put('/users/3/interests-text', { text: '  hi  ' })).body.interestsText, 'hi');
    assert.equal((await api.put('/users/3/interests-text', { text: '   ' })).body.interestsText, '');
  });

  test('500 characters are accepted, 501 is a 400 that leaves the text unchanged', async () => {
    const ok = 'a'.repeat(500);
    assert.equal((await api.put('/users/3/interests-text', { text: ok })).status, 200);
    const bad = await api.put('/users/3/interests-text', { text: 'a'.repeat(501) });
    assert.equal(bad.status, 400);
    assert.equal((await api.json('/users/3')).interestsText, ok);
    await api.put('/users/3/interests-text', { text: '' });
  });

  test('a non-string is a 400, an unknown attendee a 404', async () => {
    assert.equal((await api.put('/users/3/interests-text', { text: 5 })).status, 400);
    assert.equal((await api.put('/users/3/interests-text', {})).status, 400);
    assert.equal((await api.put('/users/99999/interests-text', { text: 'x' })).status, 404);
  });

  test('attendees start with no text', async () => {
    assert.equal((await api.json('/users/1')).interestsText, '');
  });
});
