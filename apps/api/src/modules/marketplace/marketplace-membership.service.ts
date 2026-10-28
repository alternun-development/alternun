import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  grantsGlobally,
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import type {
  ChangeProjectMembershipDto,
  CreateProjectMembershipByEmailDto,
  CreateProjectMembershipDto,
  ListProjectMembershipsQueryDto,
} from './marketplace.dto';
import { AUTHENTIK_GROUP_SYNC } from './authentik-group-sync';
import type { AuthentikGroupSync, AuthentikGroupSyncStatus } from './authentik-group-sync.types';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceMembershipRepository, memberKey } from './marketplace-membership.repository';
import { MarketplaceAdminRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type ProjectMembershipRecord,
  type ProjectMembershipScope,
} from './marketplace.types';

const GLOBAL_ROLES = new Set(['platform_owner', 'internal_admin', 'moderator']);
const PERSISTED_ROLES: readonly ProjectMembershipRecord['role'][] = [
  'partner_operator',
  'sub_admin',
  'partner_readonly',
];

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) => GLOBAL_ROLES.has(role));
}

function isSelf(principal: AdminPrincipal, member: { issuer: string; subject: string }): boolean {
  return principal.iss === member.issuer && principal.sub === member.subject;
}

function canManageRole(principal: AdminPrincipal, role: string): boolean {
  if (!PERSISTED_ROLES.includes(role as ProjectMembershipRecord['role'])) return false;
  if (principal.roles.some((item) => ['platform_owner', 'internal_admin'].includes(item)))
    return true;
  return (
    principal.roles.includes('partner_operator') && ['sub_admin', 'partner_readonly'].includes(role)
  );
}

@Injectable()
export class MarketplaceMembershipService {
  constructor(
    private readonly repository: MarketplaceMembershipRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    @Optional() @Inject(AUTHENTIK_GROUP_SYNC) private readonly groupSync?: AuthentikGroupSync
  ) {}

  // Emails only decorate the lists and drive the group sync, so a lookup failure never breaks them.
  private async emailsFor(
    members: ReadonlyArray<{ issuer: string; subject: string }>
  ): Promise<Map<string, string>> {
    try {
      return await this.repository.emailsForMembers(members);
    } catch {
      return new Map<string, string>();
    }
  }

  // Adds the verified email of each member so the admin screens can show people, not ids.
  private async withEmails(
    memberships: ProjectMembershipRecord[]
  ): Promise<ProjectMembershipRecord[]> {
    if (!memberships.length) return memberships;
    const emails = await this.emailsFor(memberships.map((membership) => membership.member));
    return memberships.map((membership) => ({
      ...membership,
      memberEmail:
        emails.get(memberKey(membership.member.issuer, membership.member.subject)) ?? null,
    }));
  }

  // Best effort: the membership in the database is the authority and stays whatever Authentik says.
  private async syncGroup(
    action: 'add' | 'remove',
    email: string | null | undefined,
    role: ProjectMembershipRecord['role']
  ): Promise<AuthentikGroupSyncStatus> {
    if (!this.groupSync || !email) return 'skipped';
    try {
      return await this.groupSync[action](email, role);
    } catch {
      return 'failed';
    }
  }

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    code: string,
    membershipId?: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'project_membership',
      targetId: membershipId,
      enterpriseId,
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async authorize(
    principal: AdminPrincipal,
    permission: AdminPermission,
    requestId: string,
    enterpriseId?: string,
    projectId?: string,
    membershipId?: string
  ): Promise<void> {
    if (!hasPermission(principal, permission))
      await this.deny(
        principal,
        requestId,
        'PERMISSION_DENIED',
        membershipId,
        enterpriseId,
        projectId
      );
    if (!enterpriseId || grantsGlobally(principal, permission)) return;
    const allowed = await this.adminRepository.actorHasScope(
      actorFromPrincipal(principal),
      principal.roles,
      enterpriseId,
      projectId ?? null,
      rolesWithPermission(principal, permission)
    );
    if (!allowed)
      await this.deny(
        principal,
        requestId,
        projectId ? 'PROJECT_SCOPE_DENIED' : 'ENTERPRISE_SCOPE_DENIED',
        membershipId,
        enterpriseId,
        projectId
      );
  }

