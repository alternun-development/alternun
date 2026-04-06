/**
 * ChangelogDrawer — Alternun Design System
 *
 * Agnostic reusable version-info drawer compatible with React Native (Expo)
 * and Expo Web (Next.js via RN Web). Parses raw CHANGELOG.md content and
 * presents it in a compact pill trigger + paginated bottom-sheet.
 *
 * Collapsed:  [v1.0.18 ∨]
 * Expanded:   Bottom-sheet modal with the last N versions (default: 3),
 *             paginated, with GitHub compare/commit links.
 *
 * Usage:
 *   import changelogRaw from '../../CHANGELOG.md';
 *
 *   <ChangelogDrawer
 *     changelog={changelogRaw}
 *     githubUrl="https://github.com/org/repo"
 *   />
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
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

export interface ChangelogItem {
  text: string;
  scope?: string;
  commitHash?: string;
  commitUrl?: string;
}

export interface ChangelogSection {
  label: string;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  compareUrl?: string;
  sections: ChangelogSection[];
  /** False when the version header has no body — empty release */
  hasContent: boolean;
}

export interface ChangelogDrawerProps {
  /** Raw CHANGELOG.md string */
  changelog: string;
  /** GitHub repository base URL, e.g. "https://github.com/org/repo" */
  githubUrl?: string;
  /** Number of versions shown per page. Default: 3 */
  pageSize?: number;
  /** Style applied to the trigger wrapper */
  style?: ViewStyle;
  /** Override label on the collapsed trigger. Default: "v{latest}" */
  triggerLabel?: string;
  /** Show the currently active/latest version highlighted. Default: true */
  highlightLatest?: boolean;
}

// ── Changelog parser ──────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
  'bug fixes': '🐛',
  features: '✨',
  'breaking changes': '⚠️',
  performance: '⚡',
  documentation: '📚',
  refactoring: '♻️',
  chore: '🔧',
  security: '🔒',
};

function sectionIcon(label: string): string {
  const key = label.toLowerCase();
  return Object.prototype.hasOwnProperty.call(SECTION_ICONS, key) ? SECTION_ICONS[key] : '•';
}

interface CommitReference {
  text: string;
  commitHash?: string;
  commitUrl?: string;
}

function isHexString(value: string): boolean {
  if (value.length < 7) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isDigit = code >= 48 && code <= 57;
    const lowerCode = code | 32;
    const isHexLetter = lowerCode >= 97 && lowerCode <= 102;

    if (!isDigit && !isHexLetter) {
      return false;
    }
  }

  return true;
}

function extractTrailingCommitReference(input: string): CommitReference {
  const trimmed = input.trim();
  const linkStart = trimmed.lastIndexOf('](');

  if (linkStart === -1) {
    return { text: input };
  }

  const hashStart = trimmed.lastIndexOf('[', linkStart);
  const urlStart = linkStart + 2;
  const urlEnd = trimmed.indexOf(')', urlStart);

  if (hashStart === -1 || urlEnd === -1) {
    return { text: input };
  }

  const commitHash = trimmed.slice(hashStart + 1, linkStart);
  const commitUrl = trimmed.slice(urlStart, urlEnd);

  if (!isHexString(commitHash)) {
    return { text: input };
  }

  for (let index = urlEnd + 1; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (char !== ')' && char !== ' ' && char !== '\t' && char !== '.') {
      return { text: input };
    }
  }

  let text = trimmed.slice(0, hashStart).trim();
  if (text.endsWith('(')) {
    text = text.slice(0, -1).trim();
  }

  return { text, commitHash, commitUrl };
}

/**
 * Parse a raw CHANGELOG.md string into structured ChangelogEntry objects.
 * Handles both formats:
 *   ## [1.0.18](compare-url) (2026-04-05)
 *   ## [1.0.18] - 2026-04-05
 * Deduplicates repeated version blocks (semantic-release sometimes emits duplicates).
 */
