import { resolveMobileApiBaseUrl } from './runtimeConfig';

export interface GeoLocation {
  countryName: string;
  countryCode: string;
  city: string;
}

export async function detectLocationFromIP(): Promise<GeoLocation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const base = resolveMobileApiBaseUrl();
    const res = await fetch(`${base}/v1/geo`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const countryName = typeof data.countryName === 'string' ? data.countryName.trim() : null;
    const countryCode = typeof data.countryCode === 'string' ? data.countryCode.trim() : '';
    const city = typeof data.city === 'string' ? data.city.trim() : null;
    if (!countryName || !city) return null;
    return { countryName, countryCode, city };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
