import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { QueryTipsDto } from './dto/query-tips.dto';

import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { VipGuard } from '../common/guards/vip.guard';
import { Public } from '../common/decorators/public.decorator';
//import { OptionalJwtAuthGuard } from '../common/guards/optional-auth.guard';

@Controller('tips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: User, @Body() createTipDto: CreateTipDto) {
    return this.tipsService.create(createTipDto, user);
  }

  @Get()
  @Public()
  async findAll(@Query() query: QueryTipsDto, @CurrentUser() user?: User) {
    return this.tipsService.findAll(query, user);
  }

  @Get('vip')
  @UseGuards(VipGuard)
  async getVipTips(@CurrentUser() user: User, @Query() query: QueryTipsDto) {
    return this.tipsService.getVipTips(user, query);
  }

  @Get('statistics')
  @Public()
  async getStatistics(): Promise<any> {
    return this.tipsService.getStatistics();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tipsService.findById(id);
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() updateTipDto: UpdateTipDto,
  ) {
    return this.tipsService.update(id, updateTipDto, user);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.tipsService.delete(id, user);
  }
}
