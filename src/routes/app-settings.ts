import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireCapability, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, normaliseEmail, handleRouteError } from '@/lib/api';
import { loadAppSettings, invalidateAppSettingsCache, missingComplianceFields } from '@/lib/app-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: branding and contact details the UI renders. */
export async function GET() {
  try {
    const settings = await loadAppSettings();
    return ok({ settings, missingComplianceFields: missingComplianceFields(settings) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Update branding, contact and legal-entity details.
 *
 * Every user-visible string in the app comes from here, including the ones that
 * appear in Terms and on the grievance page. Because those are legally
 * published details, the response reports which required fields are still
 * blank rather than letting them sit empty unnoticed.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireCapability('settings:edit');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    const textFields: Array<[string, string, number]> = [
      ['appName', 'app_name', 60],
      ['appShortName', 'app_short_name', 20],
      ['tagline', 'tagline', 120],
      ['companyLegalName', 'company_legal_name', 160],
      ['companyRegistrationNo', 'company_registration_no', 60],
      ['companyAddress', 'company_address', 400],
      ['governingLawCity', 'governing_law_city', 80],
      ['supportPhone', 'support_phone', 24],
      ['grievanceOfficerName', 'grievance_officer_name', 120],
      ['grievanceOfficerPhone', 'grievance_officer_phone', 24],
      ['emailFromName', 'email_from_name', 60],
      ['emailFooterNote', 'email_footer_note', 400],
      ['whatsappNumber', 'whatsapp_number', 24],
    ];

    for (const [key, column, max] of textFields) {
      if (body?.[key] === undefined) continue;
      const value = cleanString(body[key], max);
      if (value === null && String(body[key]).trim() !== '') {
        return fail(400, `${key} is too long (max ${max} characters).`);
      }
      update[column] = value ?? '';
    }

    for (const [key, column] of [
      ['supportEmail', 'support_email'],
      ['grievanceOfficerEmail', 'grievance_officer_email'],
    ] as const) {
      if (body?.[key] === undefined) continue;
      const email = normaliseEmail(body[key]);
      if (!email) return fail(400, `${key} must be a valid email address.`);
      update[column] = email;
    }

    // Only http(s) — a javascript: or data: URL here would land in an <img src>
    // or an <a href> on a page every client sees.
    for (const [key, column] of [
      ['logoUrl', 'logo_url'],
      ['faviconUrl', 'favicon_url'],
      ['websiteUrl', 'website_url'],
      ['telegramUrl', 'telegram_url'],
    ] as const) {
      if (body?.[key] === undefined) continue;
      const raw = cleanString(body[key], 600);
      if (!raw) {
        update[column] = null;
        continue;
      }
      if (!/^https?:\/\//i.test(raw)) {
        return fail(400, `${key} must start with http:// or https://`);
      }
      update[column] = raw;
    }

    for (const [key, column] of [
      ['primaryColor', 'primary_color'],
      ['accentColor', 'accent_color'],
    ] as const) {
      if (body?.[key] === undefined) continue;
      const colour = cleanString(body[key], 9);
      if (!colour || !/^#[0-9a-fA-F]{6}$/.test(colour)) {
        return fail(400, `${key} must be a hex colour like #10b981.`);
      }
      update[column] = colour.toLowerCase();
    }

    if (body?.grievanceResponseDays !== undefined) {
      const days = Number(body.grievanceResponseDays);
      if (!Number.isInteger(days) || days < 1 || days > 90) {
        return fail(400, 'Grievance response window must be between 1 and 90 days.');
      }
      update.grievance_response_days = days;
    }

    if (Object.keys(update).length === 0) return fail(400, 'Nothing to update.');

    update.updated_by = user.id;
    update.updated_at = new Date().toISOString();

    const { error } = await db.from('app_settings').update(update).eq('id', 1);
    if (error) {
      console.error('[app-settings] update failed:', error);
      return fail(500, 'Could not save settings.');
    }

    invalidateAppSettingsCache();

    await auditServer(req, 'APP_SETTINGS_UPDATED', {
      userId: user.id,
      metadata: { fields: Object.keys(update).filter((k) => !['updated_by', 'updated_at'].includes(k)) },
    });

    const settings = await loadAppSettings();
    const missing = missingComplianceFields(settings);

    return ok({
      settings,
      missingComplianceFields: missing,
      message: missing.length
        ? `Saved. Still required before launch: ${missing.join(', ')}.`
        : 'Settings saved.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
