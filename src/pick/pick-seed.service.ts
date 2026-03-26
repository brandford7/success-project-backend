import { Injectable, OnModuleInit } from '@nestjs/common';

import { PicksService } from '../pick/pick.service'; 

@Injectable()
export class PicksSeedService implements OnModuleInit {
  constructor(
    private readonly picksService: PicksService, // 1. Inject the PicksService
  ) {}

  async onModuleInit() {
    await this.seedPicks(); // 2. Trigger the picks seeding
  }

  private async seedPicks() {
    console.log(' Seeding common picks...');
    await this.picksService.seedCommonPicks();
    console.log(' Picks seeded successfully');
  }
}
