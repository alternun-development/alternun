/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import {
  createUserAvatarClient,
  DEFAULT_AVATAR_CHOICE,
  getUserAvatarState,
  resetUserAvatarState,
  setUserAvatarState,
  socialAvatarUrl,
  UserAvatarRequestError,
} from '../userAvatar';

function response(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const API = 'https://api.example.test/';

describe('createUserAvatarClient', () => {
  it('reads the saved avatar with the session token', async () => {
    const fetcher = jest.fn(async () =>
      response({ kind: 'preset', ref: 'mangrove', art: null, extra: 1 })
    );
    const client = createUserAvatarClient(async () => 'tok', fetcher, API);

    await expect(client.get()).resolves.toEqual({ kind: 'preset', ref: 'mangrove', art: null });
    expect(fetcher).toHaveBeenCalledWith('https://api.example.test/v1/me/avatar', {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
    });
  });

  it('saves a choice and keeps the honor award art', async () => {
    const art = { title: 'Manglar Verde', tier: 'gold', kind: 'medal' };
    const fetcher = jest.fn(async () => response({ kind: 'honor_award', ref: 'g1', art }));
    const client = createUserAvatarClient(async () => 'tok', fetcher, API);

    await expect(client.set('honor_award', 'g1')).resolves.toEqual({
      kind: 'honor_award',
      ref: 'g1',
      art,
    });
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ kind: 'honor_award', ref: 'g1' });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends a null ref when going back to the default', async () => {
    const fetcher = jest.fn(async () => response({ kind: null, ref: null, art: null }));
    const client = createUserAvatarClient(async () => 'tok', fetcher, API);

    await expect(client.set(null)).resolves.toEqual(DEFAULT_AVATAR_CHOICE);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ kind: null, ref: null });
  });

  it('normalizes unexpected payloads to the default choice', async () => {
    const client = createUserAvatarClient(
      async () => 'tok',
      jest.fn(async () => response(null)),
      API
    );
    await expect(client.get()).resolves.toEqual(DEFAULT_AVATAR_CHOICE);
  });

  it('fails without a session and never calls the API', async () => {
    const fetcher = jest.fn();
    const client = createUserAvatarClient(async () => null, fetcher, API);

    await expect(client.get()).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reports the error code of a refused badge', async () => {
    const client = createUserAvatarClient(
      async () => 'tok',
      jest.fn(async () => response({ statusCode: 403, code: 'AVATAR_NOT_ALLOWED' }, 403)),
      API
    );
    const error = await client.set('tier', 'gold').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UserAvatarRequestError);
    expect(error).toMatchObject({ status: 403, code: 'AVATAR_NOT_ALLOWED' });
  });

  it('keeps the status when the error body is not JSON', async () => {
    const client = createUserAvatarClient(
      async () => 'tok',
      jest.fn(async () => ({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      })) as unknown as typeof fetch,
      API
    );
    await expect(client.get()).rejects.toMatchObject({ status: 500, code: undefined });
  });
});

describe('socialAvatarUrl', () => {
  it('prefers avatarUrl, then the provider picture', () => {
    expect(socialAvatarUrl({ avatarUrl: ' https://cdn.test/a.png ' })).toBe(
      'https://cdn.test/a.png'
    );
    expect(socialAvatarUrl({ metadata: { avatar_url: 'https://supabase.test/a.jpg' } })).toBe(
      'https://supabase.test/a.jpg'
    );
    expect(socialAvatarUrl({ metadata: { picture: 'https://google.test/p.jpg' } })).toBe(
      'https://google.test/p.jpg'
    );
    expect(socialAvatarUrl({ avatarUrl: null, metadata: { image: 'https://d.test/i.png' } })).toBe(
      'https://d.test/i.png'
    );
  });

  it('ignores missing, empty and non-https values', () => {
    expect(socialAvatarUrl(null)).toBeNull();
    expect(socialAvatarUrl({ avatarUrl: 'http://insecure.test/a.png' })).toBeNull();
    expect(socialAvatarUrl({ metadata: { picture: 42 } })).toBeNull();
  });
});

describe('avatar store', () => {
  afterEach(() => resetUserAvatarState());

  it('merges updates and resets to the default', () => {
    setUserAvatarState({ socialUrl: 'https://cdn.test/a.png' });
    setUserAvatarState({ choice: { kind: 'preset', ref: 'sun', art: null } });
    expect(getUserAvatarState()).toEqual({
      socialUrl: 'https://cdn.test/a.png',
      choice: { kind: 'preset', ref: 'sun', art: null },
    });

    resetUserAvatarState();
    expect(getUserAvatarState()).toEqual({ socialUrl: null, choice: DEFAULT_AVATAR_CHOICE });
  });
});
