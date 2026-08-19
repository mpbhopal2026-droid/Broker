/**
 * Approximate location of a request, taken from edge headers.
 *
 * Vercel injects these on every request and Cloudflare adds a country, so this
 * costs nothing: no external lookup, no API key, no latency added to a sign-in.
 *
 * Deliberately NOT an IP-geolocation service. Sending every operator's IP to a
 * third party to ask where they are would create the exact tracking exposure
 * this feature is supposed to contain.
 *
 * Accuracy is what edge geolocation gives you: reliable at country level, fair
 * at city, and wrong for anyone on a VPN or a mobile carrier that routes
 * through another state. It is good enough to answer "does this login look like
 * the others?" and not good enough to place someone at an address — which is
 * the right amount of precision for a staff access log.
 */

export interface RequestGeo {
  country: string | null;
  region: string | null;
  city: string | null;
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  // Vercel percent-encodes city names containing spaces or non-ASCII.
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Leave it as-is if it was not encoded.
  }
  const trimmed = decoded.trim().slice(0, 80);
  return trimmed && trimmed !== 'XX' ? trimmed : null;
}

export function geoFromHeaders(headers: Headers): RequestGeo {
  return {
    // Cloudflare's country is the fallback: it is present even on requests that
    // reach the origin without passing through Vercel's edge.
    country: clean(headers.get('x-vercel-ip-country') ?? headers.get('cf-ipcountry')),
    region: clean(headers.get('x-vercel-ip-country-region')),
    city: clean(headers.get('x-vercel-ip-city')),
  };
}

/** "Mumbai, MH, IN" — or null when the edge told us nothing. */
export function formatGeo(geo: RequestGeo): string | null {
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
