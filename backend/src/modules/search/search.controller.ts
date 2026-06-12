import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Search providers' })
  async searchProviders(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('minRating') minRating?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.searchService.searchProviders({
      q,
      categoryId,
      minRating: minRating ? +minRating : undefined,
      maxDistance: maxDistance ? +maxDistance : undefined,
      page: +page,
      limit: +limit,
    });
  }

  @Get('services')
  @ApiOperation({ summary: 'Search services' })
  async searchServices(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('priceUnit') priceUnit?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.searchService.searchServices({
      q,
      categoryId,
      maxPrice: maxPrice ? +maxPrice : undefined,
      priceUnit,
      page: +page,
      limit: +limit,
    });
  }
}
