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

function VenueSection({ userId }) {
  const { venues = [] } = useConference();
  const toast = useToast();
  // undefined while loading; null means Either.
  const [chosen, setChosen] = useState(undefined);

  useEffect(() => {
    let live = true;
    setChosen(undefined);
    api.getUser(userId).then((u) => live && setChosen(u.preferredVenueId)).catch(() => live && setChosen(null));
    return () => { live = false; };
  }, [userId]);

  async function choose(venueId) {
    const before = chosen;
    if (venueId === before) return;
    setChosen(venueId);
    try {
      await api.setPreferredVenue(userId, venueId);
    } catch (err) {
      setChosen(before);
      toast({ message: `Could not save your venue: ${err.message}`, icon: 'alert' });
    }
  }

  const options = [...venues.map((v) => ({ key: v.id, id: v.id, label: v.shortName })), { key: 'either', id: null, label: 'Either' }];

  return (
    <section className="space-y-3" aria-labelledby="venue-heading" data-testid="venue-section">
      <div>
        <h2 id="venue-heading" className="font-display text-xl">Venue</h2>
        <p className="mt-1 text-sm text-muted">Which venue you would rather be at. Saved as you go.</p>
      </div>
      <div role="radiogroup" aria-labelledby="venue-heading" className="flex flex-wrap gap-1.5">
        {chosen !== undefined && options.map((o) => {
          const on = chosen === o.id;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(o.id)}
              data-testid={`venue-option-${o.key}`}
              className={cx(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                on
                  ? 'border-violet-400/50 bg-violet-500/15 text-ink'
                  : 'border-hairline bg-raised text-muted hover:border-white/20 hover:text-ink',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const SECTIONS = [TopicsSection, VenueSection];

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
