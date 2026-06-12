import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  async createReview(
    @CurrentUser('id') reviewerId: string,
    @Body('bookingId') bookingId: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    return this.reviewsService.createReview(reviewerId, bookingId, rating, comment);
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Get reviews for a provider' })
  async getProviderReviews(
    @Param('providerId') providerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.getProviderReviews(providerId, +page, +limit);
  }

  @Put(':id/response')
  @ApiOperation({ summary: 'Provider responds to a review' })
  async respondToReview(
    @CurrentUser('id') providerId: string,
    @Param('id') reviewId: string,
    @Body('response') response: string,
  ) {
    return this.reviewsService.respondToReview(reviewId, providerId, response);
  }
}
