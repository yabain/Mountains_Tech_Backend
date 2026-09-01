import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../infrastructure/audit/audit.service';
import type { JwtPayload } from '../decorators/current-user.decorator';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  resource: string;
}

/**
 * Usage on a controller method:
 * @SetMetadata(AUDIT_KEY, { action: 'DELETE', resource: 'users' })
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    return next.handle().pipe(
      tap(() => {
        void this.auditService.log({
          userId: req.user?.sub,
          action: meta.action,
          resource: meta.resource,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }),
    );
  }
}
