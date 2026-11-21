/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import {
  createHonorAwardClient,
  honorAwardsPath,
  HonorAwardRequestError,
  sortHonorAwards,
  type HonorAward,
} from '../../../utils/honorAwards';
import { buildHonorSlots, formatHonorDate, honorText, lockedHonorAward } from '../honorAwardTheme';

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

  it('lists the medals still to earn only for the signed-in person', async () => {
    const fetcher = jest.fn(async () => jsonResponse(200, []));
    const me = createHonorAwardClient(
      { kind: 'me' },
      async () => 'token',
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await me.catalog?.();
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.test/v1/me/honor-awards/catalog',
      expect.objectContaining({ method: 'GET' })
    );
    const publicClient = createHonorAwardClient(
      { kind: 'enterprise-public', slug: 's' },
      async () => null
    );
    expect('catalog' in publicClient).toBe(false);
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

  it('lists held medals, then the locked ones, then empty slots', () => {
    const item = (id: string) => ({
      ...award('x', 'claimed', ''),
      recipe: { ...award('x', 'claimed', '').recipe, id },
    });
    const locked = [item('r'), item('r2')].map(({ recipe, project, partner }) => ({
      recipe,
      project,
      partner,
    }));
    expect(buildHonorSlots([], { locked }).map((slot) => slot.kind)).toEqual([
      'locked',
      'locked',
      'empty',
      'empty',
      'empty',
    ]);
    // A held medal (recipe "r") is not repeated as locked.
    expect(
      buildHonorSlots([award('a', 'claimed', '')], { locked }).map((slot) => slot.kind)
    ).toEqual(['award', 'locked', 'empty', 'empty', 'empty']);
    const shaped = lockedHonorAward(locked[1]);
    expect(shaped).toMatchObject({ id: 'locked-r2', status: 'pending', claimedAt: null });
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

  it('previews the generic golf medal (mission medals have no tiers)', () => {
    const sample = demo.buildDemoHonorAward({
      classification: 'C',
      purpose: 'P',
      partnerDescription: 'D',
      projectLocation: 'L',
      projectDescription: 'PD',
    });
    expect(sample.recipe.tier).toBe('generic');
    expect(sample.recipe.artPreset).toBe('golf_mangrove');
    expect(sample.recipe.airsAmount).toBe(5);
    expect(sample.partner?.slug).toBe('');
    expect(sample.partner?.description).toBe('D');
    expect(sample.project).toMatchObject({ slug: '', location: 'L', description: 'PD' });
  });
});

describe('sharing a legacy medal', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { honorShareContent } =
    require('../honorAwardShare') as typeof import('../honorAwardShare');
  const { presetBadge } = require('../honorAwardArt') as typeof import('../honorAwardArt');
  /* eslint-enable @typescript-eslint/no-var-requires */
  const t = (_key: string, _params?: unknown, fallback?: string) => fallback ?? '';
  const base = award('a', 'claimed', '');

  it('links to the project and attaches the bundled medal', () => {
    const content = honorShareContent(
      {
        ...base,
        recipe: {
          ...base.recipe,
          title: 'Manglar Verde',
          tier: 'generic',
          artPreset: 'golf_mangrove',
        },
        project: { id: 'p', slug: 'batis', title: 'Batis' },
        partner: {
          id: 'e',
          slug: 's',
          displayName: 'Swing Golf',
          description: null,
          logoUrl: null,
          websiteUrl: null,
        },
      },
      t
    );
    // Reads like a shared milestone: first person, the brand and the hashtags.
    expect(content.message).toBe(
      '¡Obtuve la medalla de legado "Manglar Verde" con Swing Golf en Airs by Alternun! 🌱 #Airs #Alternun'
    );
    expect(content.url).toMatch(/\/explore\/batis$/);
    // Off the web there is no canvas to draw the card on: the medal itself is shared.
    expect(content.image).toEqual({
      source: presetBadge('golf_mangrove', 'generic'),
      fileName: 'airs-manglar-verde.webp',
    });
    expect(honorShareContent(base, t, 'Ana').message).toBe(
      '¡Obtuve la medalla de legado "Manglar Verde" en Airs by Alternun! 🌱 #Airs #Alternun'
    );
  });

  it('prefers the medal image of the recipe, then the card, then no image', () => {
    const withBadge = honorShareContent(
      {
        ...base,
        recipe: { ...base.recipe, title: 'Café Ñame', badgeImageUrl: 'https://cdn/m.JPG?v=2' },
      },
      t
    );
    expect(withBadge.image).toEqual({
      source: 'https://cdn/m.JPG?v=2',
      fileName: 'airs-cafe-name.jpg',
    });
    expect(withBadge.url).not.toContain('/explore/');
    const withCard = honorShareContent(
      { ...base, recipe: { ...base.recipe, frontImageUrl: 'https://cdn/card' } },
      t
    );
    expect(withCard.image?.fileName).toBe('airs-manglar-verde.png');
    expect(honorShareContent(base, t).image).toBeNull();
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

  it('sends the name for new people and manages claim codes', async () => {
    const calls: Array<[string, RequestInit]> = [];
    const fetcher = jest.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return jsonResponse(
        200,
        url.endsWith('/codes') && init.method === 'POST'
          ? { code: 'ABCD-EFGH-JKMN', record: {} }
          : []
      );
    });
    const client = createHonorAwardClient(
      { kind: 'enterprise-manage', enterpriseId: 'e1' },
      async () => 'token',
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await client.desk?.grant({ recipeId: 'r1', email: 'new@example.com', recipientName: ' Ana ' });
    await client.desk?.listCodes();
    const created = await client.desk?.createCode({
      recipeId: 'r1',
      label: ' Torneo ',
      maxRedemptions: 100,
      validDays: 3,
    });
    await client.desk?.revokeCode('c/1');
    const base = 'https://api.test/v1/me/enterprises/e1/manage/honor-awards';
    expect(calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      `POST ${base}/grants`,
      `GET ${base}/codes`,
      `POST ${base}/codes`,
      `POST ${base}/codes/c%2F1/revoke`,
    ]);
    expect(JSON.parse(String(calls[0][1].body))).toEqual({
      recipeId: 'r1',
      email: 'new@example.com',
      recipientName: 'Ana',
    });
    expect(JSON.parse(String(calls[2][1].body))).toEqual({
      recipeId: 'r1',
      maxRedemptions: 100,
      validDays: 3,
      label: 'Torneo',
    });
    expect(created?.code).toBe('ABCD-EFGH-JKMN');
  });

  it('lets only the signed-in person redeem a code', async () => {
    const fetcher = jest.fn(async () => jsonResponse(200, { grantId: 'g1' }));
    const me = createHonorAwardClient(
      { kind: 'me' },
      async () => 't',
      fetcher as unknown as typeof fetch,
      'https://api.test'
    );
    await me.redeem?.(' abcd-efgh-jkmn ');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.test/v1/me/honor-awards/redeem',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'abcd-efgh-jkmn' }) })
    );
    const publicClient = createHonorAwardClient(
      { kind: 'enterprise-public', slug: 's' },
      async () => null
    );
    expect('redeem' in publicClient).toBe(false);
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

  it('writes the country once, even when the ally name already has it', () => {
    const ally = (displayName: string, countryCode: string | null = 'CO') => ({
      id: 'e',
      slug: 's',
      displayName,
      description: null,
      logoUrl: null,
      websiteUrl: null,
      countryCode,
    });
    expect(theme.honorPartnerLine(ally('Swing Golf'))).toBe('Swing Golf Colombia');
    expect(theme.honorPartnerLine(ally('Swing Golf Colombia'))).toBe('Swing Golf Colombia');
    // Case, accents and punctuation do not matter; only whole words count.
    expect(theme.honorPartnerLine(ally('SWING GOLF (colombia)'))).toBe('SWING GOLF (colombia)');
    expect(theme.honorPartnerLine(ally('Golf Mexico', 'MX'))).toBe('Golf Mexico');
    expect(theme.honorPartnerLine(ally('Golf México', 'mx'))).toBe('Golf México');
    expect(theme.honorPartnerLine(ally('Colombiana de Golf'))).toBe('Colombiana de Golf Colombia');
    expect(theme.honorPartnerLine(ally('Golf Panamá', 'PA'))).toBe('Golf Panamá');
    expect(theme.honorPartnerLine(ally('Swing Golf', null))).toBe('Swing Golf');
    expect(theme.honorPartnerLine(null)).toBe('');
    expect(theme.honorPartnerCountry(ally('Swing Golf Colombia'))).toBe('');
    expect(theme.honorPartnerCountry(ally('Swing Golf'))).toBe('Colombia');
  });

  it('sizes the crest banner so each line fits where the banner narrows', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bannerFontSize } = require('../HonorAwardCrest') as typeof import('../HonorAwardCrest');
    // Width of a line at a size: ~0.75 of the size per letter plus the 0.4 letter spacing.
    const width = (line: string, size: number) => line.length * (0.75 * size + 0.4);
    expect(bannerFontSize('MANGLAR', 'VERDE')).toBe(7.6);
    expect(bannerFontSize('GOLF', '')).toBe(7.6);
    const size = bannerFontSize('TAYBO RODADERO', 'SANTA MARTA CARIBE');
    expect(size).toBeLessThan(5.6);
    expect(width('TAYBO RODADERO', size)).toBeLessThanOrEqual(70);
    expect(width('SANTA MARTA CARIBE', size)).toBeLessThanOrEqual(44);
    expect(
      width('CORAL VIVO DEL CARIBE', bannerFontSize('CORAL VIVO DEL CARIBE', ''))
    ).toBeLessThanOrEqual(60);
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
