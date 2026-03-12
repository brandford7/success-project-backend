import { Injectable, OnModuleInit } from '@nestjs/common';
import { LeaguesService } from './league.service';

@Injectable()
export class LeaguesSeedService implements OnModuleInit {
  constructor(private readonly leaguesService: LeaguesService) {}

  async onModuleInit() {
    await this.seedLeagues();
  }

  private async seedLeagues() {
    console.log('🌱 Seeding leagues...');
    await this.leaguesService.seedCommonLeagues();
    console.log('✅ Leagues seeded successfully');
  }
}
