/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import { airsAmount, createClientsClient, proofProblem } from '../projectClients';
import { ManageRequestError } from '../projectManage';

function response(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const project = 'http://api.test/v1/me/projects/p1/manage/clients';

describe('createClientsClient', () => {
  it('lists the clients of a project or of an enterprise', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response([{ id: 'c1' }]))
      .mockResolvedValueOnce(response({ projects: [{ id: 'p1', title: 'Río' }], clients: [] }));
    const forProject = createClientsClient(
      { projectId: 'p1' },
      async () => 'tok',
      fetcher,
      'http://api.test/'
    );
    expect(await forProject.list()).toEqual({
      projects: [{ id: 'p1', title: '' }],
      clients: [{ id: 'c1' }],
    });
    const forEnterprise = createClientsClient(
      { enterpriseId: 'e1' },
      async () => 'tok',
      fetcher,
      'http://api.test'
    );
    expect((await forEnterprise.list()).projects).toEqual([{ id: 'p1', title: 'Río' }]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      project,
      'http://api.test/v1/me/enterprises/e1/manage/clients',
    ]);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('sends the changes to the project of the client', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response({ email: 'a@b.test', hasAccount: false, displayName: null }))
      .mockResolvedValueOnce(response({ client: { id: 'c1' } }))
      .mockResolvedValueOnce(response(null, 204))
      .mockResolvedValueOnce(response({ id: 'c1', status: 'removed' }))
      .mockResolvedValueOnce(response({ url: 'https://signed/x' }));
    const client = createClientsClient(
      { enterpriseId: 'e1' },
      async () => 'tok',
      fetcher,
      'http://api.test'
    );
    await client.lookup('p1', ' A@B.test ');
    await client.add('p1', {
      email: ' A@B.test ',
      name: ' Ana ',
      airs: { amount: 10, concept: ' Compra ', documentNumber: ' ' },
    });
    await client.cancelInvitation('p1', 'i1');
    await client.remove('p1', 'm1', 'Ya no');
    expect(await client.proofUrl('p1', 'r1')).toBe('https://signed/x');
    expect(fetcher.mock.calls.map(([url, init]) => [url, init.method, init.body])).toEqual([
      [`${project}/lookup?email=a%40b.test`, 'GET', undefined],
      [
        project,
        'POST',
        JSON.stringify({
          email: 'a@b.test',
          name: 'Ana',
          airs: { amount: 10, concept: 'Compra' },
        }),
      ],
      [`${project}/invitations/i1`, 'DELETE', undefined],
      [`${project}/members/m1/remove`, 'POST', JSON.stringify({ reason: 'Ya no' })],
      [`${project}/reports/r1/proof`, 'GET', undefined],
    ]);
  });

  it('uploads the supporting file before adding the Airs', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response({ uploadUrl: 'https://upload/x', path: 'p1/f.pdf' }))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ client: { id: 'c1' } }));
    const client = createClientsClient(
      { projectId: 'p1' },
      async () => 'tok',
      fetcher,
      'http://api.test'
    );
    const file = { type: 'application/pdf', size: 1000 } as never;
    await client.add('p1', { email: 'a@b.test', airs: { amount: 5, concept: 'Compra' } }, file);
    expect(fetcher.mock.calls[0]).toEqual([
      `${project}/proof-upload-url`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ contentType: 'application/pdf', size: 1000 }),
      }),
    ]);
    expect(fetcher.mock.calls[1][0]).toBe('https://upload/x');
    expect(fetcher.mock.calls[1][1].method).toBe('PUT');
    expect(JSON.parse(fetcher.mock.calls[2][1].body).airs.proofPath).toBe('p1/f.pdf');
  });

  it('reports errors with their code and refuses invalid files before uploading', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response({ code: 'CLIENT_NAME_REQUIRED' }, 422))
      .mockResolvedValueOnce(response({ uploadUrl: 'https://upload/x', path: 'p' }))
      .mockResolvedValueOnce(response({}, 500));
    const client = createClientsClient(
      { projectId: 'p1' },
      async () => 'tok',
      fetcher,
      'http://api.test'
    );
    await expect(client.add('p1', { email: 'a@b.test' })).rejects.toMatchObject({
      status: 422,
      code: 'CLIENT_NAME_REQUIRED',
    });
    await expect(
      client.add('p1', { email: 'a@b.test', airs: { amount: 5, concept: 'Compra' } }, {
        type: 'text/html',
        size: 10,
      } as never)
    ).rejects.toMatchObject({ code: 'UPLOAD_TYPE' });
    await expect(
      client.add('p1', { email: 'a@b.test', airs: { amount: 5, concept: 'Compra' } }, {
        type: 'image/png',
        size: 10,
      } as never)
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    const noSession = createClientsClient({ projectId: 'p1' }, async () => null, fetcher);
    await expect(noSession.list()).rejects.toBeInstanceOf(ManageRequestError);
  });
});

describe('client helpers', () => {
  it('validates supporting files and Airs amounts', () => {
    expect(proofProblem({ type: 'application/pdf', size: 10 })).toBeNull();
    expect(proofProblem({ type: 'text/plain', size: 10 })).toBe('type');
    expect(proofProblem({ type: 'image/png', size: 11 * 1024 * 1024 })).toBe('size');
    expect(airsAmount(' 40 ')).toBe(40);
    expect(airsAmount('0')).toBeNull();
    expect(airsAmount('4.5')).toBeNull();
    expect(airsAmount('')).toBeNull();
  });
});
