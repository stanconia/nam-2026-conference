# My Agenda: a preferences panel, starting with topics

## What this changes
`/my-agenda` no longer shows the *coming soon* card. It shows a preferences panel whose first section, **Topics**, lists every topic-kind tag as a toggle chip, styled like the schedule filters. Selecting or deselecting saves to the attendee's `users.interests`; a refresh or an attendee switch shows that attendee's own saved topics. Sections are small components in a list, so availability, venue, speakers and free text can be added later without restructuring.

## Where
- `server/routes/users.js` — add `PUT /:id/interests` (body `{ interests: [name…] }`): 404 for an unknown attendee, 400 unless every entry is the name of a `kind = 'topic'` tag; de-duplicate, store comma-joined, return `toUser(row)`; test in `tests/api/interests.test.js` using `startApi` from `tests/api/harness.js`.
- `src/lib/api.js` — `setInterests(userId, interests)`, the only `fetch` caller.
- `src/pages/MyAgendaPage.jsx` — replace the placeholder with `<PreferencesPanel>` holding a `TopicsSection`; topic tags from `useConference().tags` filtered to `kind === 'topic'`; selection loaded with `api.getUser(currentUserId)` so it follows the attendee switch; toggle saves optimistically and rolls back with a toast on failure. Test ids `topic-chip-<slug>`.
- `src/lib/store.jsx` — `currentUser` comes from bootstrap and would be stale after a save; none of the existing pages read `interests`, so the page owns its state.
- `tests/my-agenda.spec.js` — Playwright, desktop and mobile, using `visit(page, '/my-agenda', { as })` and `ATTENDEES` from `tests/helpers.js`, one attendee per test, restoring the original selection afterwards.
- `tests/smoke.spec.js` / any spec asserting `agenda-coming-soon` — update to the new panel.
- `context/engineering-context/agenda.md` — the page is no longer a placeholder; document the route.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| `/my-agenda` shows the panel instead of the placeholder | `my-agenda.spec.js`: panel visible, `agenda-coming-soon` absent | Playwright |
| Select and deselect topic tags, topic-kind only | spec: chips equal the topic tags from `/bootstrap`; API test: a non-topic tag name gets 400 | Playwright + API |
| Saved to the server, kept after refresh | API test: PUT then GET `/users/:id` returns the list; spec: select, reload, still selected | API + Playwright |
| Switching attendee shows their own topics | spec: two seeded attendees show different selected chips | Playwright |
| Save proven by API test, page by spec on both projects | the two files above | API + Playwright |

## Decisions
- Store tag **names** (as the seed does: "Agent Design") rather than slugs — OK?
- Replace the whole saved list on each toggle (PUT of the full set), rather than one add/remove route per tag — OK?
- Seeded interests that are not topic-kind tags are dropped from the display and from the next save — OK?

## Out of scope
Generating a personalised agenda; availability, venue, speaker and free-text inputs.
