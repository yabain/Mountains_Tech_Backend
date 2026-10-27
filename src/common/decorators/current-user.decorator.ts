import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // Enriched by JwtStrategy.validate() — not stored in the JWT token itself,
  // added at request time from the DB document for audit and display purposes.
  firstName?: string;
  lastName?: string;
}

/**
 * Injects the authenticated user's JWT payload into a route handler parameter.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
