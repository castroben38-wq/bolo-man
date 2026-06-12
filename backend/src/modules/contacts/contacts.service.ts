import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ContactAccessMethod } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async getProviderContact(clientId: string, providerId: string) {
    // Check provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { contacts: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (!provider.contacts.length) {
      throw new NotFoundException('No contact information available for this provider');
    }

    // Check subscription-based access
    const hasSubscriptionAccess = await this.subscriptionsService.checkAccess(
      clientId,
      'contact_access',
    );

    if (hasSubscriptionAccess) {
      await this.logAccess(clientId, providerId, ContactAccessMethod.SUBSCRIPTION);
      return {
        access: true,
        method: 'subscription',
        contacts: provider.contacts.map((c) => ({
          phone: c.phone,
          whatsapp: c.whatsapp,
          address: c.address,
        })),
      };
    }

    // Check micro-payment access (valid for 48h)
    const microPaymentAccess = await this.prisma.contactAccess.findFirst({
      where: {
        clientId,
        providerId,
        accessMethod: ContactAccessMethod.MICRO_PAYMENT,
        expiresAt: { gte: new Date() },
      },
    });

    if (microPaymentAccess) {
      return {
        access: true,
        method: 'micro_payment',
        expiresAt: microPaymentAccess.expiresAt,
        contacts: provider.contacts.map((c) => ({
          phone: c.phone,
          whatsapp: c.whatsapp,
          address: c.address,
        })),
      };
    }

    // Access denied - return upgrade options
    throw new ForbiddenException({
      message: 'Contact access requires an active Gold or Premium subscription',
      code: 'CONTACT_ACCESS_DENIED',
      options: {
        subscription: {
          description: 'Upgrade to Gold or Premium for unlimited contact access',
          url: '/subscriptions',
        },
        microPayment: {
          description: 'Pay 500 XAF for 48h access to this provider\'s contact',
          amount: 500,
          currency: 'XAF',
          duration: '48h',
          url: `/contacts/${providerId}/unlock`,
        },
      },
    });
  }

  async unlockWithMicroPayment(clientId: string, providerId: string) {
    // Verify provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Get micro-payment settings
    const durationSetting = await this.prisma.adminSetting.findUnique({
      where: { key: 'micro_payment_access_duration_hours' },
    });
    const durationHours = (durationSetting?.value as number) || 48;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Create access record
    const access = await this.prisma.contactAccess.create({
      data: {
        clientId,
        providerId,
        accessMethod: ContactAccessMethod.MICRO_PAYMENT,
        expiresAt,
      },
    });

    return {
      access: true,
      method: 'micro_payment',
      expiresAt: access.expiresAt,
      message: `Contact access granted for ${durationHours} hours`,
    };
  }

  private async logAccess(
    clientId: string,
    providerId: string,
    method: ContactAccessMethod,
    bookingId?: string,
  ) {
    await this.prisma.contactAccess.create({
      data: {
        clientId,
        providerId,
        bookingId,
        accessMethod: method,
      },
    });
  }
}
