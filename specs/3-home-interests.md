# Home: describe your interests in your own words (optional)

## What this changes
Home gains an optional box, "Describe your interests in your own words", for whoever is
selected in the header, with or without any seats. Typing and pressing Save stores the text
(at most 500 characters) for that attendee; a live "N left" count shows under the box. It is
still there after a reload, can be edited, and can be cleared (Save with an empty box, or a
Clear button). The box reads and writes the attendee's existing `interestsText`, the same
field as My Agenda's "In your own words" box, so there is one stored text, not two.

## Where
- `src/pages/HomePage.jsx` — new `InterestsBox` (testids `interests-box`, `interests-input`, `interests-remaining`, `interests-save`, `interests-clear`) in `HomePage` after `QuickLinks`; loads `interestsText` with `useFetch(() => api.getUser(currentUserId), [currentUserId])`, saves with `api.setInterestsText` (`PUT /users/:id/interests-text`), 500 limit counted after trimming as the server does, toast on failure. It reads nothing about seats.
- Spec `tests/home.spec.js` — new `describe` using `visit`, `laneFor('home.interests', testInfo)`; checks the same text shows in My Agenda's box.
- `tests/helpers.js` `LANES` — `'home.interests'` (books nothing, so `agenda: false`).
- `context/engineering-context/ui.md` (HomePage part) — documents the box.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Saves, survives reload, editable, clearable | spec: type, Save, `page.reload()`, box holds text; edit and Save, reload; Clear, reload, box empty. The save route is already covered by `tests/api/interests-text.test.js` | spec + existing API |
| Over 500 rejected; UI shows remaining count | Existing API test covers the limit. Spec: `interests-remaining` reads "500 left" empty, "484 left" after 16 characters, and Save is disabled past the limit | API + spec |
| Shows for an attendee with zero seats | Spec: box is visible on Home for the lane attendee, which reads nothing about seats | spec |
| Same text as My Agenda | Spec: after saving on Home, My Agenda's "In your own words" box holds the same text | spec |
| Spec has its own lane | `home.interests` lane | spec |

## Decisions
- Reuse the existing `users.interests_text` field and `PUT /users/:id/interests-text` that My Agenda already uses (merged on `stanconia`), not a second store: two free-text fields would drift apart.
- The text is therefore in the user payload as `interestsText`, so it is not hidden from other endpoints.
- The 500 limit counts trimmed characters, as the server does. A blank save clears the text.

## Out of scope
Using the text anywhere beyond showing it back (suggestions, a natural-language ask), tag-style `users.interests`, authentication.
