import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ example: 'Jean' })
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  lastName!: string;

  @ApiProperty({ example: 'jean.dupont@mountainstech.cm' })
  email!: string;

  @ApiProperty({ enum: ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'COMMUNICATION'], example: 'EDITOR' })
  role!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  lastLoginAt?: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  pages!: number;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}
