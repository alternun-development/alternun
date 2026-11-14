import { resolveMobileApiBaseUrl } from '../utils/runtimeConfig';

export type EnterpriseCompanySize = '1-10' | '11-50' | '51-200' | '201+';
export type EnterpriseApplicationLanguage = 'es' | 'en' | 'th';

export const COMPANY_SIZES: readonly EnterpriseCompanySize[] = ['1-10', '11-50', '51-200', '201+'];

export interface EnterpriseApplicationRequest {
  companyName: string;
  legalName: string;
  sector: string;
  location: string;
  websiteUrl: string;
  companySize: EnterpriseCompanySize | '';
  offer: string;
  interest: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  language: EnterpriseApplicationLanguage;
  /** Anti-spam honeypot: hidden from people, must stay empty. */
  faxNumber: string;
}

export interface SubmitEnterpriseApplicationOptions {
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

function within(value: string, min: number, max: number): boolean {
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max && !CONTROL_CHARACTER_PATTERN.test(trimmed);
}

function optionalWithin(value: string, min: number, max: number): boolean {
  return value.trim() === '' || within(value, min, max);
}

/** Which required or malformed field blocks submission, or null when the form is valid. */
export function enterpriseApplicationProblem(
  input: EnterpriseApplicationRequest
): keyof EnterpriseApplicationRequest | null {
  if (!within(input.companyName, 2, 160)) return 'companyName';
  if (!optionalWithin(input.legalName, 2, 240)) return 'legalName';
  if (!within(input.sector, 2, 120)) return 'sector';
  if (!within(input.location, 2, 160)) return 'location';
  const website = input.websiteUrl.trim();
  if (website && (website.length > 240 || !/^https?:\/\/\S+$/.test(website))) return 'websiteUrl';
  if (input.companySize && !COMPANY_SIZES.includes(input.companySize)) return 'companySize';
  if (!within(input.offer, 2, 1000)) return 'offer';
  if (!optionalWithin(input.interest, 1, 2000)) return 'interest';
  if (!within(input.contactName, 2, 120)) return 'contactName';
  if (!optionalWithin(input.contactRole, 2, 120)) return 'contactRole';
  const email = input.contactEmail.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'contactEmail';
  const phone = input.contactPhone.trim();
  if (phone && !/^[0-9+()\s.-]{7,40}$/.test(phone)) return 'contactPhone';
  return null;
}

export async function submitEnterpriseApplication(
  input: EnterpriseApplicationRequest,
  options: SubmitEnterpriseApplicationOptions = {}
): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl = (options.apiBaseUrl ?? resolveMobileApiBaseUrl()).replace(/\/+$/, '');
  const optional = (value: string): string | undefined => value.trim() || undefined;
  const response = await fetcher(`${apiBaseUrl}/v1/enterprise-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: input.companyName.trim(),
      legalName: optional(input.legalName),
      sector: input.sector.trim(),
      location: input.location.trim(),
      websiteUrl: optional(input.websiteUrl),
      companySize: input.companySize || undefined,
      offer: input.offer.trim(),
      interest: optional(input.interest),
      contactName: input.contactName.trim(),
      contactRole: optional(input.contactRole),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      contactPhone: optional(input.contactPhone),
      language: input.language,
      faxNumber: input.faxNumber,
    }),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? 'ENTERPRISE_APPLICATION_RATE_LIMITED'
        : 'ENTERPRISE_APPLICATION_SUBMISSION_FAILED'
    );
  }
}
