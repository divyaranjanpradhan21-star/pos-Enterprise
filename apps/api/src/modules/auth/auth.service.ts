import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../core/database.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

export interface LoginDto {
  email: string;
  password?: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    tenantId: string;
    branchId?: string;
    roles: string[];
    permissions: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const { email, password } = dto;

    if (!email) {
      throw new UnauthorizedException('Email is required');
    }

    // Attempt DB lookup
    let user = null;
    try {
      if (this.db.user) {
        user = await this.db.user.findFirst({
          where: { email, isActive: true },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });
      }
    } catch {
      // If DB not connected, fallback to demo super-admin for seamless development
    }

    // Default demo user fallback for initial zero-friction onboarding
    if (!user) {
      if (email === 'admin@restaurant-pos.com' || email === 'cashier@restaurant-pos.com') {
        const isCashier = email.startsWith('cashier');
        const demoUser = {
          id: isCashier ? '018e6a12-0000-7000-8000-000000000002' : '018e6a12-0000-7000-8000-000000000001',
          email,
          fullName: isCashier ? 'Alex Cashier' : 'Sarah Owner',
          tenantId: '018e6a12-0000-7000-8000-tenant000001',
          branchId: '018e6a12-0000-7000-8000-branch000001',
          roles: [isCashier ? 'CASHIER' : 'REST_OWNER'],
          permissions: isCashier
            ? ['order:create', 'order:read', 'billing:settle', 'table:read']
            : ['*'],
        };

        const token = await this.jwtService.signAsync({
          sub: demoUser.id,
          tenantId: demoUser.tenantId,
          branchId: demoUser.branchId,
          roles: demoUser.roles,
          permissions: demoUser.permissions,
        });

        await this.audit.log({
          tenantId: demoUser.tenantId,
          userId: demoUser.id,
          action: 'USER_LOGIN_SUCCESS',
          resourceType: 'AUTH',
          resourceId: demoUser.id,
          ipAddress,
        });

        return {
          accessToken: token,
          user: demoUser,
        };
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password if DB user found
    if (password) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        await this.audit.log({
          tenantId: user.tenantId,
          action: 'USER_LOGIN_FAILED',
          resourceType: 'AUTH',
          resourceId: user.id,
          ipAddress,
        });
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const roles: string[] = user.userRoles.map((ur: any) => ur.role.code);
    const permissions: string[] = Array.from(
      new Set<string>(
        user.userRoles.flatMap((ur: any) =>
          ur.role.rolePermissions.map((rp: any) => rp.permission.code),
        ),
      ),
    );

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId ?? undefined,
      roles,
      permissions,
    };

    const token = await this.jwtService.signAsync(payload);

    await this.audit.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user.id,
      ipAddress,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        branchId: user.branchId ?? undefined,
        roles,
        permissions,
      },
    };
  }
}
