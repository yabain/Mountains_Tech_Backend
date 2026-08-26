import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Jean Dupont' })
  @IsNotEmpty() @IsString() name!: string;

  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail() email!: string;

  @ApiProperty({ example: 'Demande de partenariat' })
  @IsNotEmpty() @IsString() subject!: string;

  @ApiProperty({ example: 'Bonjour, je souhaite...' })
  @IsNotEmpty() @IsString() message!: string;

  @ApiProperty({ example: true })
  @IsBoolean() consent!: boolean;
}
