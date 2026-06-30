import { StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

export default function TestnetBanner(): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');

  if (!isTestnetRuntime()) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents='none'>
      <Text style={styles.label}>
        {t('shared.testnetBanner.label', undefined, 'Testnet — no real funds')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f59e0b',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#1f1300',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
