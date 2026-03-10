import { Injectable, OnModuleInit } from '@nestjs/common';
import { RolesService } from './role.service';

@Injectable()
export class RolesSeedService implements OnModuleInit {
  constructor(private readonly rolesService: RolesService) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    console.log('🌱 Seeding default roles...');
    await this.rolesService.ensureDefaultRoles();
    console.log('✅ Default roles seeded');
  }
}
