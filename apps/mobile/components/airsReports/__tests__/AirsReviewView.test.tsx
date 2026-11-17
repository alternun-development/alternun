/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AirsReviewView, decisionErrorKey } from '../AirsReviewView';
import { ManageRequestError } from '../../../utils/projectManage';
import type { AirsReviewClient, AirsReviewItem } from '../../../utils/airsReports';

// Toasts the view shows right now.
const mockToasts: Array<{ type: string; title: string; message?: string }> = [];
jest.mock('@alternun/ui', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
  ToastSystem: ({ toasts }: { toasts: Array<{ type: string; title: string }> }) => {
    mockToasts.splice(0, mockToasts.length, ...toasts);
    return null;
  },
}));

const palette = {
  background: '#000',
  surface: '#111',
  border: '#222',
  text: '#fff',
  muted: '#999',
  primary: '#0f0',
  primaryDeep: '#0a0',
  fill: '#070',
  mist: '#030',
};
const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as never;

function item(id: string, extra: Partial<AirsReviewItem> = {}): AirsReviewItem {
  return {
    id,
    projectId: 'p1',
    projectTitle: 'Hotel piloto',
    status: 'pending_approval',
    recipientEmail: `${id}@example.test`,
    recipientName: null,
    amount: 150,
    concept: 'Two nights at the pilot hotel',
    documentNumber: 'INV-1',
    snapshotHash: `list-${id}`,
    submittedAt: '2026-11-10T15:00:00Z',
    hasProof: true,
    ...extra,
  };
}

const totals = { dailyTotal: 150, dailyLimit: 100, monthlyTotal: 150, monthlyLimit: 300 };

function reviewClient(extra: Partial<AirsReviewClient> = {}): AirsReviewClient {
  return {
    access: jest.fn(async () => ({ canApprove: true })),
    list: jest.fn(async () => [
      item('r1'),
      item('r2', {
        projectTitle: null,
        documentNumber: null,
        hasProof: false,
        recipientName: 'Ana',
      }),
    ]),
    detail: jest.fn(async (id: string) => ({
      report: { id, snapshotHash: `detail-${id}` },
      recipientTotals: totals,
    })),
    approve: jest.fn(async () => undefined),
    reject: jest.fn(async () => undefined),
    proofFile: jest.fn(async () => ({ type: 'application/pdf' } as Blob)),
    ...extra,
  };
}

let mounted: ReactTestRenderer | undefined;
afterEach(() => {
  // Unmounting clears the toast timers.
  if (mounted) act(() => mounted?.unmount());
  mounted = undefined;
});

async function render(
  client: AirsReviewClient,
  props: Partial<React.ComponentProps<typeof AirsReviewView>> = {}
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <AirsReviewView
        client={client}
        palette={palette}
        t={t}
        onBack={() => undefined}
        toLocalUrl={async () => 'blob:proof'}
        {...props}
      />
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  mounted = renderer;
  return renderer!;
}

const byId = (r: ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id);
const pressable = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];
const texts = (r: ReactTestRenderer): string =>
  r.root
    .findAll(
      (n) =>
        typeof n.props.children === 'string' ||
        (Array.isArray(n.props.children) &&
          n.props.children.every((part: unknown) => typeof part === 'string'))
    )
    .map((n) => [n.props.children].flat().join(''))
    .join('|');
const cardOrder = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll((n) => typeof n.props.testID === 'string' && /^airs-review-r\d$/.test(n.props.testID))
    .map((n) => n.props.testID as string)
    .filter((id, index, all) => all.indexOf(id) === index);

