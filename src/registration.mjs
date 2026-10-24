const storageKey = 'registration-confirmation';

// A successful server registration must remain usable when browser storage is blocked.
// Keep the fallback in this page's memory, never in localStorage or navigation URLs.
export function createConfirmationStore(getStorage = () => window.sessionStorage) {
  let current = null;
  return {
    save(data) {
      current = data;
      try { getStorage().setItem(storageKey, JSON.stringify(data)); } catch {}
    },
    read() {
      if (current) return current;
      try { return JSON.parse(getStorage().getItem(storageKey)); } catch { return null; }
    },
  };
}

export const confirmationStore = createConfirmationStore();

export function registrationReceipt(data, origin) {
  const {event, cancel_token} = data;
  const date = value => new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short',
  }).format(new Date(value));
  return [
    'East Bay Regeneration Map — Private registration confirmation',
    '',
    'Keep this file private. Anyone with the cancellation link can cancel your place.',
    'Your registration was saved. No confirmation email will be sent.',
    '',
    event.title,
    `Hosted by: ${event.organization}`,
    `Starts: ${date(event.starts_at)} (Pacific time)`,
    `Ends: ${date(event.ends_at)} (Pacific time)`,
    `Meeting place: ${event.location_name}, ${event.address}, ${event.city}`,
    '',
    `What to bring: ${event.bring || 'Check with the organizer.'}`,
    `Accessibility: ${event.accessibility || 'Check with the organizer.'}`,
    '',
    `Event updates: ${origin}/events/${event.id}`,
    `Private cancellation link: ${origin}/cancel#${cancel_token}`,
    '',
    'This file and downloaded calendar entries do not update automatically.',
    'Check the event page before attending. Remove your calendar entry if you cancel.',
    '',
  ].join('\n');
}
