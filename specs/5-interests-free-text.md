# My Agenda: describe your interests in your own words

## What this changes
The My Agenda preferences panel (from #1, which this stacks on) gains an **In your own words (optional)** section: a textarea with a character counter and a Save button. The text can be typed, edited and cleared; it is saved to the attendee on the server, and a refresh or an attendee switch shows that attendee's own text. The API rejects text over 500 characters. Nothing reads the text yet; generating an agenda from it is out of scope.

## Where
- `server/db.js` — `users` table: add `interests_text TEXT NOT NULL DEFAULT ''` after `interests` (the seed drops and recreates tables, and `seed.js`'s explicit-column INSERT picks up the default, so no seed change).
- `server/lib/query.js` — `toUser`: add `interestsText: row.interests_text ?? ''`; unit case in `tests/unit/query.test.js`.
- `server/routes/users.js` — add `PUT /:id/interests-text` (body `{ text }`): 404 for an unknown attendee, 400 unless `text` is a string of at most `INTERESTS_TEXT_MAX` (500) characters after trimming; stores the trimmed value, `''` clears it, returns `toUser(row)`. Test in `tests/api/interests-text.test.js` using `startApi` from `tests/api/harness.js` (own throwaway database, no lane).
- `src/lib/api.js` — `setInterestsText(userId, text)`, the only `fetch` caller.
- `src/pages/MyAgendaPage.jsx` — a `FreeTextSection` added to #1's list of sections in `PreferencesPanel`: loaded from `api.getUser(currentUserId)` like the topics, so it follows the attendee switch; `maxLength={500}`, Save button, "Saved" confirmation, failure toast on error. Test ids `interests-text`, `interests-text-count`, `interests-text-save`, and the label reads "optional".
- `tests/my-agenda-interests-text.spec.js` — Playwright, both projects, using `visit(page, '/my-agenda', { as })` and `ATTENDEES` from `tests/helpers.js`; kenji on desktop and marcus on mobile (picked from `test.info().project.name`), each clearing their text afterwards. Topic chips are untouched, so it does not collide with `my-agenda.spec.js`.
- `context/engineering-context/agenda.md` and `data-model.md` — document the column, the endpoint and the 500 limit.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| The field is shown and marked optional | spec: `interests-text` is visible and its section label contains "optional" | Playwright |
| Text can be entered, edited and cleared, and is saved to the server | API test: PUT sets text, PUT a new value replaces it, PUT `''` returns `interestsText: ''`, and GET `/users/:id` agrees each time; spec: fill, save, edit, save, clear, save | API + Playwright |
| The text survives a refresh and an attendee switch | spec: save as one attendee, `page.reload()` still shows it; visit as another attendee shows an empty field, and back shows the first one's text | Playwright |
| A sensible maximum length is enforced by the API | API test: 500 characters accepted, 501 gets 400 and leaves the stored text unchanged; non-string gets 400; unknown attendee 404; spec: the counter shows the limit | API + Playwright |
| Covered by an API test and a Playwright spec | the two new files above, plus the `toUser` unit case | all |

## Decisions
- Limit the text to 500 characters, counted after trimming — OK?
- Store it in its own `users.interests_text` column and its own `PUT /users/:id/interests-text`, rather than widening #1's `interests` list route — OK?
- An explicit Save button rather than saving on every keystroke or blur — OK?
- Whitespace-only text is stored as empty, i.e. the same as clearing — OK?

## Out of scope
Using the text to personalise an agenda; showing it anywhere but My Agenda; the topic chips (#1).
