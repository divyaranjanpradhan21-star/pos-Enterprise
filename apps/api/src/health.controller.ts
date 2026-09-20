import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './core/tenant.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint for Render/Kubernetes' })
  check() {
    return {
      status: 'ok',
      service: 'pos-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
