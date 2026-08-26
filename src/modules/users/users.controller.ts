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
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';

@ApiTags('Admin — Utilisateurs')
@ApiBearerAuth('access-token')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
   * Soft delete — passe le statut à INACTIVE
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
