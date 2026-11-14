import { test, expect } from '@playwright/test';
import { API, ATTENDEES, conferenceDays, momentOn, shotForPR, visit } from './helpers.js';

/** My Agenda's preferences panel: topics are chosen, saved and per attendee. */

const chipFor = (page, name) => page.getByTestId(`topic-chip-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

test('topics can be chosen, survive a reload and follow the attendee', async ({ page, request }) => {
  const { tags } = await (await request.get(`${API}/bootstrap`)).json();
  const topics = tags.filter((t) => t.kind === 'topic');
  const original = (await (await request.get(`${API}/users/${ATTENDEES.marcus}`)).json()).interests;
  const other = (await (await request.get(`${API}/users/${ATTENDEES.sofia}`)).json()).interests;
  const pick = topics.find((t) => !original.includes(t.name));

  try {
    await visit(page, '/my-agenda', { as: ATTENDEES.marcus });
    await expect(page.getByTestId('preferences-panel')).toBeVisible();
    await expect(page.getByTestId('agenda-coming-soon')).toHaveCount(0);
    await expect(page.locator('[data-testid^="topic-chip-"]')).toHaveCount(topics.length);
    for (const name of original) await expect(chipFor(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(chipFor(page, pick.name)).toHaveAttribute('aria-pressed', 'false');

    await chipFor(page, pick.name).click();
    await expect(chipFor(page, pick.name)).toHaveAttribute('aria-pressed', 'true');
    await shotForPR(page, 'My Agenda topics selected');

    await page.reload();
    await expect(chipFor(page, pick.name)).toHaveAttribute('aria-pressed', 'true');

    await chipFor(page, pick.name).click();
    await expect(chipFor(page, pick.name)).toHaveAttribute('aria-pressed', 'false');

    // Another attendee shows their own selection.
    await visit(page, '/my-agenda', { as: ATTENDEES.sofia });
    for (const name of other) await expect(chipFor(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid^="topic-chip-"][aria-pressed="true"]')).toHaveCount(other.length);
  } finally {
    await request.put(`${API}/users/${ATTENDEES.marcus}/interests`, { data: { interests: original } });
  }
});

test('venue preference: three choices, Either by default, saved and per attendee', async ({ page, request }) => {
  const { venues } = await (await request.get(`${API}/bootstrap`)).json();
  const optionFor = (id) => page.getByTestId(`venue-option-${id}`);
  const as = ATTENDEES.kenji;

  try {
    await visit(page, '/my-agenda', { as });
    await expect(page.locator('[data-testid^="venue-option-"]')).toHaveCount(venues.length + 1);
    for (const v of venues) await expect(optionFor(v.id)).toHaveText(v.shortName);
    await expect(optionFor('either')).toHaveText('Either');
    await expect(optionFor('either')).toHaveAttribute('aria-checked', 'true');

    await optionFor(venues[0].id).click();
    await expect(optionFor(venues[0].id)).toHaveAttribute('aria-checked', 'true');
    await expect(optionFor('either')).toHaveAttribute('aria-checked', 'false');
    await shotForPR(page, 'My Agenda venue preference selected');

    await page.reload();
    await expect(optionFor(venues[0].id)).toHaveAttribute('aria-checked', 'true');

    await visit(page, '/my-agenda', { as: ATTENDEES.sofia });
    await expect(optionFor('either')).toHaveAttribute('aria-checked', 'true');
    await visit(page, '/my-agenda', { as });
    await expect(optionFor(venues[0].id)).toHaveAttribute('aria-checked', 'true');
  } finally {
    await request.put(`${API}/users/${as}/preferred-venue`, { data: { venueId: null } });
  }
});

test('speakers: followed ones are listed, picking and removing follow and unfollow, and the profile agrees', async ({ page, request }, testInfo) => {
  // Follows are shared state and the projects run concurrently: one attendee each.
  const user = testInfo.project.name === 'mobile' ? ATTENDEES.kenji : ATTENDEES.marcus;
  const programme = await (await request.get(`${API}/speakers`)).json();
  const followed = async () => (await (await request.get(`${API}/users/${user}`)).json()).followedSpeakers.map((s) => s.id);
  const before = await followed();
  const [seeded, picked] = programme.filter((s) => !before.includes(s.id));

  try {
    await request.put(`${API}/users/${user}/follows/${seeded.id}`);
    await visit(page, '/my-agenda', { as: user });
    await expect(page.getByTestId('speakers-section')).toBeVisible();
    await expect(page.getByTestId(`speaker-chip-${seeded.id}`)).toBeVisible();
    for (const id of before) await expect(page.getByTestId(`speaker-chip-${id}`)).toBeVisible();

    // The picker offers only programme speakers, and never one already followed.
    const values = await page.getByTestId('speaker-picker').locator('option[value]:not([value=""])').evaluateAll((os) => os.map((o) => Number(o.value)));
    const programmeIds = new Set(programme.map((s) => s.id));
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((v) => programmeIds.has(v))).toBe(true);
    expect(values).not.toContain(seeded.id);

    await page.getByTestId('speaker-picker').selectOption(String(picked.id));
    await expect(page.getByTestId(`speaker-chip-${picked.id}`)).toBeVisible();
    expect(await followed()).toContain(picked.id);
    await expect(page.getByTestId('speaker-picker').locator(`option[value="${picked.id}"]`)).toHaveCount(0);
    await shotForPR(page, 'My Agenda speakers followed');

    // Profile agrees, and unfollowing there is reflected back on My Agenda.
    await page.goto(`/speakers/${picked.id}`);
    await expect(page.getByTestId('follow-speaker')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('follow-speaker').click();
    await expect(page.getByTestId('follow-speaker')).toHaveAttribute('aria-pressed', 'false');
    await page.goto('/my-agenda');
    await expect(page.getByTestId(`speaker-chip-${picked.id}`)).toHaveCount(0);

    await page.getByTestId(`speaker-remove-${seeded.id}`).click();
    await expect(page.getByTestId(`speaker-chip-${seeded.id}`)).toHaveCount(0);
    expect(await followed()).not.toContain(seeded.id);
  } finally {
    for (const id of [seeded.id, picked.id]) await request.delete(`${API}/users/${user}/follows/${id}`);
  }
});

// Availability is per attendee and nothing else writes it, so each project
// gets its own pair of attendees and the test clears what it saved.
const PAIRS = { desktop: [ATTENDEES.kenji, ATTENDEES.marcus], mobile: [ATTENDEES.sofia, ATTENDEES.abraham] };

test.describe('My Agenda availability', () => {
  test('lists the days, saves ticks and windows, refuses a bad window, keeps them per attendee', async ({ page, request }, testInfo) => {
    const [me, other] = PAIRS[testInfo.project.name];
    const days = await conferenceDays();
    const [d0, d1] = days;
    const at = await momentOn(0, '10:30');
    const clear = (id) => request.put(`${API}/users/${id}/availability`, { data: { days: [] } });
    await clear(me); await clear(other);

    try {
      await visit(page, '/my-agenda', { as: me, at });
      for (const d of days) await expect(page.getByTestId(`availability-day-${d}`)).toBeVisible();
      await expect(page.getByTestId(`availability-day-${d0}`)).not.toBeChecked();

      // tick, set a window
      await page.getByTestId(`availability-day-${d0}`).check();
      await page.getByTestId(`availability-from-${d0}`).fill('09:00');
      // one-sided is refused, visibly
      await expect(page.getByTestId(`availability-error-${d0}`)).toContainText(/both/i);
      await page.getByTestId(`availability-to-${d0}`).fill('08:00');
      await expect(page.getByTestId(`availability-error-${d0}`)).toContainText(/after the start/i);
      await page.reload();
      // the tick saved, the refused window did not
      await expect(page.getByTestId(`availability-day-${d0}`)).toBeChecked();
      await expect(page.getByTestId(`availability-from-${d0}`)).toHaveValue('');
      await expect(page.getByTestId(`availability-to-${d0}`)).toHaveValue('');

      await page.getByTestId(`availability-from-${d0}`).fill('09:00');
      await page.getByTestId(`availability-to-${d0}`).fill('12:30');
      await expect(page.getByTestId(`availability-error-${d0}`)).toHaveCount(0);
      await page.getByTestId(`availability-day-${d1}`).check();
      await expect.poll(async () => (await (await request.get(`${API}/users/${me}`)).json()).availability.length).toBe(2);
      await shotForPR(page, 'availability section');

      // survives a refresh
      await page.reload();
      await expect(page.getByTestId(`availability-day-${d0}`)).toBeChecked();
      await expect(page.getByTestId(`availability-from-${d0}`)).toHaveValue('09:00');
      await expect(page.getByTestId(`availability-to-${d0}`)).toHaveValue('12:30');
      await expect(page.getByTestId(`availability-day-${d1}`)).toBeChecked();

      // clear the window, untick a day
      await page.getByTestId(`availability-clear-${d0}`).click();
      await expect(page.getByTestId(`availability-from-${d0}`)).toHaveValue('');
      await page.getByTestId(`availability-day-${d1}`).uncheck();
      await expect.poll(async () => (await (await request.get(`${API}/users/${me}`)).json()).availability)
        .toEqual([{ day: d0, from: null, to: null }]);

      // another attendee starts empty; coming back finds ours
      await visit(page, '/my-agenda', { as: other, at });
      await expect(page.getByTestId(`availability-day-${d0}`)).not.toBeChecked();
      await visit(page, '/my-agenda', { as: me, at });
      await expect(page.getByTestId(`availability-day-${d0}`)).toBeChecked();
    } finally {
      await clear(me); await clear(other);
    }
  });
});
