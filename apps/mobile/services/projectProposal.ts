import { resolveMobileApiBaseUrl } from '../utils/runtimeConfig';

export type ProjectProposalCategory = 'productive' | 'conservation';
export type ProjectProposalLanguage = 'es' | 'en' | 'th';

export interface ProjectProposalRequest {
  projectName: string;
  location: string;
  category: ProjectProposalCategory;
  message: string;
  contactEmail: string;
  contactName: string;
  language: ProjectProposalLanguage;
  website: string;
}

export interface SubmitProjectProposalOptions {
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The range is intentional: user content may contain line breaks, but not other control bytes.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export function validateProjectProposalInput(input: ProjectProposalRequest): boolean {
  const projectName = input.projectName.trim();
  const location = input.location.trim();
  const message = input.message.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const contactName = input.contactName.trim();

  return (
    projectName.length >= 2 &&
    projectName.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(projectName) &&
    location.length >= 2 &&
    location.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(location) &&
    ['productive', 'conservation'].includes(input.category) &&
    (message.length === 0 ||
      (message.length <= 2000 && !CONTROL_CHARACTER_PATTERN.test(message))) &&
    contactName.length >= 2 &&
    contactName.length <= 120 &&
    !CONTROL_CHARACTER_PATTERN.test(contactName) &&
    contactEmail.length <= 254 &&
    EMAIL_PATTERN.test(contactEmail) &&
    ['es', 'en', 'th'].includes(input.language) &&
    input.website.length <= 200
  );
}

export async function submitProjectProposal(
  input: ProjectProposalRequest,
  options: SubmitProjectProposalOptions = {}
): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl = (options.apiBaseUrl ?? resolveMobileApiBaseUrl()).replace(/\/+$/, '');
  const message = input.message.trim();
  const response = await fetcher(`${apiBaseUrl}/v1/project-proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: input.projectName.trim(),
      location: input.location.trim(),
      category: input.category,
      ...(message ? { message } : {}),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      contactName: input.contactName.trim(),
      language: input.language,
      website: input.website,
    }),
  });

  if (!response.ok) {
    throw new Error('PROJECT_PROPOSAL_SUBMISSION_FAILED');
  }
}

export function resolveMarketplaceContactMailto(
  // Expo only inlines EXPO_PUBLIC_* values written as a literal process.env.<NAME> access.
  env: Record<string, string | undefined> = {
    EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL: process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL,
  }
): string | null {
  const email = env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL?.trim().toLowerCase();
  return email && email.length <= 254 && EMAIL_PATTERN.test(email) ? `mailto:${email}` : null;
}
