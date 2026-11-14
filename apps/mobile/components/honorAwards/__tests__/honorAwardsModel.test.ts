/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import {
  createHonorAwardClient,
  honorAwardsPath,
  HonorAwardRequestError,
  sortHonorAwards,
  type HonorAward,
} from '../../../utils/honorAwards';
import { buildHonorSlots, formatHonorDate, honorText } from '../honorAwardTheme';

function award(id: string, status: HonorAward['status'], awardedAt: string): HonorAward {
  return {
    id,
    status,
    awardedAt,
    claimedAt: null,
    recipe: {
      id: 'r',
      kind: 'medal',
      tier: 'gold',
      audience: 'user',
      title: 'Manglar Verde',
      classification: null,
      purpose: null,
      eventName: null,
      eventYear: 2026,
      venueName: null,
      venueLocation: null,
      airsAmount: 15,
      badgeImageUrl: null,
      frontImageUrl: null,
      backImageUrl: null,
    },
    project: null,
    partner: null,
  };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

describe('honor awards client', () => {
  it('builds the path of each scope', () => {
    expect(honorAwardsPath({ kind: 'me' })).toBe('/v1/me/honor-awards');
    expect(honorAwardsPath({ kind: 'enterprise-manage', enterpriseId: 'e 1' })).toBe(
      '/v1/me/enterprises/e%201/manage/honor-awards'
    );
    expect(honorAwardsPath({ kind: 'enterprise-public', slug: 'swing' })).toBe(
      '/v1/enterprises/swing/honor-awards'
    );
  });

  it('sends the session token and claims with POST', async () => {
    const calls: Array<[string, RequestInit]> = [];
    const fetcher = jest.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return jsonResponse(200, url.endsWith('/claim') ? award('a', 'claimed', '') : []);
    });
    const client = createHonorAwardClient(
      { kind: 'me' },
      async () => 'token-1',
      fetcher as unknown as typeof fetch,
      'https://api.test/'
    );
    expect(client.canClaim).toBe(true);
    await client.list();
    const claimed = await client.claim('a');
    expect(claimed.status).toBe('claimed');
    expect(calls[0][0]).toBe('https://api.test/v1/me/honor-awards');
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    expect(calls[1][0]).toBe('https://api.test/v1/me/honor-awards/a/claim');
    expect(calls[1][1].method).toBe('POST');
  });

  it('reads public awards without a token and never claims them', async () => {
    const fetcher = jest.fn(async () => jsonResponse(200, []));
    const client = createHonorAwardClient(
      { kind: 'enterprise-public', slug: 'swing' },
      async () => null,
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await client.list();
    const headers = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(client.canClaim).toBe(false);
    await expect(client.claim('a')).rejects.toBeInstanceOf(HonorAwardRequestError);
  });

  it('turns API errors into request errors with their code', async () => {
    const fetcher = jest.fn(async () => jsonResponse(409, { code: 'HONOR_AWARD_NOT_CLAIMABLE' }));
    const client = createHonorAwardClient(
      { kind: 'me' },
      async () => 'token',
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await expect(client.claim('a')).rejects.toMatchObject({
      status: 409,
      code: 'HONOR_AWARD_NOT_CLAIMABLE',
    });
    const noSession = createHonorAwardClient(
      { kind: 'me' },
      async () => null,
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await expect(noSession.list()).rejects.toMatchObject({ status: 401 });
  });

  it('puts pending awards first, then the newest', () => {
    const sorted = sortHonorAwards([
      award('old', 'claimed', '2026-01-01'),
      award('new', 'claimed', '2026-06-01'),
      award('pending', 'pending', '2025-01-01'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['pending', 'new', 'old']);
  });
});

describe('honor award slots and copy', () => {
  it('fills the row with empty placeholders and grows by full rows', () => {
    expect(buildHonorSlots([]).map((slot) => slot.kind)).toEqual(Array(5).fill('empty'));
    const six = buildHonorSlots(
      Array.from({ length: 6 }, (_, index) => award(`a${index}`, 'claimed', ''))
    );
    expect(six).toHaveLength(10);
    expect(six.filter((slot) => slot.kind === 'award')).toHaveLength(6);
  });

  it('formats dates and keeps unparsable values', () => {
    expect(formatHonorDate(null)).toBe('');
    expect(formatHonorDate('not a date')).toBe('not a date');
    expect(formatHonorDate('2026-10-30T12:00:00Z', 'en-US')).toContain('2026');
  });

  it('interpolates the fallback text when the catalog has no entry', () => {
    const t = (_key: string, _params?: unknown, fallback?: string) => fallback ?? '';
    expect(honorText(t, 'missing', '+{{amount}} Airs', { amount: 5 })).toBe('+5 Airs');
  });
});

describe('honor award art and demo', () => {
  // Imported lazily so the svg module only loads for these tests.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const crest = require('../HonorAwardCrest') as typeof import('../HonorAwardCrest');
  const demo = require('../honorAwardDemo') as typeof import('../honorAwardDemo');
  /* eslint-enable @typescript-eslint/no-var-requires */

  it('splits the banner title into two balanced lines', () => {
    expect(crest.bannerLines('Manglar Verde')).toEqual(['MANGLAR', 'VERDE']);
    expect(crest.bannerLines('Taybo Rodadero Santa Marta')).toEqual([
      'TAYBO RODADERO',
      'SANTA MARTA',
    ]);
    expect(crest.bannerLines('Golf')).toEqual(['GOLF', '']);
  });

  it('knows its built-in art presets', () => {
    expect(crest.isHonorArtPreset('golf_mangrove')).toBe(true);
    expect(crest.isHonorArtPreset('coast')).toBe(true);
    expect(crest.isHonorArtPreset('unknown')).toBe(false);
    expect(crest.isHonorArtPreset(null)).toBe(false);
  });

  it('previews a different tier in each empty slot with the golf medal art', () => {
    expect([0, 1, 2, 3, 4].map(demo.demoTierForSlot)).toEqual([
      'gold',
      'silver',
      'bronze',
      'generic',
      'gold',
    ]);
    const sample = demo.buildDemoHonorAward('silver', { classification: 'C', purpose: 'P' });
    expect(sample.recipe.tier).toBe('silver');
    expect(sample.recipe.artPreset).toBe('golf_mangrove');
    expect(sample.recipe.airsAmount).toBe(10);
    expect(sample.partner?.slug).toBe('');
  });
});

describe('ally desk client', () => {
  it('only exists on the ally manage scope and calls its endpoints', async () => {
    const calls: Array<[string, RequestInit]> = [];
    const fetcher = jest.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return jsonResponse(
        200,
        url.endsWith('/lookup') ? { found: true, total: 2, byRecipe: [] } : []
      );
    });
    expect(
      createHonorAwardClient({ kind: 'me' }, async () => 'x', fetcher as unknown as typeof fetch)
        .desk
    ).toBeUndefined();
    const client = createHonorAwardClient(
      { kind: 'enterprise-manage', enterpriseId: 'e1' },
      async () => 'token',
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await client.desk?.listRecipes();
    await client.desk?.grant({ recipeId: 'r1', email: ' Ada@Example.com ', reference: ' RES-1 ' });
    const summary = await client.desk?.lookupGuest('ADA@example.com');
    const base = 'https://api.test/v1/me/enterprises/e1/manage/honor-awards';
    expect(calls.map(([url]) => url)).toEqual([
      `${base}/recipes`,
      `${base}/grants`,
      `${base}/guests/lookup`,
    ]);
    expect(JSON.parse(String(calls[1][1].body))).toEqual({
      recipeId: 'r1',
      email: 'ada@example.com',
      reference: 'RES-1',
    });
    expect(JSON.parse(String(calls[2][1].body))).toEqual({ email: 'ada@example.com' });
    expect(summary?.total).toBe(2);
  });
});

describe('card template details', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const theme = require('../honorAwardTheme') as typeof import('../honorAwardTheme');
  const art = require('../honorAwardArt') as typeof import('../honorAwardArt');
  /* eslint-enable @typescript-eslint/no-var-requires */

  it('writes the obtained date like the templates', () => {
    expect(theme.formatObtainedDate('2026-10-30T12:00:00Z', 'es')).toBe('Octubre 30 - 2026');
    expect(theme.formatObtainedDate('2026-10-30T12:00:00Z', 'en')).toBe('October 30 - 2026');
    expect(theme.formatObtainedDate(null)).toBe('');
    expect(theme.formatObtainedDate('nope')).toBe('nope');
  });

  it('names the ally country under its name', () => {
    expect(theme.honorCountryName('co')).toBe('Colombia');
    expect(theme.honorCountryName('ZZ')).toBe('ZZ');
    expect(theme.honorCountryName(null)).toBe('');
  });

  it('bundles the medals and back photo of the golf preset only', () => {
    for (const tier of ['generic', 'gold', 'silver', 'bronze'] as const) {
      expect(art.presetBadge('golf_mangrove', tier)).toBeTruthy();
      expect(art.presetBadge('coast', tier)).toBeNull();
    }
    expect(art.presetBadge(null, 'gold')).toBeNull();
    expect(art.presetBack('golf_mangrove')).toBeTruthy();
    expect(art.presetBack('coast')).toBeNull();
    expect(art.presetBack(undefined)).toBeNull();
  });
});
