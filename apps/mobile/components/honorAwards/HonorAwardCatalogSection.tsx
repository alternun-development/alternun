import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionContainer } from '@alternun/ui';
import { fetchPublicHonorCatalog, type HonorAwardCatalogItem } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardInspectModal from './HonorAwardInspectModal';
import { honorHowToEarn, honorText, lockedHonorAward } from './honorAwardTheme';
import type { HonorAwardCatalogSectionProps } from './honorAwards.types';

/**
 * The medals people can earn with an ally or through a project, on its public page. Tapping one
 * opens its mission (grey, as a medal not held yet) with how to earn it. Nothing shows when the
 * page has no medals or they cannot be loaded.
 */
export default function HonorAwardCatalogSection({
  source,
  c,
  load = fetchPublicHonorCatalog,
}: HonorAwardCatalogSectionProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  const [items, setItems] = useState<HonorAwardCatalogItem[]>([]);
  const [open, setOpen] = useState<HonorAwardCatalogItem | null>(null);

  const { kind, slug } = source;
  useEffect(() => {
    let active = true;
    load({ kind, slug })
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [load, kind, slug]);

  if (items.length === 0) return null;

  return (
    <SectionContainer
      title={honorText(t, 'profile.honorAwards.catalog.title', 'Medallas para obtener')}
      subtitle={honorText(
        t,
        'profile.honorAwards.catalog.subtitle',
        'Toca una medalla para ver cómo obtenerla.'
      )}
      style={{ margin: 12 }}
    >
      <View style={styles.row} testID='honor-award-catalog'>
        {items.map((item) => {
          const { recipe } = item;
          return (
            <Pressable
              key={recipe.id}
              accessibilityRole='button'
              accessibilityLabel={honorText(
                t,
                'profile.honorAwards.catalog.itemLabel',
                '{{title}}: ver cómo obtenerla',
                { title: recipe.eventName ? `${recipe.title} · ${recipe.eventName}` : recipe.title }
              )}
              onPress={() => setOpen(item)}
              style={styles.item}
            >
              <HonorAwardEmblem
                tier={recipe.tier}
                kind={recipe.kind}
                title={recipe.title}
                imageUrl={recipe.badgeImageUrl}
                artPreset={recipe.artPreset}
                size={72}
              />
              <Text numberOfLines={2} style={[styles.title, { color: c.text }]}>
                {recipe.title}
              </Text>
              {recipe.eventName ? (
                <Text numberOfLines={2} style={[styles.event, { color: c.muted }]}>
                  {recipe.eventName}
                </Text>
              ) : null}
              {recipe.airsAmount > 0 ? (
                <Text style={[styles.airs, { color: c.accent ?? '#0b5a5f' }]}>
                  {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                    amount: recipe.airsAmount,
                  })}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <HonorAwardInspectModal
        award={open ? lockedHonorAward(open) : null}
        initialStage='mission'
        locked
        howToEarn={open ? honorHowToEarn(t, open) : undefined}
        onClose={() => setOpen(null)}
      />
    </SectionContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  item: { width: 120, alignItems: 'center', gap: 4 },
  title: { alignSelf: 'stretch', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  event: { alignSelf: 'stretch', fontSize: 11, textAlign: 'center' },
  airs: { fontSize: 12, fontWeight: '800' },
});
