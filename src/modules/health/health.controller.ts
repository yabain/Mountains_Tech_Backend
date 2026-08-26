import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'État de l\'API et des services dépendants' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-07T10:00:00.000Z',
        services: {
          api: 'ok',
          database: 'ok',
        },
      },
    },
  })
  check() {
    const dbState = this.connection.readyState;
    // 1 = connected, 2 = connecting, 0 = disconnected
    const dbStatus = dbState === 1 ? 'ok' : dbState === 2 ? 'connecting' : 'error';

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: dbStatus,
      },
    };
  }
}
