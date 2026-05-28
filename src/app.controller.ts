import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('crawler')
  async crawl() {
    return await this.appService.crawlMultipleWebsites();
  }

  @Get('crawler/exchange-rate')
  async crawlExchangeRate() {
    return await this.appService.crawlExchangeRate();
  }

  @Get('crawler/market')
  async crawlMarket() {
    return await this.appService.crawlMarketData();
  }

  @Get('crawler/gold')
  async crawlGold() {
    return await this.appService.crawlGoldPrice();
  }

  @Get('crawler/oil')
  async crawlOil() {
    return await this.appService.crawlOilPrice();
  }

  @Get('crawler/petrol')
  async crawlPetrol() {
    return await this.appService.crawlPetrolPrice();
  }
}
