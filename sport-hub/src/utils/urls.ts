/**
 * Link checks shared by every form (event submission, record and first claims),
 * so the same link is valid everywhere. "example.com/video" counts as a link;
 * it is stored with "https://" in front.
 */

export const URL_REGEX = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

export const INVALID_URL_MESSAGE = 'Please enter a valid URL (e.g., youtube.com/watch?v=…)';

/** Adds "https://" when the link has no scheme. */
export const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** Only http(s) links, so a link can never be a javascript: or data: URL. */
export const isValidUrl = (value: string) => {
  const url = normalizeUrl(value);
  if (!/^https?:\/\/\S+$/i.test(url) || !URL_REGEX.test(url)) return false;
  try {
    return new URL(url).hostname.includes('.');
  } catch {
    return false;
  }
};
