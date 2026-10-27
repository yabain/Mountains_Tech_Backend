import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from '../../infrastructure/audit/audit.service';
import type { JwtPayload } from '../decorators/current-user.decorator';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  resource: string;
  category?: string;
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
    const res = ctx.switchToHttp().getResponse<Response>();

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;

    const method = req.method;
    const path = req.originalUrl || req.url;

    return next.handle().pipe(
      finalize(() => {
        const userName =
          req.user?.firstName || req.user?.lastName
            ? `${req.user.firstName ?? ''} ${req.user.lastName ?? ''}`.trim()
            : undefined;

        void this.auditService.log({
          userId: req.user?.sub,
          userEmail: req.user?.email,
          userName,
          action: meta.action,
          resource: meta.resource,
          category: meta.category,
          method,
          path,
          statusCode: res.statusCode,
          ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });
      }),
    );
  }
}

