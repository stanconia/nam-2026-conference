import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { useConference } from '../lib/store.jsx';
import { dayLabel } from '../lib/format.js';
import { useToast } from '../components/Toaster.jsx';
import { Button, SectionHeader, cx } from '../components/ui.jsx';
import * as api from '../lib/api.js';

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
    <section className="space-y-3" data-testid="availability-section" aria-labelledby="availability-title">
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
 * The attendee's preferences. Each section is a small component below, so
 * availability, venue, speakers or free text can be added to SECTIONS later.
 * The page owns its own state: nothing else reads `interests`.
 */
function TopicsSection({ userId }) {
  const { tags = [] } = useConference();
  const toast = useToast();
  const topics = tags.filter((t) => t.kind === 'topic');
  const [chosen, setChosen] = useState(null);

  useEffect(() => {
    let live = true;
    setChosen(null);
    api.getUser(userId).then((u) => live && setChosen(u.interests)).catch(() => live && setChosen([]));
    return () => { live = false; };
  }, [userId]);

  async function toggle(name) {
    const before = chosen;
    const next = before.includes(name) ? before.filter((n) => n !== name) : [...before, name];
    setChosen(next);
    try {
      await api.setInterests(userId, next);
    } catch (err) {
      setChosen(before);
      toast({ message: `Could not save your topics: ${err.message}`, icon: 'alert' });
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="topics-heading" data-testid="topics-section">
      <div>
        <h2 id="topics-heading" className="font-display text-xl">Topics</h2>
        <p className="mt-1 text-sm text-muted">Pick the topics you care about. Saved as you go.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chosen && topics.map((t) => {
          const on = chosen.includes(t.name);
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => toggle(t.name)}
              aria-pressed={on}
              data-testid={`topic-chip-${t.slug}`}
              className={cx(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                on
                  ? 'border-violet-400/50 bg-violet-500/15 text-ink'
                  : 'border-hairline bg-raised text-muted hover:border-white/20 hover:text-ink',
              )}
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const SECTIONS = [TopicsSection, AvailabilitySection];

function PreferencesPanel({ userId }) {
  return (
    <div className="space-y-8 rounded-2xl border border-hairline bg-surface p-5 sm:p-6" data-testid="preferences-panel">
      {SECTIONS.map((Section, i) => <Section key={i} userId={userId} />)}
    </div>
  );
}

export function MyAgendaPage() {
  useDocumentTitle('My Agenda');
  const { currentUserId } = useConference();

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Your conference" title="My Agenda" />
      <PreferencesPanel userId={currentUserId} />
    </div>
  );
}
