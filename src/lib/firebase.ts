import { initializeApp, getApps, getApp } from 'firebase/app';

/**
 * Firebase is used for push notifications ONLY.
 *
 * Authentication is deliberately not Firebase's. Sign-in is a server-side OTP
 * (HMAC-hashed code, single use, 10 minute TTL, 5 attempt lock) that mints this
 * app's own signed session cookie plus a revocable sessions row. Firebase Auth
 * would have issued a second, parallel identity to reconcile against profiles,
 * and would have bypassed all of that on the phone channel only — so the two
 * login channels would no longer behave alike. SMS delivery is a vendor choice
 * (MSG91/Twilio in lib/sms.ts), not an auth system.
 *
 * Do not re-add getAuth() here.
 */
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:placeholder',
};

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes('placeholder')
);

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();


// Messaging Instance (Browser Client Only)
let messagingInstance: Messaging | null = null;
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    messagingInstance = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging initialization skipped or unsupported in this browser context:', err);
  }
}

export const messaging = messagingInstance;

// FCM Notification Token Helper
export async function getFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !messaging) return null;
  try {
    // NEXT_PUBLIC_VAPID_PUBLIC_KEY is the name declared in lib/env.ts and the
    // one actually set. This read NEXT_PUBLIC_FIREBASE_VAPID_KEY, which is set
    // nowhere — so vapidKey was always undefined and getToken() could never
    // return a usable web-push token.
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (err) {
    console.warn('Error fetching FCM push notification token:', err);
    return null;
  }
}

// FCM Foreground Push Notification Listener
export function onForegroundNotification(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}
