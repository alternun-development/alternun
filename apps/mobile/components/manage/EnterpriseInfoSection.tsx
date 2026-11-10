import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { EnterpriseSectionProps } from './types';
import type { ManagedEnterprise } from '../../utils/enterpriseManage';
import { mergeEdited } from '../../utils/projectManage';

const LOCATION_FIELDS = ['municipality', 'department', 'address', 'coverage'] as const;
const CONTACT_FIELDS = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;

/** PATCH body for the enterprise profile; an empty description or sector clears it. */
export function enterpriseInfoPatch(
  fields: {
    displayName: string;
    sector: string;
    description: string;
    location: Record<string, string>;
    publicContact: Record<string, string>;
  },
  stored?: Pick<ManagedEnterprise, 'location' | 'publicContact'>
): Record<string, unknown> {
  return {
    displayName: fields.displayName.trim(),
    sector: fields.sector.trim(),
    description: fields.description.trim(),
    // Merged onto what is stored, so fields the form does not show survive.
    location: mergeEdited(stored?.location, fields.location),
    publicContact: mergeEdited(stored?.publicContact, fields.publicContact),
  };
}

function initial(enterprise: ManagedEnterprise) {
  return {
    displayName: enterprise.displayName,
    sector: enterprise.sector ?? '',
    description: enterprise.description ?? '',
    location: Object.fromEntries(
      LOCATION_FIELDS.map((field) => [field, enterprise.location?.[field] ?? ''])
    ),
    publicContact: Object.fromEntries(
      CONTACT_FIELDS.map((field) => [field, enterprise.publicContact?.[field] ?? ''])
    ),
  };
}

export function EnterpriseInfoSection({
  client,
  overview,
  palette,
  t,
  onChanged,
  onEnterpriseSaved,
}: EnterpriseSectionProps): React.JSX.Element {
  // The section is keyed by the saved record, so this stays the last saved state.
  const [savedDraft] = useState(() => initial(overview.enterprise));
  const [draft, setDraft] = useState(savedDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!draft.displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await client.updateEnterprise(enterpriseInfoPatch(draft, overview.enterprise));
      onEnterpriseSaved?.(saved);
      onChanged(t('manage.saved'));
    } catch {
      setError(t('manage.error'));
    } finally {
      setSaving(false);
    }
  }

  const card = [
    manageStyles.card,
    { borderColor: palette.border, backgroundColor: palette.surface },
  ];
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const discard = (): void => {
    setDraft(savedDraft);
    setError(null);
  };

  return (
    <View testID='enterprise-manage-info' style={{ gap: 14 }}>
      <View style={card}>
        <ManageField
          testID='enterprise-manage-name'
          label={t('manage.enterprise.info.name')}
          value={draft.displayName}
          onChange={(displayName) => setDraft({ ...draft, displayName })}
          palette={palette}
        />
        <ManageField
          label={t('manage.enterprise.info.sector')}
          value={draft.sector}
          onChange={(sector) => setDraft({ ...draft, sector })}
          palette={palette}
        />
        <ManageField
          testID='enterprise-manage-description'
          label={t('manage.enterprise.info.description')}
          value={draft.description}
          onChange={(description) => setDraft({ ...draft, description })}
          palette={palette}
          multiline
        />
      </View>
      <View style={card}>
        {LOCATION_FIELDS.map((field) => (
          <ManageField
            key={field}
            label={t(`manage.info.${field}`)}
            value={draft.location[field]}
            onChange={(value) =>
              setDraft({ ...draft, location: { ...draft.location, [field]: value } })
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
            testID={`enterprise-manage-contact-${field}`}
            label={t(`explorer.profile.contactFields.${field}`)}
            value={draft.publicContact[field]}
            onChange={(value) =>
              setDraft({ ...draft, publicContact: { ...draft.publicContact, [field]: value } })
            }
            palette={palette}
            keyboardType={field === 'email' ? 'email-address' : 'default'}
          />
        ))}
      </View>
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      <View style={manageStyles.row}>
        <Pressable
          testID='enterprise-manage-save'
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
            testID='enterprise-manage-discard'
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
    </View>
  );
}
