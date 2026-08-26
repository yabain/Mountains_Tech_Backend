import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HackathonResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'HackMountains 2026' })
  title!: string;

  @ApiProperty({ example: 'hackmountains-2026' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Hackathon annuel de Mountains Tech' })
  description?: string;

  @ApiPropertyOptional({ example: '<p>Règlement</p>' })
  rulesHtml?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/cover.webp' })
  coverUrl?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-10-03T00:00:00.000Z' })
  endDate?: Date;

  @ApiPropertyOptional({ example: '2026-09-25T00:00:00.000Z' })
  registrationDeadline?: Date;

  @ApiPropertyOptional({ example: 5 })
  maxTeamSize?: number;

  @ApiPropertyOptional({ example: 2 })
  minTeamSize?: number;

  @ApiProperty({ example: ['IA', 'Fintech'], type: [String] })
  themes!: string[];

  @ApiProperty({ example: ['1er prix : 500 000 FCFA'], type: [String] })
  prizes!: string[];

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' })
  status!: string;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TeamRegistrationResponseDto {
  @ApiProperty({ example: '67team...' })
  teamId!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;
}
