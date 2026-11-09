import type { AdminRole } from '../../../auth/oidc-client';
import type { Enterprise, PartnershipStatus } from '../../../marketplace/api';

export type EnterpriseProfileDraft = {
  kind: 'company' | 'event';
  sector: string;
  description: string;
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
  eventDate: string;
  venueName: string;
  venueMunicipality: string;
  venueAddress: string;
  sites: string;
  logoUrl: string;
  bannerUrl: string;
  internalContacts: string;
  pendingItems: string;
  internalNotes: string;
};

export type EnterpriseProfileEditorProps = {
  enterprise: Enterprise;
  roles: readonly AdminRole[];
  onSaved: (enterprise: Enterprise) => void;
};
