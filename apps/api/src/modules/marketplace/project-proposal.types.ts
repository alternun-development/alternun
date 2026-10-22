import type { sendAirsEmail } from '../airs/airs.email';

export type ProjectProposalCategory = 'productive' | 'conservation';
export type ProjectProposalLanguage = 'es' | 'en' | 'th';

export interface ProjectProposalInput {
  projectName: string;
  location: string;
  category: ProjectProposalCategory;
  message?: string;
  contactEmail: string;
  contactName: string;
  language: ProjectProposalLanguage;
  website?: string;
}

export interface ProjectProposalRecord {
  id: string;
  projectName: string;
  location: string;
  category: ProjectProposalCategory;
  message: string | null;
  contactEmail: string;
  contactName: string;
  language: ProjectProposalLanguage;
  status: 'new' | 'reviewed' | 'archived';
  createdAt: string;
}

export interface ProjectProposalSubmitResult {
  ok: boolean;
  reasonCode?: string;
  proposal?: ProjectProposalRecord;
}

export type ProjectProposalEmailSender = typeof sendAirsEmail;
