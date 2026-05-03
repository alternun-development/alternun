import { GlassCard } from '@alternun/ui';
import { Copy, Link2, Share2, UserRoundCheck, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import type { User } from '../auth/AppAuthProvider';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import type { ColorPalette } from './AchievementBadge';

interface ReferralSummary {
  user_id: string;
  referral_code: string;
  referral_link: string;
  referral_count: number;
  referred_by_user_id: string | null;
  referred_by_referral_code: string | null;
  referred_by_name: string | null;
  referred_by_email: string | null;
  referred_users: Array<{
    user_id: string;
    referral_code: string | null;
    name: string | null;
    email: string | null;
    created_at: string;
  }>;
}

interface ReferralCardProps {
  user: User | null;
  isDark: boolean;
  c: ColorPalette;
}

const REFERRAL_FETCH_TIMEOUT_MS = 12000;

function truncateMiddle(value: string, start = 12, end = 10): string {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getProfileDisplayName(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const firstName =
    typeof metadata.firstName === 'string'
      ? metadata.firstName
      : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : '';
  const lastName =
    typeof metadata.lastName === 'string'
      ? metadata.lastName
      : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : '';
  const fullNameFromParts = `${firstName} ${lastName}`.trim();
  const candidates = [
    typeof (user as User & { name?: unknown }).name === 'string'
      ? (user as User & { name?: unknown }).name
      : null,
    metadata.fullName,
    metadata.full_name,
    metadata.displayName,
    metadata.display_name,
    metadata.name,
    fullNameFromParts,
    typeof user.email === 'string' ? user.email.split('@')[0] : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export function ReferralCard({ user, isDark, c }: ReferralCardProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileDisplayName = useMemo(() => getProfileDisplayName(user), [user]);

  useEffect(() => {
    let isMounted = true;

    const fetchReferralSummary = async (): Promise<void> => {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let fetchTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

      try {
        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
        const referralUrl = new URL(`${apiBaseUrl}/v1/referrals/me`);
        referralUrl.searchParams.set('user_id', user.id);
        if (profileDisplayName) {
          referralUrl.searchParams.set('display_name', profileDisplayName);
        }

        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        const fetchPromise = fetch(referralUrl.toString(), {
          method: 'GET',
          headers,
          signal: abortController?.signal,
        });
        const timeoutPromise = new Promise<Response>((_, reject) => {
          fetchTimeoutHandle = setTimeout(() => {
            abortController?.abort();
            reject(new Error('Timed out while loading referral details'));
          }, REFERRAL_FETCH_TIMEOUT_MS);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          throw new Error(`Referral summary request failed (${response.status})`);
        }

        const data = (await response.json()) as ReferralSummary;
        if (isMounted) {
          setSummary(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load referral data');
        }
      } finally {
        if (fetchTimeoutHandle) {
          clearTimeout(fetchTimeoutHandle);
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchReferralSummary();

    return () => {
      isMounted = false;
    };
  }, [profileDisplayName, user?.id]);

  const shareMessage = useMemo(() => {
    if (!summary) {
      return '';
    }

    return t(
      'profile.referral.shareMessage',
      { code: summary.referral_code, link: summary.referral_link },
      `Join me on Airs By Alternun: ${summary.referral_link}`
    );
  }, [summary, t]);

  const handleCopy = (): void => {
    if (!summary) {
      return;
    }

    try {
      Clipboard.setString(`${summary.referral_link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures; sharing still remains available.
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!summary) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const webNavigator = globalThis.navigator as
          | {
              share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
              clipboard?: { writeText?: (value: string) => Promise<void> };
            }
          | undefined;

        if (typeof webNavigator?.share === 'function') {
          await webNavigator.share({
            title: t('profile.referral.shareTitle', undefined, 'Share your referral link'),
            text: shareMessage,
            url: summary.referral_link,
          });
          return;
        }

        if (typeof webNavigator?.clipboard?.writeText === 'function') {
          await webNavigator.clipboard.writeText(summary.referral_link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
          return;
        }
      }

      await Share.share({
        title: t('profile.referral.shareTitle', undefined, 'Share your referral link'),
        message: shareMessage,
        url: summary.referral_link,
      });
    } catch {
      try {
        Clipboard.setString(summary.referral_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // Ignore share-sheet failures; the link can still be copied manually.
      }
    }
  };

  const referralCode = summary?.referral_code ?? '';
  const referralLink = summary?.referral_link ?? '';
  const referrerLabel =
    summary?.referred_by_name ??
    summary?.referred_by_email ??
    summary?.referred_by_referral_code ??
    null;
  const hasReferrer = Boolean(referrerLabel);
  const referralCountValue = error ? '—' : loading ? '—' : summary?.referral_count ?? 0;
  const referralCodeValue = error
    ? '—'
    : loading
    ? '...'
    : referralCode ?? t('profile.referral.codePending', undefined, 'Loading...');

  return (
    <GlassCard
      style={{
        margin: 0,
        padding: 18,
        borderRadius: 18,
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: `${c.accent}18`,
                borderColor: `${c.accent}30`,
              },
            ]}
          >
            <Users size={18} color={c.accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]}>
              {t('profile.referral.title', undefined, 'Referidos')}
            </Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>
              {t(
                'profile.referral.subtitle',
                undefined,
                'Share your code and track invited members.'
              )}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            void handleShare();
          }}
          disabled={!summary}
          activeOpacity={0.75}
          style={[
            styles.shareButton,
            {
              borderColor: `${c.accent}30`,
              backgroundColor: `${c.accent}14`,
              opacity: summary ? 1 : 0.5,
            },
          ]}
        >
          <Share2 size={15} color={c.accent} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.codeBox,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
            borderColor: c.cardBorder,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.codeLabel, { color: c.muted }]}>
            {t('profile.referral.codeLabel', undefined, 'Your referral code')}
          </Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size='small' color={c.accent} />
              <Text style={[styles.loadingText, { color: c.text }]}>
                {t('profile.referral.loading', undefined, 'Loading referral details...')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.codeValue, { color: c.text }]}>{referralCodeValue}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            void handleCopy();
          }}
          disabled={!summary}
          activeOpacity={0.8}
          style={[
            styles.copyButton,
            {
              borderColor: `${c.accent}28`,
              backgroundColor: `${c.accent}12`,
              opacity: summary ? 1 : 0.5,
            },
          ]}
        >
          {copied ? (
            <Text style={[styles.copyText, { color: c.accent }]}>
              {t('profile.referral.copied', undefined, 'Copied')}
            </Text>
          ) : (
            <>
              <Copy size={14} color={c.accent} strokeWidth={2.2} />
              <Text style={[styles.copyText, { color: c.accent }]}>
                {t('profile.referral.copy', undefined, 'Copy')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {hasReferrer ? (
        <View
          style={[
            styles.referrerCard,
            {
              borderColor: `${c.accent}26`,
              backgroundColor: isDark ? 'rgba(28,203,161,0.08)' : 'rgba(28,203,161,0.1)',
            },
          ]}
        >
          <View
            style={[
              styles.referrerIcon,
              {
                backgroundColor: `${c.accent}18`,
                borderColor: `${c.accent}30`,
              },
            ]}
          >
            <UserRoundCheck size={15} color={c.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.referrerCopy}>
            <Text style={[styles.referrerLabel, { color: c.muted }]}>
              {t('profile.referral.referredByLabel', undefined, 'Who referred you')}
            </Text>
            <Text style={[styles.referrerName, { color: c.text }]}>{referrerLabel}</Text>
            <Text style={[styles.referrerHelper, { color: c.muted }]}>
              {t(
                'profile.referral.referredByHelper',
                undefined,
                'This is the referral source recorded on your account.'
              )}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.text }]}>{referralCountValue}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>
            {t('profile.referral.referralCount', undefined, 'Invited members')}
          </Text>
        </View>
        {hasReferrer ? (
          <>
            <View
              style={[
                styles.statDivider,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
                },
              ]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: c.text }]}>
                {t('shared.labels.yes', undefined, 'Yes')}
              </Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>
                {t('profile.referral.wasReferred', undefined, 'Referral on file')}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {referralLink ? (
        <TouchableOpacity
          onPress={() => {
            void handleCopy();
          }}
          activeOpacity={0.8}
          style={[
            styles.linkRow,
            {
              borderColor: c.cardBorder,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(11,45,49,0.02)',
            },
          ]}
        >
          <Link2 size={14} color={c.muted} strokeWidth={2} />
          <Text selectable style={[styles.linkText, { color: c.muted }]}>
            {truncateMiddle(referralLink)}
          </Text>
          <Text style={[styles.linkAction, { color: c.accent }]}>
            {t('profile.referral.copy', undefined, 'Copy')}
          </Text>
        </TouchableOpacity>
      ) : null}

      {summary?.referred_users?.length ? (
        <View style={styles.inviteesSection}>
          <Text style={[styles.inviteesTitle, { color: c.text }]}>
            {t('profile.referral.invitedUsers', undefined, 'Invited users')}
          </Text>
          <View style={styles.inviteesList}>
            {summary.referred_users.map((invitee) => {
              const inviteeLabel =
                invitee.name ??
                invitee.email ??
                t('shared.labels.anonymous', undefined, 'Anonymous');
              return (
                <View
                  key={invitee.user_id}
                  style={[
                    styles.inviteeRow,
                    {
                      borderColor: c.cardBorder,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(11,45,49,0.03)',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteeName, { color: c.text }]}>{inviteeLabel}</Text>
                    <Text style={[styles.inviteeMeta, { color: c.muted }]}>
                      {invitee.referral_code
                        ? `${invitee.referral_code} · ${invitee.created_at.slice(0, 10)}`
                        : invitee.created_at.slice(0, 10)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {error ? (
        <Text style={[styles.errorText, { color: '#ff6b6b' }]}>
          {t('profile.referral.error', undefined, 'Unable to load referral details right now.')}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    opacity: 0.35,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  linkAction: {
    fontSize: 11,
    fontWeight: '800',
  },
  referrerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 14,
  },
  referrerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  referrerCopy: {
    flex: 1,
  },
  referrerLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referrerName: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  referrerHelper: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  inviteesSection: {
    marginTop: 12,
  },
  inviteesTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inviteesList: {
    gap: 8,
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inviteeName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  inviteeMeta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  errorText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
  },
});
