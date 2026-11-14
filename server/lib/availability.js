import { db } from '../db.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const has = (v) => v !== undefined && v !== null && v !== '';

/**
 * Pure check of an availability list. Returns a message for the attendee, or
 * null when it is fine. A ticked day may carry a window (`from` and `to`
 * together) or none, which means the whole day.
 */
export function validateAvailability(entries, validDays) {
  if (!Array.isArray(entries)) return 'days must be a list';
  const seen = new Set();
  for (const e of entries) {
    if (!e || typeof e !== 'object') return 'Each day needs a date';
    if (!validDays.includes(e.day)) return `${e.day} is not a conference day`;
    if (seen.has(e.day)) return `${e.day} is listed twice`;
    seen.add(e.day);
    if (!has(e.from) && !has(e.to)) continue;
    if (!has(e.from) || !has(e.to)) return 'Set both a start and an end, or neither';
    if (!HHMM.test(e.from) || !HHMM.test(e.to)) return 'Times must be HH:MM';
    if (e.to <= e.from) return 'The end must be after the start';
  }
  return null;
}

export const sessionDays = () => db.prepare('SELECT DISTINCT day FROM sessions ORDER BY day').all().map((r) => r.day);

/** Statements are prepared on use, so the pure check above loads without a seeded database. */
export const availabilityFor = (userId) =>
  db.prepare('SELECT * FROM user_availability WHERE user_id = ? ORDER BY day').all(userId);

/** Replace the attendee's availability in one transaction. Assumes the list is valid. */
export const setAvailability = (userId, entries) => db.transaction(() => {
  db.prepare('DELETE FROM user_availability WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO user_availability (user_id, day, from_time, to_time) VALUES (?, ?, ?, ?)');
  for (const e of entries) insert.run(userId, e.day, has(e.from) ? e.from : null, has(e.to) ? e.to : null);
})();
