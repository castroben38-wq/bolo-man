import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionStatus, PaymentMethod } from '@prisma/client';
import { SubscribeDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  /**
   * List all active subscription plans, optionally filtered by countryCode/role.
   */
  async listPlans(countryCode = 'CM', role?: string) {
    return this.prisma.subscription.findMany({
      where: {
        isActive: true,
        countryCode,
        ...(role ? { targetRole: role as any } : {}),
      },
      orderBy: [{ tier: 'asc' }, { price: 'asc' }],
    });
  }

  // ─── Subscribe ─────────────────────────────────────────────────────────────

  /**
   * Subscribe a user to a plan. Pays via wallet by default.
   * Cancels any existing active subscription first.
   */
  async subscribe(userId: string, countryCode: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscription.findFirst({
      where: { id: dto.subscriptionId, isActive: true },
    });

    if (!plan) throw new NotFoundException('Subscription plan not found or inactive');

    // Check for existing active subscription
    const existing = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      include: { subscription: true },
    });

    if (existing && existing.subscriptionId === dto.subscriptionId) {
      throw new ConflictException('You are already subscribed to this plan');
    }

    // Initiate payment
    const paymentMethod = dto.paymentMethod ?? PaymentMethod.WALLET;
    const paymentResult = await this.paymentsService.initiatePayment(userId, countryCode, {
      amount: plan.price,
      method: paymentMethod,
      description: `Subscription: ${plan.name}`,
    });

    // Cancel existing subscription if any
    if (existing) {
      await this.prisma.userSubscription.update({
        where: { id: existing.id },
        data: { status: SubscriptionStatus.CANCELLED },
      });
    }

    // Calculate end date
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setDate(endsAt.getDate() + plan.durationDays);

    const userSub = await this.prisma.userSubscription.create({
      data: {
        userId,
        subscriptionId: plan.id,
        startedAt,
        endsAt,
        status: paymentMethod === PaymentMethod.WALLET
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.GRACE_PERIOD,
        autoRenew: dto.autoRenew ?? true,
        paymentMethod,
      },
      include: { subscription: true },
    });

    return { userSubscription: userSub, payment: paymentResult };
  }

  // ─── Upgrade / Downgrade ───────────────────────────────────────────────────

  /**
   * Upgrade or downgrade a user's current subscription.
   * Debits/credits the difference. No partial refunds; charged full new price.
   */
  async updateSubscription(userId: string, countryCode: string, dto: UpdateSubscriptionDto) {
    const active = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      include: { subscription: true },
    });

    if (!active) throw new NotFoundException('No active subscription found to modify');

    const newPlan = await this.prisma.subscription.findFirst({
      where: { id: dto.subscriptionId, isActive: true },
    });

    if (!newPlan) throw new NotFoundException('Target subscription plan not found');

    if (active.subscriptionId === dto.subscriptionId) {
      throw new ConflictException('Already subscribed to this plan');
    }

    // Determine if upgrade or downgrade by tier order
    const tierOrder: Record<string, number> = { CLASSIC: 1, GOLD: 2, PREMIUM: 3 };
    const currentTierValue = tierOrder[active.subscription.tier] ?? 0;
    const newTierValue = tierOrder[newPlan.tier] ?? 0;
    const direction = newTierValue >= currentTierValue ? 'upgrade' : 'downgrade';

    // Pay for the new plan
    const paymentMethod = dto.paymentMethod ?? (active.paymentMethod as PaymentMethod) ?? PaymentMethod.WALLET;
    const paymentResult = await this.paymentsService.initiatePayment(userId, countryCode, {
      amount: newPlan.price,
      method: paymentMethod,
      description: `Subscription ${direction}: ${active.subscription.name} → ${newPlan.name}`,
    });

    // Cancel old subscription
    await this.prisma.userSubscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });

    // Create new subscription
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setDate(endsAt.getDate() + newPlan.durationDays);

    const newUserSub = await this.prisma.userSubscription.create({
      data: {
        userId,
        subscriptionId: newPlan.id,
        startedAt,
        endsAt,
        status: paymentMethod === PaymentMethod.WALLET
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.GRACE_PERIOD,
        autoRenew: dto.autoRenew ?? active.autoRenew,
        paymentMethod,
      },
      include: { subscription: true },
    });

    return { direction, userSubscription: newUserSub, payment: paymentResult };
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  async cancel(userId: string) {
    const active = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD] } },
    });

    if (!active) throw new NotFoundException('No active subscription to cancel');

    return this.prisma.userSubscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.CANCELLED, autoRenew: false },
      include: { subscription: true },
    });
  }

  // ─── Access Check ──────────────────────────────────────────────────────────

  /**
   * Check if a user has access to a specific feature key.
   * Returns { hasAccess: boolean, tier: string | null, reason?: string }
   */
  async checkAccess(
    userId: string,
    featureKey: string,
  ): Promise<{ hasAccess: boolean; tier: string | null; reason?: string }> {
    const activeSub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: { gte: new Date() },
      },
      include: { subscription: true },
    });

    if (!activeSub) {
      return { hasAccess: false, tier: null, reason: 'No active subscription' };
    }

    const features = activeSub.subscription.features as Record<string, any>;
    const hasFeature = Boolean(features[featureKey]);

    return {
      hasAccess: hasFeature,
      tier: activeSub.subscription.tier,
      reason: hasFeature
        ? undefined
        : `Feature '${featureKey}' not included in ${activeSub.subscription.tier} plan`,
    };
  }

  // ─── User Subscription ─────────────────────────────────────────────────────

  async getMySubscription(userId: string) {
    const userSub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD] },
      },
      orderBy: { createdAt: 'desc' },
      include: { subscription: true },
    });

    return userSub ?? null;
  }

  // ─── Usage / Feature Breakdown ─────────────────────────────────────────────

  async getUsage(userId: string) {
    const sub = await this.getMySubscription(userId);

    if (!sub) {
      return {
        hasSubscription: false,
        tier: null,
        features: {},
        endsAt: null,
        daysRemaining: 0,
      };
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((sub.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      hasSubscription: true,
      tier: sub.subscription.tier,
      planName: sub.subscription.name,
      status: sub.status,
      features: sub.subscription.features,
      startedAt: sub.startedAt,
      endsAt: sub.endsAt,
      daysRemaining,
      autoRenew: sub.autoRenew,
    };
  }

  // ─── Cron: Process Renewals ────────────────────────────────────────────────

  /**
   * Runs daily at midnight. Finds subscriptions expiring within 0 days
   * that have autoRenew=true and attempts renewal via wallet debit.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRenewals() {
    this.logger.log('processRenewals: starting daily renewal job');

    const now = new Date();
    const expiredAutoRenew = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        endsAt: { lte: now },
      },
      include: { subscription: true, user: true },
    });

    this.logger.log(`processRenewals: found ${expiredAutoRenew.length} subscriptions to renew`);

    for (const userSub of expiredAutoRenew) {
      try {
        const plan = userSub.subscription;
        const user = userSub.user;

        // Attempt wallet payment
        await this.paymentsService.initiatePayment(user.id, user.countryCode, {
          amount: plan.price,
          method: PaymentMethod.WALLET,
          description: `Auto-renewal: ${plan.name}`,
        });

        // Extend subscription
        const newEndsAt = new Date(userSub.endsAt);
        newEndsAt.setDate(newEndsAt.getDate() + plan.durationDays);

        await this.prisma.userSubscription.update({
          where: { id: userSub.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            endsAt: newEndsAt,
          },
        });

        this.logger.log(`Renewed subscription ${userSub.id} for user ${user.id} until ${newEndsAt.toISOString()}`);
      } catch (err) {
        this.logger.error(
          `Failed to renew subscription ${userSub.id} for user ${userSub.userId}: ${(err as Error).message}`,
        );
        // Move to GRACE_PERIOD instead of EXPIRED immediately
        await this.prisma.userSubscription.update({
          where: { id: userSub.id },
          data: { status: SubscriptionStatus.GRACE_PERIOD },
        });
      }
    }
  }

  // ─── Cron: Expire Grace Period ─────────────────────────────────────────────

  /**
   * Runs every 6 hours. Expires subscriptions that are in GRACE_PERIOD
   * and whose endsAt was more than 3 days ago.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async expireGracePeriodSubscriptions() {
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - 3);

    const result = await this.prisma.userSubscription.updateMany({
      where: {
        status: SubscriptionStatus.GRACE_PERIOD,
        endsAt: { lte: graceCutoff },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} grace-period subscriptions`);
    }
  }

  // ─── Cron: Renewal Reminders ───────────────────────────────────────────────

  /**
   * Runs daily at 9:00 AM. Notifies users whose subscription expires in 3 days.
   * Actual notification delivery is stubbed – integrate with NotificationsModule.
   */
  @Cron('0 9 * * *')
  async sendRenewalReminders() {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);

    // Window: 3 days from now ±12 hours
    const windowStart = new Date(reminderDate);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(reminderDate);
    windowEnd.setHours(23, 59, 59, 999);

    const expiringSoon = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endsAt: { gte: windowStart, lte: windowEnd },
      },
      include: { subscription: true, user: true },
    });

    this.logger.log(`sendRenewalReminders: ${expiringSoon.length} subscriptions expiring in 3 days`);

    for (const userSub of expiringSoon) {
      try {
        // Create in-app notification (stub – replace with NotificationsService injection)
        await this.prisma.notification.create({
          data: {
            userId: userSub.userId,
            type: 'PUSH',
            title: 'Subscription expiring soon',
            body: `Your ${userSub.subscription.name} plan expires on ${userSub.endsAt.toLocaleDateString('fr-CM')}. Renew to avoid service interruption.`,
            data: {
              subscriptionId: userSub.subscriptionId,
              userSubscriptionId: userSub.id,
              type: 'RENEWAL_REMINDER',
            },
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to send renewal reminder for user ${userSub.userId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
