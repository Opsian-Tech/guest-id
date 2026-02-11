const API_BASE_URL_KEY = 'roomquest_api_base_url';
const API_BASE_URL_OVERRIDE_KEY = 'roomquest_api_base_url_override';
const DEFAULT_API_URL = 'https://roomquest-id-backend-git-visitor-flow-opsian-technologies.vercel.app';

// If a previous build saved a backend URL that breaks the visitor flow,
// we automatically fall back to the default unless the user explicitly
// re-saves the URL in Settings (which sets the override flag).
const DEPRECATED_API_URLS = new Set<string>([
  'https://roomquest-id-backend.vercel.app',
  'https://roomquest-id-visitor-flow.vercel.app',
]);

export const getApiBaseUrl = (): string => {
  const stored = localStorage.getItem(API_BASE_URL_KEY);
  const overrideEnabled = localStorage.getItem(API_BASE_URL_OVERRIDE_KEY) === '1';

  if (stored && DEPRECATED_API_URLS.has(stored) && !overrideEnabled) {
    localStorage.removeItem(API_BASE_URL_KEY);
    return DEFAULT_API_URL;
  }

  return stored || DEFAULT_API_URL;
};

export const setApiBaseUrl = (url: string): void => {
  localStorage.setItem(API_BASE_URL_KEY, url);
  localStorage.setItem(API_BASE_URL_OVERRIDE_KEY, '1');
};

export const clearApiBaseUrlOverride = (): void => {
  localStorage.removeItem(API_BASE_URL_OVERRIDE_KEY);
};
