import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { IsString, IsOptional, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jean Dupont' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'fr', enum: ['fr', 'en'] })
  @IsOptional()
  @IsEnum(['fr', 'en'])
  language?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'CM' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'fcm_token_string' })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve the full profile for a user, including provider info if applicable.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        language: true,
        currency: true,
        countryCode: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        provider: {
          select: {
            id: true,
            businessName: true,
            description: true,
            categories: true,
            rating: true,
            reviewsCount: true,
            isVerified: true,
            latitude: true,
            longitude: true,
            maxDistanceKm: true,
          },
        },
        wallet: {
          select: {
            id: true,
            balance: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update mutable profile fields for a user.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is disabled');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
        ...(dto.fcmToken !== undefined && { fcmToken: dto.fcmToken }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        language: true,
        currency: true,
        countryCode: true,
        avatar: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Deactivate (soft-delete) a user account.
   */
  async deactivateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'Account deactivated successfully' };
  }
}