export function parseChangelog(raw: string): ChangelogEntry[] {
  if (!raw || raw.trim().length === 0) return [];

  // Split at every "## [" boundary (version header)
  const blocks = raw.split(/(?=^## \[)/m).filter((b) => /^## \[/.test(b.trim()));

  const entries: ChangelogEntry[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] ?? '';

    // Match: ## [1.0.18](url) (2026-04-05)  or  ## [1.0.18] - 2026-04-05
    const m = headerLine.match(
      /^## \[([^\]]+)\](?:\(([^)]+)\))?\s*(?:\((\d{4}-\d{2}-\d{2})\)|-\s*(\d{4}-\d{2}-\d{2}))/
    );
    if (!m) continue;

    const version = m[1];
    if (seen.has(version)) continue; // deduplicate
    seen.add(version);

    const compareUrl = m[2] ?? undefined;
    const date = m[3] ?? m[4] ?? '';

    // Find ### section headers within this block
    const sections: ChangelogSection[] = [];
    let currentSection: ChangelogSection | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (/^### /.test(line)) {
        currentSection = { label: line.replace(/^### /, '').trim(), items: [] };
        sections.push(currentSection);
        continue;
      }

      if (currentSection && /^- /.test(line)) {
        const itemText = line.replace(/^- /, '');

        // Extract **scope**: prefix
        const scopeMatch = itemText.match(/^\*\*([^*]+)\*\*:\s*(.*)/);
        const scope = scopeMatch?.[1];
        const text = scopeMatch ? scopeMatch[2] : itemText;
        const commitReference = extractTrailingCommitReference(text);

        currentSection.items.push({
          text: commitReference.text,
          scope,
          commitHash: commitReference.commitHash,
          commitUrl: commitReference.commitUrl,
        });
      }
    }

    entries.push({
      version,
      date,
      compareUrl,
      sections,
      hasContent: sections.length > 0,
    });
  }

  return entries;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VersionBadge({
  version,
  date,
  compareUrl,
  tagUrl,
  isLatest,
  accentColor,
  textColor,
  mutedColor,
  borderColor,
}: {
  version: string;
  date: string;
  compareUrl?: string;
  tagUrl?: string;
  isLatest: boolean;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}): React.JSX.Element {
  return (
    <View
      style={[
        innerStyles.versionHeader,
        {
          borderBottomColor: borderColor,
          backgroundColor: isLatest ? `${accentColor}0d` : 'transparent',
        },
      ]}
    >
      <View style={innerStyles.versionMeta}>
        <Text style={[innerStyles.versionText, { color: isLatest ? accentColor : textColor }]}>
          v{version}
        </Text>
        {isLatest && (
          <View style={[innerStyles.latestPill, { borderColor: `${accentColor}55` }]}>
            <Text style={[innerStyles.latestPillText, { color: accentColor }]}>latest</Text>
          </View>
        )}
        <Text style={[innerStyles.dateText, { color: mutedColor }]}>{date}</Text>
      </View>
      <View style={innerStyles.versionLinks}>
        {tagUrl ? (
          <TouchableOpacity
            onPress={() => {
              void Linking.openURL(tagUrl);
            }}
            activeOpacity={0.7}
          >
            <Text style={[innerStyles.versionLink, { color: accentColor }]}>tag ↗</Text>
          </TouchableOpacity>
        ) : null}
        {compareUrl ? (
          <TouchableOpacity
            onPress={() => {
              void Linking.openURL(compareUrl);
            }}
            activeOpacity={0.7}
          >
            <Text style={[innerStyles.versionLink, { color: accentColor }]}>diff ↗</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function SectionBlock({
  section,
  accentColor,
  textColor,
  mutedColor,
}: {
  section: ChangelogSection;
  accentColor: string;
  textColor: string;
  mutedColor: string;
}): React.JSX.Element {
  return (
    <View style={innerStyles.sectionBlock}>
      <Text style={[innerStyles.sectionLabel, { color: accentColor }]}>
        {sectionIcon(section.label)} {section.label}
      </Text>
      {section.items.map((item, idx) => (
        <View key={idx} style={innerStyles.itemRow}>
          <Text style={[innerStyles.itemBullet, { color: mutedColor }]}>·</Text>
          <Text style={[innerStyles.itemText, { color: textColor }]} numberOfLines={2}>
            {item.scope ? (
              <>
                <Text style={{ color: accentColor, fontWeight: '600' }}>{item.scope}:</Text>{' '}
              </>
            ) : null}
            {item.text}
            {item.commitHash ? (
              <Text
                style={{ color: mutedColor }}
                onPress={
                  item.commitUrl
                    ? () => {
                        void Linking.openURL(item.commitUrl ?? '');
                      }
                    : undefined
                }
              >
                {' '}
                ({item.commitHash.slice(0, 7)})
              </Text>
            ) : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyEntry({ textColor }: { textColor: string }): React.JSX.Element {
  return <Text style={[innerStyles.emptyEntry, { color: textColor }]}>No documented changes.</Text>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChangelogDrawer({
  changelog,
  githubUrl,
  pageSize = 3,
  style,
  triggerLabel,
  highlightLatest = true,
}: ChangelogDrawerProps): React.JSX.Element {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const entries = useMemo(() => parseChangelog(changelog), [changelog]);

  const totalPages = Math.ceil(entries.length / pageSize);
  const visibleEntries = entries.slice(page * pageSize, page * pageSize + pageSize);
  const latestVersion = entries[0]?.version ?? '';

  const label = triggerLabel ?? (latestVersion ? `v${latestVersion}` : 'changelog');

  const isDark = theme.isDark;
  const accent = isDark ? '#1ee6b5' : '#0b5a5f';
  const textPrimary = theme.textPrimary;
  const textMuted = theme.textMuted;
  const cardBg = isDark ? '#0d0d1f' : '#ffffff';
  const overlayBg = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)';
  const sheetBg = isDark ? '#0d0d1f' : '#f8fafb';
  const borderColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)';
  const pillBg = isDark ? `${accent}22` : `${accent}18`;
  const pillBorder = isDark ? `${accent}44` : `${accent}55`;

  const handleOpen = useCallback(() => {
    setPage(0);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const releasesUrl = githubUrl ? `${githubUrl.replace(/\/$/, '')}/tags` : undefined;

  return (
    <View style={style}>
      {/* ── Trigger pill ── */}
      <TouchableOpacity
        style={[innerStyles.triggerPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
        onPress={handleOpen}
        activeOpacity={0.75}
        accessibilityRole='button'
        accessibilityLabel={`Open changelog — ${label}`}
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
              <View style={innerStyles.sheetHeaderLeft}>
                <Text style={[innerStyles.sheetTitle, { color: textPrimary }]}>
                  Release History
                  {latestVersion ? ` • v${latestVersion}` : ''}
                </Text>
                {totalPages > 1 && (
                  <Text style={[innerStyles.pageLabel, { color: textMuted }]}>
                    {page + 1}/{totalPages}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.75}
                style={innerStyles.closeBtn}
              >
                <Text style={[innerStyles.closeBtnText, { color: textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Entries */}
            <ScrollView
              style={innerStyles.entriesScroll}
              contentContainerStyle={innerStyles.entriesContent}
              showsVerticalScrollIndicator={false}
            >
              {visibleEntries.length === 0 ? (
                <Text style={[innerStyles.emptyState, { color: textMuted }]}>
                  No changelog entries found.
                </Text>
              ) : (
                visibleEntries.map((entry, idx) => (
                  <View
                    key={entry.version}
                    style={[
                      innerStyles.entryCard,
                      {
                        backgroundColor: cardBg,
                        borderColor,
                        marginBottom: idx < visibleEntries.length - 1 ? spacing[3] : 0,
                      },
                    ]}
                  >
                    <VersionBadge
                      version={entry.version}
                      date={entry.date}
                      compareUrl={entry.compareUrl}
                      tagUrl={
                        githubUrl
                          ? `${githubUrl.replace(/\/$/, '')}/releases/tag/v${entry.version}`
                          : undefined
                      }
                      isLatest={highlightLatest && idx === 0 && page === 0}
                      accentColor={accent}
                      textColor={textPrimary}
                      mutedColor={textMuted}
                      borderColor={borderColor}
                    />
                    <View style={innerStyles.entryBody}>
                      {entry.hasContent ? (
                        entry.sections.map((section, sIdx) => (
                          <SectionBlock
                            key={sIdx}
                            section={section}
                            accentColor={accent}
                            textColor={textPrimary}
                            mutedColor={textMuted}
                          />
                        ))
                      ) : (
                        <EmptyEntry textColor={textMuted} />
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Pagination + GitHub link */}
            <View style={[innerStyles.sheetFooter, { borderTopColor: borderColor }]}>
              {/* Pagination */}
              <View style={innerStyles.pagination}>
                <TouchableOpacity
                  style={[
                    innerStyles.pageBtn,
                    { borderColor },
                    page === 0 && innerStyles.pageBtnDisabled,
                  ]}
                  onPress={prevPage}
                  disabled={page === 0}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[innerStyles.pageBtnText, { color: page === 0 ? textMuted : accent }]}
                  >
                    ← Newer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    innerStyles.pageBtn,
                    { borderColor },
                    page >= totalPages - 1 && innerStyles.pageBtnDisabled,
                  ]}
                  onPress={nextPage}
                  disabled={page >= totalPages - 1}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      innerStyles.pageBtnText,
                      { color: page >= totalPages - 1 ? textMuted : accent },
                    ]}
                  >
                    Older →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* GitHub releases link */}
              {releasesUrl ? (
                <TouchableOpacity
                  onPress={() => {
                    void Linking.openURL(releasesUrl);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[innerStyles.githubLink, { color: accent }]}>
                    View all releases ↗
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
    ...StyleSheet.absoluteFillObject,
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
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sheetTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pageLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
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

  // Entries scroll
  entriesScroll: {
    flex: 1,
  },
  entriesContent: {
    padding: spacing[4],
  },
  emptyState: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },

  // Entry card
  entryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Version header
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  versionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  versionText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  latestPill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  latestPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  versionLinks: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  versionLink: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  compareLink: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Entry body
  entryBody: {
    padding: spacing[3],
    gap: spacing[3],
  },

  // Section block
  sectionBlock: {
    gap: spacing[1],
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingLeft: spacing[1],
  },
  itemBullet: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },

  // Empty entry
  emptyEntry: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },

  // Sheet footer
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  pagination: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  githubLink: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
