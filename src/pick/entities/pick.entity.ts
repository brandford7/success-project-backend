import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('picks')
@Unique(['name', 'category'])
export class Pick {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  category!: string;

  @Column({ default: 0 })
  usageCount!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
