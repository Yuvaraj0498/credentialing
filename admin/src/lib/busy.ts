/**
 * "Saving…" state for the whole screen: counts requests that change data (POST / PUT / PATCH / DELETE and
 * uploads) and the list refreshes that follow them within a moment, so a newly created record is already
 * listed when the screen becomes usable again. Chat, notifications and sign-in are not counted.
 */
let active = 0;
/** running file uploads (the loader then says "Uploading document") */
let uploads = 0;
let lastChangeEnded = 0;
const listeners = new Set<() => void>();
const FOLLOW_UP_MS = 1500;
const QUIET_PATHS = ["/auth/", "/chat", "/notifications", "/email-check", "/presence"];

const notify = () => listeners.forEach((l) => l());

export const busyStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  count: () => active,
  uploading: () => uploads > 0,
};

/** Called by the API client around each request; returns the "done" callback, or null when not counted. */
export function trackRequest(method: string, path: string, upload = false): (() => void) | null {
  if (QUIET_PATHS.some((p) => path.startsWith(p))) return null;
  const changes = method !== "GET";
  const followUp = !changes && Date.now() - lastChangeEnded < FOLLOW_UP_MS;
  if (!changes && !followUp) return null;
  active++;
  if (upload) uploads++;
  notify();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    active = Math.max(0, active - 1);
    if (upload) uploads = Math.max(0, uploads - 1);
    if (changes) lastChangeEnded = Date.now();
    notify();
  };
}
