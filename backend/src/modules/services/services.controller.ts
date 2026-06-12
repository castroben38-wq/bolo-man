import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '@prisma/client';
import {
  ServicesService,
  CreateServiceDto,
  UpdateServiceDto,
} from './services.service';

@ApiTags('services')
@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ---------------------------------------------------------------------------
  // Categories (public)
  // ---------------------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'List all active service categories' })
  @ApiOkResponse({ description: 'Category list returned' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'CM' })
  getCategories(@Query('countryCode') countryCode = 'CM') {
    return this.servicesService.getCategories(countryCode);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiOkResponse({ description: 'Category returned' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  getCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getCategoryById(id);
  }

  // ---------------------------------------------------------------------------
  // Services (public listing)
  // ---------------------------------------------------------------------------

  @Get('services')
  @ApiOperation({ summary: 'List/search all active services' })
  @ApiOkResponse({ description: 'Paginated services list' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getServices(
    @Query('categoryId') categoryId?: string,
    @Query('providerId') providerId?: string,
    @Query('countryCode') countryCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.servicesService.getServices({
      categoryId,
      providerId,
      countryCode,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('providers/:id/services')
  @ApiOperation({ summary: 'Get all active services offered by a provider' })
  @ApiOkResponse({ description: 'Provider services list' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  getProviderServices(@Param('id', ParseUUIDPipe) providerId: string) {
    return this.servicesService.getProviderServices(providerId);
  }

  // ---------------------------------------------------------------------------
  // Provider-owned service management (protected)
  // ---------------------------------------------------------------------------

  @Get('my/services')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'List own services (provider)' })
  @ApiOkResponse({ description: 'Own services list returned' })
  getMyServices(@CurrentUser('sub') userId: string) {
    return this.servicesService.getMyServices(userId);
  }

  @Post('my/services')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Create a new service (provider)' })
  @ApiCreatedResponse({ description: 'Service created' })
  @ApiBadRequestResponse({ description: 'Invalid category or data' })
  @ApiNotFoundResponse({ description: 'Provider profile not found' })
  createService(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.createService(userId, dto);
  }

  @Put('my/services/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Update own service (provider)' })
  @ApiOkResponse({ description: 'Service updated' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiForbiddenResponse({ description: 'You do not own this service' })
  updateService(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(userId, serviceId, dto);
  }

  @Delete('my/services/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove own service (soft-delete, provider)' })
  @ApiOkResponse({ description: 'Service removed' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiForbiddenResponse({ description: 'You do not own this service' })
  deleteService(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) serviceId: string,
  ) {
    return this.servicesService.deleteService(userId, serviceId);
  }
}
