import { createClient } from '@supabase/supabase-js';
import { UserProfile, KYCRecord, Transaction, TradeOrder, BrokerPaymentSettings } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Helper Methods with Graceful Fallback
export async function fetchProfilesFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) return null;
    return data.map((row: any) => ({
      id: row.id,
      fullName: row.full_name || 'Trader',
      email: row.email,
      phone: row.phone || '',
      role: row.role || 'client',
      kycStatus: row.kyc_status || 'not_submitted',
      walletBalance: Number(row.wallet_balance || 0),
      walletBalanceINR: Number(row.wallet_balance || 0) * 84.5,
      isActive: row.is_active ?? true,
      firebaseUid: row.firebase_uid,
      fcmToken: row.fcm_token,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase profiles fetch error:', err);
    return null;
  }
}

export async function upsertProfileToSupabase(profile: Partial<UserProfile>): Promise<boolean> {
  if (!isSupabaseConfigured || !profile.id) return false;
  try {
    const payload = {
      id: profile.id,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      kyc_status: profile.kycStatus,
      wallet_balance: profile.walletBalance,
      firebase_uid: profile.firebaseUid,
      fcm_token: profile.fcmToken,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').upsert(payload);
    return !error;
  } catch (err) {
    console.warn('Supabase profile upsert error:', err);
    return false;
  }
}

export async function saveFcmTokenToSupabase(userId: string, fcmToken: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: fcmToken, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  } catch (err) {
    console.warn('Supabase FCM token update error:', err);
    return false;
  }
}
