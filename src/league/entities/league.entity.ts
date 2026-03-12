import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('leagues')
@Index(['country', 'name'], { unique: true })
export class League {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  country!: string;

  @Column({ type: 'int', default: 0 })
  usageCount!: number; // Track how many times this league is used

  @CreateDateColumn()
  createdAt!: Date;
}
