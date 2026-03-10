import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TipStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  VOID = 'void',
}

@Entity('tips')
@Index(['status'])
@Index(['kickoffTime'])
@Index(['isVip'])
export class Tip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  match!: string;

  @Column({ type: 'varchar', length: 100 })
  league!: string;

  @Column({ type: 'varchar', length: 200 })
  pick!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  odds!: number;

  @Column({ type: 'text', nullable: true })
  reasoning!: string | null;

  @Column({ type: 'timestamp' })
  kickoffTime!: Date;

  @Column({
    type: 'enum',
    enum: TipStatus,
    default: TipStatus.PENDING,
  })
  status!: TipStatus;

  @Column({ type: 'text', nullable: true })
  resultNotes!: string | null;

  @Column({ type: 'boolean', default: false })
  isVip!: boolean;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isPending(): boolean {
    return this.status === TipStatus.PENDING;
  }

  isSettled(): boolean {
    return [TipStatus.WON, TipStatus.LOST, TipStatus.VOID].includes(
      this.status,
    );
  }

  getStatusColor(): string {
    switch (this.status) {
      case TipStatus.WON:
        return 'green';
      case TipStatus.LOST:
        return 'red';
      case TipStatus.VOID:
        return 'gray';
      default:
        return 'yellow';
    }
  }
}
