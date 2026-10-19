import type { AdminRole } from '../../../auth/oidc-client';
import type { Project, ProjectMembership } from '../../../marketplace/api';

export type MembershipRole = ProjectMembership['role'];

export type TeamEditorProps = {
  project: Project;
  memberships: ProjectMembership[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};
