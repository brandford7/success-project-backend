import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name },
    });
  }

  async findByNames(names: string[]): Promise<Role[]> {
    const roles = await this.roleRepository.find({
      where: {
        name: In(names),
      },
    });

    // Validate all roles were found
    if (roles.length !== names.length) {
      const foundNames = roles.map((r) => r.name);
      const missingNames = names.filter((name) => !foundNames.includes(name));
      throw new NotFoundException(
        `Roles not found: ${missingNames.join(', ')}`,
      );
    }

    return roles;
  }

  async ensureDefaultRoles(): Promise<void> {
    const defaultRoles = [
      { name: 'user', description: 'Regular user role' },
      { name: 'admin', description: 'Administrator role' },
    ];

    for (const roleData of defaultRoles) {
      const exists = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!exists) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
      }
    }
  }
}
