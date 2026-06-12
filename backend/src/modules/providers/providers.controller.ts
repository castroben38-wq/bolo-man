import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '@prisma/client';
import {
  ProvidersService,
  UpdateProviderProfileDto,
  UpdateAvailabilityDto,
  AvailabilitySlotDto,
  ProviderSearchDto,
} from './providers.service';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // ---------------------------------------------------------------------------
  // Public: search/list providers
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Search and list verified providers' })
  @ApiOkResponse({ description: 'Paginated list of providers' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  searchProviders(@Query() query: ProviderSearchDto) {
    return this.providersService.searchProviders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a provider by ID (public)' })
  @ApiOkResponse({ description: 'Provider details' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  getProviderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.getProviderById(id);
  }

  // ---------------------------------------------------------------------------
  // Protected: provider self-management
  // ---------------------------------------------------------------------------

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @ApiOperation({ summary: 'Get own provider profile' })
  @ApiOkResponse({ description: 'Provider profile returned' })
  @ApiNotFoundResponse({ description: 'Provider profile not found' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.providersService.getProviderProfile(userId);
  }

  @Put('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @ApiOperation({ summary: 'Update own provider profile' })
  @ApiOkResponse({ description: 'Provider profile updated' })
  @ApiNotFoundResponse({ description: 'Provider profile not found' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providersService.updateProviderProfile(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  @Get('availability')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @ApiOperation({ summary: 'Get own availability schedule' })
  @ApiOkResponse({ description: 'Availability schedule returned' })
  getAvailability(@CurrentUser('sub') userId: string) {
    return this.providersService.getAvailability(userId);
  }

  @Put('availability')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @ApiOperation({ summary: 'Replace entire availability schedule' })
  @ApiOkResponse({ description: 'Availability updated' })
  @ApiBadRequestResponse({ description: 'Overlapping slots detected' })
  updateAvailability(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.providersService.updateAvailability(userId, dto);
  }

  @Post('availability')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a single availability slot' })
  @ApiOkResponse({ description: 'Slot added to availability' })
  @ApiBadRequestResponse({ description: 'Slot overlaps with an existing slot' })
  addAvailabilitySlot(
    @CurrentUser('sub') userId: string,
    @Body() dto: AvailabilitySlotDto,
  ) {
    return this.providersService.addAvailabilitySlot(userId, dto);
  }
}
