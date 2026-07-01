import { Controller, Get, Ip, InternalServerErrorException } from '@nestjs/common';

interface IpapiResponse {
  country_name?: string;
  country_code?: string;
  city?: string;
}

@Controller('v1/geo')
export class GeoController {
  @Get()
  async locate(
    @Ip() clientIp: string
  ): Promise<{ countryName: string; countryCode: string; city: string }> {
    const key = process.env.IPAPI_ACCESS;
    // Use the client's IP so the lookup reflects the actual requester location.
    // Fall back to /json/ (auto-detect) when running locally without a routable IP.
    const url = key
      ? `https://ipapi.co/${encodeURIComponent(clientIp)}/json/?key=${key}`
      : 'https://ipapi.co/json/';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new InternalServerErrorException('Geo lookup failed');
      const data = (await res.json()) as IpapiResponse;
      return {
        countryName: data.country_name ?? '',
        countryCode: data.country_code ?? '',
        city: data.city ?? '',
      };
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Geo lookup unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
