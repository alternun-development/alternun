/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GallerySlider, galleryIndexAt, gallerySlideWidth } from '../GallerySlider';

const images = [
  { url: 'https://cdn.example/one.jpg', altText: 'Campo de práctica' },
  { url: 'https://cdn.example/two.jpg', altText: '' },
  { url: 'https://cdn.example/three.jpg', altText: 'Afiche del tour' },
];
const labels = {
  previous: 'Foto anterior',
  next: 'Foto siguiente',
  photo: (index: number, total: number) => `Foto ${index} de ${total}`,
};
const colors = { accent: '#0b5a5f', muted: '#ccc' };

let scrollTo: jest.Mock;

function render(
  props: Partial<React.ComponentProps<typeof GallerySlider>> = {}
): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <GallerySlider
        images={images}
        fallbackAlt='Swing Golf Colombia'
        colors={colors}
        labels={labels}
        {...props}
      />,
      { createNodeMock: () => ({ scrollTo }) }
    );
  });
  return renderer!;
}

function layout(renderer: ReactTestRenderer, width = 400): void {
  act(() => {
    renderer.root
      .findByProps({ testID: 'gallery-slider' })
      .props.onLayout({ nativeEvent: { layout: { width } } });
  });
  // The jest ScrollView is a mock component: watch its own scrollTo.
  const instance = renderer.root.findAllByType(ScrollView as never)[0]?.instance as
    | { scrollTo: (options: unknown) => void }
    | undefined;
  if (instance) instance.scrollTo = scrollTo;
}

// The outermost node of each test id (Animated and Pressable wrap the same id twice).
const byTestId = (renderer: ReactTestRenderer, testID: string) =>
  renderer.root.findAll(
    (node) => node.props.testID === testID && node.parent?.props.testID !== testID
  );

beforeEach(() => {
  scrollTo = jest.fn();
});

it('sizes photos so the neighbors peek in and finds the photo in focus', () => {
  expect(gallerySlideWidth(400)).toBe(320);
  expect(gallerySlideWidth(200)).toBe(240);
  expect(gallerySlideWidth(1400)).toBe(560);
  expect(galleryIndexAt(0, 334, 3)).toBe(0);
  expect(galleryIndexAt(500, 334, 3)).toBe(1);
  expect(galleryIndexAt(5000, 334, 3)).toBe(2);
  expect(galleryIndexAt(-20, 334, 3)).toBe(0);
  expect(galleryIndexAt(100, 0, 3)).toBe(0);
});

it('slides photo by photo with the arrows and the dots, following the scroll', () => {
  const renderer = render();
  layout(renderer);
  // 400 px wide: 320 px photos, 14 px apart, so one step is 334 px.
  expect(byTestId(renderer, 'gallery-slide')).toHaveLength(3);
  expect(byTestId(renderer, 'gallery-dot')).toHaveLength(3);
  expect(byTestId(renderer, 'gallery-previous')).toHaveLength(0);

  act(() => byTestId(renderer, 'gallery-next')[0].props.onPress());
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 334, animated: true });
  expect(byTestId(renderer, 'gallery-dot')[1].props.accessibilityState).toEqual({
    selected: true,
  });

  // A swipe to the last photo: the dots follow and the next arrow goes away.
  act(() => {
    renderer.root
      .findByType(ScrollView as never)
      .props.onScroll({ nativeEvent: { contentOffset: { x: 668 } } });
  });
  expect(byTestId(renderer, 'gallery-dot')[2].props.accessibilityState).toEqual({
    selected: true,
  });
  expect(byTestId(renderer, 'gallery-next')).toHaveLength(0);
  expect(byTestId(renderer, 'gallery-previous')).toHaveLength(1);

  act(() => byTestId(renderer, 'gallery-previous')[0].props.onPress());
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 334, animated: true });
  act(() => byTestId(renderer, 'gallery-dot')[0].props.onPress());
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });

  expect(byTestId(renderer, 'gallery-dot')[2].props.accessibilityLabel).toBe('Foto 3 de 3');
  const alts = renderer.root
    .findAll((node) => node.props.accessibilityLabel && node.props.source)
    .map((node) => node.props.accessibilityLabel);
  expect(alts).toContain('Swing Golf Colombia');
});

it('zooms the photo in focus only when animations are on', () => {
  const animatedSlider = render();
  layout(animatedSlider);
  const zoomed = StyleSheet.flatten(byTestId(animatedSlider, 'gallery-slide')[0].props.style);
  expect(zoomed.transform).toBeDefined();

  const still = render({ animated: false });
  layout(still);
  const flat = StyleSheet.flatten(byTestId(still, 'gallery-slide')[0].props.style);
  expect(flat.transform).toBeUndefined();
  act(() => byTestId(still, 'gallery-next')[0].props.onPress());
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 334, animated: false });
});

it('shows a single photo without arrows or dots, and nothing without photos', () => {
  const single = render({ images: images.slice(0, 1) });
  layout(single);
  expect(byTestId(single, 'gallery-slide')).toHaveLength(1);
  expect(byTestId(single, 'gallery-dot')).toHaveLength(0);
  expect(byTestId(single, 'gallery-next')).toHaveLength(0);

  const empty = render({ images: [] });
  expect(empty.toJSON()).toBeNull();
});
