import { useCallback, useEffect, useState } from 'react';
import { requestMarketplace, type EnterpriseProduct } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import {
  productBody,
  productCreateBody,
  productDraft,
  validateProductDraft,
  type ProductDraft,
} from '../../../marketplace/profile';
import { SectionMessage } from '../components';
import type { EnterpriseProductsEditorProps } from './enterprise-products-editor.types';

const copy = marketplaceCopy.products;

function ProductForm({
  initial,
  disabled,
  onSubmit,
  onDelete,
  submitLabel,
}: {
  initial: ProductDraft;
  disabled: boolean;
  onSubmit: (draft: ProductDraft) => Promise<boolean>;
  onDelete?: () => void;
  submitLabel: string;
}): JSX.Element {
  const [draft, setDraft] = useState(initial);
  const [invalid, setInvalid] = useState<'name' | 'airs' | null>(null);

  function update(field: keyof ProductDraft, value: string | boolean): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setInvalid(null);
  }

  async function submit(): Promise<void> {
    const problem = validateProductDraft(draft);
    setInvalid(problem);
    if (problem) return;
    if ((await onSubmit(draft)) && !onDelete) setDraft(productDraft());
  }

  return (
    <div className='marketplace-inline-form'>
      <label>
        <span>{copy.name}</span>
        <input
          disabled={disabled}
          value={draft.name}
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label>
        <span>{copy.description}</span>
        <input
          disabled={disabled}
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
        />
      </label>
      <label>
        <span>{copy.airsMin}</span>
        <input
          disabled={disabled}
          inputMode='numeric'
          value={draft.airsMin}
          onChange={(event) => update('airsMin', event.target.value)}
        />
      </label>
      <label>
        <span>{copy.airsMax}</span>
        <input
          disabled={disabled}
          inputMode='numeric'
          value={draft.airsMax}
          onChange={(event) => update('airsMax', event.target.value)}
        />
      </label>
      <label>
        <span>{copy.airsNote}</span>
        <input
          disabled={disabled}
          value={draft.airsNote}
          placeholder={copy.airsNoteHint}
          onChange={(event) => update('airsNote', event.target.value)}
        />
      </label>
      <label>
        <span>{copy.active}</span>
        <input
          checked={draft.isActive}
          disabled={disabled}
          type='checkbox'
          onChange={(event) => update('isActive', event.target.checked)}
        />
      </label>
      {invalid ? <strong className='error-text'>{copy.validation[invalid]}</strong> : null}
      <div className='marketplace-form-actions'>
        {onDelete ? (
          <button className='secondary-button' disabled={disabled} onClick={onDelete} type='button'>
            {copy.delete}
          </button>
        ) : null}
        <button
          className='primary-button'
          disabled={disabled}
          onClick={() => void submit()}
          type='button'
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export function EnterpriseProductsEditor({
  enterprise,
  roles,
  onChanged,
}: EnterpriseProductsEditorProps): JSX.Element {
  const [products, setProducts] = useState<EnterpriseProduct[] | null>(null);
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<EnterpriseProduct>();
  const canEdit = hasMarketplacePermission(roles, 'enterprises:update');
  const basePath = `/v1/admin/enterprises/${encodeURIComponent(enterprise.id)}/products`;

  const load = useCallback(() => {
    void requestMarketplace<EnterpriseProduct[]>(basePath).then(setProducts).catch(setError);
  }, [basePath]);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setSaving(true);
    setError(undefined);
    try {
      await action();
      load();
      onChanged(marketplaceCopy.edit.success);
      return true;
    } catch (requestError) {
      setError(requestError);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{copy.heading}</h3>
      <p>{copy.intro}</p>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {products?.length === 0 ? <SectionMessage>{copy.empty}</SectionMessage> : null}
      {products?.map((product) => (
        <ProductForm
          disabled={!canEdit || saving}
          initial={productDraft(product)}
          key={`${product.id}-${product.airsMin}-${product.airsMax}-${product.name}`}
          onDelete={() => setDeleting(product)}
          onSubmit={(draft) =>
            run(() =>
              requestMarketplace(`${basePath}/${encodeURIComponent(product.id)}`, {
                method: 'PATCH',
                body: productBody(draft),
              })
            )
          }
          submitLabel={copy.save}
        />
      ))}
      {canEdit ? (
        <ProductForm
          disabled={saving}
          initial={productDraft()}
          onSubmit={(draft) =>
            run(() =>
              requestMarketplace(basePath, {
                method: 'POST',
                body: { ...productCreateBody(draft), sortOrder: products?.length ?? 0 },
              })
            )
          }
          submitLabel={copy.add}
        />
      ) : null}
      {deleting ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{copy.deleteConfirm}</h4>
          <p>{deleting.name}</p>
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              onClick={() => setDeleting(undefined)}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() =>
                void run(() =>
                  requestMarketplace(`${basePath}/${encodeURIComponent(deleting.id)}`, {
                    method: 'DELETE',
                  })
                ).then(() => setDeleting(undefined))
              }
              type='button'
            >
              {copy.delete}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
