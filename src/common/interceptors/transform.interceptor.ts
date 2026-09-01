import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Wraps every controller response in the standard envelope:
 * { success: true, data: ..., message: "..." }
 *
 * Controllers that already return this shape are passed through as-is.
 * 204 No Content responses (null/undefined) are also passed through.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Already wrapped — pass through
        if (
          data !== null &&
          data !== undefined &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data
        ) {
          return data as ApiResponse<T>;
        }

        // Null/undefined (204 No Content) — pass through
        if (data === null || data === undefined) {
          return data as unknown as ApiResponse<T>;
        }

        // Wrap bare returns (shouldn't happen with current controllers, safety net)
        return { success: true, data, message: 'OK' };
      }),
    );
  }
}
