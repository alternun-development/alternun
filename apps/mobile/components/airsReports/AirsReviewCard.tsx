import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ManageField } from '../manage/ManageField';
import { manageStyles } from '../manage/styles';
import { formatClientDate } from '../../utils/projectClients';
import { REJECT_REASON_MAX, rejectReasonProblem } from '../../utils/airsReports';
import type { AirsReviewCardProps, AirsReviewDetailState } from './types';

/** One report in review: what was assigned, to whom, the recipient totals and the decision. */
export function AirsReviewCard({
  item,
  client,
  palette,
  t,
  focused,
  busy,
  onApprove,
  onReject,
  onViewProof,
}: AirsReviewCardProps): React.JSX.Element {
  const [detail, setDetail] = useState<AirsReviewDetailState>({ status: 'loading' });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const loadDetail = useCallback(() => {
    setDetail({ status: 'loading' });
    client
      .detail(item.id)
      .then((data) => setDetail({ status: 'ready', data }))
      .catch(() => setDetail({ status: 'error' }));
  }, [client, item.id]);

  useEffect(loadDetail, [loadDetail]);

  const reject = async (): Promise<void> => {
    const problem = rejectReasonProblem(reason);
    if (problem) {
      setReasonError(
        problem === 'required'
          ? t('airsReview.reasonRequired')
          : t('airsReview.reasonTooLong', { max: REJECT_REASON_MAX })
      );
      return;
    }
    if (await onReject(item, reason)) {
      setRejecting(false);
      setReason('');
    }
  };

  const totals = detail.status === 'ready' ? detail.data.recipientTotals : null;
  const id = `airs-review-${item.id}`;

  return (
    <View
      testID={id}
      accessibilityState={{ selected: focused }}
      style={[
        manageStyles.card,
        {
          borderColor: focused ? palette.primary : palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.amount, { color: palette.text }]}>
          {t('airsReview.amount', { count: item.amount })}
        </Text>
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('airsReview.submittedOn', { date: formatClientDate(item.submittedAt) })}
        </Text>
      </View>

      <Text style={{ color: palette.text }}>
        <Text style={styles.strong}>{t('airsReview.recipient')}: </Text>
        {item.recipientName
          ? `${item.recipientName} (${item.recipientEmail})`
          : item.recipientEmail}
      </Text>
      {item.projectTitle ? (
        <Text style={{ color: palette.text }}>
          <Text style={styles.strong}>{t('airsReview.project')}: </Text>
          {item.projectTitle}
        </Text>
      ) : null}
      <Text style={{ color: palette.text }}>
        <Text style={styles.strong}>{t('airsReview.concept')}: </Text>
        {item.concept}
      </Text>
      <Text style={{ color: palette.text }}>
        <Text style={styles.strong}>{t('airsReview.document')}: </Text>
        {item.documentNumber ?? t('airsReview.noDocument')}
      </Text>
      {item.hasProof ? (
        <Pressable
          testID={`${id}-proof`}
          accessibilityRole='button'
          onPress={() => onViewProof(item)}
          style={[manageStyles.secondaryButton, styles.proof, { borderColor: palette.border }]}
        >
          <Text style={[manageStyles.secondaryButtonText, { color: palette.primaryDeep }]}>
            {t('airsReview.viewProof')}
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.totals, { borderColor: palette.border }]}>
        <Text style={[manageStyles.label, { color: palette.muted }]}>
          {t('airsReview.totalsTitle')}
        </Text>
        {detail.status === 'loading' ? <ActivityIndicator color={palette.primary} /> : null}
        {detail.status === 'error' ? (
          <View style={manageStyles.row}>
            <Text style={manageStyles.error}>{t('airsReview.totalsError')}</Text>
            <Pressable
              testID={`${id}-totals-retry`}
              accessibilityRole='button'
              onPress={loadDetail}
              style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('airsReview.retry')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {totals ? (
          <>
            <Text testID={`${id}-day`} style={{ color: palette.text }}>
              {t('airsReview.totalDay', { total: totals.dailyTotal, limit: totals.dailyLimit })}
            </Text>
            <Text testID={`${id}-month`} style={{ color: palette.text }}>
              {t('airsReview.totalMonth', {
                total: totals.monthlyTotal,
                limit: totals.monthlyLimit,
              })}
            </Text>
          </>
        ) : null}
      </View>

      {rejecting ? (
        <ManageField
          testID={`${id}-reason`}
          label={t('airsReview.rejectReason')}
          value={reason}
          multiline
          onChange={(value) => {
            setReason(value);
            if (reasonError) setReasonError(null);
          }}
          palette={palette}
        />
      ) : null}

      <View style={manageStyles.row}>
        {rejecting ? (
          <>
            <Pressable
              testID={`${id}-confirm-reject`}
              accessibilityRole='button'
              disabled={busy}
              onPress={() => void reject()}
              style={[manageStyles.primaryButton, { backgroundColor: palette.fill }]}
            >
              <Text style={manageStyles.primaryButtonText}>{t('airsReview.confirmReject')}</Text>
            </Pressable>
            <Pressable
              testID={`${id}-cancel-reject`}
              accessibilityRole='button'
              disabled={busy}
              onPress={() => {
                setRejecting(false);
                setReasonError(null);
              }}
              style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('airsReview.cancel')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              testID={`${id}-approve`}
              accessibilityRole='button'
              // The hash approved is the one just reviewed; a changed report is refused.
              disabled={busy || detail.status !== 'ready'}
              onPress={() => {
                if (detail.status === 'ready')
                  void onApprove(item, detail.data.report.snapshotHash);
              }}
              style={[
                manageStyles.primaryButton,
                { backgroundColor: palette.fill },
                (busy || detail.status !== 'ready') && styles.disabled,
              ]}
            >
              <Text style={manageStyles.primaryButtonText}>{t('airsReview.approve')}</Text>
            </Pressable>
            <Pressable
              testID={`${id}-reject`}
              accessibilityRole='button'
              disabled={busy}
              onPress={() => setRejecting(true)}
              style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('airsReview.reject')}
              </Text>
            </Pressable>
          </>
        )}
      </View>
      {/* Below the buttons so showing it never moves them. */}
      {reasonError ? (
        <Text testID={`${id}-reason-error`} style={manageStyles.error}>
          {reasonError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { gap: 2 },
  amount: { fontFamily: 'Sculpin-Bold', fontSize: 22 },
  strong: { fontWeight: '800' },
  proof: { alignSelf: 'flex-start' },
  totals: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  disabled: { opacity: 0.5 },
});
