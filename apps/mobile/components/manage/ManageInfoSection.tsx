import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { InfoDraft, LocalizedInfoDraft, ManageSectionProps } from './types';
import { mergeEdited, type ManagedProject } from '../../utils/projectManage';

const CONTACT_FIELDS = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;
const LOCATION_FIELDS = ['municipality', 'department', 'address', 'coverage'] as const;
/** Languages every project offers in the form, besides the ones it already has. */
const CONTENT_LOCALES = ['es', 'en'];
/** The API requires these in every language it stores. */
const REQUIRED_FIELDS = ['title', 'theme', 'location', 'description'] as const;
const TEXT_FIELDS = [...REQUIRED_FIELDS, 'ways'] as const;
/** Each language in its own name, so it reads the same whatever the app language. */
const LOCALE_NAMES: Record<string, string> = { es: 'Español', en: 'English', th: 'ไทย' };

export function localeName(locale: string): string {
  return LOCALE_NAMES[locale] ?? LOCALE_NAMES[locale.split('-')[0]] ?? locale.toUpperCase();
}

/** Languages of the form: the default first, then the offered ones and any stored. */
export function contentLocales(project: ManagedProject): string[] {
  return [project.defaultLocale, ...CONTENT_LOCALES, ...Object.keys(project.content)].filter(
    (locale, index, all) => all.indexOf(locale) === index
  );
}

/** Language the form opens on: the person's app language when offered, else the default. */
export function initialLocale(project: ManagedProject, appLocale?: string): string {
  const locales = contentLocales(project);
  const base = appLocale?.split('-')[0];
  return (
    locales.find((locale) => locale === appLocale) ??
    locales.find((locale) => locale.split('-')[0] === base) ??
    project.defaultLocale
  );
}

function isEmpty(block: LocalizedInfoDraft): boolean {
  return TEXT_FIELDS.every((field) => !block[field].trim());
}

/** First language the API would reject: missing required fields (the default may not be empty). */
export function incompleteLocale(project: ManagedProject, draft: InfoDraft): string | null {
  const found = Object.entries(draft.content).find(
    ([locale, block]) =>
      (locale === project.defaultLocale || !isEmpty(block)) &&
      REQUIRED_FIELDS.some((field) => !block[field].trim())
  );
  return found?.[0] ?? null;
}

export function infoDraft(project: ManagedProject): InfoDraft {
  return {
    content: Object.fromEntries(
      contentLocales(project).map((locale) => {
        const block = project.content[locale];
        return [
          locale,
          {
            title: block?.title ?? '',
            theme: block?.theme ?? '',
            location: block?.location ?? '',
            description: block?.description ?? '',
            ways: (block?.waysToContribute ?? []).join('\n'),
          },
        ];
      })
    ),
    alternateName: project.alternateName ?? '',
    locationDetails: Object.fromEntries(
      LOCATION_FIELDS.map((field) => [field, project.locationDetails?.[field] ?? ''])
    ) as InfoDraft['locationDetails'],
    publicContact: Object.fromEntries(
      CONTACT_FIELDS.map((field) => [field, project.publicContact?.[field] ?? ''])
    ) as InfoDraft['publicContact'],
  };
}

