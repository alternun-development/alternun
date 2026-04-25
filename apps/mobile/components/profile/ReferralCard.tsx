import { GlassCard } from '@alternun/ui';
import { Copy, Link2, Share2, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
}

interface ReferralCardProps {
  user: User | null;
  client: {
    getSessionToken: () => Promise<string | null>;
  };
  isDark: boolean;
  c: ColorPalette;
}

function truncateMiddle(value: string, start = 12, end = 10): string {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function ReferralCard({ user, client, isDark, c }: ReferralCardProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReferralSummary = async (): Promise<void> => {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sessionToken = await client.getSessionToken();
        if (!sessionToken) {
          return;
        }

        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
        const response = await fetch(`${apiBaseUrl}/v1/referrals/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            Accept: 'application/json',
          },
        });

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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchReferralSummary();

    return () => {
      isMounted = false;
    };
  }, [client, user?.id]);

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
      await Share.share({
        title: t('profile.referral.shareTitle', undefined, 'Share your referral link'),
        message: shareMessage,
        url: summary.referral_link,
      });
    } catch {
      // Ignore share-sheet failures; the link can still be copied manually.
    }
  };

  const referralCode = summary?.referral_code ?? '';
  const referralLink = summary?.referral_link ?? '';
  const referrerLabel = summary?.referred_by_name ?? summary?.referred_by_email ?? null;
  const referralCountValue = error ? '—' : loading ? '—' : summary?.referral_count ?? 0;
  const referralStatusValue = error
    ? '—'
    : summary?.referred_by_user_id
    ? t('shared.labels.yes', undefined, 'Yes')
    : t('shared.labels.no', undefined, 'No');
  const referralCodeValue = error
    ? '—'
    : loading
    ? '...'
    : referralCode || t('profile.referral.codePending', undefined, 'Loading...');

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
          <Text style={[styles.codeValue, { color: c.text }]}>{referralCodeValue}</Text>
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

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.text }]}>{referralCountValue}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>
            {t('profile.referral.referralCount', undefined, 'Invited members')}
          </Text>
        </View>
        <View
          style={[
            styles.statDivider,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
            },
          ]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.text }]}>{referralStatusValue}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>
            {t('profile.referral.wasReferred', undefined, 'Referral on file')}
          </Text>
        </View>
      </View>

      {referralLink ? (
        <View style={styles.linkRow}>
          <Link2 size={14} color={c.muted} strokeWidth={2} />
          <Text style={[styles.linkText, { color: c.muted }]}>{truncateMiddle(referralLink)}</Text>
        </View>
      ) : null}

      {referrerLabel ? (
        <Text style={[styles.referrerText, { color: c.muted }]}>
          {t(
            'profile.referral.referredBy',
            { name: referrerLabel },
            `Referred by ${referrerLabel}`
          )}
        </Text>
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
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  referrerText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
  },
});
