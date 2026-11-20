import type { AdminRole } from '../../../auth/oidc-client';
import type { PartnershipStatus, Project } from '../../../marketplace/api';

export type ProjectProfileDraft = {
  alternateName: string;
  partnershipStatus: PartnershipStatus;
  municipality: string;
  department: string;
  address: string;
  coverage: string;
  web: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  internalContacts: string;
  pendingItems: string;
  internalNotes: string;
};

export type ProjectProfileEditorProps = {
  project: Project;
  roles: readonly AdminRole[];
  onSaved: (message: string) => void;
};

export type LinkRelation = 'sponsor' | 'partner' | 'operator';
