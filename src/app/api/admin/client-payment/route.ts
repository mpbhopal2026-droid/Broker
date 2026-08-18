import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireCapability, requireUser, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Per-client deposit routing.
 *
 * This decides which bank account a client is told to send real money to, which
 * makes it one of the highest-value fields in the product to tamper with: change
 * it and the client's deposit lands somewhere else while they hold a receipt
 * proving they paid. It is therefore server-authoritative, operator-only, and
 * audited on every write.
 *
 * It replaces a localStorage implementation where the value was client-writable
 * and the operator's save never left their own browser.
 */

/**
 * GET — a client reads their OWN routing; an operator can read any by ?userId=.
 * The client path never trusts a query parameter, so one client cannot read
 * another's account details by guessing an id.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const requested = req.nextUrl.searchParams.get('userId');
    let targetId = user.id;

    if (requested && requested !== user.id) {
      // Reading someone else's routing is an operator action.
      await requireCapability('client:view');
      targetId = requested;
    }

    const { data, error } = await db
      .from('client_payment_configs')
      .select('user_id, bank_name, account_holder, account_number, ifsc_code, upi_id, qr_image_url, notes, is_active, updated_at')
      .eq('user_id', targetId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return fail(500, 'Could not load payment routing.');
    if (!data) return ok({ config: null });

    return ok({
      config: {
        userId: data.user_id,
        bankName: data.bank_name,
        accountHolder: data.account_holder,
        accountNumber: data.account_number,
        ifscCode: data.ifsc_code,
        upiId: data.upi_id,
        qrImageUrl: data.qr_image_url,
        notes: data.notes,
        isActive: data.is_active,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** PUT — operator sets or clears a client's routing. */
export async function PUT(req: NextRequest) {
  try {
    // settings:edit is admin-only. Staff work the deposit queue but must not be
    // able to change where money is sent — that separation is the point.
    const operator = await requireCapability('settings:edit');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const userId = cleanString(body?.userId, 64);
    if (!userId) return fail(400, 'A client is required.');

    // Confirm the target exists before writing routing for an id that does not.
    const { data: target } = await db
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();
    if (!target) return fail(404, 'No such client.');

    if (body?.clear === true) {
      await db.from('client_payment_configs').update({ is_active: false }).eq('user_id', userId);
      await auditServer(req, 'CLIENT_PAYMENT_ROUTING_CLEARED', {
        userId: operator.id,
        metadata: { targetUserId: userId, targetEmail: target.email },
      });
      return ok({ config: null, message: 'Reverted to the platform default account.' });
    }

    const row = {
      user_id: userId,
      bank_name: cleanString(body?.bankName, 120) ?? null,
      account_holder: cleanString(body?.accountHolder, 120) ?? null,
      account_number: cleanString(body?.accountNumber, 34) ?? null,
      ifsc_code: cleanString(body?.ifscCode, 15)?.toUpperCase() ?? null,
      upi_id: cleanString(body?.upiId, 80) ?? null,
      qr_image_url: cleanString(body?.qrImageUrl, 600) ?? null,
      notes: cleanString(body?.notes, 500) ?? null,
      is_active: true,
      updated_by: operator.id,
    };

    // A routing row with no destination is worse than none: the deposit page
    // would fall back field by field and show a half-custom account.
    if (!row.account_number && !row.upi_id) {
      return fail(400, 'Provide at least an account number or a UPI ID.');
    }

    const { error } = await db.from('client_payment_configs').upsert(row, { onConflict: 'user_id' });
    if (error) return fail(500, 'Could not save payment routing.');

    // Redirecting a client's deposits is the action that would matter most in a
    // dispute over missing funds, so it is recorded like any money operation.
    // The account number is deliberately not written to the audit metadata.
    await auditServer(req, 'CLIENT_PAYMENT_ROUTING_SET', {
      userId: operator.id,
      metadata: {
        targetUserId: userId,
        targetEmail: target.email,
        bankName: row.bank_name,
        hasUpi: Boolean(row.upi_id),
        accountLast4: row.account_number ? row.account_number.slice(-4) : null,
      },
    });

    return ok({ message: 'Payment routing saved.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
