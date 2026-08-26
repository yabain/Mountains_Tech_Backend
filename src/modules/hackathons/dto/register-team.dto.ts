import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamMemberDto {
  @ApiProperty({ example: 'Aline' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'aline@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+237600000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Developer' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class TeamLeaderDto {
  @ApiProperty({ example: 'Jean' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+237600000000' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class RegisterTeamDto {
  @ApiProperty({ example: 'Tech Mountains' })
  @IsNotEmpty()
  @IsString()
  teamName!: string;

  @ApiPropertyOptional({ example: 'Université / Entreprise' })
  @IsOptional()
  @IsString()
  schoolOrOrganization?: string;

  @ApiProperty({ type: TeamLeaderDto })
  @ValidateNested()
  @Type(() => TeamLeaderDto)
  leader!: TeamLeaderDto;

  @ApiPropertyOptional({ type: [TeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members?: TeamMemberDto[];

  @ApiPropertyOptional({ example: 'Description de l\'idée de projet' })
  @IsOptional()
  @IsString()
  projectIdea?: string;

  @ApiPropertyOptional({ example: ['Angular', 'NestJS', 'MongoDB'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologyStack?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  consent!: boolean;
}
