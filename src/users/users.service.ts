import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RolesService } from '../role/role.service';
import { GrantVipDto } from './dto/grant-vip.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phoneNumber },
      relations: ['roles'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async create(
    email: string | null,
    phoneNumber: string | null,
    password: string,
    roleNames: string[] = ['user'],
  ): Promise<User> {
    // Get roles from database
    const roles = await this.rolesService.findByNames(roleNames);

    if (roles.length === 0) {
      throw new NotFoundException('No valid roles found');
    }

    const user = this.userRepository.create({
      email,
      phoneNumber,
      password,
      roles,
    });

    return this.userRepository.save(user);
  }

  async addRole(userId: string, roleName: string): Promise<User> {
    const user = await this.findById(userId);
    const role = await this.rolesService.findByName(roleName);

    if (!role) {
      throw new NotFoundException(`Role "${roleName}" not found`);
    }

    if (!user.hasRole(roleName)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user;
  }

  async removeRole(userId: string, roleName: string): Promise<User> {
    const user = await this.findById(userId);
    user.roles = user.roles.filter((role) => role.name !== roleName);
    return this.userRepository.save(user);
  }

  async getAllUsers(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    const { page, limit, search } = options;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.createdAt', 'DESC');

    if (search && search.trim().length > 0) {
      queryBuilder.where(
        'user.email ILIKE :search OR user.phoneNumber ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Transform roles to just names ✅
    const transformedData = data.map((user) => ({
      ...user,
      roles: user.roles.map((role) => role.name), // Convert to string[]
    }));

    return {
      data: transformedData as any,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query || query.length < 2) {
      return [];
    }

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.email ILIKE :query', { query: `%${query}%` })
      .orWhere('user.phoneNumber ILIKE :query', { query: `%${query}%` })
      .take(10)
      .getMany();
  }

  async grantVip(userId: string, grantVipDto: GrantVipDto): Promise<User> {
    const user = await this.findById(userId);

    const days = grantVipDto.customDays || grantVipDto.duration;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    user.isVip = true;
    user.vipExpiresAt = expiryDate;

    return this.userRepository.save(user);
  }

  async extendVip(userId: string, grantVipDto: GrantVipDto): Promise<User> {
    const user = await this.findById(userId);

    if (!user.isVip) {
      throw new BadRequestException('User is not a VIP member');
    }

    const days = grantVipDto.customDays || grantVipDto.duration;

    // If VIP already expired, start from now
    const startDate =
      user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date()
        ? new Date(user.vipExpiresAt)
        : new Date();

    startDate.setDate(startDate.getDate() + days);
    user.vipExpiresAt = startDate;

    return this.userRepository.save(user);
  }

  async revokeVip(userId: string): Promise<User> {
    const user = await this.findById(userId);

    user.isVip = false;
    user.vipExpiresAt = null;

    return this.userRepository.save(user);
  }

  async checkAndUpdateExpiredVips(): Promise<void> {
    const expiredVips = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isVip = :isVip', { isVip: true })
      .andWhere('user.vipExpiresAt <= :now', { now: new Date() })
      .getMany();

    for (const user of expiredVips) {
      user.isVip = false;
      await this.userRepository.save(user);
    }

    if (expiredVips.length > 0) {
      console.log(
        `✅ Revoked VIP status from ${expiredVips.length} expired users`,
      );
    }
  }

  async getVipStats(): Promise<{
    totalVips: number;
    activeVips: number;
    expiredVips: number;
  }> {
    const totalVips = await this.userRepository.count({
      where: { isVip: true },
    });

    const activeVips = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isVip = :isVip', { isVip: true })
      .andWhere('user.vipExpiresAt > :now', { now: new Date() })
      .getCount();

    const expiredVips = totalVips - activeVips;

    return { totalVips, activeVips, expiredVips };
  }

  // Role Management - Using RoleService ✅
  async updateUserRoles(
    userId: string,
    updateUserRolesDto: UpdateUserRolesDto,
  ): Promise<User> {
    const { roleNames } = updateUserRolesDto;

    const user = await this.findById(userId);

    // Use RoleService to find roles (best practice!)
    const roles = await this.rolesService.findByNames(roleNames);

    user.roles = roles;

    return this.userRepository.save(user);
  }

  async addRoleToUser(userId: string, roleName: string): Promise<User> {
    const user = await this.findById(userId);

    // Check if user already has this role
    if (user.roles.some((role) => role.name === roleName)) {
      return user;
    }

    // Use RoleService to find role (best practice!)
    const role = await this.rolesService.findByName(roleName);

    if (!role) {
      throw new NotFoundException(`Role "${roleName}" not found`);
    }

    user.roles.push(role);

    return this.userRepository.save(user);
  }

  async removeRoleFromUser(userId: string, roleName: string): Promise<User> {
    const user = await this.findById(userId);

    // Don't allow removing the last role
    if (user.roles.length === 1) {
      throw new BadRequestException('User must have at least one role');
    }

    // Don't allow removing admin role from yourself
    // (You'd need to pass current user ID to check this - optional enhancement)

    user.roles = user.roles.filter((role) => role.name !== roleName);

    return this.userRepository.save(user);
  }
}
