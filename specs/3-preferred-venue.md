# My Agenda: choose a preferred venue

## What this changes
The My Agenda preferences panel gets a second section, **Venue**, with three single-select choices: one per venue (labelled with the venue's `shortName` from the API, so *Aurora* and *The Foundry*) and *Either*. An attendee who has never chosen sees *Either* selected. The choice is saved to the server as you click, and a refresh or an attendee switch shows that attendee's own choice. Nothing else reads it yet.

## Where
- `server/db.js` — `users` table in `SCHEMA`: add `preferred_venue_id INTEGER REFERENCES venues(id)`, NULL meaning *either*. `npm run dev` / `npm test` reseed via `dropAll()` + `migrate()`, so no `ALTER` is needed.
- `server/lib/query.js` — `toUser`: add `preferredVenueId: row.preferred_venue_id ?? null` (the only snake_case → camelCase place).
- `server/routes/users.js` — add `PUT /:id/preferred-venue`, body `{ venueId: <venue id> | null }`: 404 unknown attendee; 400 unless `venueId` is null or the id of a row in `venues`; store, return `toUser(row)`. Prepared statements go beside `setInterests`.
- `src/lib/api.js` — `setPreferredVenue(userId, venueId)`, the only `fetch` caller.
- `src/pages/MyAgendaPage.jsx` — add `VenueSection` to `SECTIONS`; venues from `useConference().venues`; selection loaded with `api.getUser(userId)` (same pattern as `TopicsSection`, so it follows the attendee switch); optimistic save, rollback plus toast on failure. A radiogroup of three buttons, ids `venue-option-<venue id>` and `venue-option-either`, `aria-checked` marks the selection.
- `tests/api/preferred-venue.test.js` — API test using `startApi` from `tests/api/harness.js`, attendees 3 to 6, mirroring `interests.test.js`.
- `tests/my-agenda.spec.js` — new Playwright test using `visit(page, '/my-agenda', { as })` and `ATTENDEES` from `tests/helpers.js`; one attendee per test, restoring the original choice in `finally`.
- `context/engineering-context/agenda.md` and `data-model.md` — document the column, route and section.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Three choices shown, names from the API | spec: option count is 3; the two venue buttons' text equals `shortName` from `/venues`, plus *Either* | Playwright |
| No saved preference shows *Either* selected | API test: `GET /users/:id` has `preferredVenueId === null` for an unset attendee; spec: `venue-option-either` has `aria-checked="true"` | API + Playwright |
| Saved to the server | API test: PUT a venue id, GET returns `preferredVenueId`; PUT `null` clears it; unknown venue or non-integer is 400 and nothing changes; unknown attendee 404; another attendee untouched | API |
| Survives refresh and attendee switch | spec: pick a venue, reload, still `aria-checked`; switch to another attendee, shows *Either*; switch back, venue again | Playwright |
| API test and Playwright spec exist | the two files above, spec on desktop and mobile | API + Playwright |

## Decisions
- Is the first Decision "does anything already hold on main"? No: none of the four criteria hold today, since there is no venue section, column or route.
- Label the choices with the venue `shortName` (*Aurora*, *The Foundry*) rather than the full `name` — OK?
- Store a nullable `venue_id` on `users` (NULL = *Either*) rather than the string "either" — OK?
- Choosing *Either* is the way to clear a preference; there is no separate clear control — OK?

## Out of scope
Using the preference to filter or rank sessions or suggestions; the other preference inputs.
