import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RequestResetPasswordDto, ConfirmResetPasswordDto } from './dto/reset-password.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MailService } from '../../infrastructure/mail/mail.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Admin — Utilisateurs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/v1/admin/users
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des utilisateurs',
    description:
      'Retourne la liste paginée des utilisateurs avec filtres sur rôle, statut et recherche textuelle.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste récupérée avec succès',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '64f...',
              firstName: 'Jean',
              lastName: 'Dupont',
              email: 'jean@mountainstech.cm',
              role: 'EDITOR',
              status: 'ACTIVE',
              createdAt: '2026-08-01T10:00:00.000Z',
              updatedAt: '2026-08-01T10:00:00.000Z',
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
        message: 'Liste des utilisateurs récupérée',
      },
    },
  })
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.usersService.findAll(query);
    return { success: true, data: result, message: 'Liste des utilisateurs récupérée' };
  } 

  /**
   * GET /api/v1/admin/users/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return { success: true, data: user, message: 'Utilisateur récupéré' };
  }

  /**
   * POST /api/v1/admin/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un utilisateur',
    description: 'Crée un compte administrateur. Le mot de passe est hashé avec Argon2id.',
  })
  @ApiResponse({ status: 201, description: 'Utilisateur créé', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @ApiResponse({ status: 422, description: 'Données invalides' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return { success: true, data: user, message: 'Utilisateur créé' };
  }

  /**
   * PATCH /api/v1/admin/users/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un utilisateur',
    description: 'Mise à jour partielle : rôle, statut, informations personnelles ou mot de passe.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return { success: true, data: user, message: 'Utilisateur mis à jour' };
  }

  /**
   * DELETE /api/v1/admin/users/:id
   * Soft delete - passe le statut à INACTIVE
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Désactiver un utilisateur',
    description: 'Soft delete : le statut passe à INACTIVE. L\'enregistrement est conservé.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId MongoDB de l\'utilisateur' })
  @ApiResponse({ status: 204, description: 'Utilisateur désactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}

// ─── Password reset (public — no auth required) ───────────────────────────────

@ApiTags('Authentification')
@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /api/v1/auth/forgot-password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demande de réinitialisation de mot de passe',
    description:
      'Envoie un email avec un lien valable 1 heure. ' +
      'Retourne toujours 200 pour ne pas révéler si l\'email existe.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: null,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      },
    },
  })
  async forgotPassword(@Body() dto: RequestResetPasswordDto) {
    const result = await this.usersService.generateResetToken(dto.email);

    if (result) {
      const adminUrl = this.config.get<string>('ADMIN_URL') ?? 'http://localhost:4200';
      const resetUrl = `${adminUrl}/reset-password?token=${result.token}`;

      void this.mailService.sendResetPassword({
        to: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        resetUrl,
      });
    }

    return {
      success: true,
      data: null,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
    };
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmer la réinitialisation du mot de passe',
    description: 'Valide le token et applique le nouveau mot de passe. Token valable 1 heure.',
  })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() dto: ConfirmResetPasswordDto) {
    await this.usersService.resetPassword(dto.token, dto.newPassword);
    return { success: true, data: null, message: 'Mot de passe réinitialisé avec succès' };
  }
}
