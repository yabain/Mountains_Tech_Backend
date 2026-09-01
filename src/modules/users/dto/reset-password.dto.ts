import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetPasswordDto {
  @ApiProperty({ example: 'admin@mountainstech.cm' })
  @IsEmail()
  email!: string;
}

export class ConfirmResetPasswordDto {
  @ApiProperty({ description: 'Token de réinitialisation reçu par email' })
  @IsNotEmpty()
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewStr0ngP@ss', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
