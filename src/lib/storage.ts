const API_BASE_URL_KEY = 'roomquest_api_base_url';
const DEFAULT_API_URL = 'https://roomquest-id-backend.vercel.app';

export const getApiBaseUrl = (): string => {
  return localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_URL;
};

export const setApiBaseUrl = (url: string): void => {
  localStorage.setItem(API_BASE_URL_KEY, url);
};