/** PATCH body: every translated content block, plus the profile when the role may edit it. */
export function infoPatch(
  project: ManagedProject,
  draft: InfoDraft,
  canEditProfile: boolean
): Record<string, unknown> {
  const content = Object.fromEntries(
    Object.entries(draft.content)
      // An empty language stays untranslated; readers get the English or default version.
      .filter(([locale, block]) => locale === project.defaultLocale || !isEmpty(block))
      .map(([locale, block]) => [
        locale,
        {
          // Keeps stored fields the form does not show (e.g. the call-to-action copy).
          ...project.content[locale],
          title: block.title.trim(),
          theme: block.theme.trim(),
          location: block.location.trim(),
          description: block.description.trim(),
          waysToContribute: block.ways
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      ])
  );
  const patch: Record<string, unknown> = { content };
  if (canEditProfile) {
    patch.alternateName = draft.alternateName.trim();
    // Merged onto what is stored, so fields the form does not show survive.
    patch.locationDetails = mergeEdited(project.locationDetails, draft.locationDetails);
    patch.publicContact = mergeEdited(project.publicContact, draft.publicContact);
  }
  return patch;
}

export function ManageInfoSection({
  client,
  overview,
  palette,
  t,
  onChanged,
  onProjectSaved,
  locale: appLocale,
}: ManageSectionProps): React.JSX.Element {
  const { project } = overview;
  // The section is keyed by the saved record, so this stays the last saved state.
  const [savedDraft] = useState(() => infoDraft(project));
  const [draft, setDraft] = useState(savedDraft);
  const [locale, setLocale] = useState(() => initialLocale(project, appLocale));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = overview.can.editContent;
  const profileEditable = overview.can.editProfile;
  const set = useMemo(
    () => (patch: Partial<InfoDraft>) => setDraft((current) => ({ ...current, ...patch })),
    []
  );
  const localized = draft.content[locale];
  const setLocalized = (patch: Partial<LocalizedInfoDraft>): void =>
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], ...patch } },
    }));
  const untranslated = (code: string): boolean => !project.content[code];
  // What readers in an untranslated language get instead (see the API locale fallback).
  const fallbackName = localeName(project.content.en ? 'en' : project.defaultLocale);

  async function save(): Promise<void> {
    const incomplete = incompleteLocale(project, draft);
    if (incomplete) {
      setLocale(incomplete);
      setError(t('manage.info.incomplete', { language: localeName(incomplete) }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await client.updateProject(infoPatch(project, draft, profileEditable));
      onProjectSaved?.(saved);
      onChanged(t('manage.saved'));
    } catch {
      setError(t('manage.error'));
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const discard = (): void => {
    setDraft(savedDraft);
    setError(null);
  };

  return (
    <View testID='manage-info' style={{ gap: 14 }}>
      <View
        style={[
          manageStyles.card,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        <Text style={[manageStyles.label, { color: palette.muted }]}>
          {t('manage.info.language')}
        </Text>
        <View accessibilityRole='tablist' style={manageStyles.row}>
          {Object.keys(draft.content).map((code) => {
            const selected = code === locale;
            return (
              <Pressable
                key={code}
                testID={`manage-info-locale-${code}`}
                accessibilityRole='tab'
                accessibilityState={{ selected }}
                onPress={() => setLocale(code)}
                style={[
                  manageStyles.secondaryButton,
                  { borderColor: selected ? palette.fill : palette.border },
                  selected && { backgroundColor: palette.fill },
                ]}
              >
                <Text
                  style={[
                    manageStyles.secondaryButtonText,
                    { color: selected ? '#effff7' : palette.text },
                  ]}
                >
                  {localeName(code)}
                  {untranslated(code) ? ` · ${t('manage.info.missing')}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {untranslated(locale) ? (
          <Text
            testID='manage-info-missing'
            style={[manageStyles.muted, { color: palette.primaryDeep }]}
          >
            {t('manage.info.missingHint', {
              language: localeName(locale),
              fallback: fallbackName,
            })}
          </Text>
        ) : null}
        <ManageField
          testID='manage-info-title'
          label={t('manage.info.title')}
          value={localized.title}
          onChange={(title) => setLocalized({ title })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          testID='manage-info-theme'
          label={t('manage.info.theme')}
          value={localized.theme}
          onChange={(theme) => setLocalized({ theme })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          testID='manage-info-location'
          label={t('manage.info.location')}
          value={localized.location}
          onChange={(location) => setLocalized({ location })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          testID='manage-info-description'
          label={t('manage.info.description')}
          value={localized.description}
          onChange={(description) => setLocalized({ description })}
          palette={palette}
          editable={editable}
          multiline
        />
        <ManageField
          label={t('manage.info.ways')}
          value={localized.ways}
          onChange={(ways) => setLocalized({ ways })}
          palette={palette}
          editable={editable}
          multiline
        />
      </View>

      {profileEditable ? (
        <View
          style={[
            manageStyles.card,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <ManageField
            label={t('manage.info.alternateName')}
            value={draft.alternateName}
            onChange={(alternateName) => set({ alternateName })}
            palette={palette}
          />
          {LOCATION_FIELDS.map((field) => (
            <ManageField
              key={field}
              label={t(`manage.info.${field}`)}
              value={draft.locationDetails[field]}
              onChange={(value) =>
                set({ locationDetails: { ...draft.locationDetails, [field]: value } })
              }
              palette={palette}
            />
          ))}
          <Text style={[manageStyles.sectionTitle, { color: palette.text }]}>
            {t('manage.info.contact')}
          </Text>
          {CONTACT_FIELDS.map((field) => (
            <ManageField
              key={field}
              testID={`manage-info-contact-${field}`}
              label={t(`explorer.profile.contactFields.${field}`)}
              value={draft.publicContact[field]}
              onChange={(value) =>
                set({ publicContact: { ...draft.publicContact, [field]: value } })
              }
              palette={palette}
              keyboardType={field === 'email' ? 'email-address' : 'default'}
            />
          ))}
        </View>
      ) : editable ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.info.contentOnly')}
        </Text>
      ) : null}

      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      {editable ? (
        <View style={manageStyles.row}>
          <Pressable
            testID='manage-info-save'
            accessibilityRole='button'
            disabled={saving}
            onPress={() => void save()}
            style={[
              manageStyles.primaryButton,
              { backgroundColor: palette.fill, opacity: saving ? 0.6 : 1 },
            ]}
          >
            <Text style={manageStyles.primaryButtonText}>
              {saving ? t('manage.saving') : t('manage.save')}
            </Text>
          </Pressable>
          {dirty ? (
            <Pressable
              testID='manage-info-discard'
              accessibilityRole='button'
              disabled={saving}
              onPress={discard}
              style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('manage.discard')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