  private async resolveScope(input: {
    enterpriseId: string;
    projectId?: string;
    scopeType: ProjectMembershipScope['scopeType'];
  }): Promise<{ enterpriseId: string; projectId?: string }> {
    if (input.scopeType === 'enterprise') {
      if (input.projectId) marketplaceError('MEMBERSHIP_INPUT_INVALID');
      const enterprise = await this.adminRepository.findEnterprise(input.enterpriseId);
      if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
      return { enterpriseId: enterprise.id };
    }
    if (!input.projectId) marketplaceError('MEMBERSHIP_INPUT_INVALID');
    const project = await this.adminRepository.findProject(input.projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    return { enterpriseId: project.enterpriseId, projectId: project.id };
  }

  async list(
    principal: AdminPrincipal,
    requestId: string,
    query: ListProjectMembershipsQueryDto
  ): Promise<ProjectMembershipRecord[]> {
    if (!hasPermission(principal, 'project_memberships:read'))
      await this.deny(principal, requestId, 'PERMISSION_DENIED');
    let enterpriseId = query.enterpriseId;
    if (query.projectId) {
      const project = await this.adminRepository.findProject(query.projectId);
      if (!project) marketplaceError('PROJECT_NOT_FOUND');
      enterpriseId = project.enterpriseId;
    } else if (enterpriseId) {
      const enterprise = await this.adminRepository.findEnterprise(enterpriseId);
      if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    }
    if (enterpriseId)
      await this.authorize(
        principal,
        'project_memberships:read',
        requestId,
        enterpriseId,
        query.projectId
      );
    const filters = { ...query, ...(enterpriseId ? { enterpriseId } : {}) };
    if (isGlobal(principal)) return this.withEmails(await this.repository.list(filters));
    const actorMemberships = await this.adminRepository.listActorMemberships(
      actorFromPrincipal(principal)
    );
    const visible = await this.repository.list(filters, {
      enterpriseIds: [
        ...new Set(
          actorMemberships
            .filter((membership) => membership.scopeType === 'enterprise')
            .map((membership) => membership.enterpriseId)
        ),
      ],
      projectIds: [
        ...new Set(
          actorMemberships
            .filter(
              (membership): membership is ProjectMembershipScope & { projectId: string } =>
                membership.scopeType === 'project' && !!membership.projectId
            )
            .map((membership) => membership.projectId)
        ),
      ],
    });
    return this.withEmails(visible);
  }

  async get(
    principal: AdminPrincipal,
    requestId: string,
    membershipId: string
  ): Promise<ProjectMembershipRecord> {
    const membership = await this.repository.find(membershipId);
    if (!membership) marketplaceError('MEMBERSHIP_NOT_FOUND');
    await this.authorize(
      principal,
      'project_memberships:read',
      requestId,
      membership.enterpriseId,
      membership.projectId ?? undefined,
      membershipId
    );
    return membership;
  }

  async grant(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateProjectMembershipDto
  ): Promise<ProjectMembershipRecord> {
    const scope = await this.resolveScope(input);
    await this.authorize(
      principal,
      'project_memberships:assign',
      requestId,
      scope.enterpriseId,
      scope.projectId
    );
    if (isSelf(principal, input.member))
      await this.deny(
        principal,
        requestId,
        'SELF_MEMBERSHIP_CHANGE_DENIED',
        undefined,
        scope.enterpriseId,
        scope.projectId
      );
    if (!canManageRole(principal, input.role))
      await this.deny(
        principal,
        requestId,
        'ROLE_ESCALATION_DENIED',
        undefined,
        scope.enterpriseId,
        scope.projectId
      );
    return this.repository.grant(
      {
        memberIssuer: input.member.issuer,
        memberSubject: input.member.subject,
        memberUserId: input.memberUserId,
        enterpriseId: scope.enterpriseId,
        projectId: scope.projectId,
        scopeType: input.scopeType,
        role: input.role,
      },
      actorFromPrincipal(principal),
      requestId
    );
  }

  /**
   * Grants a membership to the person with this verified email, so nobody has to know their
   * Authentik id, and keeps the Authentik group in step. The person must have signed in once.
   */
  async grantByEmail(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateProjectMembershipByEmailDto
  ): Promise<{ membership: ProjectMembershipRecord; groupSync: AuthentikGroupSyncStatus }> {
    const scope = await this.resolveScope(input);
    // Authorize before looking the email up, so a caller without rights learns nothing about it.
    await this.authorize(
      principal,
      'project_memberships:assign',
      requestId,
      scope.enterpriseId,
      scope.projectId
    );
    const user = await this.repository.findVerifiedUserByEmail(input.email);
    if (!user) marketplaceError('MEMBERSHIP_USER_NOT_FOUND');
    const membership = await this.grant(principal, requestId, {
      // Panel tokens share the caller's issuer, not the one stored with the account.
      member: { issuer: principal.iss, subject: user.subject },
      memberUserId: user.id,
      enterpriseId: input.enterpriseId,
      projectId: input.projectId,
      scopeType: input.scopeType,
      role: input.role,
    });
    const groupSync = await this.syncGroup('add', user.email, membership.role);
    return { membership: { ...membership, memberEmail: user.email }, groupSync };
  }

  async change(
    principal: AdminPrincipal,
    requestId: string,
    membershipId: string,
    input: ChangeProjectMembershipDto
  ): Promise<ProjectMembershipRecord> {
    if (!input.role && !input.status) marketplaceError('MEMBERSHIP_INPUT_INVALID');
    const membership = await this.repository.find(membershipId);
    if (!membership) marketplaceError('MEMBERSHIP_NOT_FOUND');
    const role = input.role ?? membership.role;
    const status = input.status ?? membership.status;
    const permission: AdminPermission =
      status === 'revoked' ? 'project_memberships:revoke' : 'project_memberships:assign';
    await this.authorize(
      principal,
      permission,
      requestId,
      membership.enterpriseId,
      membership.projectId ?? undefined,
      membershipId
    );
    if (isSelf(principal, membership.member))
      await this.deny(
        principal,
        requestId,
        'SELF_MEMBERSHIP_CHANGE_DENIED',
        membershipId,
        membership.enterpriseId,
        membership.projectId ?? undefined
      );
    if (!canManageRole(principal, role))
      await this.deny(
        principal,
        requestId,
        'ROLE_ESCALATION_DENIED',
        membershipId,
        membership.enterpriseId,
        membership.projectId ?? undefined
      );
    if (status === 'revoked' && !input.reason) marketplaceError('REVOCATION_REASON_REQUIRED');
    const changed = await this.repository.change(
      membershipId,
      role,
      status,
      actorFromPrincipal(principal),
      requestId,
      input.reason
    );
    await this.reconcileGroups(membership, changed);
    return changed;
  }

  // After a role change, a reactivation or a revoke: the active role's group is added, and the old
  // one is removed only when the person holds no other active membership with that role.
  private async reconcileGroups(
    before: ProjectMembershipRecord,
    after: ProjectMembershipRecord
  ): Promise<void> {
    const emails = await this.emailsFor([after.member]);
    const email = emails.get(memberKey(after.member.issuer, after.member.subject));
    if (!email) return;
    if (after.status === 'active' && (after.role !== before.role || before.status !== 'active')) {
      await this.syncGroup('add', email, after.role);
    }
    const oldRoleGone =
      (before.status === 'active' && after.status === 'revoked') || after.role !== before.role;
    if (before.status === 'active' && oldRoleGone) {
      let remaining = 1;
      try {
        remaining = await this.repository.countActiveWithRole(after.member, before.role);
      } catch {
        // Unknown: keep the group rather than remove a role the person may still hold.
      }
      if (remaining === 0) await this.syncGroup('remove', email, before.role);
    }
  }

  async revoke(
    principal: AdminPrincipal,
    requestId: string,
    membershipId: string,
    reason: string
  ): Promise<ProjectMembershipRecord> {
    return this.change(principal, requestId, membershipId, { status: 'revoked', reason });
  }
}
