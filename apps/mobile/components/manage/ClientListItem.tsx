import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { manageStyles } from './styles';
import type { ClientListItemProps } from './types';
import { formatClientDate } from '../../utils/projectClients';

const VISIBLE_REPORTS = 3;

/** Assignments that will not move anymore; shown dimmed. */
const CLOSED_STATUSES: ReadonlySet<string> = new Set(['cancelled', 'rejected', 'reversed']);

/** What sending a report again does, by status; other statuses have nothing pending. */
const RESEND_LABELS: Readonly<Record<string, string>> = {
  awaiting_claim: 'manage.clients.resendEmail',
  pending_approval: 'manage.clients.remindAdmins',
};

/** One client of the Clients tab: status, dates, assigned Airs and invitation history. */
export function ClientListItem({
  item,
  palette,
  t,
  projectTitle,
  canEdit,
  canAssign,
  busyAction,
  onAssign,
  onReinvite,
  onRemove,
  onShowProof,
  onResendReport,
  onResendInvitation,
}: ClientListItemProps): React.JSX.Element {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [allReports, setAllReports] = useState(false);
  // Cancelling an invitation also cancels its waiting Airs, so it asks first when there are some.
  const [confirmCancel, setConfirmCancel] = useState(false);
  const waitingAirs = item.reports.filter(
    (report) => report.status === 'awaiting_claim' || report.status === 'pending_approval'
  ).length;
  // Long histories show the latest assignments first; the rest are one tap away.
  const reports = allReports ? item.reports : item.reports.slice(0, VISIBLE_REPORTS);
  const busy = busyAction !== null;
  const invitations = item.invitations ?? [];
  const lastCancelled = invitations.find((invitation) => invitation.status === 'cancelled');
  const dateLine =
    item.kind === 'member'
      ? t('manage.clients.since', { date: formatClientDate(item.since) })
      : item.kind === 'invitation'
      ? t('manage.clients.invitedOn', { date: formatClientDate(item.since) })
      : t('manage.clients.cancelledOn', {
          date: formatClientDate(lastCancelled?.cancelledAt ?? item.since),
        });
  const statusColor =
    item.kind === 'member'
      ? palette.primary
      : item.kind === 'cancelled'
      ? '#f87171'
      : palette.muted;
  const chip = [manageStyles.secondaryButton, { borderColor: palette.border }];

  return (
    <View
      testID={`manage-client-${item.id}`}
      style={[styles.item, { borderColor: palette.border }]}
    >
      <View style={[manageStyles.row, styles.header]}>
        <View style={styles.identity}>
          <Text style={[styles.name, { color: palette.text }]}>{item.name || item.email}</Text>
          <Text style={[manageStyles.muted, { color: palette.muted }]}>
            {item.email}
            {projectTitle ? ` · ${projectTitle}` : ''}
          </Text>
          <Text
            testID={`manage-client-date-${item.id}`}
            style={[styles.small, { color: palette.muted }]}
          >
            {dateLine}
          </Text>
        </View>
        <Text style={[manageStyles.secondaryButtonText, { color: statusColor }]}>
          {t(`manage.clients.kind.${item.kind}`)}
        </Text>
      </View>

      {reports.map((report) => (
        <View
          key={report.id}
          testID={`manage-client-report-${report.id}`}
          style={[
            manageStyles.row,
            styles.report,
            CLOSED_STATUSES.has(report.status) && styles.closed,
          ]}
        >
          <View style={styles.reportCopy}>
            <Text style={[manageStyles.muted, { color: palette.text }]}>
              {`${report.amount.toLocaleString('es-CO')} Airs · ${report.concept}`}
            </Text>
            <Text style={[styles.small, { color: palette.muted }]}>
              {`${t(`manage.clients.status.${report.status}`, undefined, report.status)} · ${t(
                'manage.clients.assignedOn',
                { date: formatClientDate(report.submittedAt) }
              )}`}
            </Text>
          </View>
          {report.hasProof ? (
            <Pressable
              testID={`manage-client-proof-${report.id}`}
              accessibilityRole='link'
              disabled={busy}
              onPress={() => onShowProof(report.id)}
            >
              {busyAction === `proof-${report.id}` ? (
                <ActivityIndicator size='small' color={palette.primaryDeep} />
              ) : (
                <Text style={[manageStyles.secondaryButtonText, { color: palette.primaryDeep }]}>
                  {t('manage.clients.viewProof')}
                </Text>
              )}
            </Pressable>
          ) : null}
          {canEdit && RESEND_LABELS[report.status] ? (
            <Pressable
              testID={`manage-client-resend-${report.id}`}
              accessibilityRole='button'
              disabled={busy}
              onPress={() => onResendReport(report.id)}
            >
              {busyAction === `resend-${report.id}` ? (
                <ActivityIndicator size='small' color={palette.primaryDeep} />
              ) : (
                <Text style={[manageStyles.secondaryButtonText, { color: palette.primaryDeep }]}>
                  {t(RESEND_LABELS[report.status] ?? '')}
                </Text>
              )}
            </Pressable>
          ) : null}
          {/* Airs in review for someone invited: the invitation itself can also go again. */}
          {canEdit && report.status === 'pending_approval' && item.kind === 'invitation' ? (
            <Pressable
              testID={`manage-client-resend-invitation-${report.id}`}
              accessibilityRole='button'
              disabled={busy}
              onPress={onResendInvitation}
            >
              {busyAction === `resend-${item.id}` ? (
                <ActivityIndicator size='small' color={palette.primaryDeep} />
              ) : (
                <Text style={[manageStyles.secondaryButtonText, { color: palette.primaryDeep }]}>
                  {t('manage.clients.resendInvitation')}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ))}
      {item.reports.length > VISIBLE_REPORTS ? (
        <Pressable
          testID={`manage-client-reports-${item.id}`}
          accessibilityRole='button'
          accessibilityState={{ expanded: allReports }}
          onPress={() => setAllReports((open) => !open)}
        >
          <Text style={[styles.small, styles.link, { color: palette.primaryDeep }]}>
            {allReports
              ? t('manage.clients.reportsLess')
              : t('manage.clients.reportsAll', { count: item.reports.length })}
          </Text>
        </Pressable>
      ) : null}

      {invitations.length > 0 ? (
        <>
          <Pressable
            testID={`manage-client-history-${item.id}`}
            accessibilityRole='button'
            accessibilityState={{ expanded: historyOpen }}
            onPress={() => setHistoryOpen((open) => !open)}
          >
            <Text style={[styles.small, styles.link, { color: palette.primaryDeep }]}>
              {historyOpen
                ? t('manage.clients.historyHide')
                : t('manage.clients.history', { count: invitations.length })}
            </Text>
          </Pressable>
          {historyOpen
            ? invitations.map((invitation) => (
                <Text
                  key={invitation.id}
                  testID={`manage-client-invitation-${invitation.id}`}
                  style={[styles.small, { color: palette.muted }]}
                >
                  {[
                    t(`manage.clients.invitationStatus.${invitation.status}`),
                    t('manage.clients.sentOn', { date: formatClientDate(invitation.invitedAt) }),
                    invitation.cancelledAt
                      ? t('manage.clients.cancelledAt', {
                          date: formatClientDate(invitation.cancelledAt),
                        })
                      : null,
                    invitation.acceptedAt
                      ? t('manage.clients.acceptedAt', {
                          date: formatClientDate(invitation.acceptedAt),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ))
            : null}
        </>
      ) : null}

      {canEdit ? (
        <View style={manageStyles.row}>
          {item.kind === 'cancelled' ? (
            <Pressable
              testID={`manage-client-reinvite-${item.id}`}
              accessibilityRole='button'
              disabled={busy}
              onPress={onReinvite}
              style={chip}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('manage.clients.reinvite')}
              </Text>
            </Pressable>
          ) : (
            <>
              {item.kind === 'invitation' ? (
                <Pressable
                  testID={`manage-client-resend-invitation-${item.id}`}
                  accessibilityRole='button'
                  disabled={busy}
                  onPress={onResendInvitation}
                  style={chip}
                >
                  {busyAction === `resend-${item.id}` ? (
                    <ActivityIndicator size='small' color={palette.text} />
                  ) : (
                    <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                      {t('manage.clients.resendInvitation')}
                    </Text>
                  )}
                </Pressable>
              ) : null}
              {canAssign ? (
                <Pressable
                  testID={`manage-client-assign-${item.id}`}
                  accessibilityRole='button'
                  disabled={busy}
                  onPress={onAssign}
                  style={chip}
                >
                  <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                    {t('manage.clients.assignAirs')}
                  </Text>
                </Pressable>
              ) : null}
              {confirmCancel ? (
                <Pressable
                  testID={`manage-client-keep-${item.id}`}
                  accessibilityRole='button'
                  disabled={busy}
                  onPress={() => setConfirmCancel(false)}
                  style={chip}
                >
                  <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                    {t('manage.clients.keepInvitation')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                testID={`manage-client-remove-${item.id}`}
                accessibilityRole='button'
                disabled={busy}
                onPress={() => {
                  if (item.kind === 'invitation' && waitingAirs > 0 && !confirmCancel) {
                    setConfirmCancel(true);
                    return;
                  }
                  setConfirmCancel(false);
                  onRemove();
                }}
                style={[chip, confirmCancel && { borderColor: '#f87171' }]}
              >
                {busyAction === `remove-${item.id}` ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator size='small' color={palette.text} />
                    <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                      {t('manage.clients.busy.remove')}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      manageStyles.secondaryButtonText,
                      { color: confirmCancel ? '#f87171' : palette.text },
                    ]}
                  >
                    {confirmCancel
                      ? t('manage.clients.confirmCancel', { count: waitingAirs })
                      : t(
                          item.kind === 'member'
                            ? 'manage.clients.remove'
                            : 'manage.clients.cancelInvitation'
                        )}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: 8, paddingTop: 12, borderTopWidth: 1 },
  header: { justifyContent: 'space-between', alignItems: 'flex-start' },
  identity: { flex: 1, minWidth: 160, gap: 2 },
  name: { fontWeight: '800', fontSize: 15 },
  small: { fontSize: 12, lineHeight: 17 },
  link: { fontWeight: '800' },
  report: { alignItems: 'flex-start' },
  reportCopy: { flex: 1, gap: 1 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closed: { opacity: 0.55 },
});
