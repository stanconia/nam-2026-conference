import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { useConference } from '../lib/store.jsx';
import { useToast } from '../components/Toaster.jsx';
import { SectionHeader, cx } from '../components/ui.jsx';
import * as api from '../lib/api.js';

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

/** Followed speakers, read from and written to the store so profiles stay in step. */
function SpeakersSection() {
  const { isFollowing, toggleFollow } = useConference();
  const toast = useToast();
  const [speakers, setSpeakers] = useState(null);

  useEffect(() => {
    let live = true;
    api.getSpeakers().then((s) => live && setSpeakers(s)).catch(() => live && setSpeakers([]));
    return () => { live = false; };
  }, []);

  async function change(id) {
    try {
      await toggleFollow(id);
    } catch (err) {
      toast({ message: `Could not update your speakers: ${err.message}`, icon: 'alert' });
    }
  }

  const list = speakers || [];
  const followed = list.filter((s) => isFollowing(s.id));
  const available = list.filter((s) => !isFollowing(s.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="space-y-3" aria-labelledby="speakers-heading" data-testid="speakers-section">
      <div>
        <h2 id="speakers-heading" className="font-display text-xl">Speakers</h2>
        <p className="mt-1 text-sm text-muted">Pick the speakers you want to see. This is the same list as Follow on their profiles.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {followed.map((s) => (
          <span
            key={s.id}
            data-testid={`speaker-chip-${s.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/50 bg-violet-500/15 py-1 pl-3 pr-1 text-[12px] font-semibold text-ink"
          >
            {s.name}
            <button
              type="button"
              onClick={() => change(s.id)}
              aria-label={`Unfollow ${s.name}`}
              data-testid={`speaker-remove-${s.id}`}
              className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <select
        value=""
        onChange={(e) => e.target.value && change(Number(e.target.value))}
        aria-label="Add a speaker"
        data-testid="speaker-picker"
        className="w-full max-w-sm rounded-lg border border-hairline bg-raised px-3 py-2 text-sm text-ink"
      >
        <option value="">Add a speaker…</option>
        {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </section>
  );
}

const SECTIONS = [TopicsSection, SpeakersSection];

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
