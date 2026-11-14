import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { honorText } from './honorAwardTheme';
import type { HonorAwardsInfoModalProps } from './honorAwards.types';

const MINT = '#1de9b6';

const PERSON_STEPS: ReadonlyArray<[string, string]> = [
  ['step1', 'Participa en una misión o actividad de un aliado de Airs.'],
  ['step2', 'El aliado registra tu participación con el correo de tu cuenta de Airs.'],
  ['step3', 'El galardón aparece en tu perfil por reclamar: tócalo para reclamarlo.'],
  ['step4', 'Después puedes inspeccionarlo, ver la misión y compartirlo.'],
];

const ALLY_STEPS: ReadonlyArray<[string, string]> = [
  [
    'allyStep1',
    'El equipo de Airs crea los galardones de tu alianza, por ejemplo una medalla por hotel.',
  ],
  [
    'allyStep2',
    'Desde aquí los otorgas con el correo de la cuenta de Airs de la persona. En estadías, agrega el número de reserva: se otorga uno por estadía.',
  ],
  [
    'allyStep3',
    'La persona lo reclama en su perfil y ve a tu organización y el proyecto que apoyas.',
  ],
  ['allyStep4', 'Los galardones que reclama tu organización se muestran en su página pública.'],
];

/** What honor awards are and how to get one (or, for allies, how to give them). */
export default function HonorAwardsInfoModal({
  visible,
  audience,
  onClose,
}: HonorAwardsInfoModalProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  if (!visible) return null;
  const ally = audience === 'ally';
  const steps = ally ? ALLY_STEPS : PERSON_STEPS;
  const key = (name: string) => `profile.honorAwards.info.${name}`;

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>{honorText(t, key('title'), 'Galardones de honor')}</Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.close', 'Cerrar')}
              onPress={onClose}
              style={styles.close}
            >
              <X size={18} color='#ffffff' />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.heading}>{honorText(t, key('whatTitle'), '¿Qué son?')}</Text>
            <Text style={styles.text}>
              {ally
                ? honorText(
                    t,
                    key('allyWhatBody'),
                    'Reconocimientos que tu organización recibe en Airs por sus hitos como aliado, y medallas que puedes otorgar a tus clientes o huéspedes por participar en tus misiones.'
                  )
                : honorText(
                    t,
                    key('whatBody'),
                    'Son medallas y trofeos especiales que reconocen tu participación en misiones de impacto positivo junto a aliados de Airs: torneos, estadías en hoteles aliados, eventos y otras actividades.'
                  )}
            </Text>
            <Text style={styles.heading}>
              {ally
                ? honorText(t, key('allyHowTitle'), '¿Cómo funcionan?')
                : honorText(t, key('howTitle'), '¿Cómo obtengo uno?')}
            </Text>
            {steps.map(([name, fallback], index) => (
              <View key={name} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.text, styles.stepText]}>
                  {honorText(t, key(name), fallback)}
                </Text>
              </View>
            ))}
            <Text style={styles.heading}>{honorText(t, key('tiersTitle'), 'Niveles')}</Text>
            <Text style={styles.text}>
              {honorText(
                t,
                key('tiersBody'),
                'Hay galardones de oro, plata y bronce, según el reconocimiento que defina cada misión, y medallas de participación.'
              )}
            </Text>
            <Text style={styles.heading}>
              {honorText(t, key('showsTitle'), '¿Qué muestra cada galardón?')}
            </Text>
            <Text style={styles.text}>
              {honorText(
                t,
                key('showsBody'),
                'La misión, el aliado que la apoya, el proyecto de impacto positivo al que aportaste y los Airs asociados.'
              )}
            </Text>
            {ally ? null : (
              <Text style={[styles.text, styles.hint]}>
                {honorText(
                  t,
                  key('demoHint'),
                  'Toca un espacio disponible para ver una demostración.'
                )}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,7,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#04140f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.25)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: { color: MINT, fontSize: 22, fontWeight: '800', flex: 1 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  body: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  heading: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginTop: 12 },
  text: { color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(29,233,182,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: MINT, fontWeight: '800', fontSize: 12 },
  stepText: { flex: 1 },
  hint: { color: MINT, marginTop: 12, fontWeight: '700' },
});
