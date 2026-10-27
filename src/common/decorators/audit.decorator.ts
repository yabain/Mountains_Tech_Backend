import { applyDecorators, UseInterceptors, SetMetadata } from '@nestjs/common';
import { AUDIT_KEY, AuditMeta, AuditInterceptor } from '../interceptors/audit.interceptor';

export function Audit(meta: AuditMeta) {
  return applyDecorators(
    SetMetadata(AUDIT_KEY, meta),
    UseInterceptors(AuditInterceptor),
  );
}
