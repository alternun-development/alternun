/**
 * AuthFooter — Auth Card Footer with Policy & Version
 *
 * Centered minimalist footer for auth sign-in card:
 * - Copyright text (centered, top)
 * - Privacy & Terms as text links (centered, single line)
 * - Help icon + Version pill (centered, bottom, matching LandingFooter)
 *
 * Help icon: opens help modal
 * Version pill: opens changelog/version drawer
 */

import React, { useCallback, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { ChangelogDrawer, fontSize, radius, spacing } from '@alternun/ui';
import { resolveVersionMetadata } from '../common/Footer.shared';
import { useAppPalette } from '../theme/useAppPalette';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { CHANGELOG_TEXT } from '../../utils/changelogData';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

// ── Helper: Policy content fetcher and formatter ──────────────────────────────

interface TextSpan {
  text: string;
  bold?: boolean;
  heading?: number; // h1=1, h2=2, etc.
}

function parseMarkdownLine(text: string): Array<TextSpan | string> {
  const spans: (TextSpan | string)[] = [];
  let current = '';
  let inBold = false;
  let i = 0;

  while (i < text.length) {
    if (text.charAt(i) === '*' && text.charAt(i + 1) === '*') {
      if (current) {
        if (inBold) {
          spans.push({ text: current, bold: true });
        } else {
          spans.push(current);
        }
        current = '';
      }
      inBold = !inBold;
      i += 2;
    } else {
      current += text.charAt(i);
      i += 1;
    }
  }

  if (current) {
    if (inBold) {
      spans.push({ text: current, bold: true });
    } else {
      spans.push(current);
    }
  }

  return spans;
}

function detectHeadingLevel(text: string): number {
  let level = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) === '#') {
      level++;
    } else {
      break;
    }
  }
  return level > 0 && level <= 6 ? level : 0;
}

interface PolicyDrawerContentProps {
  type: 'privacy' | 'terms';
  apiUrl: string;
  locale: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
}

