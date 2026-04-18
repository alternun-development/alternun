/**
 * PolicyDrawer — Alternun Design System
 *
 * Reusable policy drawer (privacy, terms) compatible with React Native (Expo)
 * and Expo Web (Next.js via RN Web). Fetches markdown content from an API endpoint
 * and presents it in a compact pill trigger + bottom-sheet modal.
 *
 * Collapsed:  [Privacy ∨]  or  [Terms ∨]
 * Expanded:   Bottom-sheet modal with scrollable markdown content
 *
 * Usage:
 *   <PolicyDrawer
 *     type="privacy"
 *     apiUrl="https://testnet.api.alternun.co"
 *     locale="en"
 *     triggerLabel="Privacy Policy"
 *   />
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, spacing } from '../tokens/spacing';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolicyDrawerProps {
  /** Type of policy: 'privacy' or 'terms' */
  type: 'privacy' | 'terms';
  /** Base API URL, e.g. "https://testnet.api.alternun.co" */
  apiUrl: string;
  /** Locale code. Default: 'en' */
  locale?: 'en' | 'es' | 'th';
  /** Override label on the collapsed trigger */
  triggerLabel?: string;
  /** Style applied to the trigger wrapper */
  style?: ViewStyle;
}

// ── Markdown simple formatter ──────────────────────────────────────────────────

interface TextSpan {
  text: string;
  bold?: boolean;
}

/**
 * Very simple markdown formatter for policy documents:
 * - **text** → bold text
 * - Preserves newlines and paragraphs
 */
function parseMarkdownParagraph(text: string): (TextSpan | string)[] {
  const spans: (TextSpan | string)[] = [];
  let current = '';
  let inBold = false;
  let i = 0;

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      // Toggle bold
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
      current += text[i];
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

/**
 * Render a single paragraph with inline bold formatting
 */
function renderParagraph(
  text: string,
  index: number,
  textColor: string,
  accentColor: string
): React.JSX.Element {
  const spans = parseMarkdownParagraph(text);

  return (
    <Text key={index} style={[innerStyles.paragraph, { color: textColor }]}>
      {spans.map((span, idx) =>
        typeof span === 'string' ? (
          <Text key={idx}>{span}</Text>
        ) : (
          <Text key={idx} style={{ fontWeight: 'bold', color: accentColor }}>
            {span.text}
          </Text>
        )
      )}
    </Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PolicyDrawer({
  type,
  apiUrl,
  locale = 'en',
  triggerLabel,
  style,
}: PolicyDrawerProps): React.JSX.Element {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme.isDark;
  const accent = isDark ? '#1ee6b5' : '#0b5a5f';
  const textPrimary = theme.textPrimary;
  const textMuted = theme.textMuted;
  const overlayBg = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)';
  const sheetBg = isDark ? '#0d0d1f' : '#f8fafb';
  const borderColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)';
  const pillBg = isDark ? `${accent}22` : `${accent}18`;
  const pillBorder = isDark ? `${accent}44` : `${accent}55`;

  const label = triggerLabel ?? (type === 'privacy' ? 'Privacy' : 'Terms');

  // Fetch content when drawer opens
  useEffect(() => {
    if (!open || content !== null) return;

    setLoading(true);
    setError(null);

    const fetchContent = async () => {
      try {
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
  }, [open, content, apiUrl, type, locale]);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Split content into paragraphs (double newline = paragraph break)
  const paragraphs = content ? content.split(/\n\n+/).filter((p) => p.trim().length > 0) : [];

  return (
    <View style={style}>
      {/* ── Trigger pill ── */}
      <TouchableOpacity
        style={[innerStyles.triggerPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
        onPress={handleOpen}
        activeOpacity={0.75}
        accessibilityRole='button'
        accessibilityLabel={`Open ${label}`}
      >
        <Text style={[innerStyles.triggerText, { color: accent }]}>{label}</Text>
        <Text style={[innerStyles.triggerChevron, { color: accent }]}>▾</Text>
      </TouchableOpacity>

      {/* ── Bottom-sheet modal ── */}
      <Modal
        visible={open}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handleClose}
        accessibilityViewIsModal
      >
        <View style={innerStyles.modalContainer}>
          {/* Backdrop */}
          <Pressable
            style={[innerStyles.backdrop, { backgroundColor: overlayBg }]}
            onPress={handleClose}
          />

          {/* Sheet */}
          <View style={[innerStyles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            {/* Handle */}
            <View
              style={[
                innerStyles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)' },
              ]}
            />

            {/* Header */}
            <View style={[innerStyles.sheetHeader, { borderBottomColor: borderColor }]}>
              <Text style={[innerStyles.sheetTitle, { color: textPrimary }]}>{label}</Text>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.75}
                style={innerStyles.closeBtn}
              >
                <Text style={[innerStyles.closeBtnText, { color: textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={innerStyles.contentScroll}
              contentContainerStyle={innerStyles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <Text style={[innerStyles.loadingText, { color: textMuted }]}>Loading...</Text>
              ) : error ? (
                <Text style={[innerStyles.errorText, { color: '#ef4444' }]}>Error: {error}</Text>
              ) : paragraphs.length === 0 ? (
                <Text style={[innerStyles.emptyText, { color: textMuted }]}>No content</Text>
              ) : (
                <View>
                  {paragraphs.map((para, idx) => renderParagraph(para, idx, textPrimary, accent))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const innerStyles = StyleSheet.create({
  // Modal layout
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Trigger
  triggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  triggerText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  triggerChevron: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },

  // Modal backdrop
  backdrop: {
    ...StyleSheet.absoluteFill,
  },

  // Sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
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

  // Sheet header
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

  // Content scroll
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
  },

  // Text styles
  paragraph: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
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
});
