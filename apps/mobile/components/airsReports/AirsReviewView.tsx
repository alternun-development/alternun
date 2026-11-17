import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ToastSystem } from '@alternun/ui';
import { HEADER_BUTTON_SIZE, PageHeader } from '../common/PageHeader';
import { useToasts } from '../common/useToasts';
import { defaultLocalUrl, releaseLocalUrl } from '../manage/ManageClientsSection';
import { ProofViewer } from '../manage/ProofViewer';
import { manageStyles } from '../manage/styles';
import type { ProofViewerState } from '../manage/types';
import { AirsReviewCard } from './AirsReviewCard';
import type { AirsReviewState, AirsReviewViewProps } from './types';
import { focusFirst, type AirsReviewItem } from '../../utils/airsReports';
import { ManageRequestError } from '../../utils/projectManage';

/** i18n key of the message for a decision the server refused. */
export function decisionErrorKey(error: unknown): string {
  const code = error instanceof ManageRequestError ? error.code : undefined;
  if (code === 'AIRS_REPORT_SELF_APPROVAL_DENIED') return 'airsReview.errors.self';
  if (code === 'AIRS_REPORT_SNAPSHOT_MISMATCH' || code === 'AIRS_REPORT_TRANSITION_INVALID')
    return 'airsReview.errors.changed';
  return 'airsReview.errors.generic';
}

/** In-app review of Airs in review, for approvers. */
export function AirsReviewView({
  client,
  palette,
  t,
  onBack,
  focusId,
  toLocalUrl = defaultLocalUrl,
}: AirsReviewViewProps): React.JSX.Element {
  const toasts = useToasts();
  const [state, setState] = useState<AirsReviewState>('loading');
  const [items, setItems] = useState<AirsReviewItem[]>([]);
  const [busy, setBusy] = useState(false);
  // The supporting file being shown; its local URL is released when the viewer closes.
  const [viewer, setViewer] = useState<ProofViewerState | null>(null);
  const viewerUri = useRef<string | undefined>(undefined);
  useEffect(() => () => releaseLocalUrl(viewerUri.current), []);

  const load = useCallback(() => {
    setState('loading');
    client
      .list()
      .then((next) => {
        setItems(next);
        setState('ready');
      })
      .catch((error: unknown) =>
        setState(
          error instanceof ManageRequestError && [401, 403].includes(error.status)
            ? 'denied'
            : 'error'
        )
      );
  }, [client]);

  useEffect(load, [load]);

  const decide = async (
    item: AirsReviewItem,
    send: () => Promise<void>,
    toast: 'approved' | 'rejected'
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await send();
      toasts.show({
        type: 'success',
        title: t(`airsReview.toasts.${toast}Title`),
        message: t('airsReview.toasts.body', { count: item.amount, email: item.recipientEmail }),
      });
      // Decided reports leave the queue.
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      return true;
    } catch (error) {
      const key = decisionErrorKey(error);
      toasts.show({ type: 'error', title: t(key) });
      if (key === 'airsReview.errors.changed') load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const showProof = (item: AirsReviewItem): void => {
    setViewer({ status: 'loading' });
    client
      .proofFile(item.id)
      .then(async (file) => {
        const uri = await toLocalUrl(file);
        releaseLocalUrl(viewerUri.current);
        viewerUri.current = uri;
        setViewer({ status: 'ready', uri, type: file.type });
      })
      .catch(() => setViewer({ status: 'error' }));
  };

  const closeViewer = (): void => {
    releaseLocalUrl(viewerUri.current);
    viewerUri.current = undefined;
    setViewer(null);
  };

  const focusMissing = state === 'ready' && !!focusId && !items.some((item) => item.id === focusId);

  return (
    <View style={styles.root}>
      <ScrollView
        testID='airs-review'
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={styles.content}
      >
        <PageHeader
          testID='airs-review-heading'
          title={t('airsReview.title')}
          subtitle={t('airsReview.subtitle')}
          palette={palette}
          leading={
            <Pressable
              testID='airs-review-back'
              accessibilityRole='button'
              accessibilityLabel={t('airsReview.back')}
              onPress={onBack}
              style={[
                styles.back,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <ArrowLeft size={18} color={palette.primaryDeep} />
            </Pressable>
          }
        />

        {state === 'loading' ? (
          <Text style={[manageStyles.muted, { color: palette.muted }]}>
            {t('airsReview.loading')}
          </Text>
        ) : null}
        {state === 'denied' ? (
          <Text testID='airs-review-denied' style={[manageStyles.muted, { color: palette.text }]}>
            {t('airsReview.denied')}
          </Text>
        ) : null}
        {state === 'error' ? (
          <View style={styles.block}>
            <Text style={manageStyles.error}>{t('airsReview.error')}</Text>
            <Pressable
              testID='airs-review-retry'
              accessibilityRole='button'
              onPress={load}
              style={[manageStyles.primaryButton, styles.retry, { backgroundColor: palette.fill }]}
            >
              <RotateCcw size={16} color='#effff7' />
              <Text style={manageStyles.primaryButtonText}>{t('airsReview.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {focusMissing ? (
          <Text
            testID='airs-review-focus-missing'
            style={[manageStyles.muted, { color: palette.muted }]}
          >
            {t('airsReview.focusMissing')}
          </Text>
        ) : null}
        {state === 'ready' && items.length === 0 ? (
          <Text testID='airs-review-empty' style={[manageStyles.muted, { color: palette.muted }]}>
            {t('airsReview.empty')}
          </Text>
        ) : null}
        {state === 'ready'
          ? focusFirst(items, focusId).map((item) => (
              <AirsReviewCard
                key={item.id}
                item={item}
                client={client}
                palette={palette}
                t={t}
                focused={item.id === focusId}
                busy={busy}
                onApprove={(report, snapshotHash) =>
                  decide(report, () => client.approve(report.id, snapshotHash), 'approved')
                }
                onReject={(report, reason) =>
                  decide(report, () => client.reject(report.id, reason), 'rejected')
                }
                onViewProof={showProof}
              />
            ))
          : null}
      </ScrollView>
      <ProofViewer viewer={viewer} palette={palette} t={t} onClose={closeViewer} />
      <ToastSystem toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 16 },
  back: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { gap: 10 },
  retry: { flexDirection: 'row', gap: 8 },
});
