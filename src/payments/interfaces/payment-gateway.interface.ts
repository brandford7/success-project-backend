import { VipDuration } from '../../users/dto/grant-vip.dto';

export interface PaymentInitializeRequest {
  userId: string;
  duration: VipDuration;
  email?: string;
  phoneNumber?: string;
  currency?: string;
}

export interface PaymentInitializeResponse {
  authorizationUrl: string;
  reference: string;
  gateway: string;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  message: string;
  amount?: number;
  duration?: number;
  reference?: string;
}

export interface IPaymentGateway {
  initialize(
    request: PaymentInitializeRequest,
  ): Promise<PaymentInitializeResponse>;
  verify(userId: string, reference: string): Promise<PaymentVerifyResponse>;
  handleWebhook(payload: any, signature?: string): Promise<void>;
}
