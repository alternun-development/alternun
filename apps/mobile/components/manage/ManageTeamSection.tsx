import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { ManageTeamSectionProps } from './types';
import {
  assignableRoles,
  ManageRequestError,
  type ManageRole,
  type TeamMember,
} from '../../utils/projectManage';

export function ManageTeamSection({
  client,
  overview,
  palette,
  t,
}: ManageTeamSectionProps): React.JSX.Element {
  const roles = assignableRoles(overview.roles, overview.isGlobalAdmin);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ManageRole | undefined>(roles[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void client
      .listTeam()
      .then((items) => setMembers(items.filter((item) => item.status === 'active')))
      .catch(() => setError(t('manage.error')));
  }, [client, t]);

  useEffect(load, [load]);

  async function add(): Promise<void> {
    if (!role || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await client.addTeamMember(email, role);
      setEmail('');
      load();
    } catch (addError) {
      setError(
        addError instanceof ManageRequestError && addError.code === 'MEMBERSHIP_USER_NOT_FOUND'
          ? t('manage.team.notFound')
          : t('manage.error')
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: TeamMember): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await client.revokeTeamMember(member.id, t('manage.team.removeReason'));
      load();
    } catch {
      setError(t('manage.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View testID='manage-team' style={{ gap: 14 }}>
      <Text style={[manageStyles.muted, { color: palette.muted }]}>{t('manage.team.intro')}</Text>
      <View
        style={[
          manageStyles.card,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        {members?.length === 0 ? (
          <Text style={[manageStyles.muted, { color: palette.muted }]}>
            {t('manage.team.empty')}
          </Text>
        ) : null}
        {(members ?? []).map((member) => (
          <View
            key={member.id}
            testID={`manage-team-member-${member.id}`}
            style={[manageStyles.row, { justifyContent: 'space-between' }]}
          >
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: palette.text, fontWeight: '800' }}>
                {member.memberEmail ?? member.memberUserId ?? '—'}
              </Text>
              <Text style={[manageStyles.muted, { color: palette.muted }]}>
                {t(`profile.roles.labels.${member.role}`, undefined, member.role)}
              </Text>
            </View>
            {roles.includes(member.role as ManageRole) ? (
              <Pressable
                testID={`manage-team-remove-${member.id}`}
                accessibilityRole='button'
                disabled={busy}
                onPress={() => void remove(member)}
                style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
              >
                <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                  {t('manage.team.remove')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {roles.length > 0 ? (
        <View
          style={[
            manageStyles.card,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <ManageField
            testID='manage-team-email'
            label={t('manage.team.email')}
            value={email}
            onChange={setEmail}
            palette={palette}
            keyboardType='email-address'
          />
          <Text style={[manageStyles.label, { color: palette.muted }]}>
            {t('manage.team.role')}
          </Text>
          <View style={manageStyles.row}>
            {roles.map((item) => {
              const selected = item === role;
              return (
                <Pressable
                  key={item}
                  testID={`manage-team-role-${item}`}
                  accessibilityRole='radio'
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => setRole(item)}
                  style={[
                    manageStyles.secondaryButton,
                    { borderColor: selected ? palette.primary : palette.border },
                    selected && { backgroundColor: palette.mist },
                  ]}
                >
                  <Text
                    style={[
                      manageStyles.secondaryButtonText,
                      { color: selected ? palette.primaryDeep : palette.text },
                    ]}
                  >
                    {t(`profile.roles.labels.${item}`, undefined, item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={manageStyles.error}>{error}</Text> : null}
          <Pressable
            testID='manage-team-add'
            accessibilityRole='button'
            disabled={busy || !email.trim()}
            onPress={() => void add()}
            style={[
              manageStyles.primaryButton,
              { backgroundColor: palette.fill, opacity: busy || !email.trim() ? 0.6 : 1 },
            ]}
          >
            <Text style={manageStyles.primaryButtonText}>{t('manage.team.add')}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.team.readOnly')}
        </Text>
      )}
    </View>
  );
}
