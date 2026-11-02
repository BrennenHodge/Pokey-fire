import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Where the Pokey Fire server (./server) lives. Override with EXPO_PUBLIC_API_URL.
// The deployed web build is served by the same Worker as the API, so it uses its own
// origin; in local development the server runs on port 8787 of the dev machine, which
// is also what a phone running Expo Go on the same Wi-Fi needs.
function defaultApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    const local = hostname === 'localhost' || hostname === '127.0.0.1' || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(hostname);
    return local ? `${protocol}//${hostname}:8787` : origin;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:8787`;
}

export const API_URL = defaultApiUrl();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(API_URL + path, options);
  } catch {
    throw new ApiError(`Can't reach the Pokey Fire server at ${API_URL}. Is it running?`, 0);
  }
  let body = {};
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
  return body;
}

export const api = {
  health: () => request('/api/health'),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`).then((b) => b.results),
  card: (id) => request(`/api/cards/${encodeURIComponent(id)}`).then((b) => b.card),
  identify: (base64) =>
    request('/api/identify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
    }),
};
