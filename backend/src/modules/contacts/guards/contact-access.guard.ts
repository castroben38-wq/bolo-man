import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';

@Injectable()
export class ContactAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Check active subscription with contact_access feature
    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endsAt: { gte: new Date() },
      },
      include: { subscription: true },
    });

    if (activeSubscription) {
      const features = activeSubscription.subscription.features as Record<string, any>;
      if (features.contact_access) {
        return true;
      }
    }

    // Check micro-payment access
    const providerId = request.params.providerId;
    if (providerId) {
      const microAccess = await this.prisma.contactAccess.findFirst({
        where: {
          clientId: userId,
          providerId,
          accessMethod: 'MICRO_PAYMENT',
          expiresAt: { gte: new Date() },
        },
      });

      if (microAccess) {
        return true;
      }
    }

    throw new ForbiddenException({
      message: 'Contact access requires Gold/Premium subscription or micro-payment',
      code: 'CONTACT_ACCESS_DENIED',
      upgradeUrl: '/subscriptions',
    });
  }
}
