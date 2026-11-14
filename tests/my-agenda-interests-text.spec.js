import { test, expect } from '@playwright/test';
import { visit, ATTENDEES, API, shotForPR } from './helpers.js';

/** My Agenda's free-text section: optional, saved, per attendee. */

test('interests in your own words are saved, edited, cleared and follow the attendee', async ({ page, request }) => {
  const as = test.info().project.name === 'mobile' ? ATTENDEES.marcus : ATTENDEES.kenji;
  const other = as === ATTENDEES.marcus ? ATTENDEES.kenji : ATTENDEES.marcus;
  const field = page.getByTestId('interests-text');
  const save = page.getByTestId('interests-text-save');

  try {
    await visit(page, '/my-agenda', { as });
    await expect(field).toBeVisible();
    await expect(page.getByTestId('free-text-section')).toContainText('optional');
    await expect(page.getByTestId('interests-text-count')).toHaveText('0 / 500');
    await expect(save).toBeDisabled();

    await field.fill('Evaluating agents in production');
    await expect(page.getByTestId('interests-text-count')).toHaveText('31 / 500');
    await save.click();
    await expect(page.getByTestId('interests-text-saved')).toHaveText('Saved');
    await shotForPR(page, 'My Agenda interests in your own words');

    await page.reload();
    await expect(field).toHaveValue('Evaluating agents in production');

    await field.fill('Just the keynotes');
    await save.click();
    await page.reload();
    await expect(field).toHaveValue('Just the keynotes');

    // Another attendee has their own (empty) text.
    await visit(page, '/my-agenda', { as: other });
    await expect(field).toHaveValue('');

    await visit(page, '/my-agenda', { as });
    await expect(field).toHaveValue('Just the keynotes');
    await field.fill('');
    await save.click();
    await page.reload();
    await expect(field).toHaveValue('');
  } finally {
    await request.put(`${API}/users/${as}/interests-text`, { data: { text: '' } });
  }
});
