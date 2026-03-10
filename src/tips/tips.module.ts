import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tip } from './entities/tip.entity';
import { TipsController } from './tips.controller';
import { TipsService } from './tips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tip])],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
