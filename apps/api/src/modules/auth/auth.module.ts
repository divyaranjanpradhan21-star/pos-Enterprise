import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseService } from '../../core/database.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'pos-enterprise-secret-key-2026',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DatabaseService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
