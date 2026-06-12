import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../config/prisma.service';

export const SUBSCRIPTION_FEATURE_KEY = 'subscription_feature';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      SUBSCRIPTION_FEATURE_KEY,
      context.getHandler(),
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endsAt: { gte: new Date() },
      },
      include: { subscription: true },
    });

    if (!activeSubscription) {
      throw new ForbiddenException({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/subscriptions',
      });
    }

    const features = activeSubscription.subscription.features as Record<string, any>;
    if (!features[requiredFeature]) {
      throw new ForbiddenException({
        message: `Your current plan does not include ${requiredFeature}. Please upgrade.`,
        code: 'FEATURE_NOT_AVAILABLE',
        currentTier: activeSubscription.subscription.tier,
        upgradeUrl: '/subscriptions',
      });
    }

    return true;
  }
}
