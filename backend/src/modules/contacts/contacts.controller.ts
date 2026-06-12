import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get(':providerId')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Get provider contact info (gated by subscription)' })
  @ApiResponse({ status: 200, description: 'Contact info returned' })
  @ApiResponse({ status: 403, description: 'Subscription required - upgrade options returned' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderContact(
    @CurrentUser('id') clientId: string,
    @Param('providerId') providerId: string,
  ) {
    return this.contactsService.getProviderContact(clientId, providerId);
  }

  @Post(':providerId/unlock')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Unlock contact via micro-payment (500 XAF for 48h)' })
  @ApiResponse({ status: 201, description: 'Contact unlocked via micro-payment' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async unlockContact(
    @CurrentUser('id') clientId: string,
    @Param('providerId') providerId: string,
  ) {
    return this.contactsService.unlockWithMicroPayment(clientId, providerId);
  }
}
