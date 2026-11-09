import { useEffect, useState } from 'react';
import {
  PARTNERSHIP_STATUSES,
  requestMarketplace,
  type Enterprise,
  type PartnershipStatus,
  type Project,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import {
  changedFields,
  compactRecord,
  formatInternalContacts,
  formatLines,
  parseInternalContacts,
  parseLines,
} from '../../../marketplace/profile';
import { SectionMessage } from '../components';
import { canEditLegalName } from './enterprise-editor';
import type {
  LinkRelation,
  ProjectProfileDraft,
  ProjectProfileEditorProps,
} from './project-profile-editor.types';

const copy = marketplaceCopy.profile;
const linksCopy = marketplaceCopy.projectLinks;
const contactFields = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;
const internalFields = ['partnershipStatus', 'internalContacts', 'pendingItems', 'internalNotes'];
const relations: LinkRelation[] = ['sponsor', 'partner', 'operator'];

export function projectProfileDraft(project: Project): ProjectProfileDraft {
  const contact = project.publicContact ?? {};
  return {
    alternateName: project.alternateName ?? '',
    partnershipStatus: project.partnershipStatus ?? 'structuring',
    municipality: project.locationDetails?.municipality ?? '',
    department: project.locationDetails?.department ?? '',
    address: project.locationDetails?.address ?? '',
    coverage: project.locationDetails?.coverage ?? '',
    web: contact.web ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    whatsapp: contact.whatsapp ?? '',
    instagram: contact.instagram ?? '',
    facebook: contact.facebook ?? '',
    internalContacts: formatInternalContacts(project.internalContacts),
    pendingItems: formatLines(project.pendingItems),
    internalNotes: project.internalNotes ?? '',
  };
}

/** The PATCH body: only changed fields, and team-only fields only for global admins. */
export function projectProfilePatch(
  project: Project,
  draft: ProjectProfileDraft,
  canEditInternal: boolean
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    alternateName: draft.alternateName.trim(),
    locationDetails: compactRecord({
      municipality: draft.municipality,
      department: draft.department,
      address: draft.address,
      coverage: draft.coverage,
    }),
    publicContact: compactRecord(
      Object.fromEntries(contactFields.map((field) => [field, draft[field]]))
    ),
    partnershipStatus: draft.partnershipStatus,
    internalContacts: parseInternalContacts(draft.internalContacts),
    pendingItems: parseLines(draft.pendingItems),
    internalNotes: draft.internalNotes.trim(),
  };
  if (!canEditInternal) for (const field of internalFields) delete next[field];
  return changedFields(
    {
      alternateName: project.alternateName ?? '',
      locationDetails: project.locationDetails ?? {},
      publicContact: project.publicContact ?? {},
      partnershipStatus: project.partnershipStatus ?? 'structuring',
      internalContacts: project.internalContacts ?? [],
      pendingItems: project.pendingItems ?? [],
      internalNotes: project.internalNotes ?? '',
    },
    next
  );
}

/** Enterprises linked to the project other than its primary owner. */
export function linkedEnterprises(
  project: Project,
  enterprises: readonly Enterprise[]
): Array<{ enterprise: Enterprise; relation: string }> {
  return (project.enterprises ?? [])
    .filter((link) => !link.isPrimary)
    .flatMap((link) => {
      const enterprise = enterprises.find((item) => item.id === link.enterpriseId);
      return enterprise ? [{ enterprise, relation: link.relation ?? 'sponsor' }] : [];
    });
}

