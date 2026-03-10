export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    roles: string[];
    isVip: boolean;
    vipExpiresAt: Date | null;
  };

  constructor(accessToken: string, user: any) {
    this.accessToken = accessToken;
    this.user = {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      roles: user.getRoleNames(),
      isVip: user.isVip,
      vipExpiresAt: user.vipExpiresAt,
    };
  }
}
