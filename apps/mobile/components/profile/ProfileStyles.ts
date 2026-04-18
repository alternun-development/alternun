import { StyleSheet } from 'react-native';

export const profileStylesEnhanced = (isDark: boolean) => {
  const colors = isDark
    ? {
        bg: '#0a1f1b',
        cardBg: 'rgba(15, 45, 40, 0.7)',
        cardBgHover: 'rgba(20, 55, 50, 0.8)',
        cardBorder: 'rgba(30, 230, 181, 0.2)',
        cardBorderHover: 'rgba(30, 230, 181, 0.4)',
        text: '#e8fff6',
        textSecondary: '#b0e8dc',
        muted: 'rgba(232, 255, 246, 0.5)',
        accent: '#1EE6B5',
        accentDark: '#0fb094',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(240, 253, 249, 0.95)',
        cardBgHover: 'rgba(229, 251, 246, 1)',
        cardBorder: 'rgba(13, 148, 136, 0.15)',
        cardBorderHover: 'rgba(13, 148, 136, 0.25)',
        text: '#0b5a5f',
        textSecondary: '#0d7d7a',
        muted: 'rgba(11, 45, 49, 0.55)',
        accent: '#0d9488',
        accentDark: '#0a7a70',
      };

  return StyleSheet.create({
    root: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: `${colors.cardBg}`,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    titleWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: '800',
      fontFamily: 'Sculpin-Bold',
      color: colors.text,
      letterSpacing: -0.5,
    },

    // Hero Card
    heroCard: {
      margin: 16,
      padding: 28,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: colors.cardBg,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 5,
    },
    avatarWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.accent}20`,
      borderWidth: 2,
      borderColor: `${colors.accent}40`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.accent,
    },
    heroName: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    heroEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      fontWeight: '500',
    },
    authPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: `${colors.accent}15`,
      borderColor: `${colors.accent}40`,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    authLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'capitalize',
      letterSpacing: 0.3,
    },

    // Info Cards
    infoCard: {
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 18,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: colors.cardBg,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 14,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
      flex: 0.4,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
      flex: 0.6,
    },

    // Actions
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 16,
      marginVertical: 16,
      marginTop: 24,
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      backgroundColor: colors.cardBg,
      borderColor: colors.cardBorder,
    },
    dangerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
      borderWidth: 1.5,
      borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    btnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    dangerBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ff3b30',
      letterSpacing: -0.3,
    },

    // Content
    content: {
      flexGrow: 1,
      paddingBottom: 120,
    },
    tabContent: {
      flex: 1,
    },

    // Shared
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    signInPrompt: {
      fontSize: 17,
      fontWeight: '700',
      marginVertical: 16,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    signInBtn: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    signInBtnText: {
      fontWeight: '700',
      fontSize: 15,
      letterSpacing: -0.3,
    },
  });
};

export default profileStylesEnhanced;
