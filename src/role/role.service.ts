import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async findByNames(names: string[]): Promise<Role[]> {
    if (names.length === 0) {
      return [];
    }
    return this.roleRepository.find({
      where: { name: In(names) },
    });
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async create(name: string, description?: string): Promise<Role> {
    const role = this.roleRepository.create({
      name: name.toLowerCase(),
      description,
    });
    return this.roleRepository.save(role);
  }

  async ensureDefaultRoles(): Promise<void> {
    const defaultRoles = [
      { name: 'user', description: 'Regular user - can view tips' },
      { name: 'admin', description: 'Administrator - can create tips' },
    ];

    for (const roleData of defaultRoles) {
      const exists = await this.findByName(roleData.name);
      if (!exists) {
        await this.create(roleData.name, roleData.description);
      }
    }
  }
}
