// Request handlers shared by the local Express server (index.js) and the
// Cloudflare Worker (worker.js). Each returns [status, jsonBody].
import { identifyConfigured, identifyProvider, matchReading, readCard } from './identify.js';
import { getCard, searchCards } from './tcgdex.js';

const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function health() {
  return [200, { ok: true, identify: identifyConfigured(), provider: identifyProvider() }];
}

// Body: { image: "<base64 or data: URL>", mediaType?: "image/jpeg" }
export async function identify(body) {
  if (!identifyConfigured()) {
    return [503, { error: 'Card recognition is not configured on the server (set XAI_API_KEY).' }];
  }
  let { image, mediaType = 'image/jpeg' } = body || {};
  if (typeof image !== 'string' || !image) return [400, { error: 'Missing image.' }];
  const dataUrl = image.match(/^data:(image\/[a-z+]+);base64,(.*)$/s);
  if (dataUrl) [, mediaType, image] = dataUrl;
  if (!MEDIA_TYPES.has(mediaType)) return [400, { error: `Unsupported image type ${mediaType}.` }];
  try {
    const reading = await readCard(image, mediaType);
    const matches = await matchReading(reading);
    return [200, { reading, matches }];
  } catch (err) {
    console.error('identify failed', err);
    return [502, { error: err.message || 'Identification failed.' }];
  }
}

export async function search(rawQuery) {
  const q = String(rawQuery || '').trim();
  if (q.length < 2) return [200, { results: [] }];
  // Accept "charizard 4", "charizard ex 199/165" or just a name.
  const m = q.match(/^(.*?)\s+#?([a-z]*\d+[a-z]*)(?:\/(\d+))?$/i);
  const name = m ? m[1] : q;
  const number = m ? m[2] : undefined;
  const total = m?.[3] ? Number(m[3]) : null;
  try {
    let results = await searchCards({ name, number });
    if (!results.length && number) results = await searchCards({ name: q });
    // "Bulbasaur 1/165": cards from a 165-card set are almost certainly the one meant.
    if (total) results.sort((a, b) => (b.setTotal === total) - (a.setTotal === total));
    return [200, { results }];
  } catch (err) {
    console.error('search failed', err);
    return [502, { error: 'Card search is unavailable right now.' }];
  }
}

export async function card(id) {
  try {
    const c = await getCard(id);
    if (!c) return [404, { error: 'Card not found.' }];
    return [200, { card: c }];
  } catch (err) {
    console.error('card lookup failed', err);
    return [502, { error: 'Card lookup is unavailable right now.' }];
  }
}
