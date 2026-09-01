import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { User, UserDocument } from '../../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

export interface PaginatedUsers {
  items: Omit<User & { id: string }, 'passwordHash'>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private sanitize(doc: UserDocument): Omit<User & { id: string }, 'passwordHash'> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['passwordHash'];
    delete obj['__v'];
    return obj as Omit<User & { id: string }, 'passwordHash'>;
  }

  // ─── Admin CRUD ─────────────────────────────────────────────────────────────

  async findAll(query: QueryUsersDto): Promise<PaginatedUsers> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', role, status } = query;

    const filter: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    if (role) filter['role'] = role;
    if (status) filter['status'] = status;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.userModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.sanitize(d)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Omit<User & { id: string }, 'passwordHash'>> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Utilisateur introuvable');
    return this.sanitize(doc);
  }

  async create(dto: CreateUserDto): Promise<Omit<User & { id: string }, 'passwordHash'>> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) throw new ConflictException('Un utilisateur avec cet email existe déjà');

    const passwordHash = await argon2.hash(dto.password);

    const doc = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      role: dto.role ?? 'EDITOR',
      status: dto.status ?? 'ACTIVE',
    });

    return this.sanitize(doc);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User & { id: string }, 'passwordHash'>> {
    const existing = await this.userModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    // Check email uniqueness if email is being changed
    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.userModel.findOne({ email: dto.email }).exec();
      if (conflict) throw new ConflictException('Cet email est déjà utilisé');
    }

    const updateData: Partial<User> = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.password) {
      updateData.passwordHash = await argon2.hash(dto.password);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Utilisateur introuvable');
    return this.sanitize(updated);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Utilisateur introuvable');
    // Soft delete - mark as INACTIVE rather than hard delete
    await this.userModel.findByIdAndUpdate(id, { $set: { status: 'INACTIVE' } }).exec();
  }

  // ─── Auth helpers (used by AuthModule) ──────────────────────────────────────

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findDocumentById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async generateResetToken(email: string): Promise<{ token: string; user: UserDocument } | null> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) return null; // Don't reveal if email exists

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { resetPasswordToken: token, resetPasswordExpires: expires },
    }).exec();

    return { token, user };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    }).exec();
  }
}
