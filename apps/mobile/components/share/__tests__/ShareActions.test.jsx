import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import ShareActions from '../ShareActions';
import ShareSheet from '../ShareSheet';
import ShareButton from '../ShareButton';

jest.mock('expo-asset', () => ({ Asset: {} }));
jest.mock('expo-clipboard', () => ({}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: {} }));
jest.mock('expo-sharing', () => ({}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const flush = () => act(async () => {});

function fakeServices() {
  return {
    prepareImage: jest.fn(async () => ({ uri: 'file:///a.png' })),
    shareNative: jest.fn(async () => undefined),
    copyText: jest.fn(async () => undefined),
    downloadImage: jest.fn(async () => undefined),
    openComposer: jest.fn(),
  };
}

const content = {
  title: 'Comparte tu medalla',
  message: 'Obtuve la medalla',
  url: 'https://airs.test/explore/batis',
  image: { fileName: 'medal.png', source: 'https://cdn.test/medal.png' },
};

const texts = (tree) =>
  tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
const press = (tree, label) =>
  tree.root
    .find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')
    .props.onPress();

describe('share actions', () => {
  it('runs every action through the share flow', async () => {
    const services = fakeServices();
    let tree;
    await act(async () => {
      tree = renderer.create(<ShareActions content={content} services={services} />);
    });
    await flush();
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['https://airs.test/explore/batis', 'Compartir', 'X', 'LinkedIn'])
    );

    await act(async () => press(tree, 'Copiar enlace'));
    await flush();
    expect(services.copyText).toHaveBeenCalledWith('https://airs.test/explore/batis');
    expect(texts(tree)).toContain('Copiado');

    await act(async () => press(tree, 'Compartir en X'));
    expect(services.openComposer).toHaveBeenCalledWith(
      'X',
      'Obtuve la medalla https://airs.test/explore/batis',
      'https://airs.test/explore/batis'
    );

    await act(async () => press(tree, 'Compartir'));
    await flush();
    expect(services.shareNative).toHaveBeenCalledWith(content, { uri: 'file:///a.png' });

    await act(async () => press(tree, 'Descargar imagen'));
    await flush();
    expect(services.downloadImage).toHaveBeenCalledWith({ uri: 'file:///a.png' }, 'medal.png');
    expect(texts(tree)).toContain('Imagen lista.');
    act(() => tree.unmount());
  });

  it('can hide the link row and be disabled', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ShareActions
          content={{ ...content, image: null }}
          showLink={false}
          disabled
          services={fakeServices()}
        />
      );
    });
    expect(texts(tree)).not.toContain('https://airs.test/explore/batis');
    expect(texts(tree)).not.toContain('Descargar');
    expect(tree.root.findByType(ShareButton).props.disabled).toBe(true);
    act(() => tree.unmount());
  });

  it('tells the person when the image is not available', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ShareActions
          content={content}
          services={{
            ...fakeServices(),
            prepareImage: jest.fn(async () => Promise.reject(new Error('x'))),
          }}
        />
      );
    });
    await flush();
    expect(texts(tree)).toContain('La imagen no está disponible; puedes compartir el enlace.');
    act(() => tree.unmount());
  });
});

describe('share sheet', () => {
  it('shows the preview, the message and closes', async () => {
    const onClose = jest.fn();
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ShareSheet visible content={content} onClose={onClose} services={fakeServices()} />
      );
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Comparte tu medalla', 'Obtuve la medalla'])
    );
    act(() =>
      tree.root
        .findAll((n) => n.props.accessibilityLabel === 'Cerrar' && n.props.onPress)[0]
        .props.onPress()
    );
    expect(onClose).toHaveBeenCalled();
    await act(async () =>
      tree.update(<ShareSheet visible={false} content={content} onClose={onClose} />)
    );
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });
});
