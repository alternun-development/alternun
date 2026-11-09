import React from 'react';
import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { AdminAccessScope } from '../../utils/adminAccess';
import type { RoleChipsProps } from './RoleChips.types';

// Highest first: the banner shows roles in this order.
const ROLE_ORDER = [
  'platform_owner',
  'internal_admin',
  'moderator',
  'partner_operator',
  'sub_admin',
  'partner_readonly',
];

export function sortRoles(roles: readonly string[]): string[] {
  return ROLE_ORDER.filter((role) => roles.includes(role));
}

function scopeTarget(scope: AdminAccessScope): string {
  return scope.projectSlug ?? scope.enterpriseSlug ?? scope.projectId ?? scope.enterpriseId;
}

/** Admin roles of the user as chips; "User" when there are none. */
export function RoleChips({
  roles,
  scopes = [],
  showScopes = false,
  accent,
  muted,
  align = 'center',
}: RoleChipsProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const known = sortRoles(roles);

  if (known.length === 0) {
    return (
      <Text testID='role-chips-none' style={[styles.none, { color: muted, alignSelf: align }]}>
        {t('profile.roles.none', undefined, 'User')}
      </Text>
    );
  }

  return (
    <View testID='role-chips' style={[styles.wrap, { justifyContent: align }]}>
      {known.map((role) => {
        const targets = showScopes
          ? scopes.filter((scope) => scope.role === role).map(scopeTarget)
          : [];
        return (
          <View key={role} style={styles.item}>
            <View
              testID={`role-chip-${role}`}
              style={[styles.chip, { borderColor: `${accent}55`, backgroundColor: `${accent}14` }]}
            >
              <ShieldCheck size={12} color={accent} />
              <Text style={[styles.label, { color: accent }]}>
                {t(`profile.roles.labels.${role}`, undefined, role)}
              </Text>
            </View>
            {targets.length > 0 ? (
              <Text style={[styles.scope, { color: muted }]}>
                {t(
                  'profile.roles.scoped',
                  { target: targets.join(', ') },
                  `On ${targets.join(', ')}`
                )}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  item: { gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { fontSize: 11, fontWeight: '800' },
  scope: { fontSize: 11, paddingLeft: 4 },
  none: { fontSize: 12 },
});
