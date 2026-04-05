import { useRouter } from 'expo-router';
import { ChevronLeft, Wallet, type LucideProps } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, SectionContainer } from '@alternun/ui';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;

const NETWORKS: { name: string; dot: string }[] = [
  { name: 'Polygon', dot: '#8247e5' },
  { name: 'Ethereum', dot: '#627eea' },
  { name: 'Celo', dot: '#35d07f' },
];

export default function WalletScreen() {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const c = isDark
    ? {
        bg: '#050f0c',
        cardBg: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e8fff6',
        muted: 'rgba(232,255,246,0.6)',
        accent: '#1EE6B5',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(255,255,255,0.85)',
        border: 'rgba(11,90,95,0.12)',
        text: '#0b2d31',
        muted: 'rgba(11,45,49,0.6)',
        accent: '#0d9488',
      };

  return (
    <ScreenShell activeSection='wallet' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Wallet</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Connect wallet card */}
            <GlassCard style={styles.connectCard}>
              <View style={[styles.walletIconWrap, { backgroundColor: `${c.accent}14` }]}>
                <WalletIcon size={48} color={c.accent} />
              </View>
              <Text style={[styles.connectTitle, { color: c.text }]}>Conecta tu Wallet</Text>
              <Text style={[styles.connectSub, { color: c.muted }]}>
                Vincula tu billetera para gestionar tus ATN tokens
              </Text>
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: c.accent }]}
                activeOpacity={0.85}
              >
                <Text style={styles.connectBtnText}>Conectar Wallet</Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Supported networks */}
            <SectionContainer title='Redes Soportadas'>
              <View style={styles.networkRow}>
                {NETWORKS.map((net) => (
                  <View
                    key={net.name}
                    style={[
                      styles.networkPill,
                      { backgroundColor: c.cardBg, borderColor: c.border },
                    ]}
                  >
                    <View style={[styles.networkDot, { backgroundColor: net.dot }]} />
                    <Text style={[styles.networkName, { color: c.text }]}>{net.name}</Text>
                  </View>
                ))}
              </View>
            </SectionContainer>
          </ScrollView>
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  connectCard: {
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  walletIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  connectTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  connectSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  connectBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#064A4B',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  networkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkName: {
    fontSize: 13,
    fontWeight: '600',
  },
});
