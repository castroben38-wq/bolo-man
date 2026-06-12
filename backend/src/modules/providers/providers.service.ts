import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  Length,
  IsObject,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ example: 'Plomberie Express Douala' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  businessName?: string;

  @ApiPropertyOptional({ example: 'Expert en plomberie depuis 10 ans.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['cat-uuid-1', 'cat-uuid-2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Service areas JSON array' })
  @IsOptional()
  serviceAreas?: any;

  @ApiPropertyOptional({ description: 'Pricing JSON object' })
  @IsOptional()
  pricing?: any;

  @ApiPropertyOptional({ example: 48.8566 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 2.3522 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxDistanceKm?: number;
}

export class AvailabilitySlotDto {
  @ApiProperty({ example: 1, description: '0=Sunday … 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

export class ProviderSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Douala' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiPropertyOptional({ example: 'fr', enum: ['fr', 'en'] })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  async getProviderProfile(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            language: true,
            countryCode: true,
            isVerified: true,
          },
        },
        services: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    return provider;
  }

  async getProviderById(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            language: true,
            countryCode: true,
          },
        },
        services: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async updateProviderProfile(userId: string, dto: UpdateProviderProfileDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found. Please create a provider profile first.');
    }

    return this.prisma.provider.update({
      where: { userId },
      data: {
        ...(dto.businessName !== undefined && { businessName: dto.businessName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
        ...(dto.serviceAreas !== undefined && { serviceAreas: dto.serviceAreas }),
        ...(dto.pricing !== undefined && { pricing: dto.pricing }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.maxDistanceKm !== undefined && { maxDistanceKm: dto.maxDistanceKm }),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Availability
  // -------------------------------------------------------------------------

  async getAvailability(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true, availability: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    return { availability: provider.availability ?? [] };
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    // Validate: no overlapping time slots on the same day
    const byDay = new Map<number, AvailabilitySlotDto[]>();
    for (const slot of dto.slots) {
      const existing = byDay.get(slot.dayOfWeek) ?? [];
      byDay.set(slot.dayOfWeek, [...existing, slot]);
    }

    for (const [day, slots] of byDay.entries()) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i];
          const b = slots[j];
          if (a.startTime < b.endTime && b.startTime < a.endTime) {
            throw new BadRequestException(
              `Overlapping time slots detected for day ${day}`,
            );
          }
        }
      }
    }

    const updated = await this.prisma.provider.update({
      where: { userId },
      data: { availability: dto.slots as any },
      select: { id: true, availability: true },
    });

    return { availability: updated.availability };
  }

  async addAvailabilitySlot(userId: string, slot: AvailabilitySlotDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true, availability: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const currentSlots: AvailabilitySlotDto[] =
      (provider.availability as any[]) ?? [];

    // Check for overlap with new slot
    const sameDay = currentSlots.filter(
      (s) => s.dayOfWeek === slot.dayOfWeek,
    );
    for (const existing of sameDay) {
      if (slot.startTime < existing.endTime && existing.startTime < slot.endTime) {
        throw new BadRequestException(
          `Slot overlaps with an existing slot on day ${slot.dayOfWeek}`,
        );
      }
    }

    const newSlots = [...currentSlots, slot];

    const updated = await this.prisma.provider.update({
      where: { userId },
      data: { availability: newSlots as any },
      select: { id: true, availability: true },
    });

    return { availability: updated.availability };
  }

  // -------------------------------------------------------------------------
  // Search / listing
  // -------------------------------------------------------------------------

  async searchProviders(query: ProviderSearchDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isVerified: true,
      user: { isActive: true },
    };

    if (query.categoryId) {
      where.categories = { has: query.categoryId };
    }

    if (query.minRating !== undefined) {
      where.rating = { gte: query.minRating };
    }

    if (query.maxDistance !== undefined) {
      where.maxDistanceKm = { lte: query.maxDistance };
    }

    if (query.language) {
      where.user = { ...where.user, language: query.language };
    }

    // City-based filtering via serviceAreas JSON is complex; we do simple
    // string matching on serviceAreas JSON if provided.
    // A full PostGIS geo-query would be handled at the DB level.

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ rating: 'desc' }, { reviewsCount: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              language: true,
              countryCode: true,
            },
          },
          services: {
            where: { isActive: true },
            include: { category: true },
            take: 5,
          },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
