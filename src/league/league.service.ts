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

      // Turkey
      { name: 'Turkey Super League', country: 'Turkey' },

      //Russia
      { name: 'Russian Premier League', country: 'Russia' },

      // Portugal
      { name: 'Primeira Liga', country: 'Portugal' },
      { name: 'Taça de Portugal', country: 'Portugal' },

      // Netherlands
      { name: 'Eredivisie', country: 'Netherlands' },
      { name: 'KNVB Cup', country: 'Netherlands' },

      // Belgium
      { name: 'Belgian Pro League', country: 'Belgium' },
      { name: 'Belgian Cup', country: 'Belgium' },

      //Israel
      { name: 'Israeli Premier League', country: 'Israel' },

      // Greece
      { name: 'Super League Greece', country: 'Greece' },
      { name: 'Greek Cup', country: 'Greece' },

      // Scotland
      { name: 'Scottish Premiership', country: 'Scotland' },
      { name: 'Scottish Cup', country: 'Scotland' },

      // Czech Republic
      { name: 'Czech First League', country: 'Czech Republic' },
      { name: 'Czech Cup', country: 'Czech Republic' },

      // Austria
      { name: 'Austrian Bundesliga', country: 'Austria' },
      { name: 'Austrian Cup', country: 'Austria' },

      // Switzerland
      { name: 'Swiss Super League', country: 'Switzerland' },
      { name: 'Swiss Cup', country: 'Switzerland' },

      // Poland
      { name: 'Ekstraklasa', country: 'Poland' },
      { name: 'Polish Cup', country: 'Poland' },

      // Denmark
      { name: 'Danish Superliga', country: 'Denmark' },
      { name: 'Danish Cup', country: 'Denmark' },

      // Sweden
      { name: 'Allsvenskan', country: 'Sweden' },
      { name: 'Svenska Cupen', country: 'Sweden' },

      // Norway
      { name: 'Eliteserien', country: 'Norway' },
      { name: 'Norwegian Cup', country: 'Norway' },

      //Finland
      { name: 'Veikkausliiga', country: 'Finland' },
      { name: 'Finnish Cup', country: 'Finland' },

      //Bosnia and Herzegovina
      {
        name: 'Premier League of Bosnia and Herzegovina',
        country: 'Bosnia and Herzegovina',
      },
      { name: 'Bosnian Cup', country: 'Bosnia and Herzegovina' },

      //Croatia
      { name: 'Croatian First Football League', country: 'Croatia' },
      { name: 'Croatian Football Cup', country: 'Croatia' },

      // Serbia
      { name: 'Serbian SuperLiga', country: 'Serbia' },
      { name: 'Serbian Cup', country: 'Serbia' },

      //Slovenia
      { name: 'Slovenian PrvaLiga', country: 'Slovenia' },
      { name: 'Slovenian Cup', country: 'Slovenia' },

      // Slovakia
      { name: 'Slovak Super Liga', country: 'Slovakia' },
      { name: 'Slovak Cup', country: 'Slovakia' },

      // Hungary
      { name: 'Hungary Nemzeti Bajnokság I', country: 'Hungary' },
      { name: 'Hungarian Cup', country: 'Hungary' },

      //Northern Ireland
      { name: 'NIFL Premiership', country: 'Northern Ireland' },
      { name: 'Irish Cup', country: 'Northern Ireland' },

      //Wales
      { name: 'Welsh Premier League', country: 'Wales' },
      { name: 'Welsh Cup', country: 'Wales' },

      //Faroe Islands
      { name: 'Faroe Islands Premier League', country: 'Faroe Islands' },
      { name: 'Faroe Islands Cup', country: 'Faroe Islands' },

      // Latvia
      { name: 'Latvian Higher League', country: 'Latvia' },
      { name: 'Latvian Cup', country: 'Latvia' },

      //Armenia
      { name: 'Armenian Premier League', country: 'Armenia' },
      { name: 'Armenian Cup', country: 'Armenia' },

      //Azerbaijan
      { name: 'Azerbaijan Premier League', country: 'Azerbaijan' },
      { name: 'Azerbaijan Cup', country: 'Azerbaijan' },

      //Cyprus
      { name: 'Cypriot First Division', country: 'Cyprus' },
      { name: 'Cypriot Cup', country: 'Cyprus' },

      // Romania
      { name: 'Liga I', country: 'Romania' },
      { name: 'Cupa României', country: 'Romania' },

      // Bulgaria
      { name: 'First Professional Football League', country: 'Bulgaria' },
      { name: 'Bulgarian Cup', country: 'Bulgaria' },

      // Ukraine
      { name: 'Ukrainian Premier League', country: 'Ukraine' },
      { name: 'Ukrainian Cup', country: 'Ukraine' },

      // Belarus
      { name: 'Belarusian Premier League', country: 'Belarus' },
      { name: 'Belarusian Cup', country: 'Belarus' },

      // UEFA Competitions
      { name: 'UEFA Champions League', country: 'Europe' },
      { name: 'UEFA Champions League Women', country: 'Europe' },
      { name: 'UEFA Europa League', country: 'Europe' },
      { name: 'UEFA Conference League', country: 'Europe' },
      { name: 'World Cup Qualifiers UEFA', country: 'Europe' },
      { name: 'World Cup Qualifiers UEFA Women', country: 'Europe' },
      { name: 'UEFA European Championship Qualifiers', country: 'Europe' },
      {
        name: 'UEFA European Championship Qualifiers Women',
        country: 'Europe',
      },
      { name: 'UEFA European Championship', country: 'Europe' },
      { name: 'UEFA European Championship Women', country: 'Europe' },

      //International
      { name: 'FIFA World Cup', country: 'International' },
      { name: 'FIFA World Cup Women', country: 'International' },
      {
        name: 'FIFA World Cup Qualification Playoffs',
        country: 'International',
      },
      {
        name: 'FIFA World Cup Qualification Playoffs Women',
        country: 'International',
      },

      { name: 'Olympic Football Tournament Women', country: 'International' },
      { name: 'FIFA Confederations Cup', country: 'International' },
      { name: 'FIFA Club World Cup', country: 'International' },
      { name: 'FIFA Intercontinental Cup', country: 'International' },
      { name: 'FIFA Club World Cup', country: 'International' },
      { name: 'International Friendly', country: 'International' },
      { name: 'International Friendly Women', country: 'International' },

      //Conmebol Competitions
      { name: 'Copa Libertadores', country: 'South America' },
      { name: 'Copa Sudamericana', country: 'South America' },
      { name: 'Recopa Sudamericana', country: 'South America' },
      { name: 'Copa América', country: 'South America' },
      { name: 'World Cup Qualifiers CONMEBOL', country: 'South America' },

      // Mexico
      { name: 'Liga MX', country: 'Mexico' },

      // Brazil
      { name: 'Brasileirão Série A', country: 'Brazil' },

      //Argentina
      { name: 'Argentine Primera División', country: 'Argentina' },
      { name: 'Copa Argentina', country: 'Argentina' },

      //CONCACAF Competitions
      { name: 'CONCACAF Champions League', country: 'North America' },
      { name: 'CONCACAF League', country: 'North America' },
      { name: 'CONCACAF Gold Cup', country: 'North America' },
      { name: 'CONCACAF Gold Cup Qualifiers', country: 'North America' },
      { name: 'World Cup Qualifiers CONCACAF', country: 'North America' },

      //USA
      { name: 'Major League Soccer', country: 'USA' },
      { name: 'US Open Cup', country: 'USA' },

      // Africa
      { name: 'CAF Champions League', country: 'Africa' },
      { name: 'CAF Confederation Cup', country: 'Africa' },
      { name: 'Africa Cup of Nations', country: 'Africa' },
      { name: 'AFCON Qualifiers', country: 'Africa' },
      { name: 'World Cup Qualifiers CAF', country: 'Africa' },

      // Ghana
      { name: 'Ghana Premier League', country: 'Ghana' },

      // Nigeria
      { name: 'Nigeria Professional Football League', country: 'Nigeria' },

      // Tanzania
      { name: 'Tanzania Premier League', country: 'Tanzania' },

      //Uganda
      { name: 'Ugandan Premier League', country: 'Uganda' },

      //Kenya
      { name: 'Kenyan Premier League', country: 'Kenya' },

      //Egypt
      { name: 'Egyptian Premier League', country: 'Egypt' },

      //Ivory Coast
      { name: 'Ivorian Ligue 1', country: 'Ivory Coast' },

      //Cameroon
      { name: 'Cameroonian Elite One', country: 'Cameroon' },

      //South Africa
      { name: 'South African Premier Division', country: 'South Africa' },

      //Algeria
      { name: 'Algerian Ligue Professionnelle 1', country: 'Algeria' },

      // Morocco
      { name: 'Botola Pro', country: 'Morocco' },

      //Tunisia
      { name: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia' },

      //AFC
      { name: 'AFC Champions League Elite', country: 'Asia' },
      { name: 'AFC Champions League Two', country: 'Asia' },
      { name: 'AFC Cup', country: 'Asia' },
      { name: 'AFC Asian Cup', country: 'Asia' },
      { name: 'AFC Asian Cup Qualifiers', country: 'Asia' },
      { name: 'World Cup Qualifiers AFC', country: 'Asia' },

      //Jordan
      { name: 'Jordanian Pro League', country: 'Jordan' },

      //Saudi Arabia
      { name: 'Saudi Professional League', country: 'Saudi Arabia' },

      //Qatar
      { name: 'Qatar Stars League', country: 'Qatar' },

      //UAE
      { name: 'UAE Pro League', country: 'United Arab Emirates' },

      //Iran
      { name: 'Persian Gulf Pro League', country: 'Iran' },

      //Iraq
      { name: 'Iraqi Premier League', country: 'Iraq' },

      //Syria
      { name: 'Syrian Premier League', country: 'Syria' },

      //Lebanon
      { name: 'Lebanese Premier League', country: 'Lebanon' },

      //Oman
      { name: 'Oman Professional League', country: 'Oman' },

      //Malaysia
      { name: 'Malaysia Super League', country: 'Malaysia' },

      //Indonesia
      { name: 'Liga 1', country: 'Indonesia' },

      //Vietnam
      { name: 'V.League 1', country: 'Vietnam' },

      //Uzbekistan
      { name: 'Uzbekistan Super League', country: 'Uzbekistan' },

      //UAE
      { name: 'UAE Pro League', country: 'United Arab Emirates' },

      //Kuwait
      { name: 'Kuwait Premier League', country: 'Kuwait' },

      //Bahrain
      { name: 'Bahraini Premier League', country: 'Bahrain' },

      //Iran
      { name: 'Persian Gulf Pro League', country: 'Iran' },

      //Thailand
      { name: 'Thai League 1', country: 'Thailand' },

      //Japan
      { name: 'J1 League', country: 'Japan' },

      // South Korea
      { name: 'K League 1', country: 'South Korea' },

      // India
      { name: 'Indian Super League', country: 'India' },

      // Australia
      { name: 'A-League   Men', country: 'Australia' },

      // China
      { name: 'China Super League', country: 'China' },

      // Oceania
      { name: 'OFC Champions League', country: 'Oceania' },
      { name: 'OFC Nations Cup', country: 'Oceania' },
      { name: 'World Cup Qualifiers OFC', country: 'Oceania' },

      // New Zealand
      { name: 'New Zealand Football Championship', country: 'New Zealand' },
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
