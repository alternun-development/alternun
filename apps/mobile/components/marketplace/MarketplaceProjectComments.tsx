import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MessageCircle, RotateCcw } from 'lucide-react-native';
import type { Translator } from '@alternun/i18n';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import type { DetailPalette } from './MarketplaceProjectDetail';

type Translate = Translator['t'];

export interface PublicProjectComment {
  displayName: string;
  body: string;
  createdAt: string;
}

interface CommentsPage {
  data: PublicProjectComment[];
  page: number;
  perPage: number;
  total: number;
}

export class MarketplaceCommentRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(`Marketplace comments request failed with ${status}.`);
  }
}

function isComment(value: unknown): value is PublicProjectComment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const comment = value as Partial<PublicProjectComment>;
  return (
    typeof comment.displayName === 'string' &&
    typeof comment.body === 'string' &&
    typeof comment.createdAt === 'string'
  );
}

async function responseError(response: Response): Promise<MarketplaceCommentRequestError> {
  let code: string | undefined;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && typeof (body as { code?: unknown }).code === 'string') {
      code = (body as { code: string }).code;
    }
  } catch {
    // Status remains enough to present a safe localized error.
  }
  return new MarketplaceCommentRequestError(response.status, code);
}

export async function loadProjectComments(
  slug: string,
  page: number,
  perPage: number,
  signal?: AbortSignal
): Promise<CommentsPage> {
  const response = await fetch(
    `${resolveMobileApiBaseUrl()}/v1/projects/${encodeURIComponent(
      slug
    )}/comments?page=${page}&perPage=${perPage}`,
    { signal }
  );
  if (!response.ok) throw await responseError(response);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new MarketplaceCommentRequestError(502);
  }
  const pageData = payload as Partial<CommentsPage>;
  if (
    !Array.isArray(pageData.data) ||
    !pageData.data.every(isComment) ||
    typeof pageData.page !== 'number' ||
    typeof pageData.perPage !== 'number' ||
    typeof pageData.total !== 'number'
  ) {
    throw new MarketplaceCommentRequestError(502);
  }
  return pageData as CommentsPage;
}

