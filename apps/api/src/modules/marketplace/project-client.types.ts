import type { AirsReportStatus } from './airs-report.types';

/** Private bucket for the supporting file of a report; read only through signed URLs. */
export const AIRS_REPORT_PROOF_BUCKET = 'airs-report-proofs';
export const AIRS_REPORT_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const AIRS_REPORT_PROOF_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
/** Lifetime of a signed URL to read a supporting file. */
export const AIRS_REPORT_PROOF_URL_SECONDS = 60;

export type ProjectClientKind = 'member' | 'invitation';

/** Airs assigned to a client (a User Airs Report), without who submitted or approved it. */
export interface ProjectClientReport {
  id: string;
  amount: number;
  concept: string;
  status: AirsReportStatus;
  submittedAt: string;
  hasProof: boolean;
}

/** A client of a project: a participant with an account, or a pending invitation by email. */
export interface ProjectClientRecord {
  id: string;
  kind: ProjectClientKind;
  projectId: string;
  email: string;
  name: string;
  since: string;
  reports: ProjectClientReport[];
}

export interface ProjectClientInvitationRecord {
  id: string;
  projectId: string;
  email: string;
  name: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invitedAt: string;
}

export interface ProjectClientProof {
  path: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
}

// POST /v1/me/projects/:projectId/manage/clients
export interface AddProjectClientRequest {
  email: string;
  /** Required for a person without an account (the invitation and report use it). */
  name?: string;
  airs?: {
    amount: number;
    concept: string;
    documentNumber?: string;
    /** Path returned by the proof upload URL, once the file is uploaded. */
    proofPath?: string;
    requestKey?: string;
  };
}

export interface AddProjectClientResponse {
  client: ProjectClientRecord;
  /** True when the email already was a client: only the Airs (if any) were added. */
  alreadyClient: boolean;
  invitationSent: boolean;
  /** Status of the report when Airs were assigned. */
  reportStatus: AirsReportStatus | null;
}

export interface ProjectClientProofUploadResponse {
  uploadUrl: string;
  path: string;
}
