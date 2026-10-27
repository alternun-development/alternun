import { useState } from 'react';
import { requestMarketplace, type Enterprise } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { isValidSlug } from '../project-create-wizard';
import type { AdminRole } from '../../../auth/oidc-client';
import type {
  EnterpriseDraft,
  EnterpriseEditorProps,
  EnterprisePatch,
} from './enterprise-editor.types';

const countryPattern = /^[A-Z]{2}$/;

export function enterpriseDraft(enterprise?: Enterprise): EnterpriseDraft {
  return {
    displayName: enterprise?.displayName ?? '',
    slug: enterprise?.slug ?? '',
    legalName: enterprise?.legalName ?? '',
    countryCode: enterprise?.countryCode ?? '',
    websiteUrl: enterprise?.websiteUrl ?? '',
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// Mirrors the API: only global admins change the legal name.
export function canEditLegalName(roles: readonly AdminRole[]): boolean {
  return roles.some((role) => role === 'platform_owner' || role === 'internal_admin');
}

// The API accepts no empty values, so a stored value can change but not be cleared.
export function validateEnterpriseDraft(
  draft: EnterpriseDraft,
  current?: Enterprise
): Record<string, string> {
  const copy = marketplaceCopy.enterpriseForm.validation;
  const errors: Record<string, string> = {};
  if (!draft.displayName.trim()) errors.displayName = copy.name;
  if (!current && !isValidSlug(draft.slug)) errors.slug = copy.slug;
  const country = draft.countryCode.trim();
  if (country && !countryPattern.test(country)) errors.countryCode = copy.country;
  const website = draft.websiteUrl.trim();
  if (website && !isHttpsUrl(website)) errors.websiteUrl = copy.website;
  if (current?.legalName && !draft.legalName.trim()) errors.legalName = copy.cannotClear;
  if (current?.countryCode && !country) errors.countryCode = copy.cannotClear;
  if (current?.websiteUrl && !website) errors.websiteUrl = copy.cannotClear;
  return errors;
}

export function enterpriseCreateBody(draft: EnterpriseDraft): Record<string, string> {
  const body: Record<string, string> = {
    displayName: draft.displayName.trim(),
    slug: draft.slug.trim(),
  };
  if (draft.legalName.trim()) body.legalName = draft.legalName.trim();
  if (draft.countryCode.trim()) body.countryCode = draft.countryCode.trim();
  if (draft.websiteUrl.trim()) body.websiteUrl = draft.websiteUrl.trim();
  return body;
}

export function enterpriseUpdatePatch(
  enterprise: Enterprise,
  draft: EnterpriseDraft,
  roles: readonly AdminRole[]
): EnterprisePatch {
  const patch: EnterprisePatch = {};
  const displayName = draft.displayName.trim();
  if (displayName !== enterprise.displayName) patch.displayName = displayName;
  const legalName = draft.legalName.trim();
  if (canEditLegalName(roles) && legalName && legalName !== (enterprise.legalName ?? ''))
    patch.legalName = legalName;
  const countryCode = draft.countryCode.trim();
  if (countryCode && countryCode !== (enterprise.countryCode ?? ''))
    patch.countryCode = countryCode;
  const websiteUrl = draft.websiteUrl.trim();
  if (websiteUrl && websiteUrl !== (enterprise.websiteUrl ?? '')) patch.websiteUrl = websiteUrl;
  return patch;
}

export function EnterpriseEditor({
  enterprise,
  roles,
  onSaved,
}: EnterpriseEditorProps): JSX.Element {
  const [draft, setDraft] = useState<EnterpriseDraft>(() => enterpriseDraft(enterprise));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const canEdit = hasMarketplacePermission(roles, 'enterprises:update');
  const legalEditable = canEdit && canEditLegalName(roles);
  const patch = enterpriseUpdatePatch(enterprise, draft, roles);
  const dirty = Object.keys(patch).length > 0;

  function update(field: keyof EnterpriseDraft, value: string): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function save(): Promise<void> {
    const nextErrors = validateEnterpriseDraft(draft, enterprise);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !dirty) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      const saved = await requestMarketplace<Enterprise>(
        `/v1/admin/enterprises/${encodeURIComponent(enterprise.id)}`,
        { method: 'PATCH', body: patch }
      );
      setDraft(enterpriseDraft(saved));
      onSaved(saved);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.enterpriseForm.editTitle}</h3>
      {requestError ? <p className='error-text'>{marketplaceErrorMessage(requestError)}</p> : null}
      <div className='marketplace-form-grid'>
        <label>
          <span>{marketplaceCopy.enterpriseForm.name}</span>
          <input
            disabled={!canEdit}
            value={draft.displayName}
            onChange={(event) => update('displayName', event.target.value)}
          />
          {errors.displayName ? <strong className='error-text'>{errors.displayName}</strong> : null}
        </label>
        <label>
          <span>{marketplaceCopy.enterpriseForm.slug}</span>
          <input disabled value={draft.slug} />
          <small>{marketplaceCopy.enterpriseForm.slugHint}</small>
        </label>
        <label>
          <span>{marketplaceCopy.enterpriseForm.legalName}</span>
          <input
            disabled={!legalEditable}
            value={draft.legalName}
            onChange={(event) => update('legalName', event.target.value)}
          />
          {canEdit && !legalEditable ? (
            <small>{marketplaceCopy.enterpriseForm.legalNameReadOnly}</small>
          ) : null}
          {errors.legalName ? <strong className='error-text'>{errors.legalName}</strong> : null}
        </label>
        <label>
          <span>{marketplaceCopy.enterpriseForm.country}</span>
          <input
            disabled={!canEdit}
            maxLength={2}
            value={draft.countryCode}
            onChange={(event) => update('countryCode', event.target.value.toUpperCase())}
          />
          <small>{marketplaceCopy.enterpriseForm.countryHint}</small>
          {errors.countryCode ? <strong className='error-text'>{errors.countryCode}</strong> : null}
        </label>
        <label>
          <span>{marketplaceCopy.enterpriseForm.website}</span>
          <input
            disabled={!canEdit}
            type='url'
            value={draft.websiteUrl}
            placeholder={marketplaceCopy.enterpriseForm.websitePlaceholder}
            onChange={(event) => update('websiteUrl', event.target.value)}
          />
          {errors.websiteUrl ? <strong className='error-text'>{errors.websiteUrl}</strong> : null}
        </label>
      </div>
      {canEdit ? (
        <div className='marketplace-form-actions'>
          {dirty ? <small>{marketplaceCopy.edit.unsaved}</small> : null}
          <button
            className='primary-button'
            disabled={saving || !dirty}
            onClick={() => void save()}
            type='button'
          >
            {saving ? marketplaceCopy.edit.saving : marketplaceCopy.edit.save}
          </button>
        </div>
      ) : null}
    </section>
  );
}
