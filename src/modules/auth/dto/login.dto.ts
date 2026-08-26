import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@mountainstech.cm' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '********' })
  @IsNotEmpty()
  @IsString()
  password!: string;
}
