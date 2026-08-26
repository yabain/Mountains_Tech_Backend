import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'Yaba-In SARL' })
  companyName!: string;

  @ApiProperty({ example: 'yaba-in-sarl' })
  slug!: string;

  @ApiPropertyOptional({ example: "Entreprise spécialisée en développement logiciel" })
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/logo.png' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://yaba-in.com' })
  website?: string;

  @ApiProperty({ example: ['Fintech', 'EdTech'], type: [String] })
  sectors!: string[];

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], example: 'APPROVED' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  approvedAt?: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-07T10:00:00.000Z' })
  updatedAt!: Date;
}

export class MemberApplicationResponseDto {
  @ApiProperty({ example: '67abc...' })
  applicationId!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], example: 'PENDING' })
  status!: string;
}
