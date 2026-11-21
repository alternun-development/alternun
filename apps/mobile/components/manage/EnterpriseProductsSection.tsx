import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { EnterpriseLocaleTabs } from './EnterpriseLocaleTabs';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { EnterpriseSectionProps, ProductDraft, ProductRowProps } from './types';
import {
  productInput,
  type EnterpriseLocale,
  type ManagedProduct,
  type ProductTextField,
} from '../../utils/enterpriseManage';

const EMPTY: ProductDraft = {
  name: '',
  description: '',
  airsMin: '',
  airsMax: '',
  airsNote: '',
  en: { name: '', description: '', airsNote: '' },
};

export function productDraftFrom(product: ManagedProduct): ProductDraft {
  const en = product.translations?.en;
  return {
    name: product.name,
    description: product.description ?? '',
    airsMin: product.airsMin === null ? '' : String(product.airsMin),
    airsMax: product.airsMax === null ? '' : String(product.airsMax),
    airsNote: product.airsNote ?? '',
    en: { name: en?.name ?? '', description: en?.description ?? '', airsNote: en?.airsNote ?? '' },
  };
}

function ProductRow({
  initial,
  locale,
  palette,
  t,
  busy,
  submitLabel,
  onSubmit,
  onDelete,
  testID,
}: ProductRowProps): React.JSX.Element {
  const [draft, setDraft] = useState(initial);
  // Text follows the selected language; Spanish is the base text.
  const textField = (key: ProductTextField) => (
    <ManageField
      testID={`${testID}-${key}`}
      label={t(`manage.enterprise.products.${key}`)}
      value={locale === 'es' ? draft[key] : draft.en[key]}
      onChange={(value) =>
        setDraft(
          locale === 'es'
            ? { ...draft, [key]: value }
            : { ...draft, en: { ...draft.en, [key]: value } }
        )
      }
      palette={palette}
    />
  );
  const airsField = (key: 'airsMin' | 'airsMax') => (
    <ManageField
      testID={`${testID}-${key}`}
      label={t(`manage.enterprise.products.${key}`)}
      value={draft[key]}
      onChange={(value) => setDraft({ ...draft, [key]: value.replace(/[^\d]/g, '') })}
      palette={palette}
    />
  );
  return (
    <View
      testID={testID}
      style={[manageStyles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      {textField('name')}
      {textField('description')}
      <View style={manageStyles.row}>
        <View style={{ flex: 1, minWidth: 120 }}>{airsField('airsMin')}</View>
        <View style={{ flex: 1, minWidth: 120 }}>{airsField('airsMax')}</View>
      </View>
      {textField('airsNote')}
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
  const [locale, setLocale] = useState<EnterpriseLocale>('es');
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
    save: (input: NonNullable<ReturnType<typeof productInput>>) => Promise<unknown>,
    stored?: ManagedProduct['translations']
  ) {
    return async (draft: ProductDraft): Promise<boolean> => {
      const input = productInput(draft, stored);
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
      <EnterpriseLocaleTabs
        testID='enterprise-products-locale'
        selected={locale}
        onSelect={setLocale}
        palette={palette}
        t={t}
      />
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
          locale={locale}
          palette={palette}
          t={t}
          busy={busy}
          submitLabel={t('manage.enterprise.products.save')}
          onSubmit={submitWith(
            (input) => client.updateProduct(product.id, input),
            product.translations
          )}
          onDelete={() => void run(() => client.deleteProduct(product.id))}
        />
      ))}
      {/* New products start in Spanish, the base text; English is added once they exist. */}
      {locale === 'es' ? (
        <ProductRow
          testID='enterprise-product-new'
          initial={EMPTY}
          locale={locale}
          palette={palette}
          t={t}
          busy={busy}
          submitLabel={t('manage.enterprise.products.add')}
          onSubmit={submitWith((input) => client.createProduct(input))}
        />
      ) : null}
    </View>
  );
}
