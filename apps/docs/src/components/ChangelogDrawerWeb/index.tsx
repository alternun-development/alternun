/**
 * ChangelogDrawerWeb — Docusaurus Version
 *
 * Web-compatible changelog drawer for Docusaurus documentation.
 * Displays a version pill that opens a modal dialog with paginated changelog entries.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access */

import React, { useCallback, useMemo, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { parseChangelog, type ChangelogEntry } from '../../utils/getChangelog';
import useIsBrowser from '@docusaurus/useIsBrowser';
import styles from './styles.module.css';

interface ChangelogDrawerWebProps {
  /** Raw CHANGELOG.md string */
  changelog: string;
  /** GitHub repository base URL, e.g. "https://github.com/org/repo" */
  githubUrl?: string;
  /** Number of versions shown per page. Default: 3 */
  pageSize?: number;
  /** Override label on the collapsed trigger. Default: "v{latest}" */
  triggerLabel?: string;
  /** Use localized labels. Default: true */
  useLocalizedLabels?: boolean;
}

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

function getLocalizedLabels(locale: string): Record<string, string> {
  const labels: Record<string, Record<string, string>> = {
    en: {
      releaseHistory: 'Release History',
      latest: 'latest',
      tag: 'tag',
      diff: 'diff',
      newer: '← Newer',
      older: 'Older →',
      viewAllReleases: 'View all releases',
      noChanges: 'No changelog entries found.',
      noDocumented: 'No documented changes.',
    },
    es: {
      releaseHistory: 'Historial de Versiones',
      latest: 'más reciente',
      tag: 'etiqueta',
      diff: 'diferencia',
      newer: '← Más Reciente',
      older: 'Más Antiguo →',
      viewAllReleases: 'Ver todas las versiones',
      noChanges: 'No se encontraron entradas de cambios.',
      noDocumented: 'Sin cambios documentados.',
    },
    th: {
      releaseHistory: 'ประวัติการปล่อยรุ่น',
      latest: 'ล่าสุด',
      tag: 'แท็ก',
      diff: 'ความแตกต่าง',
      newer: '← ล่าสุด',
      older: 'เก่าลง →',
      viewAllReleases: 'ดูการปล่อยรุ่นทั้งหมด',
      noChanges: 'ไม่พบรายการที่เปลี่ยนแปลง',
      noDocumented: 'ไม่มีการเปลี่ยนแปลงที่มีเอกสาร',
    },
  };

  return labels[locale] || labels.en;
}

function ChangelogDrawerWebContent({
  changelog,
  githubUrl,
  pageSize = 3,
  triggerLabel,
  useLocalizedLabels = true,
}: ChangelogDrawerWebProps): React.JSX.Element {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale || 'en';
  const labels = useLocalizedLabels ? getLocalizedLabels(locale) : getLocalizedLabels('en');

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const entries = useMemo((): ChangelogEntry[] => parseChangelog(changelog), [changelog]);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const visibleEntries: ChangelogEntry[] =
    entries.length > 0 ? entries.slice(page * pageSize, page * pageSize + pageSize) : [];
  const latestVersion = entries[0]?.version ?? '';

  const label = triggerLabel ?? (latestVersion ? `v${latestVersion}` : 'changelog');

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
    <>
      {/* Trigger pill */}
      <button
        className={styles.triggerPill}
        onClick={handleOpen}
        aria-label={`Open changelog — ${label}`}
      >
        <span className={styles.triggerText}>{label}</span>
        <span className={styles.triggerChevron}>▾</span>
      </button>

      {/* Modal backdrop + content */}
      {open && (
        <>
          <div className={styles.backdrop} onClick={handleClose} aria-hidden />
          <div className={styles.modalContainer}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
              {/* Handle */}
              <div className={styles.handle} />

              {/* Header */}
              <div className={styles.sheetHeader}>
                <div className={styles.sheetHeaderLeft}>
                  <h3 className={styles.sheetTitle}>
                    {labels.releaseHistory}
                    {latestVersion ? ` • v${latestVersion}` : ''}
                  </h3>
                  {totalPages > 1 && (
                    <span className={styles.pageLabel}>
                      {page + 1}/{totalPages}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className={styles.closeBtn}
                  aria-label='Close changelog'
                >
                  ✕
                </button>
              </div>

              {/* Entries */}
              <div className={styles.entriesScroll}>
                <div className={styles.entriesContent}>
                  {visibleEntries.length === 0 ? (
                    <p className={styles.emptyState}>{labels.noChanges}</p>
                  ) : (
                    visibleEntries.map((entry, idx) => (
                      <div key={entry.version} className={styles.entryCard}>
                        {/* Version header */}
                        <div className={styles.versionHeader}>
                          <div className={styles.versionMeta}>
                            <span className={styles.versionText}>v{entry.version}</span>
                            {idx === 0 && page === 0 && (
                              <span className={styles.latestPill}>{labels.latest}</span>
                            )}
                            <span className={styles.dateText}>{entry.date}</span>
                          </div>
                          <div className={styles.versionLinks}>
                            {githubUrl && (
                              <a
                                href={`${githubUrl.replace(/\/$/, '')}/releases/tag/v${
                                  entry.version
                                }`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.versionLink}
                              >
                                {labels.tag} ↗
                              </a>
                            )}
                            {entry.compareUrl && (
                              <a
                                href={entry.compareUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.versionLink}
                              >
                                {labels.diff} ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Entry body */}
                        <div className={styles.entryBody}>
                          {entry.hasContent ? (
                            entry.sections.map((section, sIdx) => (
                              <div key={sIdx} className={styles.sectionBlock}>
                                <h4 className={styles.sectionLabel}>
                                  {sectionIcon(section.label)} {section.label}
                                </h4>
                                <ul className={styles.itemList}>
                                  {section.items.map((item, itemIdx) => (
                                    <li key={itemIdx} className={styles.itemRow}>
                                      <span className={styles.itemBullet}>·</span>
                                      <span className={styles.itemText}>
                                        {item.scope ? (
                                          <>
                                            <strong className={styles.itemScope}>
                                              {item.scope}:
                                            </strong>{' '}
                                          </>
                                        ) : null}
                                        {item.text}
                                        {item.commitHash && item.commitUrl ? (
                                          <a
                                            href={item.commitUrl}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className={styles.commitHash}
                                          >
                                            {' '}
                                            ({item.commitHash.slice(0, 7)})
                                          </a>
                                        ) : item.commitHash ? (
                                          <span className={styles.commitHash}>
                                            {' '}
                                            ({item.commitHash.slice(0, 7)})
                                          </span>
                                        ) : null}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))
                          ) : (
                            <p className={styles.emptyEntry}>{labels.noDocumented}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pagination + GitHub link */}
              <div className={styles.sheetFooter}>
                {/* Pagination */}
                <div className={styles.pagination}>
                  <button
                    className={`${styles.pageBtn} ${page === 0 ? styles.pageBtnDisabled : ''}`}
                    onClick={prevPage}
                    disabled={page === 0}
                  >
                    {labels.newer}
                  </button>
                  <button
                    className={`${styles.pageBtn} ${
                      page >= totalPages - 1 ? styles.pageBtnDisabled : ''
                    }`}
                    onClick={nextPage}
                    disabled={page >= totalPages - 1}
                  >
                    {labels.older}
                  </button>
                </div>

                {/* GitHub releases link */}
                {releasesUrl && (
                  <a
                    href={releasesUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.githubLink}
                  >
                    {labels.viewAllReleases} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function ChangelogDrawerWeb(
  props: ChangelogDrawerWebProps
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
): React.JSX.Element | null {
  const isBrowser = useIsBrowser();

  // Only render on client side to avoid hydration mismatches
  if (!isBrowser) {
    return null;
  }

  return <ChangelogDrawerWebContent {...props} />;
}
