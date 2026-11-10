import { StyleSheet } from 'react-native';

/** Shared look of the in-app manage view (cards, fields, buttons). */
export const manageStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 18 },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primaryButtonText: { color: '#effff7', fontSize: 14, fontWeight: '900' },
  secondaryButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 19 },
  error: { color: '#f87171', fontSize: 13, fontWeight: '700' },
});
