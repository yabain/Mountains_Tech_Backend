import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    await this.usersService.updateLastLogin(String(user._id));

    return this.buildTokens(user);
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(payload: JwtPayload): Promise<{ accessToken: string }> {
    const user = await this.usersService.findDocumentById(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Refresh token invalide ou compte inactif');
    }

    const accessToken = this.signAccessToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  // ─── Profile (GET /auth/me) ───────────────────────────────────────────────────

  async getMe(sub: string) {
    return this.usersService.findById(sub);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildTokens(user: {
    _id: unknown;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }): AuthResponseDto {
    const id = String(user._id);
    const payload: JwtPayload = { sub: id, email: user.email, role: user.role };

    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
      user: {
        id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as never,
      },
    );
  }

  private signRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d') as never,
      },
    );
  }
}
