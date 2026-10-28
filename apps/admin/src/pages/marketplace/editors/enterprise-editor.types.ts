import type { AdminRole } from '../../../auth/oidc-client';
import type { Enterprise } from '../../../marketplace/api';

export type EnterpriseDraft = {
  displayName: string;
  slug: string;
  legalName: string;
  countryCode: string;
  websiteUrl: string;
};

export type EnterprisePatch = Partial<
  Pick<Enterprise, 'displayName' | 'legalName' | 'countryCode' | 'websiteUrl'>
>;

export type EnterpriseEditorProps = {
  enterprise: Enterprise;
  roles: readonly AdminRole[];
  onSaved: (enterprise: Enterprise) => void;
};
