export interface GeoLocation {
  countryName: string;
  countryCode: string;
  city: string;
}

export async function detectLocationFromIP(): Promise<GeoLocation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const countryName = typeof data.country_name === 'string' ? data.country_name.trim() : null;
    const countryCode = typeof data.country_code === 'string' ? data.country_code.trim() : '';
    const city = typeof data.city === 'string' ? data.city.trim() : null;
    if (!countryName || !city) return null;
    return { countryName, countryCode, city };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
