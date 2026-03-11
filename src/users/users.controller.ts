import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Get,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GrantVipDto } from './dto/grant-vip.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { VipExpiryService } from './vip-expiry.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly vipExpiryService: VipExpiryService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Get()
  @Roles('admin')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAllUsers({ page, limit, search });
  }

  @Get('search')
  @Roles('admin')
  async searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Post('me/upgrade-vip')
  @HttpCode(HttpStatus.OK)
  async upgradeToVip(
    @CurrentUser() user: User,
    @Body() grantVipDto: GrantVipDto,
  ) {
    // TODO: Add payment verification here
    return this.usersService.grantVip(user.id, grantVipDto);
  }

  @Post(':id/grant-vip')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async grantVip(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() grantVipDto: GrantVipDto,
  ) {
    return this.usersService.grantVip(userId, grantVipDto);
  }

  @Post(':id/extend-vip')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async extendVip(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() grantVipDto: GrantVipDto,
  ) {
    return this.usersService.extendVip(userId, grantVipDto);
  }

  @Delete(':id/revoke-vip')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeVip(@Param('id', ParseUUIDPipe) userId: string) {
    await this.usersService.revokeVip(userId);
  }

  @Get('vip/stats')
  @Roles('admin')
  async getVipStats() {
    return this.usersService.getVipStats();
  }

  @Post('vip/check-expired')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async checkExpiredVips() {
    await this.vipExpiryService.manualExpiryCheck();
    return { message: 'Expired VIPs checked and updated' };
  }

  @Patch(':id/roles')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async updateUserRoles(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto,
  ) {
    return this.usersService.updateUserRoles(userId, updateUserRolesDto);
  }

  @Post(':id/roles/:roleName')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async addRoleToUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('roleName') roleName: string,
  ) {
    return this.usersService.addRoleToUser(userId, roleName);
  }

  @Delete(':id/roles/:roleName')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoleFromUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('roleName') roleName: string,
  ) {
    await this.usersService.removeRoleFromUser(userId, roleName);
  }
}
