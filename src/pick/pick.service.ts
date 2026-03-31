import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pick } from './entities/pick.entity'; // You'll need to create this entity

@Injectable()
export class PicksService {
  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
  ) {}

  async findAll(): Promise<Pick[]> {
    return this.pickRepository.find({
      order: { usageCount: 'DESC', name: 'ASC' },
    });
  }

  async getPopularPicks(limit: number = 15): Promise<Pick[]> {
    return this.pickRepository.find({
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async incrementUsage(pickName: string, category: string): Promise<void> {
    let pick = await this.pickRepository.findOne({
      where: { name: pickName, category },
    });

    if (pick) {
      pick.usageCount += 1;
      await this.pickRepository.save(pick);
    } else {
      pick = this.pickRepository.create({
        name: pickName,
        category,
        usageCount: 1,
      });
      await this.pickRepository.save(pick);
    }
  }

  async seedCommonPicks(): Promise<void> {
    const commonPicks = [
      // Full Time Result
      { name: '1', category: 'Full Time' },
      { name: 'X', category: 'Full Time' },
      { name: '2', category: 'Full Time' },
      { name: '1X', category: 'FT Double Chance' },
      { name: 'X2', category: 'FT Double Chance' },
      { name: '12', category: 'FT Double Chance' },

      // Half Time Result
      { name: '1', category: '1st Half' },
      { name: 'X', category: '1st Half' },
      { name: '2', category: '1st Half' },
      { name: '1X', category: '1st Half Double Chance' },
      { name: 'X2', category: '1st Half Double Chance' },
      { name: '12', category: '1st Half Double Chance' },

      // Full Time Goals
      { name: 'Over 0.5', category: 'Full Time Goals' },
      { name: 'Under 0.5', category: 'Full Time Goals' },
      { name: 'Over 1.5', category: 'Full Time Goals' },
      { name: 'Under 1.5', category: 'Full Time Goals' },
      { name: 'Over 2.5', category: 'Full Time Goals' },
      { name: 'Under 2.5', category: 'Full Time Goals' },
      { name: 'Over 3.5', category: 'Full Time Goals' },
      { name: 'Under 3.5', category: 'Full Time Goals' },
      { name: 'Over 4.5', category: 'Full Time Goals' },
      { name: 'Under 4.5', category: 'Full Time Goals' },
      { name: 'Over 5.5', category: 'Full Time Goals' },
      { name: 'Under 5.5', category: 'Full Time Goals' },

      // 1st Half Goals
      { name: 'Over 0.5', category: '1st Half Goals' },
      { name: 'Under 0.5', category: '1st Half Goals' },
      { name: 'Over 1.5', category: '1st Half Goals' },
      { name: 'Under 1.5', category: '1st Half Goals' },
      { name: 'Over 2.5', category: '1st Half Goals' },
      { name: 'Under 2.5', category: '1st Half Goals' },
      { name: 'Over 3.5', category: '1st Half Goals' },
      { name: 'Under 3.5', category: '1st Half Goals' },
      { name: 'Over 4.5', category: '1st Half Goals' },
      { name: 'Under 4.5', category: '1st Half Goals' },

      //2nd Half Goals
      { name: 'Over 0.5', category: '2nd Half Goals' },
      { name: 'Under 0.5', category: '2nd Half Goals' },
      { name: 'Over 1.5', category: '2nd Half Goals' },
      { name: 'Under 1.5', category: '2nd Half Goals' },
      { name: 'Over 2.5', category: '2nd Half Goals' },
      { name: 'Under 2.5', category: '2nd Half Goals' },
      { name: 'Over 3.5', category: '2nd Half Goals' },
      { name: 'Under 3.5', category: '2nd Half Goals' },
      { name: 'Over 4.5', category: '2nd Half Goals' },
      { name: 'Under 4.5', category: '2nd Half Goals' },

      //Home Team Goals
      { name: 'Over 0.5', category: 'Home Team Goals' },
      { name: 'Under 0.5', category: 'Home Team Goals' },
      { name: 'Over 1.5', category: 'Home Team Goals' },
      { name: 'Under 1.5', category: 'Home Team Goals' },
      { name: 'Over 2.5', category: 'Home Team Goals' },
      { name: 'Under 2.5', category: 'Home Team Goals' },
      { name: 'Over 3.5', category: 'Home Team Goals' },
      { name: 'Under 3.5', category: 'Home Team Goals' },
      { name: 'Over 4.5', category: 'Home Team Goals' },
      { name: 'Under 4.5', category: 'Home Team Goals' },

      //Away Team Goals
      { name: 'Over 0.5', category: 'Away Team Goals' },
      { name: 'Under 0.5', category: 'Away Team Goals' },
      { name: 'Over 1.5', category: 'Away Team Goals' },
      { name: 'Under 1.5', category: 'Away Team Goals' },
      { name: 'Over 2.5', category: 'Away Team Goals' },
      { name: 'Under 2.5', category: 'Away Team Goals' },
      { name: 'Over 3.5', category: 'Away Team Goals' },
      { name: 'Under 3.5', category: 'Away Team Goals' },
      { name: 'Over 4.5', category: 'Away Team Goals' },
      { name: 'Under 4.5', category: 'Away Team Goals' },

      // Both Teams to Score
      { name: 'BTTS Yes', category: 'BTTS' },
      { name: 'BTTS No', category: 'BTTS' },

      // Half Time / Full Time
      { name: '1/1', category: 'HT/FT' },
      { name: 'X/1', category: 'HT/FT' },
      { name: '2/2', category: 'HT/FT' },

      // Draw No Bet
      { name: 'DNB 1', category: 'DNB' },
      { name: 'DNB 2', category: 'DNB' },
    ];

    for (const pickData of commonPicks) {
      const exists = await this.pickRepository.findOne({
        where: { name: pickData.name, category: pickData.category },
      });

      if (!exists) {
        await this.pickRepository.save(this.pickRepository.create(pickData));
      }
    }
  }
}
