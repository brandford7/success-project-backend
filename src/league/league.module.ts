import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaguesService } from './league.service';
import { LeaguesController } from './league.controller';
import { League } from './entities/league.entity';
import { LeaguesSeedService } from './leagues-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([League])],
  controllers: [LeaguesController],
  providers: [LeaguesService, LeaguesSeedService],
  exports: [LeaguesService],
})
export class LeagueModule {}
