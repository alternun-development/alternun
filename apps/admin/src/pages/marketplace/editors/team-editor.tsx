import { useState } from 'react';
import { adminEnv } from '../../../config/env';
import { requestMarketplace, type ProjectMembership } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import {
  hasMarketplacePermission,
  membershipRolesGrantedBy,
} from '../../../marketplace/permissions';
import { SectionMessage } from '../components';
import type { MembershipRole, TeamEditorProps } from './team-editor.types';

export function TeamEditor({
  project,
  memberships,
  roles,
  onChanged,
}: TeamEditorProps): JSX.Element {
  const allowedRoles = membershipRolesGrantedBy(roles);
  const [showAdd, setShowAdd] = useState(false);
  const [person, setPerson] = useState('');
  const [role, setRole] = useState<MembershipRole>(allowedRoles[0] ?? 'partner_readonly');
  const [removing, setRemoving] = useState<ProjectMembership>();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const canAssign = hasMarketplacePermission(roles, 'project_memberships:assign');
  const canRevoke = hasMarketplacePermission(roles, 'project_memberships:revoke');
  const active = memberships.filter((membership) => membership.status === 'active');

  async function add(): Promise<void> {
    if (!person.trim() || !allowedRoles.includes(role)) return;
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectMembership>('/v1/admin/project-memberships', {
        method: 'POST',
        body: {
          member: { issuer: adminEnv.authIssuer, subject: person.trim() },
          enterpriseId: project.enterpriseId,
          projectId: project.id,
          scopeType: 'project',
          role,
        },
      });
      setPerson('');
      setShowAdd(false);
      onChanged(marketplaceCopy.teamEditor.added);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(membership: ProjectMembership, newRole: MembershipRole): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectMembership>(
        `/v1/admin/project-memberships/${membership.id}`,
        { method: 'PATCH', body: { role: newRole } }
      );
      onChanged(marketplaceCopy.teamEditor.updated);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (!removing) return;
    if (!reason.trim()) {
      setReasonError(marketplaceCopy.teamEditor.reasonRequired);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectMembership>(
        `/v1/admin/project-memberships/${removing.id}/revoke`,
        { method: 'POST', body: { reason: reason.trim() } }
      );
      setRemoving(undefined);
      setReason('');
      onChanged(marketplaceCopy.teamEditor.removed);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <div className='panel-heading'>
        <h3>{marketplaceCopy.projectDetail.team.heading}</h3>
        {canAssign && allowedRoles.length ? (
          <button className='primary-button' onClick={() => setShowAdd(true)} type='button'>
            {marketplaceCopy.teamEditor.add}
          </button>
        ) : null}
      </div>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {!active.length ? (
        <SectionMessage>{marketplaceCopy.projectDetail.team.empty}</SectionMessage>
      ) : (
        <div className='marketplace-card-grid'>
          {active.map((membership, index) => {
            const manageable = allowedRoles.includes(membership.role);
            return (
              <article className='metric-card' key={membership.id}>
                <h4>
                  {marketplaceCopy.projectDetail.team.member} {index + 1}
                </h4>
                {canAssign && manageable ? (
                  <label>
                    <span>{marketplaceCopy.teamEditor.role}</span>
                    <select
                      disabled={saving}
                      value={membership.role}
                      onChange={(event) =>
                        void changeRole(membership, event.target.value as MembershipRole)
                      }
                    >
                      {allowedRoles.map((allowedRole) => (
                        <option key={allowedRole} value={allowedRole}>
                          {marketplaceCopy.projectDetail.team.roles[allowedRole]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p>{marketplaceCopy.projectDetail.team.roles[membership.role]}</p>
                )}
                {canRevoke && manageable ? (
                  <button
                    className='secondary-button'
                    onClick={() => setRemoving(membership)}
                    type='button'
                  >
                    {marketplaceCopy.teamEditor.remove}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {!canAssign ? <p>{marketplaceCopy.permissions.team}</p> : null}

      {showAdd ? (
        <div className='marketplace-inline-form'>
          <h4>{marketplaceCopy.teamEditor.add}</h4>
          <label>
            <span>{marketplaceCopy.teamEditor.person}</span>
            <input value={person} onChange={(event) => setPerson(event.target.value)} />
            <small>{marketplaceCopy.teamEditor.personHint}</small>
          </label>
          <label>
            <span>{marketplaceCopy.teamEditor.role}</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MembershipRole)}
            >
              {allowedRoles.map((allowedRole) => (
                <option key={allowedRole} value={allowedRole}>
                  {marketplaceCopy.projectDetail.team.roles[allowedRole]}
                </option>
              ))}
            </select>
          </label>
          <div className='marketplace-form-actions'>
            <button className='secondary-button' onClick={() => setShowAdd(false)} type='button'>
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving || !person.trim()}
              onClick={() => void add()}
              type='button'
            >
              {marketplaceCopy.teamEditor.save}
            </button>
          </div>
        </div>
      ) : null}

      {removing ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.teamEditor.removeTitle}</h4>
          <p>{marketplaceCopy.teamEditor.removeEffect}</p>
          <label>
            <span>{marketplaceCopy.teamEditor.reason}</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError('');
              }}
            />
          </label>
          {reasonError ? <strong className='error-text'>{reasonError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              onClick={() => setRemoving(undefined)}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void remove()}
              type='button'
            >
              {marketplaceCopy.actions.confirm}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
