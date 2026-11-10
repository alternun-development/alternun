import type { DetailPalette, Translate } from '../marketplace/types';
import type {
  ManageClient,
  ManageOverview,
  ManagedProject,
  ManageRole,
  TeamMember,
} from '../../utils/projectManage';
import type {
  EnterpriseManageClient,
  EnterpriseManageOverview,
  ManagedEnterprise,
} from '../../utils/enterpriseManage';

export type ManageTab = 'info' | 'images' | 'team' | 'comments';

export interface ManageSectionProps {
  client: ManageClient;
  overview: ManageOverview;
  palette: DetailPalette;
  t: Translate;
  /** Called after a change the overview depends on (e.g. saved info). */
  onChanged: (message?: string) => void;
  /** The project as the server saved it, applied right away so nothing shows stale data. */
  onProjectSaved?: (project: ManagedProject) => void;
}

export interface ProjectManageViewProps {
  client: ManageClient;
  palette: DetailPalette;
  t: Translate;
  onBack: () => void;
  /** Whether the browser file picker is available (web). */
  canPickFiles: boolean;
}

export interface ManageImagesSectionProps extends ManageSectionProps {
  canPickFiles: boolean;
  /** Opens a file picker; defaults to the browser one. */
  pickFile?: () => Promise<(Blob & { type: string; size: number }) | null>;
}

export interface InfoDraft {
  title: string;
  theme: string;
  location: string;
  description: string;
  ways: string;
  alternateName: string;
  locationDetails: Record<'municipality' | 'department' | 'address' | 'coverage', string>;
  publicContact: Record<'web' | 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook', string>;
}

/** What the team section needs; both the project and the enterprise clients provide it. */
export interface TeamClient {
  listTeam(): Promise<TeamMember[]>;
  addTeamMember(email: string, role: ManageRole): Promise<void>;
  revokeTeamMember(membershipId: string, reason: string): Promise<void>;
}

export interface ManageTeamSectionProps {
  client: TeamClient;
  overview: { roles: string[]; isGlobalAdmin: boolean };
  palette: DetailPalette;
  t: Translate;
}

export type EnterpriseManageTab = 'info' | 'images' | 'products' | 'team';

export interface EnterpriseSectionProps {
  client: EnterpriseManageClient;
  overview: EnterpriseManageOverview;
  palette: DetailPalette;
  t: Translate;
  onChanged: (message?: string) => void;
  /** The enterprise as the server saved it, applied right away so nothing shows stale data. */
  onEnterpriseSaved?: (enterprise: ManagedEnterprise) => void;
}

export interface EnterpriseImagesSectionProps extends EnterpriseSectionProps {
  canPickFiles: boolean;
  pickFile?: () => Promise<(Blob & { type: string; size: number }) | null>;
}

export interface EnterpriseManageViewProps {
  client: EnterpriseManageClient;
  palette: DetailPalette;
  t: Translate;
  onBack: () => void;
  canPickFiles: boolean;
}

export interface ProductDraft {
  name: string;
  description: string;
  airsMin: string;
  airsMax: string;
  airsNote: string;
}

export interface ProductRowProps {
  initial: ProductDraft;
  palette: DetailPalette;
  t: Translate;
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: ProductDraft) => Promise<boolean>;
  onDelete?: () => void;
  testID: string;
}
