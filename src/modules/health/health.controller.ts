import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { MailService } from '../../infrastructure/mail/mail.service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class TestMailDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  to!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly mailService: MailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'État de l\'API et des services dépendants' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-07T10:00:00.000Z',
        services: { api: 'ok', database: 'ok' },
      },
    },
  })
  check() {
    const dbState = this.connection.readyState;
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

  /**
   * POST /api/v1/health/test-mail
   * Test SMTP - throws full error if send fails
   */
  @Post('test-mail')
  @ApiOperation({
    summary: 'Tester l\'envoi d\'email SMTP',
    description: 'Envoie un email de test et retourne l\'erreur complète si l\'envoi échoue.',
  })
  async testMail(@Body() dto: TestMailDto) {
    try {
      await this.mailService.send(
        {
          to: dto.to,
          subject: 'Test email - Mountains Tech',
          template: 'contact-acknowledgment',
          context: {
            name: 'Test',
            subject: 'Test email depuis le backend',
            messageId: 'TEST-001',
            receivedAt: new Date().toLocaleString('fr-FR'),
          },
        },
        true, // throwOnError = true pour voir l'erreur complète
      );

      return { success: true, message: `Email envoyé avec succès à ${dto.to}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          code: (error as Record<string, unknown>)['code'],
          command: (error as Record<string, unknown>)['command'],
          response: (error as Record<string, unknown>)['response'],
          responseCode: (error as Record<string, unknown>)['responseCode'],
        },
      };
    }
  }
}
