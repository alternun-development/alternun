import { useState } from 'react';
import {
  PARTNERSHIP_STATUSES,
  requestMarketplace,
  type Enterprise,
  type PartnershipStatus,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import {
  changedFields,
  compactRecord,
  formatInternalContacts,
  formatLines,
  formatSites,
  parseInternalContacts,
  parseLines,
  parseSites,
} from '../../../marketplace/profile';
import { canEditLegalName } from './enterprise-editor';
import { ImageUploadButton } from './image-upload-button';
import { toSafeMediaUrl } from './media-editor';
import type {
  EnterpriseProfileDraft,
  EnterpriseProfileEditorProps,
} from './enterprise-profile-editor.types';

const copy = marketplaceCopy.profile;
const contactFields = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;
const internalFields = ['partnershipStatus', 'internalContacts', 'pendingItems', 'internalNotes'];

export function enterpriseProfileDraft(enterprise: Enterprise): EnterpriseProfileDraft {
  const contact = enterprise.publicContact ?? {};
  const venue = enterprise.eventDetails?.venue ?? {};
  return {
    kind: enterprise.kind ?? 'company',
    sector: enterprise.sector ?? '',
    description: enterprise.description ?? '',
    partnershipStatus: enterprise.partnershipStatus ?? 'in_conversation',
    municipality: enterprise.location?.municipality ?? '',
    department: enterprise.location?.department ?? '',
    address: enterprise.location?.address ?? '',
    coverage: enterprise.location?.coverage ?? '',
    web: contact.web ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    whatsapp: contact.whatsapp ?? '',
    instagram: contact.instagram ?? '',
    facebook: contact.facebook ?? '',
    eventDate: enterprise.eventDetails?.date ?? '',
    venueName: venue.name ?? '',
    venueMunicipality: venue.municipality ?? '',
    venueAddress: venue.address ?? '',
    sites: formatSites(enterprise.sites),
    logoUrl: enterprise.logoUrl ?? '',
    bannerUrl: enterprise.bannerUrl ?? '',
    internalContacts: formatInternalContacts(enterprise.internalContacts),
    pendingItems: formatLines(enterprise.pendingItems),
    internalNotes: enterprise.internalNotes ?? '',
  };
}

/** The PATCH body: only changed fields, and team-only fields only for global admins. */
export function enterpriseProfilePatch(
  enterprise: Enterprise,
  draft: EnterpriseProfileDraft,
  canEditInternal: boolean
): Record<string, unknown> {
  const venue = compactRecord({
    name: draft.venueName,
    municipality: draft.venueMunicipality,
    address: draft.venueAddress,
  });
  const next: Record<string, unknown> = {
    kind: draft.kind,
    sector: draft.sector.trim(),
    description: draft.description.trim(),
    location: compactRecord({
      municipality: draft.municipality,
      department: draft.department,
      address: draft.address,
      coverage: draft.coverage,
    }),
    publicContact: compactRecord(
      Object.fromEntries(contactFields.map((field) => [field, draft[field]]))
    ),
    eventDetails:
      draft.kind === 'event'
        ? {
            ...compactRecord({ date: draft.eventDate }),
            ...(Object.keys(venue).length ? { venue } : {}),
          }
        : enterprise.eventDetails ?? {},
    sites: parseSites(draft.sites),
    logoUrl: draft.logoUrl.trim(),
    bannerUrl: draft.bannerUrl.trim(),
    partnershipStatus: draft.partnershipStatus,
    internalContacts: parseInternalContacts(draft.internalContacts),
    pendingItems: parseLines(draft.pendingItems),
    internalNotes: draft.internalNotes.trim(),
  };
  if (!canEditInternal) for (const field of internalFields) delete next[field];
  const current: Record<string, unknown> = {
    ...enterprise,
    kind: enterprise.kind ?? 'company',
    sector: enterprise.sector ?? '',
    description: enterprise.description ?? '',
    location: enterprise.location ?? {},
    publicContact: enterprise.publicContact ?? {},
    eventDetails: enterprise.eventDetails ?? {},
    sites: enterprise.sites ?? [],
    logoUrl: enterprise.logoUrl ?? '',
    bannerUrl: enterprise.bannerUrl ?? '',
    internalContacts: enterprise.internalContacts ?? [],
    pendingItems: enterprise.pendingItems ?? [],
    internalNotes: enterprise.internalNotes ?? '',
  };
  return changedFields(current, next);
}

export function EnterpriseProfileEditor({
  enterprise,
  roles,
  onSaved,
}: EnterpriseProfileEditorProps): JSX.Element {
  const [draft, setDraft] = useState(() => enterpriseProfileDraft(enterprise));
  const [requestError, setRequestError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const canEdit = hasMarketplacePermission(roles, 'enterprises:update');
  const canEditInternal = canEdit && canEditLegalName(roles);
  const patch = enterpriseProfilePatch(enterprise, draft, canEditInternal);
  const dirty = Object.keys(patch).length > 0;
  const uploadPath = `/v1/admin/enterprises/${encodeURIComponent(enterprise.id)}/upload-url`;

  function update<K extends keyof EnterpriseProfileDraft>(
    field: K,
    value: EnterpriseProfileDraft[K]
  ): void {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function text(field: keyof EnterpriseProfileDraft, label: string, multiline = false) {
    const props = {
      disabled: !canEdit,
      value: draft[field],
      onChange: (event: { target: { value: string } }) => update(field, event.target.value),
    };
    return (
      <label key={field}>
        <span>{label}</span>
        {multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
      </label>
    );
  }

  function image(field: 'logoUrl' | 'bannerUrl', kind: 'logo' | 'banner', label: string) {
    const url = toSafeMediaUrl(draft[field]);
    return (
      <div className='marketplace-image-field'>
        <span>{label}</span>
        {url ? (
          <img alt={label} className='marketplace-preview' src={url} />
        ) : (
          <small>{copy.noImage}</small>
        )}
        {canEdit ? (
          <div className='marketplace-form-actions'>
            <ImageUploadButton
              kind={kind}
              onUploaded={(publicUrl) => update(field, publicUrl)}
              uploadPath={uploadPath}
            />
            {url ? (
              <button className='secondary-button' onClick={() => update(field, '')} type='button'>
                {copy.remove}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  async function save(): Promise<void> {
    if (!dirty) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      const saved = await requestMarketplace<Enterprise>(
        `/v1/admin/enterprises/${encodeURIComponent(enterprise.id)}`,
        { method: 'PATCH', body: patch }
      );
      setDraft(enterpriseProfileDraft(saved));
      onSaved(saved);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{copy.enterpriseTitle}</h3>
      <p>{copy.intro}</p>
      {requestError ? <p className='error-text'>{marketplaceErrorMessage(requestError)}</p> : null}

      <h4>{copy.imagesHeading}</h4>
      <div className='marketplace-form-grid'>
        {image('logoUrl', 'logo', copy.logo)}
        {image('bannerUrl', 'banner', copy.banner)}
      </div>

      <div className='marketplace-form-grid'>
        <label>
          <span>{copy.kind}</span>
          <select
            disabled={!canEdit}
            value={draft.kind}
            onChange={(event) => update('kind', event.target.value as 'company' | 'event')}
          >
            <option value='company'>{copy.kinds.company}</option>
            <option value='event'>{copy.kinds.event}</option>
          </select>
        </label>
        {text('sector', copy.sector)}
        <label>
          <span>{copy.partnership}</span>
          <select
            disabled={!canEditInternal}
            value={draft.partnershipStatus}
            onChange={(event) =>
              update('partnershipStatus', event.target.value as PartnershipStatus)
            }
          >
            {PARTNERSHIP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {copy.partnershipLabels[status]}
              </option>
            ))}
          </select>
          <small>{copy.partnershipHint}</small>
        </label>
        {text('description', copy.description, true)}
      </div>

      <h4>{copy.locationHeading}</h4>
      <div className='marketplace-form-grid'>
        {text('municipality', copy.municipality)}
        {text('department', copy.department)}
        {text('address', copy.address)}
        {text('coverage', copy.coverage)}
      </div>

      <h4>{copy.contactHeading}</h4>
      <div className='marketplace-form-grid'>
        {contactFields.map((field) => text(field, copy.contact[field]))}
      </div>

      {draft.kind === 'event' ? (
        <>
          <h4>{copy.eventHeading}</h4>
          <div className='marketplace-form-grid'>
            {text('eventDate', copy.eventDate)}
            {text('venueName', copy.venueName)}
            {text('venueMunicipality', copy.municipality)}
            {text('venueAddress', copy.address)}
          </div>
        </>
      ) : null}

      <h4>{copy.sitesHeading}</h4>
      <div className='marketplace-form-grid'>{text('sites', copy.sitesHint, true)}</div>

      {canEditInternal ? (
        <>
          <h4>{copy.internalHeading}</h4>
          <p>{copy.internalHint}</p>
          <div className='marketplace-form-grid'>
            {text(
              'internalContacts',
              `${copy.internalContacts} (${copy.internalContactsHint})`,
              true
            )}
            {text('pendingItems', `${copy.pendingItems} (${copy.pendingItemsHint})`, true)}
            {text('internalNotes', copy.internalNotes, true)}
          </div>
        </>
      ) : null}

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
