/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import {
  assignableRoles,
  createManageClient,
  ManageRequestError,
  pickImageFile,
  uploadProblem,
} from '../projectManage';

function response(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('createManageClient', () => {
  const base = 'http://api.test/v1/me/projects/p1/manage';

  it('sends the Airs session token and maps API error codes', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response({ project: { id: 'p1' } }))
      .mockResolvedValueOnce(response({ code: 'PROJECT_SCOPE_DENIED' }, 403));
    const client = createManageClient('p1', async () => 'tok', fetcher, 'http://api.test/');
    await client.overview();
    expect(fetcher.mock.calls[0][0]).toBe(base);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    await expect(client.listTeam()).rejects.toMatchObject({
      status: 403,
      code: 'PROJECT_SCOPE_DENIED',
    });
  });

  it('refuses to call the API without a session', async () => {
    const fetcher = jest.fn();
    const client = createManageClient('p1', async () => null, fetcher, 'http://api.test');
    await expect(client.overview()).rejects.toBeInstanceOf(ManageRequestError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('builds team, comment and media requests', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({}));
    const client = createManageClient('p1', async () => 'tok', fetcher, 'http://api.test');
    await client.addTeamMember(' mod@x.test ', 'project_moderator');
    await client.revokeTeamMember('m1', 'bye');
    await client.listComments('pending');
    await client.moderateComment('c1', 'hide', 'spam');
    await client.retireMedia('md1');
    const calls = fetcher.mock.calls.map(([url, init]) => [url, init.method, init.body]);
    expect(calls).toEqual([
      [`${base}/team`, 'POST', JSON.stringify({ email: 'mod@x.test', role: 'project_moderator' })],
      [`${base}/team/m1/revoke`, 'POST', JSON.stringify({ reason: 'bye' })],
      [`${base}/comments?status=pending`, 'GET', undefined],
      [`${base}/comments/c1/hide`, 'POST', JSON.stringify({ reason: 'spam' })],
      [`${base}/media/md1`, 'DELETE', undefined],
    ]);
  });

  it('uploads to the signed URL and then saves the image as project media', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        response({ uploadUrl: 'https://storage.test/up', publicUrl: 'https://cdn.test/a.png' })
      )
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ project: { defaultLocale: 'es' } }))
      .mockResolvedValueOnce(response({ id: 'md1' }));
    const client = createManageClient('p1', async () => 'tok', fetcher, 'http://api.test');
    const file = { type: 'image/png', size: 1000 } as Blob & { type: string };
    await client.uploadImage('cover', file, ' Banner ');
    expect(fetcher.mock.calls[0][1].body).toBe(
      JSON.stringify({ kind: 'cover', contentType: 'image/png' })
    );
    expect(fetcher.mock.calls[1][0]).toBe('https://storage.test/up');
    expect(fetcher.mock.calls[1][1].method).toBe('PUT');
    expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({
      kind: 'cover',
      url: 'https://cdn.test/a.png',
      altText: { es: 'Banner' },
    });
    await expect(
      client.uploadImage(
        'logo',
        { type: 'image/svg+xml', size: 10 } as Blob & { type: string },
        'x'
      )
    ).rejects.toMatchObject({ code: 'UPLOAD_TYPE' });
  });
});

describe('helpers', () => {
  it('validates uploads', () => {
    expect(uploadProblem({ type: 'image/webp', size: 10 })).toBeNull();
    expect(uploadProblem({ type: 'image/gif', size: 10 })).toBe('type');
    expect(uploadProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toBe('size');
  });

  it('only lets project admins hand out the delegated roles', () => {
    expect(assignableRoles(['partner_operator'], false)).toEqual([
      'sub_admin',
      'project_moderator',
      'partner_readonly',
    ]);
    expect(assignableRoles(['sub_admin', 'project_moderator'], false)).toEqual([]);
    expect(assignableRoles(['platform_owner'], true)).toContain('partner_operator');
  });

  it('opens the browser file picker and resolves the chosen file', async () => {
    const input: Record<string, unknown> = { click: jest.fn(), files: ['file-1'] };
    const doc = { createElement: jest.fn(() => input) } as unknown as Document;
    const picked = pickImageFile(doc);
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    (input.onchange as () => void)();
    await expect(picked).resolves.toBe('file-1');
    await expect(pickImageFile(undefined)).resolves.toBeNull();
  });
});