export async function submitProjectComment(
  slug: string,
  body: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${resolveMobileApiBaseUrl()}/v1/projects/${encodeURIComponent(slug)}/comments`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }
  );
  if (!response.ok) throw await responseError(response);
}

function errorKey(error: unknown): string {
  if (error instanceof MarketplaceCommentRequestError) {
    if (error.status === 429 || error.code === 'COMMENT_RATE_LIMITED') return 'rateLimited';
    if (error.status === 401 || error.code === 'USER_AUTH_REQUIRED') return 'signInRequired';
    if (error.status === 404 || error.code === 'PROJECT_NOT_FOUND') return 'projectUnavailable';
  }
  return 'submitError';
}

export default function MarketplaceProjectComments({
  slug,
  locale,
  palette,
  t,
  signedIn,
  getSessionToken,
  onSignIn,
  loader = loadProjectComments,
  submitter = submitProjectComment,
}: {
  slug: string;
  locale: string;
  palette: DetailPalette;
  t: Translate;
  signedIn: boolean;
  getSessionToken: () => Promise<string | null>;
  onSignIn: () => void;
  loader?: typeof loadProjectComments;
  submitter?: typeof submitProjectComment;
}): React.JSX.Element {
  const perPage = 10;
  const [comments, setComments] = useState<PublicProjectComment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; key: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setComments([]);
    setPage(1);
    void loader(slug, 1, perPage, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setComments(result.data);
        setPage(result.page);
        setTotal(result.total);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, [loader, requestVersion, slug]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || comments.length >= total) return;
    setLoadingMore(true);
    try {
      const result = await loader(slug, page + 1, perPage);
      setComments((current) => [...current, ...result.data]);
      setPage(result.page);
      setTotal(result.total);
    } catch {
      setFeedback({ kind: 'error', key: 'loadMoreError' });
    } finally {
      setLoadingMore(false);
    }
  }, [comments.length, loader, loadingMore, page, slug, total]);

  const publish = useCallback(async (): Promise<void> => {
    const cleanBody = body.trim();
    if (!cleanBody) {
      setFeedback({ kind: 'error', key: 'emptyBody' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const token = await getSessionToken();
      if (!token) throw new MarketplaceCommentRequestError(401, 'USER_AUTH_REQUIRED');
      await submitter(slug, cleanBody, token);
      setBody('');
      setFeedback({ kind: 'success', key: 'submitted' });
    } catch (error) {
      setFeedback({ kind: 'error', key: errorKey(error) });
    } finally {
      setSubmitting(false);
    }
  }, [body, getSessionToken, slug, submitter]);

  return (
    <View testID='project-comments' style={styles.section}>
      <View style={styles.headingRow}>
        <MessageCircle size={21} color={palette.primary} />
        <Text style={[styles.title, { color: palette.text }]}>
          {t('explorer.detail.comments.title')}
        </Text>
      </View>

      {state === 'loading' ? (
        <View
          testID='project-comments-loading'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.muted }}>{t('explorer.detail.comments.loading')}</Text>
        </View>
      ) : state === 'error' ? (
        <View
          testID='project-comments-error'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.text }}>{t('explorer.detail.comments.loadError')}</Text>
          <Pressable
            testID='project-comments-retry'
            onPress={() => setRequestVersion((value) => value + 1)}
            style={[styles.smallButton, { backgroundColor: palette.primaryDeep }]}
          >
            <RotateCcw size={15} color='#effff7' />
            <Text style={styles.buttonText}>{t('explorer.detail.comments.retry')}</Text>
          </Pressable>
        </View>
      ) : comments.length ? (
        <View testID='project-comments-list' style={styles.list}>
          {comments.map((comment, index) => (
            <View
              key={`${comment.createdAt}-${index}`}
              style={[
                styles.commentCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={styles.commentMeta}>
                <Text style={[styles.author, { color: palette.text }]}>{comment.displayName}</Text>
                <Text style={[styles.date, { color: palette.muted }]}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                    new Date(comment.createdAt)
                  )}
                </Text>
              </View>
              <Text style={[styles.commentBody, { color: palette.text }]}>{comment.body}</Text>
            </View>
          ))}
          {comments.length < total ? (
            <Pressable
              testID='project-comments-load-more'
              disabled={loadingMore}
              onPress={() => void loadMore()}
              style={[styles.outlineButton, { borderColor: palette.primary }]}
            >
              <Text style={[styles.outlineButtonText, { color: palette.primaryDeep }]}>
                {loadingMore
                  ? t('explorer.detail.comments.loadingMore')
                  : t('explorer.detail.comments.loadMore')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          testID='project-comments-empty'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {t('explorer.detail.comments.emptyList')}
          </Text>
          <Text style={[styles.emptyBody, { color: palette.muted }]}>
            {t('explorer.detail.comments.emptyInvite')}
          </Text>
        </View>
      )}

      {signedIn ? (
        <View style={styles.composer}>
          <TextInput
            testID='project-comment-input'
            value={body}
            onChangeText={(value) => {
              setBody(value);
              setFeedback(null);
            }}
            multiline
            maxLength={1000}
            placeholder={t('explorer.detail.comments.placeholder')}
            placeholderTextColor={palette.muted}
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}
          />
          <Text style={[styles.counter, { color: palette.muted }]}>{body.length}/1000</Text>
          <Pressable
            testID='project-comment-submit'
            disabled={submitting}
            onPress={() => void publish()}
            style={[
              styles.publishButton,
              { backgroundColor: palette.primaryDeep },
              submitting && styles.disabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {submitting
                ? t('explorer.detail.comments.publishing')
                : t('explorer.detail.comments.publish')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          testID='project-comments-sign-in'
          style={[
            styles.signInCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.emptyBody, { color: palette.text }]}>
            {t('explorer.detail.comments.signInPrompt')}
          </Text>
          <Pressable
            testID='project-comments-sign-in-button'
            onPress={onSignIn}
            style={[styles.smallButton, { backgroundColor: palette.primaryDeep }]}
          >
            <Text style={styles.buttonText}>{t('explorer.detail.comments.signIn')}</Text>
          </Pressable>
        </View>
      )}

      {feedback ? (
        <Text
          testID={`project-comment-feedback-${feedback.key}`}
          accessibilityRole='alert'
          style={{ color: feedback.kind === 'success' ? palette.primary : '#b42318' }}
        >
          {t(`explorer.detail.comments.${feedback.key}`)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, marginTop: 8 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 22 },
  stateCard: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', gap: 10 },
  list: { gap: 10 },
  commentCard: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 9 },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  author: { fontSize: 14, fontWeight: '900', flex: 1 },
  date: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 21 },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  composer: { gap: 8 },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 11, textAlign: 'right' },
  publishButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  smallButton: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  outlineButton: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: { fontWeight: '900' },
  buttonText: { color: '#effff7', fontWeight: '900' },
  signInCard: { borderWidth: 1, borderRadius: 16, padding: 17, alignItems: 'center', gap: 12 },
  disabled: { opacity: 0.6 },
});
