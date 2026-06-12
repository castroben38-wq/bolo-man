import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '@prisma/client';
import {
  BookingsService,
  CreateBookingDto,
  UpdateBookingStatusDto,
  ListBookingsQueryDto,
} from './bookings.service';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Create a new booking request' })
  @ApiCreatedResponse({ description: 'Booking created with REQUESTED status' })
  @ApiBadRequestResponse({ description: 'Invalid service, provider, or data' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  createBooking(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings for the authenticated user' })
  @ApiOkResponse({ description: 'Paginated bookings list' })
  @ApiQuery({ name: 'status', required: false, enum: ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-06-30' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listBookings(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listBookings(userId, userRole, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiOkResponse({ description: 'Booking details' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  getBooking(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookingsService.getBookingById(userId, userRole, bookingId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update booking status (state machine)',
    description:
      'Valid transitions: REQUESTED→ACCEPTED|CANCELLED, ACCEPTED→EN_ROUTE|CANCELLED, EN_ROUTE→ON_SITE, ON_SITE→COMPLETED',
  })
  @ApiOkResponse({ description: 'Booking status updated' })
  @ApiBadRequestResponse({ description: 'Invalid status transition or missing cancel reason' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Access denied or insufficient role for this transition' })
  updateBookingStatus(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(
      userId,
      userRole,
      bookingId,
      dto,
    );
  }
}
