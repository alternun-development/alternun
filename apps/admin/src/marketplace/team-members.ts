import { marketplaceCopy } from './copy';
import type { Project, ProjectMembership } from './api';
import type { AddMemberBody, GrantByEmailResponse } from './team-members.types';

export const memberByEmailPath = '/v1/admin/project-memberships/by-email';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX = 320;

export function normalizeMemberEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidMemberEmail(value: string): boolean {
  const email = normalizeMemberEmail(value);
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

export function buildAddMemberBody(
  project: Pick<Project, 'id' | 'enterpriseId'>,
  email: string,
  role: ProjectMembership['role']
): AddMemberBody {
  return {
    email: normalizeMemberEmail(email),
    enterpriseId: project.enterpriseId,
    projectId: project.id,
    scopeType: 'project',
    role,
  };
}

/** Names the person by email when known, so lists show people instead of numbered cards. */
export function memberLabel(
  membership: Pick<ProjectMembership, 'memberEmail'>,
  index: number
): string {
  const email = membership.memberEmail?.trim();
  if (email) return email;
  return `${marketplaceCopy.projectDetail.team.member} ${index + 1}`;
}

/** The membership is saved either way; the note says when the sign-in group needs a manual look. */
export function addedMessage(response: Pick<GrantByEmailResponse, 'groupSync'>): string {
  return response.groupSync === 'added'
    ? marketplaceCopy.teamEditor.added
    : marketplaceCopy.teamEditor.addedGroupNotSynced;
}
