import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'Webinaire IA générative' })
  title!: string;

  @ApiProperty({ example: 'webinaire-ia-generative' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Présentation des dernières avancées en IA générative' })
  excerpt?: string;

  @ApiPropertyOptional({ example: '<p>Contenu HTML</p>' })
  contentHtml?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/cover.webp' })
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'WEBINAIRE' })
  category?: string;

  @ApiPropertyOptional({ example: 'En ligne' })
  location?: string;

  @ApiProperty({ example: '2026-09-10T17:00:00.000Z' })
  startAt!: Date;

  @ApiPropertyOptional({ example: '2026-09-10T19:00:00.000Z' })
  endAt?: Date;

  @ApiProperty({ example: true })
  registrationRequired!: boolean;

  @ApiPropertyOptional({ example: 200 })
  capacity?: number;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  publishedAt?: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-07T10:00:00.000Z' })
  updatedAt!: Date;
}

export class EventRegistrationResponseDto {
  @ApiProperty({ example: '67reg...' })
  registrationId!: string;

  @ApiProperty({ example: 'CONFIRMED' })
  status!: string;
}
