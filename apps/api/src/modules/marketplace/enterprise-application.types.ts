export type EnterpriseApplicationLanguage = 'es' | 'en' | 'th';
export type EnterpriseCompanySize = '1-10' | '11-50' | '51-200' | '201+';

export interface EnterpriseApplicationInput {
  companyName: string;
  legalName?: string;
  sector: string;
  location: string;
  websiteUrl?: string;
  companySize?: EnterpriseCompanySize;
  offer: string;
  interest?: string;
  contactName: string;
  contactRole?: string;
  contactEmail: string;
  contactPhone?: string;
  language: EnterpriseApplicationLanguage;
  /** Anti-spam honeypot: must stay empty. */
  faxNumber?: string;
}

export interface EnterpriseApplicationRecord {
  id: string;
  companyName: string;
  legalName: string | null;
  sector: string;
  location: string;
  websiteUrl: string | null;
  companySize: EnterpriseCompanySize | null;
  offer: string;
  interest: string | null;
  contactName: string;
  contactRole: string | null;
  contactEmail: string;
  contactPhone: string | null;
  language: EnterpriseApplicationLanguage;
  createdAt: string;
}

export interface EnterpriseApplicationSubmitResult {
  ok: boolean;
  reasonCode?: string;
  application?: EnterpriseApplicationRecord;
}
