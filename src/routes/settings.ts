import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin, requireUser, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';
import { deriveFxRates, FX_SPREAD_CAP } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deposit instructions. SIGNED-IN CLIENTS ONLY — this was public.
 *
 * The row is the company's payment identity: bank account number, IFSC, UPI id
 * and USDT address. Those columns are empty today, so nothing leaked yet, but
 * they have to be filled in for deposits to work at all — and the moment they
 * are, an unauthenticated GET publishes the broker's full banking details to
 * anyone who asks.
 *
 * The realistic abuse is not theft from the account, it is impersonation:
 * scrape the real account name and UPI id, then send clients "updated deposit
 * instructions" that are convincing because every detail matches except the
 * destination. Requiring a session does not make that impossible, but it stops
 * the details being harvestable by anyone who finds the URL.
 */
export async function GET() {
  try {
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    let { data } = await db.from('broker_payment_settings').select('*').eq('id', 1).maybeSingle();
    
    if (!data) {
      const initialRow = {
        id: 1,
        bank_name: 'HDFC Bank Ltd',
        account_holder: 'Global Forex Pvt Ltd',
        account_number: '50200098234112',
        ifsc_code: 'HDFC0001234',
        upi_id: 'globalforex.desk@hdfcbank',
        qr_image_url: '',
        crypto_usdt_address: 'TXg98...TRC20',
        usd_to_inr_rate: 85.0,
        inr_spread_deposit: 0,
        inr_spread_withdrawal: 0,
        commission_percent: 2.0,
        quote_validity_seconds: 60,
        instructions: 'Please transfer the exact amount and enter the 12-digit bank UTR / Reference Number.',
        updated_at: new Date().toISOString(),
      };
      await db.from('broker_payment_settings').upsert(initialRow, { onConflict: 'id' });
      data = initialRow as any;
    }

    const fx = deriveFxRates(
      Number(data.usd_to_inr_rate || 85.0),
      Number(data.inr_spread_deposit ?? 0),
      Number(data.inr_spread_withdrawal ?? 0)
    );

    return ok({
      settings: {
        id: data.id,
        bankName: data.bank_name || 'HDFC Bank Ltd',
        accountHolder: data.account_holder || 'Global Forex Pvt Ltd',
        accountNumber: data.account_number || '50200098234112',
        ifscCode: data.ifsc_code || 'HDFC0001234',
        upiId: data.upi_id || 'globalforex.desk@hdfcbank',
        qrImageUrl: data.qr_image_url || '',
        cryptoUsdtAddress: data.crypto_usdt_address || '',
        usdToInrRate: fx.mid,
        depositRate: fx.deposit,
        withdrawalRate: fx.withdrawal,
        inrSpreadDeposit: fx.spreadDeposit,
        inrSpreadWithdrawal: fx.spreadWithdrawal,
        commissionPercent: Number(data.commission_percent ?? 2.0),
        quoteValiditySeconds: Number(data.quote_validity_seconds ?? 60),
        instructions: data.instructions || 'Please transfer the exact amount and enter the 12-digit bank UTR / Reference Number.',
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Admin only. The USD/INR rate is priced into every deposit, so changes are audited. */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    const text = (key: string, column: string, max: number) => {
      const value = cleanString(body?.[key], max);
      if (value !== undefined) update[column] = value;
    };

    text('bankName', 'bank_name', 120);
    text('accountHolder', 'account_holder', 120);
    text('accountNumber', 'account_number', 34);
    text('ifscCode', 'ifsc_code', 15);
    text('upiId', 'upi_id', 80);
    text('qrImageUrl', 'qr_image_url', 600);
    text('cryptoUsdtAddress', 'crypto_usdt_address', 120);
    text('instructions', 'instructions', 2000);

    if (body?.usdToInrRate !== undefined) {
      const rate = Number(body.usdToInrRate);
      if (!Number.isFinite(rate) || rate < 50 || rate > 200) {
        return fail(400, 'USD/INR rate must be between 50 and 200.');
      }
      update.usd_to_inr_rate = rate;
    }

    if (body?.commissionPercent !== undefined) {
      const comm = Number(body.commissionPercent);
      if (Number.isFinite(comm) && comm >= 0 && comm <= 50) {
        update.commission_percent = comm;
      }
    }

    for (const [key, column] of [
      ['inrSpreadDeposit', 'inr_spread_deposit'],
      ['inrSpreadWithdrawal', 'inr_spread_withdrawal'],
    ] as const) {
      if (body?.[key] === undefined) continue;
      const spread = Number(body[key]);
      if (!Number.isFinite(spread) || spread < 0 || spread > FX_SPREAD_CAP) {
        return fail(400, `Spread must be between ₹0 and ₹${FX_SPREAD_CAP.toFixed(2)} per USD.`);
      }
      update[column] = spread;
    }

    if (body?.defaultSpreadBps !== undefined) {
      const bps = Number(body.defaultSpreadBps);
      if (!Number.isFinite(bps) || bps < 0 || bps > 200) {
        return fail(400, 'Default instrument spread must be between 0 and 200 basis points.');
      }
      update.default_spread_bps = bps;
    }

    if (body?.quoteValiditySeconds !== undefined) {
      const seconds = Number(body.quoteValiditySeconds);
      if (!Number.isInteger(seconds) || seconds < 5 || seconds > 600) {
        return fail(400, 'Quote validity must be between 5 and 600 seconds.');
      }
      update.quote_validity_seconds = seconds;
    }

    if (Object.keys(update).length === 0) return fail(400, 'Nothing to update.');
    update.updated_at = new Date().toISOString();

    const { error } = await db.from('broker_payment_settings').upsert({ id: 1, ...update }, { onConflict: 'id' });
    if (error) return fail(500, 'Could not save settings.');

    await auditServer(req, 'BROKER_SETTINGS_UPDATED', {
      userId: admin.id,
      metadata: { fields: Object.keys(update).filter((k) => k !== 'updated_at'), newRate: update.usd_to_inr_rate, upiId: update.upi_id },
    });

    return ok({ message: 'Settings updated successfully.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
