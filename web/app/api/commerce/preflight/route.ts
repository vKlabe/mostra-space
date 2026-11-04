import { CommerceError, commerceConfig, configurationBlockers } from '@/lib/commerce/config';
import { actor, failure, json, stripeClient } from '@/lib/commerce/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify the deployed key without revealing it or enabling payments.
export async function GET() {
  try {
    const { db } = await actor('admin');
    const { data: settings, error } = await db.from('commerce_settings')
      .select('payments_enabled').eq('id', true).single();
    if (error || !settings) throw new CommerceError('SERVICE_UNAVAILABLE', 503);

    const config = commerceConfig();
    // Read the account authenticated by the server key, without an account override.
    const account = await stripeClient().accounts.retrieveCurrent();
    const blockers = configurationBlockers(config);
    return json({
      stripeAccountId: account.id,
      livemode: config.livemode,
      paymentsSwitchEnabled: settings.payments_enabled === true,
      paymentsEnabled: settings.payments_enabled === true && blockers.length === 0,
      configurationBlockers: blockers,
    });
  } catch (error) {
    return failure(error);
  }
}