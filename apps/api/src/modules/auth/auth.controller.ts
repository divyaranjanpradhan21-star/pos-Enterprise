import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, LoginDto, AuthResponse } from './auth.service';
import { Public } from '../../core/tenant.guard';
import { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.authService.login(dto, ip);
  }
}
