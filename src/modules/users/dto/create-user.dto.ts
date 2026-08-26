import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Jean' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'jean.dupont@mountainstech.cm' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'COMMUNICATION'],
    default: 'EDITOR',
  })
  @IsOptional()
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'COMMUNICATION'])
  role?: string = 'EDITOR';

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string = 'ACTIVE';
}
