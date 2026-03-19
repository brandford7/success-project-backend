import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('picks')
@Unique(['name', 'category'])
export class Pick {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // e.g., "Over 2.5"

  @Column()
  category!: string; // e.g., "Goals"

  @Column({ default: 0 })
  usageCount!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
