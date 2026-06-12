import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(reviewerId: string, bookingId: string, rating: number, comment?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed bookings');
    }

    if (booking.clientId !== reviewerId && booking.providerId !== reviewerId) {
      throw new ForbiddenException('Only booking participants can review');
    }

    const revieweeId = booking.providerId === reviewerId ? booking.clientId : booking.providerId;

    const existingReview = await this.prisma.review.findFirst({
      where: { bookingId, reviewerId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    const review = await this.prisma.review.create({
      data: {
        bookingId,
        reviewerId,
        revieweeId,
        rating,
        comment,
      },
    });

    // Update provider rating
    if (booking.providerId === revieweeId) {
      const providerReviews = await this.prisma.review.findMany({
        where: { revieweeId },
      });
      const avgRating = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;

      await this.prisma.provider.update({
        where: { userId: revieweeId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviewsCount: { increment: 1 },
        },
      });
    }

    return review;
  }

  async getProviderReviews(providerId: string, page: number = 1, limit: number = 10) {
    return this.prisma.review.findMany({
      where: { revieweeId: providerId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reviewer: { select: { name: true } },
        booking: { select: { service: { select: { name: true } } } },
      },
    });
  }

  async respondToReview(reviewId: string, providerId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: { select: { providerId: true } } },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.booking.providerId !== providerId) {
      throw new ForbiddenException('Only the provider can respond');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response },
    });
  }
}
