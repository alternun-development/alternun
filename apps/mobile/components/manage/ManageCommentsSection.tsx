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

export function ManageCommentsSection({
  client,
  palette,
  t,
}: ManageSectionProps): React.JSX.Element {
  const [status, setStatus] = useState<CommentStatus>('pending');
  const [comments, setComments] = useState<ManagedComment[] | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setComments(null);
    void client
      .listComments(status)
      .then(setComments)
      .catch(() => setError(t('manage.error')));
  }, [client, status, t]);

  useEffect(load, [load]);

  async function moderate(comment: ManagedComment, action: CommentAction): Promise<void> {
    if ((action === 'reject' || action === 'hide') && !reason.trim()) {
      setError(t('manage.comments.reasonPrompt'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client.moderateComment(comment.id, action, reason.trim() || undefined);
      setReason('');
      load();
    } catch {
      setError(t('manage.error'));
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
      <ManageField
        label={t('manage.comments.reasonPrompt')}
        value={reason}
        onChange={setReason}
        palette={palette}
      />
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      {comments?.length === 0 ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.comments.empty')}
        </Text>
      ) : null}
      {(comments ?? []).map((comment) => (
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
          <View style={manageStyles.row}>
            {commentActions(comment.status).map((action) => (
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
        </View>
      ))}
    </View>
  );
}
