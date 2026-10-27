import type { ProjectMembership } from './api';

export type GroupSyncStatus = 'added' | 'removed' | 'skipped' | 'failed';

// POST /v1/admin/project-memberships/by-email
export type GrantByEmailResponse = {
  membership: ProjectMembership;
  groupSync: GroupSyncStatus;
};

export type AddMemberBody = {
  email: string;
  enterpriseId: string;
  projectId: string;
  scopeType: 'project';
  role: ProjectMembership['role'];
};