async function press(r: ReactTestRenderer, id: string): Promise<void> {
  await act(async () => {
    pressable(r, id).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function type(r: ReactTestRenderer, id: string, value: string): Promise<void> {
  await act(async () => {
    input(r, id).props.onChangeText(value);
  });
}

beforeEach(() => {
  mockToasts.length = 0;
});

describe('AirsReviewView', () => {
  it('lists the reports in review with what the approver needs to decide', async () => {
    const r = await render(reviewClient());
    // Every string in the tree, including text nested next to labels.
    const all = r.root
      .findAll(() => true)
      .flatMap((n) => [n.props.children].flat())
      .filter((part): part is string => typeof part === 'string')
      .join('|');
    expect(all).toContain('airsReview.amount:{"count":150}');
    expect(all).toContain('r1@example.test');
    expect(all).toContain('Ana (r2@example.test)');
    expect(all).toContain('airsReview.recipient');
    expect(all).toContain('Hotel piloto');
    expect(all).toContain('Two nights at the pilot hotel');
    expect(all).toContain('INV-1');
    expect(all).toContain('airsReview.noDocument');
    expect(all).toContain('airsReview.totalDay:{"total":150,"limit":100}');
    expect(all).toContain('airsReview.totalMonth:{"total":150,"limit":300}');
    // Only reports with a supporting file offer it.
    expect(byId(r, 'airs-review-r1-proof').length).toBeGreaterThan(0);
    expect(byId(r, 'airs-review-r2-proof')).toHaveLength(0);
  });

  it('opens the report from the email link first', async () => {
    const r = await render(reviewClient(), { focusId: 'r2' });
    expect(cardOrder(r)).toEqual(['airs-review-r2', 'airs-review-r1']);
    expect(byId(r, 'airs-review-focus-missing')).toHaveLength(0);
  });

  it('says when the linked report is no longer in review', async () => {
    const r = await render(reviewClient(), { focusId: 'gone' });
    expect(byId(r, 'airs-review-focus-missing').length).toBeGreaterThan(0);
  });

  it('shows the empty state', async () => {
    const r = await render(reviewClient({ list: jest.fn(async () => []) }));
    expect(byId(r, 'airs-review-empty').length).toBeGreaterThan(0);
  });

  it('tells non-approvers this section is not for them', async () => {
    const r = await render(
      reviewClient({
        list: jest.fn(async () => {
          throw new ManageRequestError(403, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');
        }),
      })
    );
    expect(byId(r, 'airs-review-denied').length).toBeGreaterThan(0);
    expect(byId(r, 'airs-review-retry')).toHaveLength(0);
  });

  it('offers a retry when the queue cannot be loaded', async () => {
    let fail = true;
    const list = jest.fn(async () => {
      if (fail) throw new ManageRequestError(500);
      return [item('r1')];
    });
    const r = await render(reviewClient({ list }));
    expect(texts(r)).toContain('airsReview.error');
    fail = false;
    await press(r, 'airs-review-retry');
    expect(list).toHaveBeenCalledTimes(2);
    expect(byId(r, 'airs-review-r1').length).toBeGreaterThan(0);
  });

  it('approves the reviewed version and removes it from the queue', async () => {
    const client = reviewClient();
    const r = await render(client);
    await press(r, 'airs-review-r1-approve');
    expect(client.approve).toHaveBeenCalledWith('r1', 'detail-r1');
    expect(mockToasts[0]).toMatchObject({
      type: 'success',
      title: 'airsReview.toasts.approvedTitle',
      message: 'airsReview.toasts.body:{"count":150,"email":"r1@example.test"}',
    });
    expect(byId(r, 'airs-review-r1')).toHaveLength(0);
    expect(byId(r, 'airs-review-r2').length).toBeGreaterThan(0);
  });

  it('waits for the totals before approving and lets the approver retry them', async () => {
    let fail = true;
    const detail = jest.fn(async (id: string) => {
      if (fail) throw new ManageRequestError(500);
      return { report: { id, snapshotHash: 'fresh' }, recipientTotals: totals };
    });
    const client = reviewClient({ list: jest.fn(async () => [item('r1')]), detail });
    const r = await render(client);
    expect(texts(r)).toContain('airsReview.totalsError');
    expect(pressable(r, 'airs-review-r1-approve').props.disabled).toBe(true);
    fail = false;
    await press(r, 'airs-review-r1-totals-retry');
    expect(pressable(r, 'airs-review-r1-approve').props.disabled).toBe(false);
    await press(r, 'airs-review-r1-approve');
    expect(client.approve).toHaveBeenCalledWith('r1', 'fresh');
  });

  it('asks for a reason to reject, below the buttons, and sends it', async () => {
    const client = reviewClient();
    const r = await render(client);
    await press(r, 'airs-review-r1-reject');
    await press(r, 'airs-review-r1-confirm-reject');
    expect(client.reject).not.toHaveBeenCalled();
    expect(texts(r)).toContain('airsReview.reasonRequired');

    // The error sits after the buttons so it never moves them.
    const card = byId(r, 'airs-review-r1')[0];
    const ids = card
      .findAll((n) => typeof n.props.testID === 'string')
      .map((n) => n.props.testID as string);
    expect(ids.lastIndexOf('airs-review-r1-reason-error')).toBeGreaterThan(
      ids.lastIndexOf('airs-review-r1-confirm-reject')
    );

    await type(r, 'airs-review-r1-reason', 'x'.repeat(501));
    expect(byId(r, 'airs-review-r1-reason-error')).toHaveLength(0);
    await press(r, 'airs-review-r1-confirm-reject');
    expect(texts(r)).toContain('airsReview.reasonTooLong:{"max":500}');

    await type(r, 'airs-review-r1-reason', 'No invoice attached');
    await press(r, 'airs-review-r1-confirm-reject');
    expect(client.reject).toHaveBeenCalledWith('r1', 'No invoice attached');
    expect(mockToasts[0]).toMatchObject({ title: 'airsReview.toasts.rejectedTitle' });
    expect(byId(r, 'airs-review-r1')).toHaveLength(0);
  });

  it('cancelling a rejection brings back the decision buttons', async () => {
    const r = await render(reviewClient());
    await press(r, 'airs-review-r1-reject');
    await press(r, 'airs-review-r1-confirm-reject');
    await press(r, 'airs-review-r1-cancel-reject');
    expect(byId(r, 'airs-review-r1-reason')).toHaveLength(0);
    expect(byId(r, 'airs-review-r1-reason-error')).toHaveLength(0);
    expect(byId(r, 'airs-review-r1-approve').length).toBeGreaterThan(0);
  });

  it('explains a refused decision and keeps the report', async () => {
    const client = reviewClient({
      approve: jest.fn(async () => {
        throw new ManageRequestError(403, 'AIRS_REPORT_SELF_APPROVAL_DENIED');
      }),
    });
    const r = await render(client);
    await press(r, 'airs-review-r1-approve');
    expect(mockToasts[0]).toMatchObject({ type: 'error', title: 'airsReview.errors.self' });
    expect(byId(r, 'airs-review-r1').length).toBeGreaterThan(0);
  });

  it('reloads the queue when the report changed or was already decided', async () => {
    const client = reviewClient({
      reject: jest.fn(async () => {
        throw new ManageRequestError(409, 'AIRS_REPORT_TRANSITION_INVALID');
      }),
    });
    const r = await render(client);
    await press(r, 'airs-review-r1-reject');
    await type(r, 'airs-review-r1-reason', 'Duplicated');
    await press(r, 'airs-review-r1-confirm-reject');
    expect(mockToasts[0]).toMatchObject({ type: 'error', title: 'airsReview.errors.changed' });
    expect(client.list).toHaveBeenCalledTimes(2);
  });

  it('shows the supporting file in the private viewer', async () => {
    const client = reviewClient();
    const r = await render(client);
    await press(r, 'airs-review-r1-proof');
    expect(client.proofFile).toHaveBeenCalledWith('r1');
    const frame = r.root.findAll(
      (n) => n.type === 'iframe' || n.props.testID === 'manage-client-proof-viewer'
    );
    expect(frame.length).toBeGreaterThan(0);
    await press(r, 'manage-client-proof-close');
    expect(byId(r, 'manage-client-proof-viewer')).toHaveLength(0);
  });

  it('says when the supporting file cannot be read', async () => {
    const r = await render(
      reviewClient({
        proofFile: jest.fn(async () => {
          throw new ManageRequestError(404);
        }),
      })
    );
    await press(r, 'airs-review-r1-proof');
    expect(texts(r)).toContain('manage.clients.proof.error');
  });

  it('goes back from the header', async () => {
    const onBack = jest.fn();
    const r = await render(reviewClient(), { onBack });
    await press(r, 'airs-review-back');
    expect(onBack).toHaveBeenCalled();
  });
});

describe('decisionErrorKey', () => {
  it('maps the refusal codes to messages', () => {
    expect(decisionErrorKey(new ManageRequestError(409, 'AIRS_REPORT_SNAPSHOT_MISMATCH'))).toBe(
      'airsReview.errors.changed'
    );
    expect(decisionErrorKey(new ManageRequestError(500))).toBe('airsReview.errors.generic');
    expect(decisionErrorKey(new Error('offline'))).toBe('airsReview.errors.generic');
  });
});
