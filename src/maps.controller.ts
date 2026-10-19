import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MapsService } from './maps.service';

@Controller('crawler/maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search Google Maps by address or place name' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  search(@Query('query') query: string, @Query('limit') limit?: string) {
    return this.maps.search(query, limit === undefined ? 10 : Number(limit));
  }

  @Get('detail')
  @ApiOperation({
    summary: 'Get details of a selected Google Maps result or short link',
  })
  @ApiQuery({ name: 'url', required: true, type: String })
  detail(@Query('url') url: string) {
    return this.maps.crawl(url);
  }

  @Get()
  @ApiOperation({
    summary: 'Resolve a Google Maps place URL or shared short link',
  })
  @ApiQuery({ name: 'url', required: true, type: String })
  crawl(@Query('url') url: string) {
    return this.maps.crawl(url);
  }
}
