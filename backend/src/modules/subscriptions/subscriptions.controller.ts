import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─── List Plans ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all available subscription plans' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'CM' })
  @ApiQuery({ name: 'role', required: false, example: 'CLIENT' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async listPlans(
    @Query('countryCode') countryCode?: string,
    @Query('role') role?: string,
  ) {
    return this.subscriptionsService.listPlans(countryCode ?? 'CM', role);
  }

  // ─── My Subscription ───────────────────────────────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user\'s active subscription' })
  @ApiResponse({ status: 200, description: 'Active subscription or null' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  // ─── Usage / Feature Breakdown ─────────────────────────────────────────────

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription usage and feature availability' })
  @ApiResponse({ status: 200, description: 'Usage breakdown with feature flags' })
  async getUsage(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUsage(userId);
  }

  // ─── Check Feature Access ──────────────────────────────────────────────────

  @Get('access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the current user has access to a specific feature' })
  @ApiQuery({ name: 'feature', required: true, description: 'Feature key to check' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(
    @CurrentUser('id') userId: string,
    @Query('feature') featureKey: string,
  ) {
    return this.subscriptionsService.checkAccess(userId, featureKey);
  }

  // ─── Subscribe ─────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 409, description: 'Already subscribed to this plan' })
  async subscribe(
    @CurrentUser() user: { id: string; countryCode: string },
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(user.id, user.countryCode || 'CM', dto);
  }

  // ─── Upgrade / Downgrade ───────────────────────────────────────────────────

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade or downgrade current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async updateSubscription(
    @CurrentUser() user: { id: string; countryCode: string },
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(
      user.id,
      user.countryCode || 'CM',
      dto,
    );
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 404, description: 'No active subscription to cancel' })
  async cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancel(userId);
  }
}
