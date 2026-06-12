import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data || {},
      },
    });
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async sendPush(userId: string, title: string, body: string, data?: Record<string, any>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      // TODO: Implement FCM push notification
      console.log(`[PUSH] To ${userId}: ${title} - ${body}`);
    }

    return this.create(userId, NotificationType.PUSH, title, body, data);
  }

  async sendSms(phone: string, message: string) {
    // TODO: Implement SMS (Twilio or local provider)
    console.log(`[SMS] To ${phone}: ${message}`);
    return { success: true };
  }

  async sendEmail(email: string, subject: string, body: string) {
    // TODO: Implement email (SendGrid or Nodemailer)
    console.log(`[EMAIL] To ${email}: ${subject}`);
    return { success: true };
  }
}
