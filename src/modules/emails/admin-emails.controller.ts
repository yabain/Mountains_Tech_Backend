import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { MailService } from '../../infrastructure/mail/mail.service';
import * as fs from 'fs';
import * as path from 'path';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

class SendEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  template!: string;

  @IsObject()
  context!: Record<string, unknown>;
}

class SendTestEmailDto {
  @IsEmail()
  @IsOptional()
  to?: string;
}

@ApiTags('Admin - Emails')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/emails')
export class AdminEmailsController {
  constructor(private readonly mailService: MailService) {}

  @Get('templates')
  @ApiOperation({ summary: "Lister les templates d'email disponibles" })
  getTemplates() {
    const templateDir = path.join(__dirname, '../../infrastructure/mail/templates');
    try {
      const files = fs
        .readdirSync(templateDir)
        .filter((f) => f.endsWith('.hbs'))
        .map((f) => f.replace('.hbs', ''));
      return { success: true, data: { templates: files }, message: 'Templates récupérés' };
    } catch (error) {
      return { success: true, data: { templates: [] }, message: 'Templates récupérés' };
    }
  }

  @Audit({ action: 'SEND', resource: 'emails', category: 'SECURITY' })
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoyer un email générique via un template" })
  async sendEmail(@Body() dto: SendEmailDto) {
    await this.mailService.send(
      {
        to: dto.to,
        subject: dto.subject,
        template: dto.template,
        context: dto.context,
      },
      false,
    );
    return { success: true, message: 'Email envoyé' };
  }

  @Audit({ action: 'SEND_TEST', resource: 'emails', category: 'SECURITY' })
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoyer un email de test" })
  async sendTest(@Body() dto: SendTestEmailDto) {
    const to = dto.to || 'tientcheuigorcarel@gmail.com';
    await this.mailService.send(
      {
        to,
        subject: 'Test email - Mountains Tech Admin',
        template: 'contact-acknowledgment',
        context: {
          name: 'Admin Test',
          subject: 'Test depuis /admin/emails/test',
          messageId: 'ADMIN-TEST',
          receivedAt: new Date().toLocaleString('fr-FR'),
        },
      },
      false,
    );
    return { success: true, message: `Email de test envoyé à ${to}` };
  }

  @Audit({ action: 'INVITE_ADMIN', resource: 'emails', category: 'SECURITY' })
  @Post('invite-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoyer une invitation admin" })
  async inviteAdmin(
    @Body()
    dto: {
      to: string;
      firstName: string;
      lastName: string;
      email: string;
      tempPassword: string;
      role: string;
    },
  ) {
    await this.mailService.sendAdminInvitation(dto);
    return { success: true, message: "Invitation envoyée" };
  }
}
