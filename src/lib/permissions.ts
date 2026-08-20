/**
 * Role capabilities.
 *
 * `developer` is intentionally NOT a superset of `admin`. Whoever builds and
 * operates the system should not also be able to move client funds — if the
 * same person can both change the code and adjust balances, the audit trail
 * proves nothing. Keep them as separate accounts even if they are the same
 * human wearing two hats.
 *
 * This table is advisory for the UI. Every server route re-checks with
 * requireCapability(), because a client-side check is a hint, not a control.
 */

export type UserRole = 'client' | 'staff' | 'admin' | 'developer';

export type Capability =
  // client
  | 'trade:demo'
  | 'wallet:deposit'
  | 'wallet:withdraw'
  | 'kyc:submit'
  // operations
  | 'kyc:review'
  | 'deposit:review'
  | 'withdrawal:review'
  | 'client:view'
  | 'client:edit'
  | 'client:suspend'
  | 'client:delete'
  | 'balance:adjust'
  | 'settings:view'
  | 'settings:edit'
  | 'email:send'
  | 'audit:view'
  // developer tooling
  | 'flags:view'
  | 'flags:edit'
  | 'logs:view'
  | 'email:log:view'
  | 'system:health'
  | 'role:manage'
  | 'notification:test';

const MATRIX: Record<UserRole, Capability[]> = {
  client: ['trade:demo', 'wallet:deposit', 'wallet:withdraw', 'kyc:submit'],

  // Staff has full operational clearance: KYC, deposits, withdrawals, client edits, balance adjustments, and bank settings.
  staff: [
    'kyc:review',
    'deposit:review',
    'withdrawal:review',
    'client:view',
    'client:edit',
    'client:suspend',
    'balance:adjust',
    'settings:view',
    'settings:edit',
    'email:send',
  ],

  // Admin includes operational control plus staff and client management
  admin: [
    'kyc:review',
    'deposit:review',
    'withdrawal:review',
    'client:view',
    'client:edit',
    'client:suspend',
    'client:delete',
    'balance:adjust',
    'settings:view',
    'settings:edit',
    'email:send',
    'audit:view',
    'flags:view',
    'flags:edit',
    'logs:view',
    'email:log:view',
    'system:health',
    'role:manage',
    'notification:test',
  ],

  // Developer has full system observability, flags, notification testing, and complete user purge powers.
  developer: [
    'flags:view',
    'flags:edit',
    'logs:view',
    'email:log:view',
    'system:health',
    'audit:view',
    'settings:view',
    'role:manage',
    'notification:test',
    'client:view',
    'client:delete',
  ],
};

export function capabilitiesFor(role: UserRole): Capability[] {
  return MATRIX[role] ?? MATRIX.client;
}

export function can(role: UserRole, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

/** Roles permitted to sign in to the admin/ops deployment. */
export const OPERATIONS_ROLES: UserRole[] = ['staff', 'admin', 'developer'];

export function isOperationsRole(role: string): role is UserRole {
  return OPERATIONS_ROLES.includes(role as UserRole);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Client',
  staff: 'Staff',
  admin: 'Administrator',
  developer: 'Developer',
};
