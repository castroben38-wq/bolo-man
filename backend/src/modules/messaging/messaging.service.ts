import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        booking: {
          OR: [{ clientId: userId }, { providerId: userId }],
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            clientId: true,
            providerId: true,
            service: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return conversations;
  }

  async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 20) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        booking: { select: { clientId: true, providerId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.booking.clientId === userId ||
      conversation.booking.providerId === userId;

    if (!isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages;
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { booking: { select: { clientId: true, providerId: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.booking.clientId === senderId ||
      conversation.booking.providerId === senderId;

    if (!isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getOrCreateConversation(bookingId: string) {
    let conversation = await this.prisma.conversation.findUnique({
      where: { bookingId },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { bookingId },
      });
    }

    return conversation;
  }
}
