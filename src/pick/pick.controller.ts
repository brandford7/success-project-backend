import { Controller, Get, Post, Body, Query, Patch } from '@nestjs/common';
import { PicksService } from './pick.service';
import { Pick } from './entities/pick.entity';

@Controller('picks')
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @Get()
  async getAllPicks(): Promise<Pick[]> {
    return this.picksService.findAll();
  }

  @Get('popular')
  async getPopular(@Query('limit') limit: number): Promise<Pick[]> {
    return this.picksService.getPopularPicks(limit);
  }

  @Post('seed')
  async seedPicks(): Promise<{ message: string }> {
    await this.picksService.seedCommonPicks();
    return { message: 'Common picks seeded successfully' };
  }

  @Patch('usage')
  async incrementUsage(
    @Body() body: { name: string; category: string },
  ): Promise<{ success: boolean }> {
    await this.picksService.incrementUsage(body.name, body.category);
    return { success: true };
  }
}
