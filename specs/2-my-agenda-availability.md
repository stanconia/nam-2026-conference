# My Agenda: say which days and hours you can attend

Stacks on #1 (`issue-1-my-agenda-preferences`): it adds `PreferencesPanel` on `/my-agenda`; this adds a second section to it.

## What this changes
The My Agenda preferences panel gains an **Availability** section listing each conference day (label and date from `days` in the bootstrap). The attendee ticks the days they attend and, for a ticked day, may set a from and a to time. A window whose end is not after its start is refused with a visible message and not saved. Availability is stored per attendee and comes back after a refresh or an attendee switch. Nothing uses it yet.

## Where
- `server/db.js` — new table `user_availability (user_id, day, from_time, to_time, PRIMARY KEY (user_id, day))`, nullable times (`HH:MM`); add it to the reseed `DROP TABLE` list beside `speaker_follows`.
- `server/lib/availability.js` (new) — `validateAvailability(entries, validDays)` (pure: day must be a seeded session day, times `HH:MM`, both or neither, `to` > `from`, no duplicate days) and `setAvailability(userId, entries)` replacing the attendee's rows in one transaction; unit test in `tests/unit/availability.test.js`.
- `server/lib/query.js` — `toAvailability(row)` → `{ day, from, to }`.
- `server/routes/users.js` — `PUT /:id/availability` (body `{ days: [{ day, from, to }] }`): 404 unknown attendee, 400 with a message on invalid input, else returns the saved list; `GET /:id` adds `availability`; test in `tests/api/availability.test.js` using `startApi` from `tests/api/harness.js`.
- `src/lib/api.js` — `setAvailability(userId, days)`, the only `fetch` caller.
- `src/pages/MyAgendaPage.jsx` — `AvailabilitySection` added to the panel's section list; days from `useConference().days`, saved state from `api.getUser(currentUserId)` like the topics section. Tick/untick and a valid window save at once; an invalid window shows `availability-error-<date>` and is not sent. Test ids `availability-day-<date>`, `availability-from-<date>`, `availability-to-<date>`, `availability-clear-<date>`.
- `tests/my-agenda.spec.js` — Playwright, both projects, `visit(page, '/my-agenda', { as })`, `ATTENDEES` and `conferenceDays()` from `tests/helpers.js`, one attendee per test, clearing availability afterwards through the API.
- `context/engineering-context/agenda.md`, `data-model.md` — document the section, route and table.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Each day listed, date from the API | spec: one `availability-day-<date>` per `conferenceDays()` entry | Playwright |
| Tick/untick days, set or clear a window | API test: PUT then GET returns the days and windows, a later PUT with a day removed or its window cleared drops it; spec: tick, set times, clear | API + Playwright |
| End not after start is rejected, visibly | unit test of `validateAvailability` (equal, earlier, one-sided, unknown day); API test: 400 and nothing stored; spec: message shown, still empty after reload | Unit + API + Playwright |
| Saved; survives refresh and attendee switch | spec: set, reload, still set; switch attendee, theirs is empty; switch back | Playwright |
| API test and Playwright spec exist | the files above | API + Playwright |

## Decisions
- Store availability in a new `user_availability` table, one row per ticked day, rather than a text column on `users` — OK?
- A fresh attendee has no days ticked and that means "no preference stated", not "unavailable" — OK?
- A ticked day with no window means the whole day; times are `HH:MM` venue-local like sessions — OK?
- Each change saves immediately, as the topics section does, rather than behind a Save button — OK?
- Sections `from`/`to` are both or neither; setting only one is refused with a message — OK?

## Out of scope
Using availability to build or filter an agenda, and the other preference inputs.
