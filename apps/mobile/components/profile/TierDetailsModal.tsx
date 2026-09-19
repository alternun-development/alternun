import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Award, X, type LucideProps } from 'lucide-react-native';
import { resolveTier, TIERS, type AirsTier } from '@alternun/ui';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { STATUS_DETAIL_BADGES } from './badgeAssets';

const CloseIcon = X as React.FC<LucideProps>;
const AwardIcon = Award as React.FC<LucideProps>;

const DESCRIPTIONS: Record<AirsTier, string> = {
  bronze:
    'Your AIRS journey starts here. Build a visible track record through eligible, verified actions that contribute to the regenerative ecosystem.',
  silver:
    'A growing track record of contribution. Silver recognizes the verified actions that have brought your cumulative AIRS score to this milestone.',
  gold: 'A significant milestone in your regenerative journey. Gold makes your accumulated contribution and commitment visible within the ecosystem.',
  platinum:
    'The highest tier in the current AIRS journey. Platinum recognizes an extensive track record of verified contribution, built over time.',
};

export function TierDetailsModal({
  tier,
  score,
  onClose,
}: {
  tier: AirsTier | null;
  score: number | null;
  onClose: () => void;
}): React.JSX.Element | null {
  const { t, locale } = useAppTranslation('mobile');
  const { width, height } = useWindowDimensions();
  if (!tier) return null;

  const spec = TIERS[tier];
  const label = t(`profile.tierLabels.${tier}`, undefined, spec.label);
  const title = t('profile.tierDetails.title', { tier: label }, '{{tier}} status');
  const closeLabel = t('profile.tierDetails.close', undefined, 'Close tier details');
  const compact = width < 600;
  const remaining = score === null ? null : Math.max(0, spec.min - score);
  const current = score !== null && resolveTier(score) === tier;
  const status = current
    ? t('profile.tierDetails.current', undefined, 'Your current tier')
    : remaining === null
    ? t('profile.tierDetails.unavailable', undefined, 'Your score is currently unavailable')
    : remaining > 0
    ? t(
        'profile.tierDetails.remaining',
        { amount: remaining.toLocaleString(locale) },
        '{{amount}} AIRS to reach this tier'
      )
    : t('profile.tierDetails.reached', undefined, 'Milestone reached');
  const perks = [
    t(
      'profile.tierDetails.reputation',
      undefined,
      'A visible, verifiable reputation built from your contribution.'
    ),
    t(
      'profile.tierDetails.opportunities',
      undefined,
      'Access to eligible ecosystem benefits, discounts, projects and opportunities.'
    ),
    t(
      'profile.tierDetails.rbi',
      undefined,
      'Your AIRS track record informs participation in Regenerative Basic Income (RBI), when eligible.'
    ),
  ];

  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          testID='tier-details-backdrop'
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          importantForAccessibility='no'
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.panel, { maxHeight: Math.max(160, height - 48) }]}
        >
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={styles.close}
          >
            <CloseIcon size={22} color='#d9eee6' />
          </Pressable>
          <ScrollView contentContainerStyle={[styles.content, compact && styles.compact]}>
            <View style={[styles.layout, compact && styles.stacked]}>
              <View style={styles.artwork}>
                {STATUS_DETAIL_BADGES[tier] ? (
                  <Image
                    source={STATUS_DETAIL_BADGES[tier]}
                    resizeMode='contain'
                    accessible={false}
                    style={{ width: compact ? 144 : 192, height: compact ? 144 : 192 }}
                  />
                ) : (
                  <View style={[styles.fallback, { borderColor: spec.color }]}>
                    <AwardIcon size={80} color={spec.color} />
                  </View>
                )}
              </View>
              <View style={[styles.copy, compact && styles.compactCopy]}>
                <Text accessibilityRole='header' style={[styles.title, { color: spec.color }]}>
                  {title}
                </Text>
                <View style={styles.threshold}>
                  <Text style={styles.thresholdText}>
                    {t(
                      'profile.tierDetails.threshold',
                      { amount: spec.min.toLocaleString(locale) },
                      '{{amount}}+ AIRS'
                    )}
                  </Text>
                </View>
                <Text style={styles.description}>
                  {t(`profile.tierDetails.descriptions.${tier}`, undefined, DESCRIPTIONS[tier])}
                </Text>
                <View style={styles.benefits}>
                  <Text style={styles.benefitsTitle}>
                    {t('profile.tierDetails.benefits', undefined, 'What AIRS opens up')}
                  </Text>
                  {perks.map((perk) => (
                    <View key={perk} style={styles.perk}>
                      <Text accessible={false} style={styles.bullet}>
                        •
                      </Text>
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                  <Text style={styles.eligibility}>
                    {t(
                      'profile.tierDetails.eligibility',
                      undefined,
                      'Availability depends on each program’s participation and eligibility rules. Reaching a tier does not automatically grant every benefit.'
                    )}
                  </Text>
                </View>
                <Text style={styles.status}>{status}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,12,9,0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#06251c',
    borderWidth: 1,
    borderColor: '#235144',
    borderRadius: 24,
    overflow: 'hidden',
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderRadius: 22,
    backgroundColor: '#12392e',
  },
  content: { padding: 40, paddingTop: 68 },
  compact: { padding: 24, paddingTop: 60 },
  layout: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  stacked: { flexDirection: 'column', gap: 20, alignItems: 'center' },
  artwork: { alignItems: 'center', justifyContent: 'center' },
  fallback: {
    width: 144,
    height: 144,
    borderWidth: 2,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c3b30',
  },
  copy: { flex: 1, minWidth: 0, width: '100%' },
  compactCopy: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Sculpin-Bold', lineHeight: 34 },
  threshold: {
    backgroundColor: '#14ddb0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  thresholdText: { color: '#043b32', fontSize: 19, fontWeight: '800' },
  description: { color: '#e0ece7', fontSize: 14, lineHeight: 22, marginTop: 24 },
  benefits: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#14ddb0',
    paddingVertical: 20,
    marginTop: 24,
    gap: 12,
  },
  benefitsTitle: { fontSize: 15, fontWeight: '700', color: '#14ddb0' },
  perk: { flexDirection: 'row', gap: 10 },
  bullet: { color: '#14ddb0', fontSize: 16, lineHeight: 21 },
  perkText: { flex: 1, color: '#e0ece7', fontSize: 13, lineHeight: 21 },
  eligibility: { color: '#adcbc0', fontSize: 12, lineHeight: 19 },
  status: { color: '#14ddb0', fontSize: 13, fontWeight: '700', marginTop: 20 },
});
