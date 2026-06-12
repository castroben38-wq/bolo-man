import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PriceUnit } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class CreateServiceDto {
  @ApiProperty({ example: 'cat-uuid-1' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'Réparation fuite d\'eau' })
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional({ example: 'Détection et réparation de fuite.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000, description: 'Price in XAF (no decimals)' })
  @IsInt()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ enum: PriceUnit, default: PriceUnit.FLAT })
  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Réparation fuite d\'eau urgente' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ enum: PriceUnit })
  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  async getCategories(countryCode = 'CM') {
    return this.prisma.category.findMany({
      where: { isActive: true, countryCode },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // -------------------------------------------------------------------------
  // Services (public listing)
  // -------------------------------------------------------------------------

  async getServices(filters?: {
    categoryId?: string;
    providerId?: string;
    countryCode?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.providerId) where.providerId = filters.providerId;
    if (filters?.countryCode) where.countryCode = filters.countryCode;

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ rating: 'desc' }, { reviewsCount: 'desc' }],
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              businessName: true,
              rating: true,
              isVerified: true,
              user: { select: { name: true, avatar: true, language: true } },
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: services,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // -------------------------------------------------------------------------
  // Provider-owned services
  // -------------------------------------------------------------------------

  async getProviderServices(providerId: string) {
    // Verify provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return this.prisma.service.findMany({
      where: { providerId, isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyServices(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    return this.prisma.service.findMany({
      where: { providerId: provider.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(userId: string, dto: CreateServiceDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true, countryCode: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found. Create a provider profile first.');
    }

    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    return this.prisma.service.create({
      data: {
        providerId: provider.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        priceUnit: dto.priceUnit ?? PriceUnit.FLAT,
        maxDistanceKm: dto.maxDistanceKm,
        countryCode: provider.countryCode,
      },
      include: { category: true },
    });
  }

  async updateService(
    userId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: { select: { userId: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.userId !== userId) {
      throw new ForbiddenException('You do not own this service');
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.priceUnit !== undefined && { priceUnit: dto.priceUnit }),
        ...(dto.maxDistanceKm !== undefined && { maxDistanceKm: dto.maxDistanceKm }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { category: true },
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: { select: { userId: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.userId !== userId) {
      throw new ForbiddenException('You do not own this service');
    }

    // Soft-delete: mark as inactive
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    return { message: 'Service removed successfully' };
  }
}
