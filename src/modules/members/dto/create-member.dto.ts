import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'Yaba-In SARL' })
  @IsNotEmpty()
  @IsString()
  companyName!: string;

  @ApiPropertyOptional({ example: 'SARL' })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiPropertyOptional({ example: "Description de l'entreprise" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.cm' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'contact@example.cm' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+237600000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Bangangté, Cameroun' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Nom Prénom' })
  @IsNotEmpty()
  @IsString()
  representativeName!: string;

  @ApiProperty({ example: 'prenom@example.cm' })
  @IsEmail()
  representativeEmail!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: ['Fintech', 'EdTech'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectors?: string[];

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  employees?: number;
}
