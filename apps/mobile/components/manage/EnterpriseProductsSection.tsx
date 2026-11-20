import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { EnterpriseSectionProps, ProductDraft, ProductRowProps } from './types';
import { productInput, type ManagedProduct } from '../../utils/enterpriseManage';

const EMPTY: ProductDraft = { name: '', description: '', airsMin: '', airsMax: '', airsNote: '' };

export function productDraftFrom(product: ManagedProduct): ProductDraft {
  return {
    name: product.name,
    description: product.description ?? '',
    airsMin: product.airsMin === null ? '' : String(product.airsMin),
    airsMax: product.airsMax === null ? '' : String(product.airsMax),
    airsNote: product.airsNote ?? '',
  };
}

function ProductRow({
  initial,
  palette,
  t,
  busy,
  submitLabel,
  onSubmit,
  onDelete,
  testID,
}: ProductRowProps): React.JSX.Element {
  const [draft, setDraft] = useState(initial);
  const field = (key: keyof ProductDraft, numeric = false) => (
    <ManageField
      testID={`${testID}-${key}`}
      label={t(`manage.enterprise.products.${key}`)}
      value={draft[key]}
      onChange={(value) =>
        setDraft({ ...draft, [key]: numeric ? value.replace(/[^\d]/g, '') : value })
      }
      palette={palette}
    />
  );
  return (
    <View
      testID={testID}
      style={[manageStyles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      {field('name')}
      {field('description')}
      <View style={manageStyles.row}>
        <View style={{ flex: 1, minWidth: 120 }}>{field('airsMin', true)}</View>
        <View style={{ flex: 1, minWidth: 120 }}>{field('airsMax', true)}</View>
      </View>
      {field('airsNote')}
      <View style={manageStyles.row}>
        <Pressable
          testID={`${testID}-submit`}
          accessibilityRole='button'
          disabled={busy}
          onPress={() => {
            void onSubmit(draft).then((done) => {
              if (done && !onDelete) setDraft(EMPTY);
            });
          }}
          style={[
            manageStyles.primaryButton,
            { backgroundColor: palette.fill, opacity: busy ? 0.6 : 1 },
          ]}
        >
          <Text style={manageStyles.primaryButtonText}>{submitLabel}</Text>
        </Pressable>
        {onDelete ? (
          <Pressable
            testID={`${testID}-delete`}
            accessibilityRole='button'
            disabled={busy}
            onPress={onDelete}
            style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
          >
            <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
              {t('manage.enterprise.products.delete')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EnterpriseProductsSection({
  client,
  palette,
  t,
}: EnterpriseSectionProps): React.JSX.Element {
  const [products, setProducts] = useState<ManagedProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void client
      .listProducts()
      .then(setProducts)
      .catch(() => setError(t('manage.error')));
  }, [client, t]);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
      return true;
    } catch {
      setError(t('manage.error'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function submitWith(
    save: (input: NonNullable<ReturnType<typeof productInput>>) => Promise<unknown>
  ) {
    return async (draft: ProductDraft): Promise<boolean> => {
      const input = productInput(draft);
      if (!input) {
        setError(t('manage.enterprise.products.invalid'));
        return false;
      }
      return run(() => save(input));
    };
  }

  return (
    <View testID='enterprise-manage-products' style={{ gap: 14 }}>
      <Text style={[manageStyles.muted, { color: palette.muted }]}>
        {t('manage.enterprise.products.intro')}
      </Text>
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      {products?.length === 0 ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.enterprise.products.empty')}
        </Text>
      ) : null}
      {(products ?? []).map((product) => (
        <ProductRow
          key={`${product.id}-${product.name}-${product.airsMin}-${product.airsMax}`}
          testID={`enterprise-product-${product.id}`}
          initial={productDraftFrom(product)}
          palette={palette}
          t={t}
          busy={busy}
          submitLabel={t('manage.enterprise.products.save')}
          onSubmit={submitWith((input) => client.updateProduct(product.id, input))}
          onDelete={() => void run(() => client.deleteProduct(product.id))}
        />
      ))}
      <ProductRow
        testID='enterprise-product-new'
        initial={EMPTY}
        palette={palette}
        t={t}
        busy={busy}
        submitLabel={t('manage.enterprise.products.add')}
        onSubmit={submitWith((input) => client.createProduct(input))}
      />
    </View>
  );
}
