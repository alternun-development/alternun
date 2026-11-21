import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { localeName } from './ManageInfoSection';
import { manageStyles } from './styles';
import type { EnterpriseLocaleTabsProps } from './types';
import { ENTERPRISE_LOCALES } from '../../utils/enterpriseManage';

/** Language selector of the enterprise forms: Spanish (the base text) or its English version. */
export function EnterpriseLocaleTabs({
  selected,
  onSelect,
  palette,
  t,
  testID,
}: EnterpriseLocaleTabsProps): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[manageStyles.label, { color: palette.muted }]}>
        {t('manage.info.language')}
      </Text>
      <View accessibilityRole='tablist' style={manageStyles.row}>
        {ENTERPRISE_LOCALES.map((code) => {
          const active = code === selected;
          return (
            <Pressable
              key={code}
              testID={`${testID}-${code}`}
              accessibilityRole='tab'
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(code)}
              style={[
                manageStyles.secondaryButton,
                { borderColor: active ? palette.fill : palette.border },
                active && { backgroundColor: palette.fill },
              ]}
            >
              <Text
                style={[
                  manageStyles.secondaryButtonText,
                  { color: active ? '#effff7' : palette.text },
                ]}
              >
                {localeName(code)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected === 'es' ? null : (
        <Text testID={`${testID}-hint`} style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.enterprise.translationHint', { language: localeName(selected) })}
        </Text>
      )}
    </View>
  );
}
