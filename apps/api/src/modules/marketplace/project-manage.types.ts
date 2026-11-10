import type { EnterpriseRecord, ProjectRecord } from './marketplace.types';

/** What the signed-in Airs user can do on the in-app "Manage project" view. */
export interface ProjectManageCapabilities {
  editContent: boolean;
  /** Location, contact and alternate name; content-only roles cannot change them. */
  editProfile: boolean;
  media: boolean;
  team: boolean;
  comments: boolean;
}

export interface ProjectManageOverview {
  project: ProjectRecord;
  roles: string[];
  isGlobalAdmin: boolean;
  can: ProjectManageCapabilities;
}

export type CommentAction = 'approve' | 'reject' | 'hide' | 'restore';

export interface EnterpriseManageCapabilities {
  editInfo: boolean;
  images: boolean;
  products: boolean;
  team: boolean;
}

export interface EnterpriseManageOverview {
  enterprise: EnterpriseRecord;
  roles: string[];
  isGlobalAdmin: boolean;
  can: EnterpriseManageCapabilities;
}
