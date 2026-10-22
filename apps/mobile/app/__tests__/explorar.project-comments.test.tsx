/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MarketplaceProjectComments, {
  MarketplaceCommentRequestError,
  loadProjectComments,
  submitProjectComment,
} from '../../components/marketplace/MarketplaceProjectComments';

const palette = {
  background: '#fff',
  surface: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#087f63',
  primaryDeep: '#075440',
  mist: '#eee',
};
const t = ((key: string): string => key) as never;
const comment = {
  displayName: 'Visitor',
  body: 'A thoughtful visit.',
  createdAt: '2026-10-15T12:00:00.000Z',
};
const secondComment = {
  displayName: 'Second visitor',
  body: 'Another useful perspective.',
  createdAt: '2026-10-16T12:00:00.000Z',
};

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function findText(renderer: ReactTestRenderer, value: string) {
  return renderer.root.find((node) => {
    const children = node.props.children as unknown;
    return Array.isArray(children) && children.join('') === value;
  });
}

async function renderComments(
  overrides: Partial<React.ComponentProps<typeof MarketplaceProjectComments>> = {}
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceProjectComments
        slug='forest-hotel'
        locale='en'
        palette={palette}
        t={t}
        signedIn
        getSessionToken={() => Promise.resolve('token')}
        onSignIn={() => undefined}
        loader={() => Promise.resolve({ data: [comment], page: 1, perPage: 10, total: 1 })}
        submitter={() => Promise.resolve()}
        {...overrides}
      />
    );
    await Promise.resolve();
  });
  return renderer!;
}

describe('Marketplace project comments', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads and submits comments through the API helpers', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [comment], page: 1, perPage: 10, total: 1 }),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    await expect(loadProjectComments('forest hotel', 1, 10)).resolves.toEqual({
      data: [comment],
      page: 1,
      perPage: 10,
      total: 1,
    });
    await expect(submitProjectComment('forest hotel', 'Hello', 'session-token')).resolves.toBe(
      undefined
    );

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/projects/forest%20hotel/comments?page=1');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: 'Hello' }),
    });
  });

  it('renders the visible comment list', async () => {
    const renderer = await renderComments();
    expect(renderer.root.findByProps({ testID: 'project-comments-list' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'A thoughtful visit.' })).toBeTruthy();
  });

  it('renders an invitation for an empty list', async () => {
    const renderer = await renderComments({
      loader: () => Promise.resolve({ data: [], page: 1, perPage: 10, total: 0 }),
    });
    expect(renderer.root.findByProps({ testID: 'project-comments-empty' })).toBeTruthy();
  });

  it('loads additional comment pages', async () => {
    const loader = jest
      .fn()
      .mockResolvedValueOnce({ data: [comment], page: 1, perPage: 10, total: 2 })
      .mockResolvedValueOnce({ data: [secondComment], page: 2, perPage: 10, total: 2 });
    const renderer = await renderComments({ loader });

    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comments-load-more' }).props.onPress();
      await flushPromises();
    });

    expect(loader).toHaveBeenNthCalledWith(2, 'forest-hotel', 2, 10);
    expect(renderer.root.findByProps({ children: 'Another useful perspective.' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'project-comments-load-more' })).toHaveLength(0);
  });

  it('shows a load-more error without discarding existing comments', async () => {
    const loader = jest
      .fn()
      .mockResolvedValueOnce({ data: [comment], page: 1, perPage: 10, total: 2 })
      .mockRejectedValueOnce(new Error('offline'));
    const renderer = await renderComments({ loader });

    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comments-load-more' }).props.onPress();
      await flushPromises();
    });

    expect(
      renderer.root.findByProps({ testID: 'project-comment-feedback-loadMoreError' })
    ).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'A thoughtful visit.' })).toBeTruthy();
  });

  it('retries after the initial comment list fails', async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: [comment], page: 1, perPage: 10, total: 1 });
    const renderer = await renderComments({ loader });

    expect(renderer.root.findByProps({ testID: 'project-comments-error' })).toBeTruthy();
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comments-retry' }).props.onPress();
      await flushPromises();
    });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ testID: 'project-comments-list' })).toBeTruthy();
  });

  it('submits a comment and confirms moderation', async () => {
    const calls: Array<{ slug: string; body: string; token: string }> = [];
    const renderer = await renderComments({
      submitter: (slug, body, token) => {
        calls.push({ slug, body, token });
        return Promise.resolve();
      },
    });
    await act(() => {
      renderer.root
        .findByProps({ testID: 'project-comment-input' })
        .props.onChangeText(' New comment ');
    });
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comment-submit' }).props.onPress();
      await Promise.resolve();
    });
    expect(calls).toEqual([{ slug: 'forest-hotel', body: 'New comment', token: 'token' }]);
    expect(
      renderer.root.findByProps({ testID: 'project-comment-feedback-submitted' })
    ).toBeTruthy();
  });

  it('offers sign in instead of the composer without a session', async () => {
    const renderer = await renderComments({ signedIn: false });
    expect(renderer.root.findByProps({ testID: 'project-comments-sign-in' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'project-comment-input' })).toHaveLength(0);
  });

  it('shows the sign-in error when the session expires before submission', async () => {
    const submitter = jest.fn(() => Promise.resolve());
    const renderer = await renderComments({
      getSessionToken: () => Promise.resolve(null),
      submitter,
    });
    await act(() => {
      renderer.root.findByProps({ testID: 'project-comment-input' }).props.onChangeText('Hello');
    });
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comment-submit' }).props.onPress();
      await flushPromises();
    });

    expect(submitter).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ testID: 'project-comment-feedback-signInRequired' })
    ).toBeTruthy();
  });

  it('translates the API rate limit', async () => {
    const renderer = await renderComments({
      submitter: () =>
        Promise.reject(new MarketplaceCommentRequestError(429, 'COMMENT_RATE_LIMITED')),
    });
    await act(() => {
      renderer.root.findByProps({ testID: 'project-comment-input' }).props.onChangeText('Hello');
    });
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-comment-submit' }).props.onPress();
      await Promise.resolve();
    });
    expect(
      renderer.root.findByProps({ testID: 'project-comment-feedback-rateLimited' })
    ).toBeTruthy();
  });

  it('counts characters and disables invalid comment bodies', async () => {
    const renderer = await renderComments();
    const input = renderer.root.findByProps({ testID: 'project-comment-input' });

    expect(findText(renderer, '0/1000')).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-comment-submit' }).props.disabled).toBe(
      true
    );

    await act(() => input.props.onChangeText('Valid comment'));
    expect(findText(renderer, '13/1000')).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-comment-submit' }).props.disabled).toBe(
      false
    );

    await act(() => input.props.onChangeText('x'.repeat(1001)));
    expect(findText(renderer, '1001/1000')).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-comment-submit' }).props.disabled).toBe(
      true
    );
  });
});
