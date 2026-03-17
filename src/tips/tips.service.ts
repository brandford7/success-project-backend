import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  FindOptionsWhere,
  MoreThanOrEqual,
  LessThanOrEqual,
  ILike,
} from 'typeorm';
import { Tip, TipStatus } from './entities/tip.entity';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { QueryTipsDto } from './dto/query-tips.dto';
import { User } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { LeaguesService } from '../league/league.service';
import { log } from 'console';

@Injectable()
export class TipsService {
  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    private readonly leaguesService: LeaguesService,
  ) {}

  async create(createTipDto: CreateTipDto, user: User): Promise<Tip> {
    const tip = this.tipRepository.create({
      ...createTipDto,
      kickoffTime: new Date(createTipDto.kickoffTime),
      createdBy: user,
    });

    const savedTip = await this.tipRepository.save(tip);

    this.trackLeagueUsage(
      createTipDto.league,
      createTipDto.country || 'Unknown',
    );

    return savedTip;
  }

  async findAll(
    query: QueryTipsDto,
    user?: User,
  ): Promise<PaginatedResponse<Tip>> {
    const {
      status,
      page = 1,
      limit = 20,
      isVip,
      league,
      startDate,
      endDate,
    } = query;

    // Build where conditions
    const where: FindOptionsWhere<Tip> = {};

    if (status) {
      where.status = status;
    }

    if (league) {
      where.league = ILike(`%${league}%`);
    }

    // Date range filter
    if (startDate && endDate) {
      where.kickoffTime = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.kickoffTime = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.kickoffTime = LessThanOrEqual(new Date(endDate));
    }

    // ✅ VIP FILTER LOGIC - CORRECTED
    // Check user access level
    const isAdmin = user?.roles?.some((role) => role.name === 'admin') || false;
    const hasVipAccess = user?.hasActiveVip() || false;

    if (isVip !== undefined) {
      // Explicitly filtering for VIP or non-VIP tips
      where.isVip = isVip;
    } else {
      // No explicit VIP filter - apply access control
      if (!isAdmin && !hasVipAccess) {
        // Non-VIP users can only see free tips
        where.isVip = false;
      }
      // Admin and VIP users see all tips (no filter applied)
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.tipRepository.findAndCount({
      where,
      relations: ['createdBy'],
      order: {
        kickoffTime: 'ASC',
      },
      skip,
      take: limit,
    });

    console.log(user, hasVipAccess);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Tip> {
    const tip = await this.tipRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!tip) {
      throw new NotFoundException(`Tip with ID "${id}" not found`);
    }

    return tip;
  }

  async update(
    id: string,
    updateTipDto: UpdateTipDto,
    user: User,
  ): Promise<Tip> {
    const tip = await this.findById(id);

    // Check if user is the creator or admin
    if (tip.createdBy.id !== user.id && !user.isAdmin()) {
      throw new ForbiddenException('You can only update your own tips');
    }

    tip.resultNotes = updateTipDto.resultNotes || tip.resultNotes;

    return this.tipRepository.save(tip);
  }

  async delete(id: string, user: User): Promise<void> {
    const tip = await this.findById(id);

    // Check if user is the creator or admin
    if (tip.createdBy.id !== user.id && !user.isAdmin()) {
      throw new ForbiddenException('You can only delete your own tips');
    }

    await this.tipRepository.remove(tip);
  }

  async getStatistics(): Promise<any> {
    const total = await this.tipRepository.count();
    const won = await this.tipRepository.count({
      where: { status: TipStatus.WON },
    });
    const lost = await this.tipRepository.count({
      where: { status: TipStatus.LOST },
    });
    const pending = await this.tipRepository.count({
      where: { status: TipStatus.PENDING },
    });
    const voided = await this.tipRepository.count({
      where: { status: TipStatus.VOID },
    });

    const settled = won + lost;
    const winRate = settled > 0 ? (won / settled) * 100 : 0;

    return {
      total,
      won,
      lost,
      pending,
      voided,
      settled,
      winRate: Number(winRate.toFixed(2)),
    };
  }

  async getVipTips(
    user: User,
    query: QueryTipsDto,
  ): Promise<PaginatedResponse<Tip>> {
    if (!user.hasActiveVip() && !user.isAdmin()) {
      throw new ForbiddenException(
        'VIP subscription required to access VIP tips',
      );
    }

    return this.findAll({ ...query, isVip: true }, user);
  }

  private async trackLeagueUsage(
    league: string,
    country: string,
  ): Promise<void> {
    try {
      await this.leaguesService.incrementUsage(league, country);
    } catch (error) {
      console.error('Failed to track league usage:', error);
    }
  }
}
