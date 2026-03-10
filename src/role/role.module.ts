import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';

import { RolesSeedService } from './roles-seed.service';
import { RolesService } from './role.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [RolesService, RolesSeedService],
  exports: [RolesService],
})
export class RolesModule {}
