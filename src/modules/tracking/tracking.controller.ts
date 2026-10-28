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

  @Get('pages')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: "Statistiques des pages du portail public (home, about, membres, événements, projets, hackathons, partenaires, contact)" })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Période en jours (défaut 30)' })
  async getPublicPagesStats(@Query('days') days?: string) {
    const data = await this.trackingService.getPublicPagesStats(days ? parseInt(days, 10) : 30);
    return { success: true, data, message: 'Statistiques des pages récupérées' };
  }

  @Get('entities')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: "Statistiques des fiches individuelles (ed-cnt) par événement/hackathon/projet/..." })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Période en jours (défaut 30)' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['event', 'hackathon', 'project', 'activity', 'partner', 'member', 'announcement'] })
  async getEntityStats(@Query('days') days?: string, @Query('entityType') entityType?: string) {
    const data = await this.trackingService.getEntityStats(days ? parseInt(days, 10) : 30, entityType);
    return { success: true, data, message: 'Statistiques des fiches individuelles récupérées' };
  }
}

