import type { HonorAwardClient } from '../../utils/honorAwards';
import type { DetailPalette, Translate } from '../marketplace/types';
import type {
  ManageClient,
  ManageOverview,
  ManagedProject,
  ManageRole,
  TeamMember,
} from '../../utils/projectManage';
import type { ClientsClient, ProjectClient, ProofFile } from '../../utils/projectClients';
import type {
  EnterpriseManageClient,
  EnterpriseManageOverview,
  ManagedEnterprise,
} from '../../utils/enterpriseManage';

export type ManageTab = 'info' | 'images' | 'team' | 'clients' | 'comments';

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
  /** Clients tab API; the tab shows only when given and the person can see clients. */
  clientsClient?: ClientsClient;
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

export type EnterpriseManageTab = 'info' | 'images' | 'products' | 'team' | 'clients' | 'honors';

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
  clientsClient?: ClientsClient;
  /** Honor awards of the enterprise, claimed from the "honors" tab. */
  honorAwardsClient?: HonorAwardClient;
}

export interface ManageClientsSectionProps {
  client: ClientsClient;
  can: { editClients?: boolean; assignAirs?: boolean };
  palette: DetailPalette;
  t: Translate;
  canPickFiles: boolean;
  /** Opens a file picker for the supporting file; defaults to the browser one. */
  pickFile?: () => Promise<ProofFile | null>;
  /** Local URL to show a downloaded supporting file (blob: on web, data: on native). */
  toLocalUrl?: (file: Blob) => Promise<string>;
  /** Enterprise view: shows each client's project and asks for it when adding. */
  multiProject?: boolean;
  /** Shows a toast for a finished action (success or error). */
  onToast?: (toast: { type: 'success' | 'error'; title: string; message?: string }) => void;
}

export type ClientFilter = 'all' | 'member' | 'invitation' | 'cancelled' | 'withAirs';

export interface ProofViewerState {
  status: 'loading' | 'ready' | 'error';
  /** Local URL of the file, only while it is shown. */
  uri?: string;
  type?: string;
}

export interface ProofViewerProps {
  viewer: ProofViewerState | null;
  palette: DetailPalette;
  t: Translate;
  onClose: () => void;
}

export interface ClientListItemProps {
  item: ProjectClient;
  palette: DetailPalette;
  t: Translate;
  /** The client's project, shown in the enterprise view. */
  projectTitle?: string;
  canEdit: boolean;
  canAssign: boolean;
  /** Action running in the section ('remove-<id>', 'proof-<id>', ...). */
  busyAction: string | null;
  onAssign: () => void;
  onReinvite: () => void;
  onRemove: () => void;
  onShowProof: (reportId: string) => void;
  /** Sends a pending step again (invitation with Airs, or a reminder to admins). */
  onResendReport: (reportId: string) => void;
  onResendInvitation: () => void;
}

export interface ClientDraft {
  email: string;
  name: string;
  assign: boolean;
  amount: string;
  concept: string;
  documentNumber: string;
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
