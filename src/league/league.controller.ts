import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaguesService } from './league.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler/dist/throttler.decorator';

@Controller('leagues')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  @Public()
  async findAll() {
    return this.leaguesService.findAll();
  }

  @Get('search')
  @Public()
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.leaguesService.searchLeagues(query);
  }

  @Get('popular')
  @Public()
  async popular(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.leaguesService.getPopularLeagues(limitNum);
  }

  @Get('by-country')
  @Public()
  async byCountry(@Query('country') country: string) {
    return this.leaguesService.findByCountry(country);
  }
}
