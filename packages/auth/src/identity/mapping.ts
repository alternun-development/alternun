import type {
  ExternalIdentity,
  LinkedAuthAccount,
  Principal,
  ProvisioningEventRecord,
  UserProjectionRecord,
} from '../core/types';
import {
  buildLinkedAccountsFromIdentity,
  claimsToExternalIdentity as claimsToExternalIdentityFromSession,
} from '../core/session';
import { createPrincipalFromIdentity } from './principal';

export function externalIdentityToPrincipal(input: {
  issuer: string;
  identity: ExternalIdentity;
  extraMetadata?: Record<string, unknown>;
}): Principal {
  return createPrincipalFromIdentity(input);
}

export function externalIdentityToLinkedAccount(
  identity: ExternalIdentity,
  type: LinkedAuthAccount['type'] = 'oidc'
): LinkedAuthAccount {
  return buildLinkedAccountsFromIdentity(identity, type)[0];
}

export function principalToUserProjection(input: {
  principal: Principal;
  externalIdentity: ExternalIdentity;
  appUserId: string;
  status?: string;
}): UserProjectionRecord {
  return {
    appUserId: input.appUserId,
    principal: input.principal,
    email: input.externalIdentity.email,
    displayName: input.externalIdentity.displayName,
    avatarUrl: input.externalIdentity.avatarUrl,
    status: input.status ?? 'active',
    metadata: {
      ...input.principal.metadata,
      externalProvider: input.externalIdentity.provider,
      externalProviderUserId: input.externalIdentity.providerUserId,
      emailVerified: input.externalIdentity.emailVerified ?? false,
    },
  };
}

export function buildProvisioningEvent(input: {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  principal: Principal;
  externalIdentity: ExternalIdentity;
  metadata?: Record<string, unknown>;
}): ProvisioningEventRecord {
  return {
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: {
      principal: input.principal,
      externalIdentity: input.externalIdentity,
      metadata: input.metadata ?? {},
    },
    status: 'pending',
    attempts: 0,
  };
}

export const claimsToExternalIdentity = claimsToExternalIdentityFromSession;
