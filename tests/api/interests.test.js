import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** PUT /users/:id/interests — the My Agenda topics section saves through it. */

let api;
let close;
let topics;
let nonTopic;

before(async () => {
  ({ api, close } = await startApi());
  const { tags } = await api.json('/bootstrap');
  topics = tags.filter((t) => t.kind === 'topic').map((t) => t.name);
  nonTopic = tags.find((t) => t.kind !== 'topic').name;
});
after(() => close());

describe('PUT /users/:id/interests', () => {
  test('stores the list, de-duplicated, and GET returns it', async () => {
    const [a, b] = topics;
    const put = await api.put('/users/3/interests', { interests: [a, b, a] });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body.interests, [a, b]);
    assert.deepEqual((await api.json('/users/3')).interests, [a, b]);
  });

  test('an empty list clears the interests', async () => {
    const put = await api.put('/users/3/interests', { interests: [] });
    assert.equal(put.status, 200);
    assert.deepEqual((await api.json('/users/3')).interests, []);
  });

  test('saving one attendee leaves another alone', async () => {
    const before = (await api.json('/users/2')).interests;
    await api.put('/users/1/interests', { interests: [topics[0]] });
    assert.deepEqual((await api.json('/users/2')).interests, before);
  });

  test('a tag that is not a topic is a 400 and nothing is saved', async () => {
    const was = (await api.json('/users/4')).interests;
    for (const bad of [[nonTopic], [topics[0], 'Not A Tag'], 'Agent Design', null]) {
      const res = await api.put('/users/4/interests', { interests: bad });
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
    assert.deepEqual((await api.json('/users/4')).interests, was);
  });

  test('an unknown attendee is a 404', async () => {
    const res = await api.put('/users/9999/interests', { interests: [] });
    assert.equal(res.status, 404);
  });
});
