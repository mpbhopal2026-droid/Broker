import 'server-only';

import { getServiceClient } from './supabase-server';

/**
 * Branding, contact and legal-entity details, all operator-editable.
 *
 * Nothing user-visible is hardcoded in the app. Falling back to blank rather
 * than to a plausible-looking placeholder is deliberate for the legal fields:
 * an empty registered address is obviously unfinished, whereas an invented one
 * reads as real and is a misrepresentation.
 */

export interface AppSettings {
  appName: string;
  appShortName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  companyLegalName: string;
  companyRegistrationNo: string;
  companyAddress: string;
  governingLawCity: string;
  supportEmail: string;
  supportPhone: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
  grievanceOfficerPhone: string;
  grievanceResponseDays: number;
  emailFromName: string;
  emailFooterNote: string;
  websiteUrl: string | null;
  telegramUrl: string | null;
  whatsappNumber: string | null;
  updatedAt: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'Global Forex',
  appShortName: 'Global Forex',
  tagline: 'Markets, transparently',
  logoUrl: '/icons/logo.svg',
  faviconUrl: '/icons/favicon.svg',
  primaryColor: '#3faa4a',
  accentColor: '#1e5aa8',
  companyLegalName: '',
  companyRegistrationNo: '',
  companyAddress: '',
  governingLawCity: '',
  supportEmail: '',
  supportPhone: '',
  grievanceOfficerName: '',
  grievanceOfficerEmail: '',
  grievanceOfficerPhone: '',
  grievanceResponseDays: 30,
  emailFromName: 'Global Forex',
  emailFooterNote: '',
  websiteUrl: 'https://globalforex.online',
  telegramUrl: null,
  whatsappNumber: null,
  updatedAt: new Date(0).toISOString(),
};

// Short in-process cache. Settings are read on nearly every request but change
// rarely; 30s keeps an edit visible quickly without hammering the database.
let cache: { value: AppSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateAppSettingsCache(): void {
  cache = null;
}

export async function loadAppSettings(): Promise<AppSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const db = getServiceClient();
  if (!db) return DEFAULT_APP_SETTINGS;

  try {
    const { data } = await db.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (!data) return DEFAULT_APP_SETTINGS;

    const value: AppSettings = {
      appName: data.app_name || DEFAULT_APP_SETTINGS.appName,
      appShortName: data.app_short_name || DEFAULT_APP_SETTINGS.appShortName,
      tagline: data.tagline || '',
      logoUrl: data.logo_url || null,
      faviconUrl: data.favicon_url || null,
      primaryColor: data.primary_color || DEFAULT_APP_SETTINGS.primaryColor,
      accentColor: data.accent_color || DEFAULT_APP_SETTINGS.accentColor,
      companyLegalName: data.company_legal_name || '',
      companyRegistrationNo: data.company_registration_no || '',
      companyAddress: data.company_address || '',
      governingLawCity: data.governing_law_city || '',
      supportEmail: data.support_email || '',
      supportPhone: data.support_phone || '',
      grievanceOfficerName: data.grievance_officer_name || '',
      grievanceOfficerEmail: data.grievance_officer_email || '',
      grievanceOfficerPhone: data.grievance_officer_phone || '',
      grievanceResponseDays: Number(data.grievance_response_days ?? 30),
      emailFromName: data.email_from_name || DEFAULT_APP_SETTINGS.appName,
      emailFooterNote: data.email_footer_note || '',
      websiteUrl: data.website_url || null,
      telegramUrl: data.telegram_url || null,
      whatsappNumber: data.whatsapp_number || null,
      updatedAt: data.updated_at,
    };

    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch (err) {
    console.error('[app-settings] load failed:', err);
    return DEFAULT_APP_SETTINGS;
  }
}

/** Which legally-required fields are still blank. Surfaced in the admin UI. */
export function missingComplianceFields(settings: AppSettings): string[] {
  const required: Array<[keyof AppSettings, string]> = [
    ['companyLegalName', 'Legal entity name'],
    ['companyAddress', 'Registered office address'],
    ['supportEmail', 'Support email'],
    ['grievanceOfficerName', 'Grievance Officer name'],
    ['grievanceOfficerEmail', 'Grievance Officer email'],
  ];

  return required.filter(([key]) => !String(settings[key] ?? '').trim()).map(([, label]) => label);
}
