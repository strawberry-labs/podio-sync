import { SetMetadata } from '@nestjs/common';

export enum ApiAccess {
  READ_ONLY = 'read-only',
  FULL_ACCESS = 'full-access',
}

export const REQUIRED_ACCESS_KEY = 'requiredAccess';

/**
 * Decorator to specify the minimum access level required for an endpoint.
 * Used with ApiKeyGuard to enforce tiered API key access.
 *
 * - READ_ONLY: accessible by both read-only and full-access keys
 * - FULL_ACCESS: accessible only by the full-access key
 *
 * If not specified, defaults to FULL_ACCESS (secure by default).
 */
export const RequireAccess = (access: ApiAccess) =>
  SetMetadata(REQUIRED_ACCESS_KEY, access);
