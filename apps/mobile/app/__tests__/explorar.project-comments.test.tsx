/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MarketplaceProjectComments, {
  MarketplaceCommentRequestError,
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
});