export function PolicyDrawerContent({
  type,
  apiUrl,
  locale,
  textPrimary,
  textMuted,
  accent,
}: PolicyDrawerContentProps): React.JSX.Element {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const url = `${apiUrl.replace(/\/$/, '')}/v1/legal/${type}?locale=${locale}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type} content`);
        }

        const data = (await response.json()) as { content: string };
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    void fetchContent();
  }, [type, apiUrl, locale]);

  // Remove YAML frontmatter and title metadata
  let cleanContent = content ?? '';

  // Remove YAML frontmatter (---)
  cleanContent = cleanContent.replace(/^---\n[\s\S]*?\n---\n*/m, '').trim();

  // Remove title: line
  cleanContent = cleanContent.replace(/^title:\s*.*\n*/m, '').trim();

  const lines = cleanContent.split('\n').filter((l) => {
    const trimmed = l.trim();
    // Filter out empty lines and standalone dashes
    return trimmed.length > 0 && trimmed !== '---';
  });

  return (
    <ScrollView
      style={innerStyles.contentScroll}
      contentContainerStyle={innerStyles.contentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled
    >
      {loading ? (
        <Text style={[innerStyles.loadingText, { color: textMuted }]}>Loading...</Text>
      ) : error ? (
        <Text style={[innerStyles.errorText, { color: '#ef4444' }]}>Error: {error}</Text>
      ) : lines.length === 0 ? (
        <Text style={[innerStyles.emptyText, { color: textMuted }]}>No content</Text>
      ) : (
        <View selectable={false}>
          {lines.map((line, idx) => {
            const headingLevel = detectHeadingLevel(line);

            if (headingLevel > 0) {
              // Heading
              const headingText = line.replace(/^#+\s*/, '').trim();
              const spans = parseMarkdownLine(headingText);
              const stylesCatalog = innerStyles as Record<string, unknown>;
              const headingStyle = stylesCatalog[`heading${headingLevel}`] as TextStyle | undefined;

              return (
                <Text
                  key={idx}
                  style={[headingStyle ?? innerStyles.paragraph, { color: accent }]}
                  selectable={false}
                >
                  {spans.map((span, sidx) =>
                    typeof span === 'string' ? (
                      <Text key={sidx} selectable={false}>
                        {span}
                      </Text>
                    ) : (
                      <Text key={sidx} style={{ fontWeight: 'bold' }} selectable={false}>
                        {span.text}
                      </Text>
                    )
                  )}
                </Text>
              );
            } else if (line.startsWith('- ')) {
              // List item
              const itemText = line.replace(/^-\s*/, '').trim();
              const spans = parseMarkdownLine(itemText);

              return (
                <View key={idx} style={innerStyles.listItem}>
                  <Text style={[innerStyles.listBullet, { color: textMuted }]} selectable={false}>
                    •
                  </Text>
                  <Text
                    style={[innerStyles.listItemText, { color: textPrimary }]}
                    selectable={false}
                  >
                    {spans.map((span, sidx) =>
                      typeof span === 'string' ? (
                        <Text key={sidx} selectable={false}>
                          {span}
                        </Text>
                      ) : (
                        <Text
                          key={sidx}
                          style={{ fontWeight: 'bold', color: accent }}
                          selectable={false}
                        >
                          {span.text}
                        </Text>
                      )
                    )}
                  </Text>
                </View>
              );
            } else {
              // Regular paragraph
              const spans = parseMarkdownLine(line);

              return (
                <Text
                  key={idx}
                  style={[innerStyles.paragraph, { color: textPrimary }]}
                  selectable={false}
                >
                  {spans.map((span, sidx) =>
                    typeof span === 'string' ? (
                      <Text key={sidx} selectable={false}>
                        {span}
                      </Text>
                    ) : (
                      <Text
                        key={sidx}
                        style={{ fontWeight: 'bold', color: accent }}
                        selectable={false}
                      >
                        {span.text}
                      </Text>
                    )
                  )}
                </Text>
              );
            }
          })}
        </View>
      )}
    </ScrollView>
  );
}

export interface AuthFooterProps {
  apiUrl?: string;
  locale?: 'en' | 'es' | 'th';
  appVersion?: string;
}

export function AuthFooter({ apiUrl, locale = 'en', appVersion }: AuthFooterProps): JSX.Element {
  const p = useAppPalette();
  const { t } = useAppTranslation('mobile');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyHovered, setPrivacyHovered] = useState(false);
  const [termsHovered, setTermsHovered] = useState(false);
  const resolvedApiUrl = resolveMobileApiBaseUrl(apiUrl);
  const resolvedAppVersion = appVersion?.trim() ?? resolveVersionMetadata().version;

  // Detect environment and set documentation base URL
  const getDocsBaseUrl = useCallback(() => {
    const normalizedApiUrl = resolvedApiUrl.toLowerCase();

    // Local development
    if (normalizedApiUrl.includes('localhost') || normalizedApiUrl.includes('127.0.0.1')) {
      return 'http://127.0.0.1:8083';
    }

    // Testnet
    if (normalizedApiUrl.includes('testnet')) {
      return 'https://testnet-docs.alternun.co';
    }

    // Production (default)
    return 'https://docs.alternun.io';
  }, [resolvedApiUrl]);

  const docsBaseUrl = getDocsBaseUrl();

  const handlePrivacyOpen = useCallback(() => {
    setPrivacyOpen(true);
  }, []);

  const handlePrivacyClose = useCallback(() => {
    setPrivacyOpen(false);
  }, []);

  const handleTermsOpen = useCallback(() => {
    setTermsOpen(true);
  }, []);

  const handleTermsClose = useCallback(() => {
    setTermsOpen(false);
  }, []);

  const handleHelpOpen = useCallback(() => {
    setHelpOpen(true);
  }, []);

  const handleHelpClose = useCallback(() => {
    setHelpOpen(false);
  }, []);

  return (
    <>
      {/* Centered footer — matching landing footer layout (no divider line) */}
      <View style={innerStyles.footer}>
        {/* Copyright text — centered */}
        <Text style={[innerStyles.copyrightText, { color: p.textMuted }]}>
          (c) 2026 Alternun. All rights reserved.
        </Text>

        {/* Privacy & Terms as text links — centered, single line */}
        <View style={innerStyles.policyRow}>
          <TouchableOpacity
            onPress={handlePrivacyOpen}
            activeOpacity={0.7}
            style={innerStyles.linkContainer}
            onMouseEnter={() => setPrivacyHovered(true)}
            onMouseLeave={() => setPrivacyHovered(false)}
          >
            <Text style={[innerStyles.linkText, { color: p.accent }]}>{t('footer.privacy')}</Text>
            {privacyHovered && (
              <View style={[innerStyles.linkUnderline, { backgroundColor: p.accent }]} />
            )}
          </TouchableOpacity>
          <Text style={[innerStyles.separator, { color: p.textMuted }]}>·</Text>
          <TouchableOpacity
            onPress={handleTermsOpen}
            activeOpacity={0.7}
            style={innerStyles.linkContainer}
            onMouseEnter={() => setTermsHovered(true)}
            onMouseLeave={() => setTermsHovered(false)}
          >
            <Text style={[innerStyles.linkText, { color: p.accent }]}>{t('footer.terms')}</Text>
            {termsHovered && (
              <View style={[innerStyles.linkUnderline, { backgroundColor: p.accent }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Version pill + Help icon — centered, matching landing footer */}
        <View style={innerStyles.controlsRow}>
          {/* Changelog drawer — version pill opens changelog */}
          <ChangelogDrawer
            changelog={CHANGELOG_TEXT}
            githubUrl='https://github.com/alternun-development/alternun'
            triggerLabel={`v${resolvedAppVersion}`}
            highlightLatest
          />

          {/* Help icon button — opens help modal */}
          <TouchableOpacity
            onPress={handleHelpOpen}
            style={[
              innerStyles.helpButton,
              {
                borderColor: p.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                backgroundColor: p.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole='button'
            accessibilityLabel={t('footer.help')}
          >
            <HelpCircle size={16} color={p.textMuted} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy Drawer */}
      <Modal
        visible={privacyOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handlePrivacyClose}
        accessibilityViewIsModal
      >
        <View style={innerStyles.modalContainer}>
          <Pressable
            style={[
              innerStyles.backdrop,
              {
                backgroundColor: p.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
              },
            ]}
            onPress={handlePrivacyClose}
          />
          <View
            style={[
              innerStyles.sheet,
              {
                backgroundColor: p.isDark ? '#0d0d1f' : '#f8fafb',
                borderColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
              },
            ]}
          >
            <View
              style={[
                innerStyles.handle,
                {
                  backgroundColor: p.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
                },
              ]}
            />
            <View
              style={[
                innerStyles.sheetHeader,
                {
                  borderBottomColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <Text style={[innerStyles.sheetTitle, { color: p.textPrimary }]}>
                {t('footer.privacy')}
              </Text>
              <TouchableOpacity
                onPress={handlePrivacyClose}
                activeOpacity={0.75}
                style={innerStyles.closeBtn}
              >
                <Text style={[innerStyles.closeBtnText, { color: p.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <PolicyDrawerContent
              type='privacy'
              apiUrl={resolvedApiUrl}
              locale={locale}
              textPrimary={p.textPrimary}
              textMuted={p.textMuted}
              accent={p.accent}
            />
            {/* Documentation link footer */}
            <View
              style={[
                innerStyles.drawerFooter,
                {
                  borderTopColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  void Linking.openURL(`${docsBaseUrl}/privacy`);
                }}
                activeOpacity={0.7}
              >
                <Text style={[innerStyles.docLink, { color: p.accent }]}>
                  View full documentation ↗
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Terms Drawer */}
      <Modal
        visible={termsOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handleTermsClose}
        accessibilityViewIsModal
      >
        <View style={innerStyles.modalContainer}>
          <Pressable
            style={[
              innerStyles.backdrop,
              {
                backgroundColor: p.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
              },
            ]}
            onPress={handleTermsClose}
          />
          <View
            style={[
              innerStyles.sheet,
              {
                backgroundColor: p.isDark ? '#0d0d1f' : '#f8fafb',
                borderColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
              },
            ]}
          >
            <View
              style={[
                innerStyles.handle,
                {
                  backgroundColor: p.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
                },
              ]}
            />
            <View
              style={[
                innerStyles.sheetHeader,
                {
                  borderBottomColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <Text style={[innerStyles.sheetTitle, { color: p.textPrimary }]}>
                {t('footer.terms')}
              </Text>
              <TouchableOpacity
                onPress={handleTermsClose}
                activeOpacity={0.75}
                style={innerStyles.closeBtn}
              >
                <Text style={[innerStyles.closeBtnText, { color: p.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <PolicyDrawerContent
              type='terms'
              apiUrl={resolvedApiUrl}
              locale={locale}
              textPrimary={p.textPrimary}
              textMuted={p.textMuted}
              accent={p.accent}
            />
            {/* Documentation link footer */}
            <View
              style={[
                innerStyles.drawerFooter,
                {
                  borderTopColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  void Linking.openURL(`${docsBaseUrl}/terms`);
                }}
                activeOpacity={0.7}
              >
                <Text style={[innerStyles.docLink, { color: p.accent }]}>
                  View full documentation ↗
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={helpOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handleHelpClose}
        accessibilityViewIsModal
      >
        <View style={innerStyles.modalContainer}>
          <Pressable
            style={[
              innerStyles.backdrop,
              {
                backgroundColor: p.isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
              },
            ]}
            onPress={handleHelpClose}
          />
          <View
            style={[
              innerStyles.sheet,
              {
                backgroundColor: p.isDark ? '#0d0d1f' : '#f8fafb',
                borderColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
              },
            ]}
          >
            <View
              style={[
                innerStyles.handle,
                {
                  backgroundColor: p.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
                },
              ]}
            />
            <View
              style={[
                innerStyles.sheetHeader,
                {
                  borderBottomColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <Text style={[innerStyles.sheetTitle, { color: p.textPrimary }]}>
                {t('footer.help')}
              </Text>
              <TouchableOpacity
                onPress={handleHelpClose}
                activeOpacity={0.75}
                style={innerStyles.closeBtn}
              >
                <Text style={[innerStyles.closeBtnText, { color: p.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={innerStyles.contentScroll}
              contentContainerStyle={innerStyles.contentContainer}
              showsVerticalScrollIndicator={false}
              scrollEnabled
            >
              <Text style={[innerStyles.helpSection, { color: p.textPrimary }]}>Getting Help</Text>
              <Text style={[innerStyles.helpText, { color: p.textMuted }]}>
                For support and assistance, visit our documentation or contact the support team.
              </Text>
            </ScrollView>
            {/* Documentation link footer */}
            <View
              style={[
                innerStyles.drawerFooter,
                {
                  borderTopColor: p.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  void Linking.openURL(docsBaseUrl);
                }}
                activeOpacity={0.7}
              >
                <Text style={[innerStyles.docLink, { color: p.accent }]}>View documentation ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const innerStyles = StyleSheet.create({
  // Footer — centered layout (no divider line)
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: -spacing[4],
    marginBottom: -spacing[4],
    marginTop: spacing[2],
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[2],
  },

  // Copyright text — centered
  copyrightText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Policy row — Privacy · Terms (centered, single line)
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  // Text link style for Privacy/Terms
  linkContainer: {
    alignItems: 'center',
    gap: 2,
    minHeight: 22, // Reserve space for text + underline to prevent height shift
  },
  linkText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  linkUnderline: {
    height: 1.5,
    width: '100%',
    borderRadius: 1,
  },

  // Separator between items
  separator: {
    fontSize: fontSize.xs,
    opacity: 0.4,
  },

  // Controls row — Help + Version (centered)
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  // Help button (minimal, circular border — non-functional like landing footer)
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Policy drawer content
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[6],
  },

  // Headings
  heading1: {
    fontSize: fontSize.base,
    fontWeight: '700',
    marginTop: spacing[4],
    marginBottom: spacing[2],
    lineHeight: 28,
  },
  heading2: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing[3],
    marginBottom: spacing[2],
    lineHeight: 24,
  },
  heading3: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: spacing[2],
    marginBottom: spacing[1],
    lineHeight: 20,
  },
  heading4: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing[2],
    marginBottom: spacing[1],
    lineHeight: 20,
  },
  heading5: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing[1],
    marginBottom: spacing[1],
    lineHeight: 18,
  },
  heading6: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: spacing[1],
    marginBottom: spacing[1],
    lineHeight: 18,
  },

  // List
  listItem: {
    flexDirection: 'row',
    marginVertical: spacing[1],
    marginLeft: spacing[2],
  },
  listBullet: {
    fontSize: fontSize.sm,
    marginRight: spacing[2],
    lineHeight: 20,
    marginTop: 1,
  },
  listItemText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  // Paragraph
  paragraph: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginVertical: spacing[2],
  },

  // States
  loadingText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing[8],
    fontStyle: 'italic',
  },

  // Help modal content
  helpSection: {
    fontSize: fontSize.base,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  helpText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing[4],
  },

  // Drawer footer with documentation link
  drawerFooter: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  docLink: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Policy modals
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.full,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
