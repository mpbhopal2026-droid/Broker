import { NextRequest } from 'next/server';
import { loadSession } from '@/lib/auth-server';
import { ok, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who am I? The client treats this as the only source of truth for identity. */
export async function GET(_req: NextRequest) {
  try {
    const user = await loadSession();
    if (!user) return ok({ user: null });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        kycStatus: user.kycStatus,
        emailVerified: user.emailVerified,
        walletBalance: user.walletBalance,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
