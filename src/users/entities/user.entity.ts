import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../role/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar' })
  @Exclude()
  password!: string;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @Column({ type: 'boolean', default: false })
  isVip!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  vipExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Instance methods
  hasRole(roleName: string): boolean {
    return this.roles.some((role) => role.name === roleName);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  hasActiveVip(): boolean {
    if (!this.isVip || !this.vipExpiresAt) {
      return false;
    }
    return new Date() < this.vipExpiresAt;
  }

  getRoleNames(): string[] {
    return this.roles.map((role) => role.name);
  }

  getDisplayName(): string {
    return this.email || this.phoneNumber || 'Unknown User';
  }

  // Static utility methods
  static validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumberOrSpecial = /[\d\W]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumberOrSpecial
    );
  }

  static normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    return normalized;
  }

  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
