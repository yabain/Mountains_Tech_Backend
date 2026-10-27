import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTrackingEventDto {
  @ApiProperty({ description: 'Identifiant unique du visiteur' })
  @IsString()
  @IsNotEmpty()
  visitorId!: string;

  @ApiPropertyOptional({ description: 'Identifiant de session' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Page visitée' })
  @IsString()
  @IsNotEmpty()
  page!: string;

  @ApiPropertyOptional({ description: "URL de provenance" })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiPropertyOptional({ description: "Type d'événement", example: 'page_view' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
