import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

interface CachedResponse {
  statusCode: number;
  body: unknown;
  timestamp: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private static readonly cache = new Map<string, CachedResponse>();
  private static readonly pendingKeys = new Set<string>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method.toUpperCase();

    // Only apply to mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      if (!idempotencyKey) {
        // Idempotency key required for mutating actions according to BR-IDEM-001
        throw new BadRequestException('Idempotency-Key header is required for mutating operations');
      }

      const cacheKey = `${request.tenantId ?? 'global'}:${method}:${request.path}:${idempotencyKey}`;

      // Check if duplicate request is currently executing
      if (IdempotencyInterceptor.pendingKeys.has(cacheKey)) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'An identical request is currently in flight. Please retry shortly.',
        });
      }

      // Check if previously executed and cached
      const cached = IdempotencyInterceptor.cache.get(cacheKey);
      if (cached) {
        response.status(cached.statusCode);
        response.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
        return of(cached.body);
      }

      // Mark as pending
      IdempotencyInterceptor.pendingKeys.add(cacheKey);

      return next.handle().pipe(
        tap({
          next: (body) => {
            IdempotencyInterceptor.cache.set(cacheKey, {
              statusCode: response.statusCode,
              body,
              timestamp: Date.now(),
            });
            IdempotencyInterceptor.pendingKeys.delete(cacheKey);
          },
          error: () => {
            IdempotencyInterceptor.pendingKeys.delete(cacheKey);
          },
        }),
      );
    }

    return next.handle();
  }
}
