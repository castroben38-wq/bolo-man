import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { Role, BookingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalProviders,
      activeProviders,
      totalBookings,
      totalRevenue,
      recentSignups,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { in: [Role.CLIENT, Role.PROVIDER] } } }),
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { isActive: true } }),
      this.prisma.booking.count(),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      users: { total: totalUsers, recentSignups },
      providers: { total: totalProviders, active: activeProviders },
      bookings: { total: totalBookings },
      revenue: totalRevenue._sum.amount || 0,
    };
  }

  async getUsers(filters: { role?: Role; verified?: boolean; q?: string }, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.verified !== undefined) where.isVerified = filters.verified;
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { phone: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          provider: true,
          subscriptions: { where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] } }, include: { subscription: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUser(userId: string, data: { isActive?: boolean; isVerified?: boolean; role?: Role }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: { provider: true },
    });
  }

  async verifyProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    await this.prisma.user.update({
      where: { id: provider.userId },
      data: { isVerified: true },
    });

    return this.prisma.provider.update({
      where: { id: providerId },
      data: { isVerified: true },
    });
  }

  async suspendProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return this.prisma.provider.update({
      where: { id: providerId },
      data: { isActive: false },
    });
  }

  async getBookings(filters: { status?: BookingStatus; providerId?: string; clientId?: string }, page: number = 1, limit: number = 20) {
    const where = filters || {};
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { name: true, phone: true } },
          provider: { select: { name: true, phone: true } },
          service: { select: { name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data: bookings, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateBooking(bookingId: string, data: { status?: BookingStatus; price?: number; notes?: string }) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data,
      include: {
        client: { select: { name: true } },
        provider: { select: { name: true } },
        service: { select: { name: true } },
      },
    });
  }

  async getPayments(filters: { status?: string; method?: string }, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true, phone: true } },
          booking: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: payments, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSettings() {
    return this.prisma.adminSetting.findMany();
  }

  async updateSetting(key: string, value: any, description?: string) {
    return this.prisma.adminSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }
}
