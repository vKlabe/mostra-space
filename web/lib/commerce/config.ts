export type CommerceConfig = {
  stripeKey: string;
  webhookSecret: string;
  clientId: string;
  origin: string;
  livemode: boolean;
  feeBps: number | null;
  feeBase: 'artwork' | 'total' | null;
  refundApplicationFee: boolean | null;
  activationApproved: boolean;
  commercialReviewed: boolean;
};

export function commerceConfig(env: Record<string, string | undefined> = process.env): CommerceConfig {
  const rate = env.COMMERCE_FEE_BPS;
  return {
    stripeKey: env.STRIPE_SECRET_KEY || '',
    webhookSecret: env.STRIPE_CONNECT_WEBHOOK_SECRET || '',
    clientId: env.STRIPE_CONNECT_CLIENT_ID || '',
    origin: (env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''),
    livemode: /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || ''),
    feeBps: rate !== undefined && /^\d+$/.test(rate) && Number(rate) < 10000 ? Number(rate) : null,
    feeBase: env.COMMERCE_FEE_BASE === 'artwork' || env.COMMERCE_FEE_BASE === 'total' ? env.COMMERCE_FEE_BASE : null,
    refundApplicationFee: env.COMMERCE_REFUND_APPLICATION_FEE === 'true' ? true : env.COMMERCE_REFUND_APPLICATION_FEE === 'false' ? false : null,
    activationApproved: env.COMMERCE_ACTIVATION_APPROVED === 'true',
    commercialReviewed: env.COMMERCE_COMMERCIAL_REVIEWED === 'true',
  };
}

export function configurationBlockers(config: CommerceConfig): string[] {
  const missing: string[] = [];
  if (!/^(sk|rk)_(test|live)_/.test(config.stripeKey)) missing.push('STRIPE_SECRET_KEY');
  if (!config.webhookSecret.startsWith('whsec_')) missing.push('STRIPE_CONNECT_WEBHOOK_SECRET');
  if (!config.clientId.startsWith('ca_')) missing.push('STRIPE_CONNECT_CLIENT_ID');
  if (!/^https:\/\/[^/]+$/.test(config.origin) && !/^http:\/\/localhost:\d+$/.test(config.origin)) missing.push('NEXT_PUBLIC_SITE_URL');
  if (config.feeBps === null) missing.push('COMMERCE_FEE_BPS');
  if (config.feeBase === null) missing.push('COMMERCE_FEE_BASE');
  if (config.refundApplicationFee === null) missing.push('COMMERCE_REFUND_APPLICATION_FEE');
  if (!config.commercialReviewed) missing.push('COMMERCE_COMMERCIAL_REVIEWED');
  if (!config.activationApproved) missing.push('COMMERCE_ACTIVATION_APPROVED');
  return missing;
}

export class CommerceError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 409) { super(code); this.code = code; this.status = status; }
}

export function cents(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new CommerceError('INVALID_AMOUNT', 400);
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 99999999) throw new CommerceError('INVALID_AMOUNT', 400);
  return amount;
}
