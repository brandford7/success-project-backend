import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { League } from './entities/league.entity';

@Injectable()
export class LeaguesService {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {}

  async findAll(): Promise<League[]> {
    return this.leagueRepository.find({
      order: { usageCount: 'DESC', name: 'ASC' },
    });
  }

  async findByCountry(country: string): Promise<League[]> {
    return this.leagueRepository.find({
      where: { country: ILike(`%${country}%`) },
      order: { usageCount: 'DESC', name: 'ASC' },
    });
  }

  async searchLeagues(query: string): Promise<League[]> {
    return this.leagueRepository.find({
      where: [{ name: ILike(`%${query}%`) }, { country: ILike(`%${query}%`) }],
      order: { usageCount: 'DESC', name: 'ASC' },
      take: 20,
    });
  }

  async getPopularLeagues(limit: number = 10): Promise<League[]> {
    return this.leagueRepository.find({
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async incrementUsage(leagueName: string, country: string): Promise<void> {
    let league = await this.leagueRepository.findOne({
      where: { name: leagueName, country },
    });

    if (league) {
      league.usageCount += 1;
      await this.leagueRepository.save(league);
    } else {
      // Create new league entry
      league = this.leagueRepository.create({
        name: leagueName,
        country,
        usageCount: 1,
      });
      await this.leagueRepository.save(league);
    }
  }

  async seedCommonLeagues(): Promise<void> {
    const commonLeagues = [
      // England
      { name: 'Premier League', country: 'England' },
      { name: 'Championship', country: 'England' },
      { name: 'League One', country: 'England' },
      { name: 'League Two', country: 'England' },
      { name: 'FA Cup', country: 'England' },
      { name: 'EFL Cup', country: 'England' },

      // Spain
      { name: 'La Liga', country: 'Spain' },
      { name: 'Segunda División', country: 'Spain' },
      { name: 'Copa del Rey', country: 'Spain' },

      // Germany
      { name: 'Bundesliga', country: 'Germany' },
      { name: '2. Bundesliga', country: 'Germany' },
      { name: 'DFB-Pokal', country: 'Germany' },

      // Italy
      { name: 'Serie A', country: 'Italy' },
      { name: 'Serie B', country: 'Italy' },
      { name: 'Coppa Italia', country: 'Italy' },

      // France
      { name: 'Ligue 1', country: 'France' },
      { name: 'Ligue 2', country: 'France' },
      { name: 'Coupe de France', country: 'France' },

      // International
      { name: 'UEFA Champions League', country: 'Europe' },
      { name: 'UEFA Europa League', country: 'Europe' },
      { name: 'UEFA Conference League', country: 'Europe' },
      { name: 'FIFA World Cup', country: 'International' },
      { name: 'UEFA European Championship', country: 'Europe' },

      // Ghana
      { name: 'Ghana Premier League', country: 'Ghana' },

      // Nigeria
      { name: 'Nigeria Professional Football League', country: 'Nigeria' },

      // Other African
      { name: 'CAF Champions League', country: 'Africa' },
      { name: 'CAF Confederation Cup', country: 'Africa' },
    ];

    for (const leagueData of commonLeagues) {
      const exists = await this.leagueRepository.findOne({
        where: { name: leagueData.name, country: leagueData.country },
      });

      if (!exists) {
        const league = this.leagueRepository.create(leagueData);
        await this.leagueRepository.save(league);
      }
    }
  }
}
