import { Module } from '@nestjs/common';
import { PicksService } from './pick.service';
import { PicksController } from './pick.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pick } from './entities/pick.entity';
import { PicksSeedService } from './pick-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pick])],
  controllers: [PicksController],
  providers: [PicksService, PicksSeedService],
})
export class PickModule {}
