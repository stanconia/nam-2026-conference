import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAvailability } from '../../server/lib/availability.js';

const DAYS = ['2026-10-12', '2026-10-13'];
const check = (entries) => validateAvailability(entries, DAYS);

describe('validateAvailability', () => {
  test('accepts a whole day, a window and an empty list', () => {
    assert.equal(check([]), null);
    assert.equal(check([{ day: DAYS[0] }]), null);
    assert.equal(check([{ day: DAYS[0], from: '09:00', to: '12:30' }, { day: DAYS[1], from: null, to: null }]), null);
  });

  test('refuses an end that is not after the start', () => {
    assert.match(check([{ day: DAYS[0], from: '10:00', to: '10:00' }]), /after/i);
    assert.match(check([{ day: DAYS[0], from: '11:00', to: '10:00' }]), /after/i);
  });

  test('refuses a window with only one end', () => {
    assert.match(check([{ day: DAYS[0], from: '10:00' }]), /both/i);
    assert.match(check([{ day: DAYS[0], to: '10:00' }]), /both/i);
  });

  test('refuses an unknown day, a duplicate day and malformed times', () => {
    assert.match(check([{ day: '2020-01-01' }]), /day/i);
    assert.match(check([{ day: DAYS[0] }, { day: DAYS[0] }]), /twice|duplicate/i);
    assert.match(check([{ day: DAYS[0], from: '9am', to: '10:00' }]), /HH:MM/);
    assert.match(check([{ day: DAYS[0], from: '25:00', to: '26:00' }]), /HH:MM/);
  });

  test('refuses a payload that is not a list', () => {
    assert.ok(check(undefined));
    assert.ok(check([null]));
  });
});
