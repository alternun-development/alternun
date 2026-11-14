import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { InfoDraft, ManageSectionProps } from './types';
import { mergeEdited, type ManagedProject } from '../../utils/projectManage';

const CONTACT_FIELDS = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;
const LOCATION_FIELDS = ['municipality', 'department', 'address', 'coverage'] as const;

export function infoDraft(project: ManagedProject): InfoDraft {
  const block = project.content[project.defaultLocale] ?? Object.values(project.content)[0];
  return {
    title: block?.title ?? '',
    theme: block?.theme ?? '',
    location: block?.location ?? '',
    description: block?.description ?? '',
    ways: (block?.waysToContribute ?? []).join('\n'),
    alternateName: project.alternateName ?? '',
    locationDetails: Object.fromEntries(
      LOCATION_FIELDS.map((field) => [field, project.locationDetails?.[field] ?? ''])
    ) as InfoDraft['locationDetails'],
    publicContact: Object.fromEntries(
      CONTACT_FIELDS.map((field) => [field, project.publicContact?.[field] ?? ''])
    ) as InfoDraft['publicContact'],
  };
}

/** PATCH body: the localized content block, plus the profile when the role may edit it. */
export function infoPatch(
  project: ManagedProject,
  draft: InfoDraft,
  canEditProfile: boolean
): Record<string, unknown> {
  const locale = project.defaultLocale;
  const current = project.content[locale] ?? Object.values(project.content)[0];
  const patch: Record<string, unknown> = {
    content: {
      ...project.content,
      [locale]: {
        ...current,
        title: draft.title.trim(),
        theme: draft.theme.trim(),
        location: draft.location.trim(),
        description: draft.description.trim(),
        waysToContribute: draft.ways
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      },
    },
  };
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
}: ManageSectionProps): React.JSX.Element {
  // The section is keyed by the saved record, so this stays the last saved state.
  const [savedDraft] = useState(() => infoDraft(overview.project));
  const [draft, setDraft] = useState(savedDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = overview.can.editContent;
  const profileEditable = overview.can.editProfile;
  const set = useMemo(
    () => (patch: Partial<InfoDraft>) => setDraft((current) => ({ ...current, ...patch })),
    []
  );

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const saved = await client.updateProject(infoPatch(overview.project, draft, profileEditable));
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
        <ManageField
          testID='manage-info-title'
          label={t('manage.info.title')}
          value={draft.title}
          onChange={(title) => set({ title })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          label={t('manage.info.theme')}
          value={draft.theme}
          onChange={(theme) => set({ theme })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          label={t('manage.info.location')}
          value={draft.location}
          onChange={(location) => set({ location })}
          palette={palette}
          editable={editable}
        />
        <ManageField
          testID='manage-info-description'
          label={t('manage.info.description')}
          value={draft.description}
          onChange={(description) => set({ description })}
          palette={palette}
          editable={editable}
          multiline
        />
        <ManageField
          label={t('manage.info.ways')}
          value={draft.ways}
          onChange={(ways) => set({ ways })}
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
