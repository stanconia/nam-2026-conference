# My Agenda: pick the speakers you want to see, kept in sync with follows

## What this changes
The My Agenda preferences panel gets a **Speakers** section under Topics. It
lists the speakers the attendee follows, each with a remove button, and a
picker of the programme's speakers they do not follow yet. Choosing one follows
them; removing one unfollows them. The section reads the store's follow state
(`useConference().followingIds`), the same state the speaker profile's Follow
button writes, so the two always agree and there is no second list.

## Where
- `src/pages/MyAgendaPage.jsx` — new `SpeakersSection({ userId })` added to `SECTIONS`. It fetches `api.getSpeakers()` once for the programme list (names, ids), shows `speakers.filter(s => isFollowing(s.id))` as removable chips (`speaker-chip-<id>`, remove button `speaker-remove-<id>`), and a native `<select data-testid="speaker-picker">` whose options are only the unfollowed speakers from that list. Both pick and remove call `toggleFollow(id)` from the store, which calls `followSpeaker` / `unfollowSpeaker`. Reset the select after a pick.
- No server, `api.js` or store change: `PUT /users/:id/follows/:speakerId` already 404s an unknown speaker, and the store already holds `followingIds`.
- Test in `tests/my-agenda.spec.js` using `ATTENDEES` and `visit(..., { as })` from `tests/helpers.js`, a different attendee per project, unfollowing in `finally` (follows are shared state; same pattern as `tests/speakers.spec.js`).

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Lists the speakers already followed | Follow a speaker through the API, open `/my-agenda`: `speaker-chip-<id>` is visible | Playwright, `tests/my-agenda.spec.js` |
| Picking follows, removing unfollows | Pick from `speaker-picker`, chip appears and `GET /users/:id` lists them in `followedSpeakers`; click remove, chip gone and API no longer lists them | Playwright, same spec |
| Profile and My Agenda stay in step, both ways | Pick on My Agenda, open `/speakers/<id>`: `follow-speaker` is `aria-pressed=true`; unfollow there, return to My Agenda: chip gone | Playwright, same spec |
| Only the programme's speakers can be picked | The picker is a `<select>`: every option value is an id from `/api/speakers`, and a followed speaker is no longer an option | Playwright, same spec |
| Releases its follows | `finally` unfollows via the API | Playwright, same spec |

## Decisions
- A plain `<select>` of unfollowed speakers (110 names, alphabetical) rather than a type-ahead list: bounded by construction and no new component. OK?
- Removing from My Agenda shows the store's existing "Unfollowed" toast, as on the profile. OK?

## Out of scope
Ranking sessions by followed speakers, and anything on Home.
