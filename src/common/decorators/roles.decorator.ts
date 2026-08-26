import { SetMetadata } from '@nestjs/common';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'COMMUNICATION';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to specific roles.
 * Usage: @Roles('ADMIN', 'SUPER_ADMIN')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
