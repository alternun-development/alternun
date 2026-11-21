import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import type { HonorAwardSharePreviewProps } from './honorAwards.types';

/**
 * The image a medal is shared with, above the share actions: the drawn card with the person's
 * name (as when a milestone is shared), a spinner while it is drawn, or `fallback` when it
 * cannot be drawn.
 */
export default function HonorAwardSharePreview({
  image,
  label,
  fallback,
}: HonorAwardSharePreviewProps): React.JSX.Element {
  const load = image?.load;
  const [state, setState] = useState<{ uri: string } | 'drawing' | 'failed'>(
    load ? 'drawing' : 'failed'
  );

  useEffect(() => {
    if (!load) {
      setState('failed');
      return undefined;
    }
    let active = true;
    setState('drawing');
    load()
      .then((uri) => {
        if (active) setState({ uri });
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, [load]);

  if (state === 'failed') return <>{fallback}</>;
  if (state === 'drawing') {
    return (
      <View style={[styles.card, styles.drawing]}>
        <ActivityIndicator color='#1de9b6' />
      </View>
    );
  }
  return (
    <Image
      accessibilityLabel={label}
      source={{ uri: state.uri }}
      resizeMode='contain'
      style={styles.card}
    />
  );
}

const styles = StyleSheet.create({
  // The size the milestone images are previewed at.
  card: { width: '100%', maxWidth: 260, aspectRatio: 1, borderRadius: 16 },
  drawing: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#071d19' },
});
