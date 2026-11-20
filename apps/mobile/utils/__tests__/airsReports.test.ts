/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import {
  createAirsReviewClient,
  focusedReportId,
  focusFirst,
  REJECT_REASON_MAX,
  rejectReasonProblem,
} from '../airsReports';
import { ManageRequestError } from '../projectManage';

function response(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
    blob: async () => ({ type: 'application/pdf' }),
  } as unknown as Response;
}

function setup(reply: Response = response(200, {}), token: string | null = 'tok') {
  const fetcher = jest.fn(async () => reply);
  const client = createAirsReviewClient(
    async () => token,
    fetcher as unknown as typeof fetch,
    'https://api.example/'
  );
  return { client, fetcher };
}

describe('airs review client', () => {
  it('reads the access, the queue and the detail with the session', async () => {
    const { client, fetcher } = setup(response(200, { canApprove: true }));
    await expect(client.access()).resolves.toEqual({ canApprove: true });
    await client.list();
    await client.detail('r 1');
    const urls = fetcher.mock.calls.map((call) => (call as unknown[])[0]);
    expect(urls).toEqual([
      'https://api.example/v1/me/airs-reports/access',
      'https://api.example/v1/me/airs-reports',
      'https://api.example/v1/me/airs-reports/r%201',
    ]);
    const init = (fetcher.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer tok' });
  });

  it('approves with the snapshot hash and rejects with the trimmed reason', async () => {
    const { client, fetcher } = setup(response(200, { report: {} }));
    await client.approve('r1', 'hash');
    await client.reject('r1', '  No invoice  ');
    const [approve, reject] = fetcher.mock.calls.map((call) => call as unknown[]);
    expect(approve[0]).toBe('https://api.example/v1/me/airs-reports/r1/approve');
    expect(approve[1]).toMatchObject({ method: 'POST', body: '{"snapshotHash":"hash"}' });
    expect(reject[0]).toBe('https://api.example/v1/me/airs-reports/r1/reject');
    expect(reject[1]).toMatchObject({ method: 'POST', body: '{"reason":"No invoice"}' });
  });

  it('downloads the supporting file as a blob', async () => {
    const { client, fetcher } = setup(response(200));
    await expect(client.proofFile('r1')).resolves.toEqual({ type: 'application/pdf' });
    expect((fetcher.mock.calls[0] as unknown[])[0]).toBe(
      'https://api.example/v1/me/airs-reports/r1/proof'
    );
  });

  it('turns refusals into errors with the API code, or just the status', async () => {
    const coded = setup(response(403, { code: 'AIRS_REPORT_APPROVER_NOT_ALLOWED' }));
    await expect(coded.client.list()).rejects.toMatchObject({
      status: 403,
      code: 'AIRS_REPORT_APPROVER_NOT_ALLOWED',
    });
    const bare = setup(response(500));
    await expect(bare.client.list()).rejects.toMatchObject({ status: 500, code: undefined });
  });

  it('never calls the API without a session', async () => {
    const { client, fetcher } = setup(response(200, {}), null);
    await expect(client.access()).rejects.toBeInstanceOf(ManageRequestError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('review helpers', () => {
  it('requires a reason within the API limit', () => {
    expect(rejectReasonProblem('   ')).toBe('required');
    expect(rejectReasonProblem('x'.repeat(REJECT_REASON_MAX + 1))).toBe('tooLong');
    expect(rejectReasonProblem(` ${'x'.repeat(REJECT_REASON_MAX)} `)).toBeNull();
  });

  it('reads the report from the email link', () => {
    expect(focusedReportId('r1')).toBe('r1');
    expect(focusedReportId(['r2', 'r3'])).toBe('r2');
    expect(focusedReportId(' ')).toBeUndefined();
    expect(focusedReportId(undefined)).toBeUndefined();
  });

  it('puts the linked report first and keeps the rest in order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(focusFirst(items, 'c').map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(focusFirst(items, 'missing')).toBe(items);
    expect(focusFirst(items)).toBe(items);
  });
});