function ProjectLinks({
  project,
  canLink,
  onSaved,
}: {
  project: Project;
  canLink: boolean;
  onSaved: (message: string) => void;
}): JSX.Element {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selected, setSelected] = useState('');
  const [relation, setRelation] = useState<LinkRelation>('sponsor');
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const linked = linkedEnterprises(project, enterprises);
  const available = enterprises.filter(
    (enterprise) =>
      enterprise.id !== project.enterpriseId &&
      !linked.some((item) => item.enterprise.id === enterprise.id)
  );

  useEffect(() => {
    void requestMarketplace<Enterprise[]>('/v1/admin/enterprises')
      .then(setEnterprises)
      .catch(setError);
  }, []);

  async function change(enterpriseId: string, method: 'PUT' | 'DELETE'): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace(
        `/v1/admin/projects/${encodeURIComponent(project.id)}/enterprises/${encodeURIComponent(
          enterpriseId
        )}`,
        method === 'PUT' ? { method, body: { relation } } : { method }
      );
      setSelected('');
      onSaved(marketplaceCopy.edit.success);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{linksCopy.heading}</h3>
      <p>{linksCopy.intro}</p>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {linked.length === 0 ? <SectionMessage>{linksCopy.empty}</SectionMessage> : null}
      <ul>
        {linked.map(({ enterprise, relation: current }) => (
          <li key={enterprise.id}>
            {enterprise.displayName} · {linksCopy.relations[current as LinkRelation] ?? current}
            {canLink ? (
              <button
                className='secondary-button'
                disabled={saving}
                onClick={() => void change(enterprise.id, 'DELETE')}
                type='button'
              >
                {linksCopy.unlink}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canLink ? (
        <div className='marketplace-inline-form'>
          <label>
            <span>{linksCopy.enterprise}</span>
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value='' />
              {available.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {enterprise.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{linksCopy.relation}</span>
            <select
              value={relation}
              onChange={(event) => setRelation(event.target.value as LinkRelation)}
            >
              {relations.map((item) => (
                <option key={item} value={item}>
                  {linksCopy.relations[item]}
                </option>
              ))}
            </select>
          </label>
          <button
            className='primary-button'
            disabled={saving || !selected}
            onClick={() => void change(selected, 'PUT')}
            type='button'
          >
            {linksCopy.link}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function ProjectProfileEditor({
  project,
  roles,
  onSaved,
}: ProjectProfileEditorProps): JSX.Element {
  const [draft, setDraft] = useState(() => projectProfileDraft(project));
  const [requestError, setRequestError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const canEdit =
    hasMarketplacePermission(roles, 'projects:update') &&
    !roles.every((role) => role === 'moderator' || role === 'sub_admin');
  const canEditInternal = canEdit && canEditLegalName(roles);
  const patch = projectProfilePatch(project, draft, canEditInternal);
  const dirty = Object.keys(patch).length > 0;

  useEffect(() => setDraft(projectProfileDraft(project)), [project]);

  function text(field: keyof ProjectProfileDraft, label: string, multiline = false) {
    const props = {
      disabled: !canEdit,
      value: draft[field],
      onChange: (event: { target: { value: string } }) =>
        setDraft((current) => ({ ...current, [field]: event.target.value })),
    };
    return (
      <label key={field}>
        <span>{label}</span>
        {multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
      </label>
    );
  }

  async function save(): Promise<void> {
    if (!dirty) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      await requestMarketplace<Project>(`/v1/admin/projects/${encodeURIComponent(project.id)}`, {
        method: 'PATCH',
        body: patch,
      });
      onSaved(marketplaceCopy.edit.success);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className='panel'>
        <h3>{copy.projectTitle}</h3>
        <p>{copy.intro}</p>
        {requestError ? (
          <p className='error-text'>{marketplaceErrorMessage(requestError)}</p>
        ) : null}
        <div className='marketplace-form-grid'>
          {text('alternateName', copy.alternateName)}
          <label>
            <span>{copy.partnership}</span>
            <select
              disabled={!canEditInternal}
              value={draft.partnershipStatus}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  partnershipStatus: event.target.value as PartnershipStatus,
                }))
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
      <ProjectLinks project={project} canLink={canEditLegalName(roles)} onSaved={onSaved} />
    </>
  );
}
