import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion administrateur',
    description:
      'Authentifie un administrateur et retourne un access token JWT (15 min) et un refresh token (30 jours).',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentification réussie',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          accessToken: '<jwt>',
          refreshToken: '<refresh-token>',
          user: {
            id: '64f...',
            firstName: 'Admin',
            lastName: 'Mountains Tech',
            email: 'admin@mountainstech.cm',
            role: 'SUPER_ADMIN',
          },
        },
        message: 'Authentification réussie',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data, message: 'Authentification réussie' };
  }

  /**
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Renouvellement du token',
    description: 'Génère un nouvel access token à partir d\'un refresh token valide.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'Token renouvelé',
    schema: {
      example: {
        success: true,
        data: { accessToken: '<new-jwt>' },
        message: 'Token renouvelé',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.refresh(user);
    return { success: true, data, message: 'Token renouvelé' };
  }

  /**
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Déconnexion',
    description:
      'Déconnexion côté client. Les tokens JWT étant stateless, la révocation est gérée côté client en supprimant les tokens stockés.',
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
    schema: {
      example: { success: true, data: null, message: 'Déconnexion réussie' },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  logout() {
    return { success: true, data: null, message: 'Déconnexion réussie' };
  }

  /**
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Profil de l\'utilisateur connecté',
    description: 'Retourne les informations du compte authentifié (sans passwordHash).',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré',
    schema: {
      example: {
        success: true,
        data: {
          id: '64f...',
          firstName: 'Admin',
          lastName: 'Mountains Tech',
          email: 'admin@mountainstech.cm',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          lastLoginAt: '2026-08-07T10:00:00.000Z',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-07T10:00:00.000Z',
        },
        message: 'Profil récupéré',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async me(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.getMe(user.sub);
    return { success: true, data, message: 'Profil récupéré' };
  }
}
