/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import { createEnterpriseManageClient, productInput } from '../enterpriseManage';

function response(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const base = 'http://api.test/v1/me/enterprises/e1/manage';

describe('createEnterpriseManageClient', () => {
  it('builds product, team and profile requests with the session token', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({}));
    const client = createEnterpriseManageClient(
      'e1',
      async () => 'tok',
      fetcher,
      'http://api.test/'
    );
    await client.createProduct({
      name: 'Noche',
      description: null,
      airsMin: 5,
      airsMax: null,
      airsNote: null,
    });
    await client.updateProduct('p1', { airsNote: null });
    await client.deleteProduct('p1');
    await client.addTeamMember(' a@b.test ', 'sub_admin');
    await client.removeImage('banner');
    const calls = fetcher.mock.calls.map(([url, init]) => [url, init.method, init.body]);
    expect(calls).toEqual([
      // Creation leaves nulls out; updates keep them to clear fields.
      [`${base}/products`, 'POST', JSON.stringify({ name: 'Noche', airsMin: 5 })],
      [`${base}/products/p1`, 'PATCH', JSON.stringify({ airsNote: null })],
      [`${base}/products/p1`, 'DELETE', undefined],
      [`${base}/team`, 'POST', JSON.stringify({ email: 'a@b.test', role: 'sub_admin' })],
      [base, 'PATCH', JSON.stringify({ bannerUrl: '' })],
    ]);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('uploads the logo through a signed URL and saves it on the enterprise', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        response({ uploadUrl: 'https://storage.test/up', publicUrl: 'https://cdn.test/l.png' })
      )
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}));
    const client = createEnterpriseManageClient(
      'e1',
      async () => 'tok',
      fetcher,
      'http://api.test'
    );
    await client.uploadImage('logo', { type: 'image/png', size: 10 } as Blob & {
      type: string;
      size: number;
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      kind: 'logo',
      contentType: 'image/png',
    });
    expect(fetcher.mock.calls[1][1].method).toBe('PUT');
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
      logoUrl: 'https://cdn.test/l.png',
    });
    await expect(
      client.uploadImage('logo', { type: 'image/gif', size: 10 } as Blob & {
        type: string;
        size: number;
      })
    ).rejects.toMatchObject({ code: 'UPLOAD_TYPE' });
  });
});

describe('productInput', () => {
  it('turns the form into an API body and rejects bad Airs', () => {
    expect(
      productInput({
        name: ' Noche ',
        description: '',
        airsMin: '5',
        airsMax: '',
        airsNote: 'por noche',
      })
    ).toEqual({
      name: 'Noche',
      description: null,
      airsMin: 5,
      airsMax: null,
      airsNote: 'por noche',
    });
    expect(
      productInput({ name: '', description: '', airsMin: '', airsMax: '', airsNote: '' })
    ).toBeNull();
    expect(
      productInput({ name: 'x', description: '', airsMin: '10', airsMax: '5', airsNote: '' })
    ).toBeNull();
    expect(
      productInput({ name: 'x', description: '', airsMin: '1.5', airsMax: '', airsNote: '' })
    ).toBeNull();
  });
});
