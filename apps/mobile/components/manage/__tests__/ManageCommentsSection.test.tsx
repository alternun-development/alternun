/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ManageCommentsSection } from '../ManageCommentsSection';
import type { ManageClient, ManagedComment } from '../../../utils/projectManage';

jest.mock('@alternun/ui', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
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
const t = ((key: string, params?: { reason?: string }) =>
  params?.reason ? `${key}:${params.reason}` : key) as never;

function client(comments: ManagedComment[]): ManageClient {
  return {
    listComments: jest.fn(async () => comments),
    moderateComment: jest.fn(async () => undefined),
  } as unknown as ManageClient;
}

const comment = (id: string, status: ManagedComment['status'], reason?: string) => ({
  id,
  authorDisplayName: 'Ana',
  body: `Body ${id}`,
  status,
  createdAt: '',
  moderationReason: reason ?? null,
});

async function render(c: ManageClient): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <ManageCommentsSection
        client={c}
        palette={palette}
        t={t}
        overview={{} as never}
        onChanged={jest.fn()}
      />
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}

const byId = (r: ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id);
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];
const text = (r: ReactTestRenderer, id: string) => byId(r, id)[0]?.props.children;

async function press(r: ReactTestRenderer, id: string): Promise<void> {
  await act(async () => {
    byId(r, id)[0].props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ManageCommentsSection', () => {
  it('keeps a reason per comment and sends only that comment reason', async () => {
    const c = client([comment('c1', 'pending'), comment('c2', 'pending')]);
    const r = await render(c);
    await act(async () => input(r, 'manage-comment-c1-reason').props.onChangeText('Spam'));
    expect(input(r, 'manage-comment-c2-reason').props.value).toBe('');

    await press(r, 'manage-comment-c2-reject');
    expect(c.moderateComment).not.toHaveBeenCalled();
    expect(text(r, 'manage-comment-c2-error')).toBe('manage.comments.reasonRequired');
    expect(byId(r, 'manage-comment-c1-error')).toHaveLength(0);

    await press(r, 'manage-comment-c1-reject');
    expect(c.moderateComment).toHaveBeenCalledWith('c1', 'reject', 'Spam');
  });

  it('shows the missing-reason error after the action buttons, not above them', async () => {
    const c = client([comment('c1', 'visible')]);
    const r = await render(c);
    await press(r, 'manage-comment-c1-hide');
    const card = byId(r, 'manage-comment-c1')[0];
    const ids = card.findAll((n) => typeof n.props.testID === 'string').map((n) => n.props.testID);
    expect(ids.lastIndexOf('manage-comment-c1-error')).toBeGreaterThan(
      ids.lastIndexOf('manage-comment-c1-hide')
    );
    // Typing a reason clears the error.
    await act(async () => input(r, 'manage-comment-c1-reason').props.onChangeText('Off-topic'));
    expect(byId(r, 'manage-comment-c1-error')).toHaveLength(0);
  });

  it('shows the moderation reason on hidden and rejected comments without a reason field', async () => {
    const c = client([comment('c1', 'hidden', 'Off-topic'), comment('c2', 'rejected', 'Spam')]);
    const r = await render(c);
    expect(text(r, 'manage-comment-c1-moderation-reason')).toBe(
      'manage.comments.moderationReason:Off-topic'
    );
    expect(text(r, 'manage-comment-c2-moderation-reason')).toBe(
      'manage.comments.moderationReason:Spam'
    );
    expect(byId(r, 'manage-comment-c1-reason')).toHaveLength(0);
    await press(r, 'manage-comment-c1-restore');
    expect(c.moderateComment).toHaveBeenCalledWith('c1', 'restore', undefined);
  });
});
