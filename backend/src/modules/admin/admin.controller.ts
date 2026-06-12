import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with filters' })
  async getUsers(
    @Query('role') role?: Role,
    @Query('q') q?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getUsers({ role, q }, +page, +limit);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(
    @Param('id') userId: string,
    @Body() data: { isActive?: boolean; isVerified?: boolean; role?: Role },
  ) {
    return this.adminService.updateUser(userId, data);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete/suspend user' })
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.updateUser(userId, { isActive: false });
  }

  @Get('providers')
  @ApiOperation({ summary: 'List providers' })
  async getProviders(
    @Query('q') q?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getUsers({ role: Role.PROVIDER, q }, +page, +limit);
  }

  @Put('providers/:id/verify')
  @ApiOperation({ summary: 'Verify a provider' })
  async verifyProvider(@Param('id') providerId: string) {
    return this.adminService.verifyProvider(providerId);
  }

  @Put('providers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a provider' })
  async suspendProvider(@Param('id') providerId: string) {
    return this.adminService.suspendProvider(providerId);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List bookings' })
  async getBookings(
    @Query('status') status?: BookingStatus,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getBookings({ status }, +page, +limit);
  }

  @Put('bookings/:id')
  @ApiOperation({ summary: 'Update booking' })
  async updateBooking(
    @Param('id') bookingId: string,
    @Body() data: { status?: BookingStatus; price?: number; notes?: string },
  ) {
    return this.adminService.updateBooking(bookingId, data);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  async getPayments(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getPayments({ status, method }, +page, +limit);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get admin settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update settings' })
  async updateSettings(
    @Body('key') key: string,
    @Body('value') value: any,
    @Body('description') description?: string,
  ) {
    return this.adminService.updateSetting(key, value, description);
  }
}
