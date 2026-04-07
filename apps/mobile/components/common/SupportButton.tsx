import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  MessageSquare,
  Phone,
  ArrowLeft,
} from 'lucide-react-native';

interface SupportButtonProps {
  supportEmail: string;
  palette: {
    title: string;
    muted: string;
    accent: string;
    text: string;
    shellBg?: string;
    overlayBg?: string;
    borderColor?: string;
  };
}

export default function SupportButton({
  supportEmail,
  palette,
}: SupportButtonProps): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);

  const handleOpenChatOptions = (): void => {
    setShowChatOptions(true);
  };

  const handleTelegram = (): void => {
    const telegramUrl = 'https://t.me/alternun_io';
    void Linking.openURL(telegramUrl).catch(() => {
      void Linking.openURL(`mailto:${supportEmail}`);
    });
    setShowChatOptions(false);
    setDialogOpen(false);
  };

  const handleWhatsAppMessage = (): void => {
    // WhatsApp message - replace with actual support phone number if available
    const whatsappUrl = 'https://wa.me/?text=Hello%20Alternun%20Support';
    void Linking.openURL(whatsappUrl).catch(() => {
      void Linking.openURL(`mailto:${supportEmail}`);
    });
    setShowChatOptions(false);
    setDialogOpen(false);
  };

  const handleWhatsAppGroup = (): void => {
    const whatsappGroupUrl = 'https://chat.whatsapp.com/IcX8nBsx1Nq4B8nOTDoeLH';
    void Linking.openURL(whatsappGroupUrl).catch(() => {
      void Linking.openURL(`mailto:${supportEmail}`);
    });
    setShowChatOptions(false);
    setDialogOpen(false);
  };

  const handleLiveChat = (): void => {
    // Open live chat - can be configured to your live chat service
    // Examples: Intercom, Drift, Chatwoot, etc.
    const liveChatUrl = 'https://alternun.io/support';
    void Linking.openURL(liveChatUrl).catch(() => {
      void Linking.openURL(`mailto:${supportEmail}`);
    });
    setShowChatOptions(false);
    setDialogOpen(false);
  };

  const handleSendEmail = (): void => {
    void Linking.openURL(`mailto:${supportEmail}`);
    setDialogOpen(false);
  };

  const handleBack = (): void => {
    setShowChatOptions(false);
  };

  const isDark = palette.title === '#effff9'; // Check if dark theme based on title color

  return (
    <>
      {/* Support button */}
      <Pressable
        onPress={() => setDialogOpen(true)}
        style={({ pressed, hovered }) => [
          styles.supportButton,
          {
            backgroundColor: hovered || pressed ? `${palette.accent}18` : 'transparent',
            borderColor: palette.muted,
          },
        ]}
        accessibilityRole='button'
        accessibilityLabel='Open support'
      >
        <HelpCircle size={16} color={palette.title} strokeWidth={1.8} />
      </Pressable>

      {/* Support dialog modal */}
      <Modal
        visible={dialogOpen}
        transparent
        animationType='fade'
        onRequestClose={() => setDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop */}
          <Pressable
            style={[
              styles.backdrop,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
              },
            ]}
            onPress={() => setDialogOpen(false)}
          />

          {/* Dialog */}
          <View
            style={[
              styles.dialogBox,
              {
                backgroundColor: isDark ? '#0d0d1f' : '#ffffff',
                borderColor: palette.muted,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: palette.title }]}>How can we help?</Text>
              <TouchableOpacity onPress={() => setDialogOpen(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: palette.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Options - conditional rendering */}
            {!showChatOptions ? (
              <View style={styles.optionsContainer}>
                {/* Chat option */}
                <TouchableOpacity
                  onPress={handleOpenChatOptions}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <MessageCircle size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>Chat with us</Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      Start a conversation with our support team
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Email option */}
                <TouchableOpacity
                  onPress={handleSendEmail}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <Mail size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>
                      Send an email
                    </Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      {supportEmail}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {/* Back button header for chat options */}
                <TouchableOpacity onPress={handleBack} style={styles.backButtonRow}>
                  <ArrowLeft size={16} color={palette.accent} strokeWidth={2} />
                  <Text style={[styles.backButtonText, { color: palette.accent }]}>Back</Text>
                </TouchableOpacity>

                {/* Telegram option */}
                <TouchableOpacity
                  onPress={handleTelegram}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <MessageSquare size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>
                      Join Telegram
                    </Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      Chat with our community
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* WhatsApp Message option */}
                <TouchableOpacity
                  onPress={handleWhatsAppMessage}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <MessageCircle size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>
                      Send WhatsApp message
                    </Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      Message us directly
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* WhatsApp Group option */}
                <TouchableOpacity
                  onPress={handleWhatsAppGroup}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <MessageCircle size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>
                      Join WhatsApp group
                    </Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      Connect with our community
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Live Chat option */}
                <TouchableOpacity
                  onPress={handleLiveChat}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: palette.accent,
                      backgroundColor: `${palette.accent}08`,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrapper}>
                    <Phone size={20} color={palette.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: palette.title }]}>
                      Start live chat
                    </Text>
                    <Text style={[styles.optionDescription, { color: palette.muted }]}>
                      Chat with support agent
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  supportButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogBox: {
    borderRadius: 16,
    borderWidth: 1,
    width: '85%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsContainer: {
    padding: 16,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
    gap: 12,
  },
  optionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
