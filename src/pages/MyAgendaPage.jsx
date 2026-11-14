import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { useConference } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { dayLabel } from '../lib/format.js';
import { Button, SectionHeader } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

/** Why a from/to pair cannot be saved, or null. Mirrors `validateAvailability` on the server. */
const windowProblem = ({ from, to }) => {
  if (!from && !to) return null;
  if (!from || !to) return 'Set both a start and an end, or neither';
  if (to <= from) return 'The end must be after the start';
  return null;
};

/** Which days the attendee can attend, and optionally between which hours. Saves on every valid change. */
function AvailabilitySection() {
  const { days = [], currentUserId } = useConference();
  const [drafts, setDrafts] = useState({});   // date -> { from, to }, present only for ticked days
  const [errors, setErrors] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false); setDrafts({}); setErrors({});
    api.getUser(currentUserId).then((u) => {
      if (!active) return;
      setDrafts(Object.fromEntries((u.availability ?? []).map((a) => [a.day, { from: a.from ?? '', to: a.to ?? '' }])));
      setLoaded(true);
    }).catch(() => active && setLoaded(true));
    return () => { active = false; };
  }, [currentUserId]);

  const save = async (next, date) => {
    const problem = date && next[date] ? windowProblem(next[date]) : null;
    setDrafts(next);
    setErrors((e) => ({ ...e, [date]: problem }));
    if (problem) return;
    const body = Object.entries(next)
      .filter(([d, w]) => !windowProblem(w))
      .map(([day, w]) => ({ day, from: w.from || null, to: w.to || null }));
    try {
      await api.setAvailability(currentUserId, body);
    } catch (err) {
      setErrors((e) => ({ ...e, [date]: err.message }));
    }
  };

  const toggle = (date) => {
    const next = { ...drafts };
    if (next[date]) delete next[date]; else next[date] = { from: '', to: '' };
    save(next, date);
  };
  const setWindow = (date, patch) => save({ ...drafts, [date]: { ...drafts[date], ...patch } }, date);

  return (
    <section className="space-y-3 rounded-2xl border border-hairline bg-surface p-5" data-testid="availability-section" aria-labelledby="availability-title">
      <h2 id="availability-title" className="font-display text-xl">Availability</h2>
      <p className="text-sm text-muted">Tick the days you can attend. Add hours if you are only free for part of a day.</p>
      <ul className="space-y-3">
        {days.map((d) => {
          const w = drafts[d.date];
          return (
            <li key={d.date} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex min-w-48 items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={!!w} disabled={!loaded} onChange={() => toggle(d.date)}
                  data-testid={`availability-day-${d.date}`}
                />
                <span><strong>{d.label}</strong> · {dayLabel(d.date)}</span>
              </label>
              {w && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="time" aria-label={`From, ${dayLabel(d.date)}`} value={w.from}
                    onChange={(e) => setWindow(d.date, { from: e.target.value })}
                    className="rounded-md border border-hairline bg-transparent px-2 py-1"
                    data-testid={`availability-from-${d.date}`}
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time" aria-label={`To, ${dayLabel(d.date)}`} value={w.to}
                    onChange={(e) => setWindow(d.date, { to: e.target.value })}
                    className="rounded-md border border-hairline bg-transparent px-2 py-1"
                    data-testid={`availability-to-${d.date}`}
                  />
                  {(w.from || w.to) && (
                    <Button size="sm" onClick={() => setWindow(d.date, { from: '', to: '' })} data-testid={`availability-clear-${d.date}`}>
                      Clear hours
                    </Button>
                  )}
                </div>
              )}
              {errors[d.date] && (
                <p role="alert" className="basis-full text-sm text-rose-400" data-testid={`availability-error-${d.date}`}>{errors[d.date]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Deliberately empty. Workshop teams design this page from scratch, so it
 * holds no opinion about what an agenda should be. The rules and data are all
 * still there: adding a session takes a seat, and `/users/:id/schedule`,
 * `/users/:id/today` and the `.ics` exports are wired up in `lib/api.js`.
 */
export function MyAgendaPage() {
  useDocumentTitle('My Agenda');

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Your conference" title="My Agenda" />
      <AvailabilitySection />
      <section
        className="grid place-items-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-20 text-center"
        data-testid="agenda-coming-soon"
      >
        <span className="grid size-12 place-items-center rounded-xl bg-violet-500/12 text-violet-300">
          <Icon name="ticket" className="size-5" />
        </span>
        <h2 className="mt-4 font-display text-2xl">Coming soon</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          A new way to plan your time at the conference is on its way.
        </p>
        <Button to="/schedule" size="sm" className="mt-6">Browse the schedule</Button>
      </section>
    </div>
  );
}
