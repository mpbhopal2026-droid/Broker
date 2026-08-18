import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';
import { sendMailBestEffort } from '@/lib/mailer';
import { buildKycStatusEmailHtml } from '@/lib/resend';
import { mapKycRecord } from '@/lib/mappers';
import { notifications } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Review queue. Returns masked identifiers only — never the decrypted number. */
export async function GET() {
  try {
    await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data: records, error } = await db
      .from('kyc_records')
      .select('id, user_id, document_type, document_number_masked, file_paths, status, admin_notes, submitted_at, reviewed_at')
      .order('submitted_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin kyc] error querying records:', error);
      return fail(500, 'Could not load the KYC queue.');
    }

    const rawRecords = records ?? [];
    const userIds = Array.from(new Set(rawRecords.map((r) => r.user_id)));

    let profileMap: Record<string, { full_name?: string; email?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
      }
    }

    const mapped = rawRecords.map((r) => {
      const p = profileMap[r.user_id] || {};
      return mapKycRecord({
        ...r,
        profiles: p,
      });
    });

    return ok({ records: mapped });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Approve, reject, or directly manual-verify a user's KYC. */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const recordId = cleanString(body?.recordId, 64);
    const userId = cleanString(body?.userId, 64);
    const status = body?.status;
    const notes = cleanString(body?.notes, 1000);

    if (!recordId && !userId) {
      return fail(400, 'Either recordId or userId is required.');
    }

    if (status !== 'approved' && status !== 'rejected' && status !== 'unverified' && status !== 'pending') {
      return fail(400, 'status must be approved, rejected, pending, or unverified.');
    }

    if (status === 'rejected' && !notes) {
      return fail(400, 'Give a reason so the client knows what to fix.');
    }

    const now = new Date().toISOString();

    // Case 1: Direct user verification / override by userId
    if (userId) {
      const { data: client } = await db
        .from('profiles')
        .select('id, email, full_name, kyc_status')
        .eq('id', userId)
        .maybeSingle();

      if (!client) return fail(404, 'User profile not found.');

      // Update profile status
      await db.from('profiles').update({ kyc_status: status }).eq('id', userId);

      // Check if there is an existing kyc_record
      const { data: existingRecord } = await db
        .from('kyc_records')
        .select('id')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRecord) {
        await db
          .from('kyc_records')
          .update({
            status,
            admin_notes: notes || `Direct manual KYC verification by Admin (${admin.email || admin.id})`,
            reviewed_at: now,
            reviewed_by: admin.id,
          })
          .eq('id', existingRecord.id);
      } else {
        // Create manual verification record so compliance audits stay complete
        await db.from('kyc_records').insert({
          user_id: userId,
          document_type: 'manual_override',
          document_number_masked: 'ADMIN-VERIFIED',
          document_number_hash: 'ADMIN-VERIFIED',
          file_paths: [],
          status,
          admin_notes: notes || `Direct manual KYC verification by Admin (${admin.email || admin.id})`,
          submitted_at: now,
          reviewed_at: now,
          reviewed_by: admin.id,
        });
      }

      await auditServer(req, `KYC_MANUAL_${status.toUpperCase()}`, {
        userId: admin.id,
        metadata: { clientId: userId, status, notes },
      });

      if (client?.email && (status === 'approved' || status === 'rejected')) {
        sendMailBestEffort({
          to: client.email,
          subject: `KYC verification ${status} | Global Forex`,
          html: buildKycStatusEmailHtml({
            userName: client.full_name || 'Trader',
            status,
            documentType: 'manual_override',
            remarks: notes || undefined,
          }),
          template: 'kyc_status',
          userId: client.id,
        });
      }

      if (status === 'approved') notifications.kycApproved(userId);
      else if (status === 'rejected') notifications.kycRejected(userId, notes || '');

      return ok({ success: true, message: `KYC for ${client.full_name || 'user'} successfully marked as ${status}.` });
    }

    // Case 2: Process specific submission by recordId
    const { data: record } = await db
      .from('kyc_records')
      .select('id, user_id, document_type, status')
      .eq('id', recordId)
      .maybeSingle();

    if (!record) return fail(404, 'No such KYC record.');

    const { data: client } = await db
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', record.user_id)
      .maybeSingle();

    await db
      .from('kyc_records')
      .update({ status, admin_notes: notes, reviewed_at: now, reviewed_by: admin.id })
      .eq('id', record.id);

    await db.from('profiles').update({ kyc_status: status }).eq('id', record.user_id);

    await auditServer(req, `KYC_${status.toUpperCase()}`, {
      userId: admin.id,
      metadata: { recordId: record.id, clientId: record.user_id, notes },
    });

    if (client?.email) {
      sendMailBestEffort({
        to: client.email,
        subject: `KYC verification ${status} | Global Forex`,
        html: buildKycStatusEmailHtml({
          userName: client.full_name || 'Trader',
          status,
          documentType: record.document_type,
          remarks: notes || undefined,
        }),
        template: 'kyc_status',
        userId: client.id,
      });
    }

    if (status === 'approved') notifications.kycApproved(record.user_id);
    else if (status === 'rejected') notifications.kycRejected(record.user_id, notes || '');

    return ok({ success: true, message: `KYC marked ${status}.` });
  } catch (err) {
    return handleRouteError(err);
  }
}
