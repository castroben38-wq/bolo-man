import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchProviders(filters: {
    q?: string;
    categoryId?: string;
    city?: string;
    minRating?: number;
    maxDistance?: number;
    latitude?: number;
    longitude?: number;
    page?: number;
    limit?: number;
  }) {
    const { q, categoryId, minRating, page = 1, limit = 10 } = filters;

    const where: any = {
      isVerified: true,
    };

    if (q) {
      where.OR = [
        { businessName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categories = { has: categoryId };
    }

    if (minRating) {
      where.rating = { gte: minRating };
    }

    const providers = await this.prisma.provider.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, avatar: true, language: true } },
      },
      orderBy: { rating: 'desc' },
    });

    const total = await this.prisma.provider.count({ where });

    return {
      data: providers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async searchServices(filters: {
    q?: string;
    categoryId?: string;
    maxPrice?: number;
    priceUnit?: string;
    page?: number;
    limit?: number;
  }) {
    const { q, categoryId, maxPrice, priceUnit, page = 1, limit = 10 } = filters;

    const where: any = { isActive: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (maxPrice) {
      where.basePrice = { lte: maxPrice };
    }

    if (priceUnit) {
      where.priceUnit = priceUnit;
    }

    const services = await this.prisma.service.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        provider: {
          select: { businessName: true, rating: true, latitude: true, longitude: true },
        },
        category: { select: { name: true } },
      },
      orderBy: { rating: 'desc' },
    });

    const total = await this.prisma.service.count({ where });

    return {
      data: services,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
