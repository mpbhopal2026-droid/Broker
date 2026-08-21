import { NextRequest } from 'next/server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, handleRouteError } from '@/lib/api';
import { loadDemoState, resetDemoAccount, demoDepositFunds, demoWithdrawFunds, loadSpreadConfig, quoteFor } from '@/lib/demo-engine';
import { INSTRUMENTS } from '@/lib/market-data';
import { isEnabled } from '@/lib/feature-flags';
import { getQuotes } from '@/lib/quote-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Demo account state plus live simulated quotes for every instrument. */
export async function GET() {
  try {
    const user = await requireUser();

    const allowed = await isEnabled('demo_account_enabled', user.id);
    if (!allowed) {
      return fail(403, 'Demo trading is currently unavailable.');
    }

    // getQuotes() is awaited for its side effect of populating the live price
    // cache that quoteFor() reads, so demo prices track the same market the
    // chart shows rather than an unrelated simulated series.
    const [state, config] = await Promise.all([
      loadDemoState(user.id),
      loadSpreadConfig(),
      getQuotes().catch(() => null),
    ]);
    if (!state) return fail(503, 'Demo trading is unavailable.');

    const now = Date.now();
    const quotes = INSTRUMENTS.map((instrument) => {
      const quote = quoteFor(instrument.symbol, config, now);
      return {
        symbol: instrument.symbol,
        name: instrument.name,
        category: instrument.category,
        tvSymbol: instrument.tvSymbol,
        mid: quote.mid,
        bid: quote.bid,
        ask: quote.ask,
        spreadBps: quote.spreadBps,
        spreadAbsolute: quote.spreadAbsolute,
      };
    });

    return ok({ demo: state, quotes, simulated: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Reset, deposit, or withdraw in the demo account. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'reset') {
      const limit = rateLimit(`demo:reset:${user.id}`, 10, 60 * 60);
      if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

      const done = await resetDemoAccount(user.id);
      if (!done) return fail(500, 'Could not reset the demo account.');

      await auditServer(req, 'DEMO_ACCOUNT_RESET', { userId: user.id });
      return ok({ message: 'Demo account reset to $1,000. Open positions were discarded.' });
    }

    if (action === 'deposit') {
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail(400, 'Invalid deposit amount.');

      const res = await demoDepositFunds(user.id, amount);
      if (!res.ok) return fail(400, res.error);

      await auditServer(req, 'DEMO_DEPOSIT', { userId: user.id, metadata: { amount } });
      return ok({ message: `Deposited $${amount.toFixed(2)} into Demo balance.`, balance: res.balance });
    }

    if (action === 'withdraw') {
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail(400, 'Invalid withdrawal amount.');

      const res = await demoWithdrawFunds(user.id, amount);
      if (!res.ok) return fail(400, res.error);

      await auditServer(req, 'DEMO_WITHDRAW', { userId: user.id, metadata: { amount } });
      return ok({ message: `Simulated withdrawal of $${amount.toFixed(2)} from Demo balance.`, balance: res.balance });
    }

    return fail(400, 'Unknown action.');
  } catch (err) {
    return handleRouteError(err);
  }
}

