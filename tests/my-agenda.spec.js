import { test, expect } from '@playwright/test';
import { visit, ATTENDEES, API, shotForPR } from './helpers.js';

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
