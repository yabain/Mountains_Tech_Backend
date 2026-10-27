import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TrackingService } from './tracking.service';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Enregistrer un événement de tracking depuis le site public" })
  async createEvent(@Body() dto: CreateTrackingEventDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const data = await this.trackingService.createEvent(dto, ip, userAgent);
    return { success: true, data, message: 'Événement enregistré' };
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: "Métriques de tracking par jour/semaine (admin)" })
  async getMetrics() {
    const data = await this.trackingService.getMetrics();
    return { success: true, data, message: 'Métriques récupérées' };
  }

  @Get('visitors')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: "Visiteurs actifs (récents)" })
  @ApiQuery({ name: 'minutes', required: false, type: Number, description: 'Fenêtre en minutes (défaut 5)' })
  async getActiveVisitors(@Query('minutes') minutes?: string) {
    const data = await this.trackingService.getActiveVisitors(minutes ? parseInt(minutes, 10) : 5);
    return { success: true, data, message: 'Visiteurs actifs récupérés' };
  }
}
