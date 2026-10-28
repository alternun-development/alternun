import { marketplaceCopy } from './copy';
import type {
  AccessMembership,
  AccessProject,
  AccessRow,
  ProjectAccessGap,
} from './project-access.types';

export const projectAccessGapsPath = '/v1/admin/project-access/gaps';

function person(membership: AccessMembership): string {
  const email = membership.memberEmail?.trim();
  return email ? email : marketplaceCopy.projectAccess.unknownPerson;
}

/**
 * One row per project: who administers it, who moderates it, and what is missing. A membership
 * counts for a project when it is active and set on that project, or on its enterprise.
 */
export function buildAccessRows(
  projects: readonly AccessProject[],
  memberships: readonly AccessMembership[],
  gaps: readonly ProjectAccessGap[]
): AccessRow[] {
  const gapByProject = new Map(gaps.map((gap) => [gap.projectId, gap]));
  const active = memberships.filter((membership) => membership.status === 'active');
  return projects
    .map((project) => {
      const relevant = active.filter((membership) =>
        membership.scopeType === 'project'
          ? membership.projectId === project.id
          : membership.enterpriseId === project.enterpriseId
      );
      const names = (role: AccessMembership['role']): string[] =>
        Array.from(new Set(relevant.filter((item) => item.role === role).map(person))).sort();
      const gap = gapByProject.get(project.id);
      return {
        projectId: project.id,
        title: project.title,
        slug: project.slug,
        admins: names('partner_operator'),
        moderators: names('sub_admin'),
        readOnly: names('partner_readonly'),
        missingAccount: gap?.missingAccount ?? false,
        missingAdmin: gap?.missingAdmin ?? false,
      };
    })
    .sort(
      (a, b) =>
        Number(b.missingAdmin || b.missingAccount) - Number(a.missingAdmin || a.missingAccount) ||
        a.title.localeCompare(b.title)
    );
}

export function countGaps(rows: readonly AccessRow[]): number {
  return rows.filter((row) => row.missingAccount || row.missingAdmin).length;
}
