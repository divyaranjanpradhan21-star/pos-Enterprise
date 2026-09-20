import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  branchId?: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      // Decode and verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env['JWT_SECRET'] || 'pos-enterprise-secret-key-2026',
      });

      if (!payload.tenantId) {
        throw new UnauthorizedException('Token payload is missing required tenantId');
      }

      // Explicitly set verified tenant context on the request
      request.tenantId = payload.tenantId;
      request.user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        branchId: payload.branchId,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
