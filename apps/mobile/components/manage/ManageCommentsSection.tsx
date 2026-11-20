import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { ManageSectionProps } from './types';
import type { CommentAction, CommentStatus, ManagedComment } from '../../utils/projectManage';

const STATUSES: readonly CommentStatus[] = ['pending', 'visible', 'hidden', 'rejected'];

/** Actions that make sense from each status. */
export function commentActions(status: CommentStatus): CommentAction[] {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'visible') return ['hide'];
  return ['restore'];
}

/** Reject and hide need a written reason. */
function needsReason(action: CommentAction): boolean {
  return action === 'reject' || action === 'hide';
}

export function ManageCommentsSection({
  client,
  palette,
  t,
}: ManageSectionProps): React.JSX.Element {
  const [status, setStatus] = useState<CommentStatus>('pending');
  const [comments, setComments] = useState<ManagedComment[] | null>(null);
  // Reason and error are kept per comment so one comment never uses text typed for another.
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCommentError(commentId: string, message: string | null): void {
    setCommentErrors((current) => {
      const next = { ...current };
      if (message) next[commentId] = message;
      else delete next[commentId];
      return next;
    });
  }

  const load = useCallback(() => {
    setComments(null);
    setError(null);
    void client
      .listComments(status)
      .then(setComments)
      .catch(() => setError(t('manage.error')));
  }, [client, status, t]);

  useEffect(load, [load]);

  async function moderate(comment: ManagedComment, action: CommentAction): Promise<void> {
    const reason = (reasons[comment.id] ?? '').trim();
    if (needsReason(action) && !reason) {
      setCommentError(comment.id, t('manage.comments.reasonRequired'));
      return;
    }
    setBusy(true);
    setCommentError(comment.id, null);
    try {
      await client.moderateComment(comment.id, action, needsReason(action) ? reason : undefined);
      setReasons((current) => ({ ...current, [comment.id]: '' }));
      load();
    } catch {
      setCommentError(comment.id, t('manage.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View testID='manage-comments' style={{ gap: 14 }}>
      <View style={manageStyles.row}>
        {STATUSES.map((item) => {
          const selected = item === status;
          return (
            <Pressable
              key={item}
              testID={`manage-comments-status-${item}`}
              accessibilityRole='tab'
              accessibilityState={{ selected }}
              onPress={() => setStatus(item)}
              style={[
                manageStyles.secondaryButton,
                { borderColor: selected ? palette.primary : palette.border },
                selected && { backgroundColor: palette.mist },
              ]}
            >
              <Text
                style={[
                  manageStyles.secondaryButtonText,
                  { color: selected ? palette.primaryDeep : palette.text },
                ]}
              >
                {t(`manage.comments.status.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      {comments?.length === 0 ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.comments.empty')}
        </Text>
      ) : null}
      {(comments ?? []).map((comment) => {
        const actions = commentActions(comment.status);
        const commentError = commentErrors[comment.id];
        return (
          <View
            key={comment.id}
            testID={`manage-comment-${comment.id}`}
            style={[
              manageStyles.card,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <Text style={{ color: palette.text, fontWeight: '800' }}>
              {comment.authorDisplayName}
            </Text>
            <Text style={{ color: palette.text }}>{comment.body}</Text>
            {(comment.status === 'hidden' || comment.status === 'rejected') &&
            comment.moderationReason ? (
              <Text
                testID={`manage-comment-${comment.id}-moderation-reason`}
                style={[manageStyles.muted, { color: palette.muted }]}
              >
                {t('manage.comments.moderationReason', { reason: comment.moderationReason })}
              </Text>
            ) : null}
            {actions.some(needsReason) ? (
              <ManageField
                testID={`manage-comment-${comment.id}-reason`}
                label={t('manage.comments.reasonPrompt')}
                value={reasons[comment.id] ?? ''}
                onChange={(value) => {
                  setReasons((current) => ({ ...current, [comment.id]: value }));
                  if (commentError) setCommentError(comment.id, null);
                }}
                palette={palette}
              />
            ) : null}
            <View style={manageStyles.row}>
              {actions.map((action) => (
                <Pressable
                  key={action}
                  testID={`manage-comment-${comment.id}-${action}`}
                  accessibilityRole='button'
                  disabled={busy}
                  onPress={() => void moderate(comment, action)}
                  style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
                >
                  <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                    {t(`manage.comments.${action}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Below the buttons so showing it never moves them. */}
            {commentError ? (
              <Text testID={`manage-comment-${comment.id}-error`} style={manageStyles.error}>
                {commentError}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
