// Shapes for the Super Admin "Project access" screen (issue #249 B4).

export type ProjectAccessGap = {
  projectId: string;
  slug: string;
  missingAccount: boolean;
  missingAdmin: boolean;
};

export type AccessMembership = {
  id: string;
  projectId: string | null;
  enterpriseId: string;
  scopeType: 'enterprise' | 'project';
  role: 'partner_operator' | 'sub_admin' | 'partner_readonly';
  status: 'active' | 'revoked';
  memberEmail?: string | null;
};

export type AccessProject = {
  id: string;
  /** Every enterprise related to the project, not only its primary owner. */
  enterpriseIds: string[];
  slug: string;
  title: string;
};

export type AccessRow = {
  projectId: string;
  title: string;
  slug: string;
  admins: string[];
  moderators: string[];
  readOnly: string[];
  missingAccount: boolean;
  missingAdmin: boolean;
};
