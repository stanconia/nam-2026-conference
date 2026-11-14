import { test, expect } from '@playwright/test';
import { API, ATTENDEES, conferenceDays, momentOn, shotForPR, visit } from './helpers.js';

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
