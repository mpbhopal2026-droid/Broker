'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  KYCRecord,
  Transaction,
  BrokerPaymentSettings,
  TradeOrder,
  TradeSignal,
  MarketAsset,
  NewsArticle,
  KYCDocumentType,
  WithdrawalDetails,
  ThemeMode,
  NotificationMessage,
  LedgerEntry,
  AccountMode,
  DemoState,
  DemoQuote,
  UserRole,
  ToastMessage,
  SupportTicket,
  ChatMessage,
  KYCDraft,
  ClientPaymentConfig,
} from './types';
import { NotificationBanner } from '@/components/notifications/NotificationBanner';

/**
 * CLIENT application state.
 *
 * Contains no admin capability. Operator actions live in admin-store.tsx and
 * are imported only by apps/admin, so approveDeposit/adjustUserBalance and
 * friends are not present in the client bundle at all.
 *
 *
 * What changed, and why it matters:
 *
 *   - Identity, balances, KYC status and transactions are no longer kept in
 *     localStorage. They are read from the server on every load. Previously a
 *     user could open devtools and set their own wallet balance or KYC status.
 *
 *   - There is no switchRole(). Role comes from the database via the session
 *     and cannot be changed from the browser at all.
 *
 *   - There is no injectTrade()/adminUpdateTradePnL()/adminCloseTrade().
 *     Fabricated positions and hand-typed P&L have been removed entirely.
 *
 *   - OTP is generated, stored and checked server-side. The old flow generated
 *     it in the browser, displayed it on screen, and accepted '1234' forever.
 *
 * Only presentation state (theme, in-app notifications, market display data)
 * still lives client-side.
 */

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface AppContextType {
  // Session
  currentUser: UserProfile | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;

  // Server-backed data
  transactions: Transaction[];
  ledger: LedgerEntry[];
  /** Alias kept for the funds screen. */
  ledgerEntries: LedgerEntry[];
  kycRecords: KYCRecord[];
  paymentSettings: BrokerPaymentSettings;
  pendingLegal: string[];
  consents: Record<string, boolean>;
  canTrade: boolean;


  // Display-only market data
  tradeOrders: TradeOrder[];
  tradeSignals: TradeSignal[];
  marketAssets: MarketAsset[];
  /** Whether displayed prices come from a real feed or the simulator. */
  quoteFeed: 'live' | 'stale' | 'simulated';
  newsArticles: NewsArticle[];

  /**
   * Which account the UI is operating on.
   *
   * 'demo' uses a virtual balance and simulated prices — nothing is at stake,
   * so trading works fully. 'live' is real money; order entry there stays
   * disabled until there is a real market-data feed. Demo value can never
   * become live value: they are different tables with no code path between.
   */
  accountMode: AccountMode;
  setAccountMode: (mode: AccountMode) => void;
  isDemo: boolean;
  canUseDemo: boolean;
  featureFlags: Record<string, boolean>;

  demo: DemoState | null;
  quotes: DemoQuote[];
  refreshDemo: () => Promise<void>;
  openDemoTrade: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    margin: number;
    leverage: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => Promise<ActionResult>;
  closeDemoTrade: (tradeId: string) => Promise<ActionResult>;
  resetDemoAccount: () => Promise<ActionResult>;

  // Notifications (in-app, client-side)
  notifications: NotificationMessage[];
  notify: (title: string, body: string, type?: NotificationMessage['type']) => void;
  sendPushNotification: (title: string, body: string, type?: NotificationMessage['type']) => void;
  dismissNotification: (id: string) => void;

  // Support Tickets & Live Client Chat
  supportTickets: SupportTicket[];
  ticketMessages: Record<string, ChatMessage[]>;
  createSupportTicket: (subject: string, category: SupportTicket['category'], initialMessage: string) => Promise<string>;
  sendChatMessage: (ticketId: string, message: string) => void;
  resolveSupportTicket: (ticketId: string) => void;

  /**
   * Toasts and watchlist are presentation-only. They exist because the UI
   * expects them; neither influences money, authorisation or persisted state.
   */
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  watchlist: string[];
  toggleWatchlist: (symbol: string) => void;

  /**
   * Order entry. In demo mode these route to the demo engine; in live mode they
   * refuse, because live trading needs a real market-data feed and server-side
   * execution. They never mutate a balance in the browser.
   */
  openTrade: (symbol: string, pairName: string, type: 'BUY' | 'SELL', lotSize: number, margin: number, leverage: number, stopLoss?: number, takeProfit?: number) => Promise<ActionResult>;
  closeTrade: (tradeId: string) => Promise<ActionResult>;

  // Theme
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;

  /** `identifier` is an email address, or a phone number when channel is 'sms'. */
  requestOtp: (
    identifier: string,
    channel?: 'email' | 'sms',
    purpose?: 'login' | 'email_verify'
  ) => Promise<ActionResult & { userExists?: boolean; alreadyRegistered?: boolean; notRegistered?: boolean }>;
  verifyOtpAndLogin: (
    identifier: string,
    code: string,
    extras?: { fullName?: string; phone?: string; acceptedDocuments?: string[] },
    channel?: 'email' | 'sms'
  ) => Promise<ActionResult & { role?: UserRole; isNewAccount?: boolean; needsRegistration?: boolean }>;
  logout: () => Promise<void>;
  revokeAllSessions: () => Promise<ActionResult>;

  // Profile
  updateUserProfile: (data: Partial<UserProfile>) => Promise<ActionResult>;

  // KYC
  submitKYC: (documentType: KYCDocumentType, documentNumber: string, files: string[], details?: Record<string, unknown>) => Promise<ActionResult>;

  // Money
  submitDeposit: (amountINR: number, paymentMode: string, utrNumber: string, proofImage?: string) => Promise<ActionResult>;
  submitWithdrawal: (amountUSD: number, details: WithdrawalDetails) => Promise<ActionResult>;

  // Compliance
  acceptLegalDocuments: (documents: string[]) => Promise<ActionResult>;
  setConsent: (purpose: string, granted: boolean) => Promise<ActionResult>;
  submitDataRequest: (requestType: string, details?: string) => Promise<ActionResult>;

  // Onboarding & KYC Gate Modals
  isOnboardingChoiceOpen: boolean;
  openOnboardingChoice: () => void;
  closeOnboardingChoice: () => void;

  isKycGateModalOpen: boolean;
  openKycGateModal: () => void;
  closeKycGateModal: () => void;

  // KYC Draft persistence
  saveKycDraft: (draft: Partial<KYCDraft>) => void;
  getKycDraft: () => KYCDraft | null;
  clearKycDraft: () => void;

  // Demo balance actions
  demoDeposit: (amount: number) => Promise<ActionResult>;
  demoWithdraw: (amount: number) => Promise<ActionResult>;

  // Observability & click-stream logging
  logClientEvent: (action: string, category: 'TRADE' | 'AUTH' | 'KYC' | 'WALLET' | 'UI' | 'ERROR', details: string, metadata?: Record<string, any>) => void;

  /**
   * Live trading is disabled. It requires a real market-data feed and a
   * server-side execution path; until those exist, positions and P&L cannot be
   * produced honestly, and the previous client-side implementation let the
   * browser mutate its own balance.
   */
  tradingDisabledReason: string;
}

const TRADING_DISABLED_REASON =
  'Live trading is not enabled. It requires a licensed market-data feed and server-side execution.';

/**
 * Shown until /api/settings responds. Payment fields are blank on purpose —
 * rendering a plausible-looking placeholder account number would be worse than
 * rendering nothing, because a client might pay into it.
 */
const PLACEHOLDER_SETTINGS: BrokerPaymentSettings = {
  id: 1,
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  qrImageUrl: '',
  cryptoUsdtAddress: '',
  usdToInrRate: 84.5,
  depositRate: 84.5,
  withdrawalRate: 84.5,
  inrSpreadDeposit: 0,
  inrSpreadWithdrawal: 0,
  quoteValiditySeconds: 60,
  instructions: 'Loading payment instructions…',
  updatedAt: new Date(0).toISOString(),
};

// Display-only reference data for the markets screen. These are static sample
// quotes, not a live feed — no order may be priced from them.
/**
 * First-paint placeholder only. Replaced within a second by /api/quotes, which
 * is the single source of truth and reports whether the feed is live or
 * simulated. Do not treat these numbers as prices.
 */
const DISPLAY_MARKET_ASSETS: MarketAsset[] = [
  { symbol: 'XAU/USD', name: 'Gold Spot / US Dollar', category: 'Commodities', price: 2415.80, change: 18.50, changePercent: 0.77, high24h: 2448.20, low24h: 2410.50, volume24h: '$190B', tvSymbol: 'OANDA:XAUUSD' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'Forex', price: 1.08745, change: 0.00130, changePercent: 0.12, high24h: 1.09100, low24h: 1.08420, volume24h: '$420B', tvSymbol: 'FX:EURUSD' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'Forex', price: 1.26820, change: -0.00370, changePercent: -0.29, high24h: 1.27450, low24h: 1.26500, volume24h: '$280B', tvSymbol: 'FX:GBPUSD' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', category: 'Forex', price: 84.150, change: 0.080, changePercent: 0.10, high24h: 84.300, low24h: 83.950, volume24h: '$45B', tvSymbol: 'FX_IDC:USDINR' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'Crypto', price: 64250.00, change: 1350.00, changePercent: 2.15, high24h: 65400.00, low24h: 63800.00, volume24h: '$38B', tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'WTI/USD', name: 'WTI Crude Oil Spot', category: 'Commodities', price: 81.955, change: -0.845, changePercent: -1.02, high24h: 83.400, low24h: 81.200, volume24h: '$80B', tvSymbol: 'TVC:USOIL' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

async function postJson(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } };
  }
}

async function patchJson(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } };
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<BrokerPaymentSettings>(PLACEHOLDER_SETTINGS);
  const [pendingLegal, setPendingLegal] = useState<string[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [canTrade, setCanTrade] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Real-money positions recorded by the dealing desk. This was a hardcoded
  // empty array, so live positions could never appear on screen no matter what
  // was recorded against the account.
  const [tradeOrders, setTradeOrders] = useState<TradeOrder[]>([]);
  const [tradeSignals] = useState<TradeSignal[]>([]);
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>(DISPLAY_MARKET_ASSETS);
  const [quoteFeed, setQuoteFeed] = useState<'live' | 'stale' | 'simulated'>('simulated');
  const [newsArticles] = useState<NewsArticle[]>([]);

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Support Tickets & Live Chat State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'ticket-01',
      userId: 'user-client-01',
      userFullName: 'Rahul Sharma',
      userEmail: 'rahul.trader@gmail.com',
      subject: 'Deposit UTR Verification Query',
      category: 'deposit',
      status: 'open',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: 'I transferred ₹50,000 via UPI GPay. Please verify UTR 423910592819.',
    }
  ]);

  const [ticketMessages, setTicketMessages] = useState<Record<string, ChatMessage[]>>({
    'ticket-01': [
      {
        id: 'msg-1',
        ticketId: 'ticket-01',
        senderRole: 'client',
        senderName: 'Rahul Sharma',
        message: 'I transferred ₹50,000 via UPI GPay. Please verify UTR 423910592819.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-2',
        ticketId: 'ticket-01',
        senderRole: 'admin',
        senderName: 'Support Officer',
        message: 'Hello Rahul! Checking your UTR with the bank desk now. It will take ~2 minutes.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      }
    ]
  });

  const createSupportTicket = useCallback(async (subject: string, category: SupportTicket['category'], initialMessage: string): Promise<string> => {
    const ticketId = `ticket-${Date.now()}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      userId: currentUser?.id || 'guest-user',
      userFullName: currentUser?.fullName || 'Client',
      userEmail: currentUser?.email || 'client@example.com',
      subject,
      category,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: initialMessage,
    };

    const firstMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderRole: 'client',
      senderName: currentUser?.fullName || 'Client',
      message: initialMessage,
      timestamp: new Date().toISOString(),
    };

    setSupportTickets((prev) => [newTicket, ...prev]);
    setTicketMessages((prev) => ({ ...prev, [ticketId]: [firstMsg] }));
    return ticketId;
  }, [currentUser]);

  const sendChatMessage = useCallback((ticketId: string, message: string) => {
    if (!message.trim()) return;
    const senderRole: 'client' | 'admin' = currentUser?.role === 'admin' ? 'admin' : 'client';
    const senderName: string = currentUser?.fullName || (senderRole === 'admin' ? 'Support Desk' : 'Client');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderRole,
      senderName,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setTicketMessages((prev) => ({
      ...prev,
      [ticketId]: [...(prev[ticketId] || []), newMsg],
    }));

    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, lastMessage: message, updatedAt: new Date().toISOString(), status: senderRole === 'admin' ? 'in_progress' : 'open' }
          : t
      )
    );
  }, [currentUser]);

  const resolveSupportTicket = useCallback((ticketId: string) => {
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved', updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  // Feature flags & Demo Account State
  const [canUseDemo, setCanUseDemo] = useState(true);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [accountMode, setAccountModeState] = useState<AccountMode>('demo');
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [quotes, setQuotes] = useState<DemoQuote[]>([]);

  // --- notifications --------------------------------------------------------

  const notify = useCallback((title: string, body: string, type: NotificationMessage['type'] = 'system') => {
    setNotifications((prev) => [
      { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, body, type, read: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Kept under the old name for call sites. This raises an in-app banner only —
  // it does not push to a device. Real push delivery happens server-side when
  // the corresponding email/FCM dispatch runs.
  const sendPushNotification = notify;

  // --- theme ----------------------------------------------------------------

  const applyTheme = useCallback((mode: ThemeMode) => {
    let effective = mode;
    if (mode === 'system') {
      effective = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    const root = document.documentElement;
    root.classList.toggle('light', effective === 'light');
    root.classList.toggle('dark', effective !== 'light');
    root.setAttribute('data-theme', effective === 'light' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem('apex_theme', mode);
    } catch {
      /* private browsing */
    }
    applyTheme(mode);
  }, [applyTheme]);

  // --- session --------------------------------------------------------------

  const refreshSession = useCallback(async () => {
    try {
      // Hard timeout. Without it, a hanging upstream (an unreachable or
      // misconfigured Supabase, a cold serverless function) leaves this promise
      // pending forever and the app sits on its loading state with no error —
      // which is exactly what a user sees as "the site never loads".
      const withTimeout = (url: string, ms = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return fetch(url, { credentials: 'same-origin', signal: controller.signal }).finally(() =>
          clearTimeout(timer)
        );
      };

      const [sessionRes, settingsRes] = await Promise.all([
        withTimeout('/api/auth/session'),
        withTimeout('/api/settings'),
      ]);

      const settingsBody = await settingsRes.json().catch(() => ({}));
      if (settingsBody?.settings) setPaymentSettings(settingsBody.settings);

      const sessionBody = await sessionRes.json().catch(() => ({}));

      if (!sessionBody?.user) {
        setCurrentUser(null);
        setTransactions([]);
        setLedger([]);
        setKycRecords([]);
        setPendingLegal([]);
        setConsents({});
        setCanTrade(false);
        return;
      }

      const overviewRes = await fetch('/api/me/overview', { credentials: 'same-origin' });
      const overview = await overviewRes.json().catch(() => ({}));

      if (overview?.profile) {
        const rate = settingsBody?.settings?.usdToInrRate ?? 84.5;
        // The database is the only source of KYC status. localStorage used to
        // override it, so a browser that had once optimistically written
        // 'pending' kept showing the holding screen no matter what the server
        // said — including when nothing had ever been submitted.
        //
        // Clearing the key here also unsticks every client already trapped by
        // that bug: on next load their real status wins and the form returns.
        const finalKycStatus = overview.profile.kycStatus;
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('apex_kyc_status_' + overview.profile.id);
          }
        } catch {}
        setCurrentUser({
          ...overview.profile,
          kycStatus: finalKycStatus,
          walletBalanceINR: Number((overview.profile.walletBalance * rate).toFixed(2)),
        });
      }

      setTransactions(overview?.transactions ?? []);
      setLedger(overview?.ledger ?? []);
      setKycRecords(overview?.kycRecords ?? []);
      setPendingLegal(overview?.pendingLegal ?? []);
      setConsents(overview?.consents ?? {});
      setCanTrade(Boolean(overview?.canTrade));

      if (overview?.canUseDemo !== undefined) {
        setCanUseDemo(Boolean(overview.canUseDemo));
        if (!overview.canUseDemo) {
          setAccountModeState('live');
        }
      }
      if (overview?.featureFlags) {
        setFeatureFlags(overview.featureFlags);
      }
    } catch (err) {
      // Degrade to signed-out rather than hanging. A visitor who cannot reach
      // the API should still get a usable login page.
      console.warn('Session refresh failed:', err);
      setCurrentUser(null);
      setCanTrade(false);
    }
  }, []);

  // Quotes come from the server so there is exactly one source of truth and the
  // client cannot be fed prices the backend never saw.
  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch('/api/quotes', { cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled || !body?.ok || !Array.isArray(body.quotes)) return;

        // 'partial' means some instruments are live and some are not, which is
        // the normal state now. Reported as 'stale' rather than 'live' so the
        // banner never claims more than is true — the per-instrument `source`
        // below is what the UI should trust for any individual price.
        setQuoteFeed(body.feed === 'live' ? 'live' : body.feed === 'partial' ? 'stale' : 'simulated');
        setMarketAssets(
          body.quotes.map((q: any) => ({
            symbol: q.symbol,
            name: q.name,
            category: q.category,
            price: q.mid,
            change: q.change,
            changePercent: q.changePercent,
            high24h: q.high24h,
            low24h: q.low24h,
            volume24h: '—',
            tvSymbol: q.tvSymbol,
            // Carried through rather than dropped. Without these the client
            // cannot tell a live gold price from a simulated oil price.
            source: q.source,
            asOf: q.asOf,
          })),
        );
      } catch {
        /* keep the last good quotes rather than blanking the board */
      }
    };

    pull();
    const id = setInterval(pull, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    try {
      const storedTheme = (localStorage.getItem('apex_theme') as ThemeMode) || 'light';
      setThemeState(storedTheme);
      applyTheme(storedTheme);

      const storedWatchlist = localStorage.getItem('apex_watchlist');
      if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));

      const storedMode = localStorage.getItem('apex_account_mode');
      if (storedMode === 'live' || storedMode === 'demo') setAccountModeState(storedMode);
    } catch {
      applyTheme('light');
    }

    void refreshSession().finally(() => setIsLoaded(true));
  }, [applyTheme, refreshSession]);

  // Real-time auto-refresh across client application: polls every 6s & refreshes on window focus
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshSession();
      }
    };

    timer = setInterval(poll, 6000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSession();
      }
    };
    const onFocus = () => void refreshSession();

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshSession]);

  // --- auth -----------------------------------------------------------------

  const requestOtp = useCallback(
    async (
      identifier: string,
      channel: 'email' | 'sms' = 'email',
      purpose: 'login' | 'email_verify' = 'login'
    ): Promise<ActionResult & { userExists?: boolean; alreadyRegistered?: boolean; notRegistered?: boolean }> => {
      const res = await postJson('/api/auth/request-otp', {
        channel,
        ...(channel === 'sms' ? { phone: identifier } : { email: identifier }),
        purpose,
      });
      if (!res.ok) {
        return {
          success: false,
          error: res.data?.error || 'Could not send the code.',
          alreadyRegistered: res.data?.alreadyRegistered === true,
          notRegistered: res.data?.notRegistered === true,
        };
      }
      return {
        success: true,
        message: res.data?.message,
        userExists: res.data?.userExists !== false,
      };
    },
    []
  );

  const verifyOtpAndLogin = useCallback(
    async (
      identifier: string,
      code: string,
      extras?: { fullName?: string; phone?: string; acceptedDocuments?: string[] },
      channel: 'email' | 'sms' = 'email'
    ) => {
      const res = await postJson('/api/auth/verify-otp', {
        channel,
        ...(channel === 'sms' ? { phone: identifier } : { email: identifier }),
        code,
        ...extras,
      });

      if (!res.ok) {
        return {
          success: false,
          error: res.data?.error || 'Verification failed.',
          // Lets the login form offer to continue to registration instead of
          // dead-ending on an unknown number.
          needsRegistration: res.data?.needsRegistration === true,
        };
      }

      await refreshSession();
      return {
        success: true,
        role: res.data?.user?.role as UserRole,
        isNewAccount: Boolean(res.data?.isNewAccount),
      };
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    await postJson('/api/auth/logout');
    setCurrentUser(null);
    setTransactions([]);
    setLedger([]);
    setKycRecords([]);
    setPendingLegal([]);
    setConsents({});
    setCanTrade(false);
  }, []);

  const revokeAllSessions = useCallback(async (): Promise<ActionResult> => {
    const res = await postJson('/api/auth/revoke-all');
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not sign out other devices.' };
    setCurrentUser(null);
    return { success: true, message: res.data?.message };
  }, []);

  // --- profile / KYC --------------------------------------------------------

  const updateUserProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<ActionResult> => {
      const res = await patchJson('/api/me/profile', data);
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not save changes.' };
      await refreshSession();
      return { success: true, message: res.data?.message };
    },
    [refreshSession]
  );

  const submitKYC = useCallback(
    async (
      documentType: KYCDocumentType,
      documentNumber: string,
      files: string[],
      details?: Record<string, unknown>
    ): Promise<ActionResult> => {
      // Do not mark pending before the server has accepted anything. This
      // previously wrote 'pending' to localStorage AND to state before the
      // request, then again after, without ever checking the result — so a
      // rejected submission still parked the client on the holding screen
      // forever while the compliance queue stayed empty. The client believed
      // they were waiting for us; we had nothing to wait on.
      const res = await postJson('/api/me/kyc', { documentType, documentNumber, filePaths: files, ...details });

      if (!res.ok) {
        // Clear any stale marker so the form is reachable again on retry.
        if (currentUser?.id) {
          try { localStorage.removeItem('apex_kyc_status_' + currentUser.id); } catch {}
        }
        return {
          success: false,
          error: res.data?.error || 'Could not submit your documents. Please try again.',
        };
      }

      setCurrentUser((prev) => (prev ? { ...prev, kycStatus: 'pending' } : null));
      await refreshSession();
      notify('KYC submitted', 'Your documents are with our compliance desk.', 'kyc');
      return { success: true, message: res.data?.message || 'Documents submitted successfully.' };
    },
    [refreshSession, notify, currentUser]
  );

  // --- money ----------------------------------------------------------------

  const submitDeposit = useCallback(
    async (amountINR: number, paymentMode: string, utrNumber: string, proofImage?: string): Promise<ActionResult> => {
      const res = await postJson('/api/wallet/deposit', { amountINR, paymentMode, utrNumber, proofImagePath: proofImage });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not submit the deposit.' };
      await refreshSession();
      notify('Deposit submitted', 'It will be credited once our payments desk confirms receipt.', 'deposit');
      return { success: true, message: res.data?.message };
    },
    [refreshSession, notify]
  );

  const submitWithdrawal = useCallback(
    async (amountUSD: number, details: WithdrawalDetails): Promise<ActionResult> => {
      const res = await postJson('/api/wallet/withdraw', { amountUSD, details });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not submit the request.' };
      await refreshSession();
      notify('Withdrawal requested', 'Funds are on hold pending payout approval.', 'withdrawal');
      return { success: true, message: res.data?.message };
    },
    [refreshSession, notify]
  );

  // --- compliance -----------------------------------------------------------

  const acceptLegalDocuments = useCallback(
    async (documents: string[]): Promise<ActionResult> => {
      const res = await postJson('/api/legal/accept', { documents });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not record acceptance.' };
      await refreshSession();
      return { success: true };
    },
    [refreshSession]
  );

  const setConsent = useCallback(
    async (purpose: string, granted: boolean): Promise<ActionResult> => {
      const res = await postJson('/api/consent', { purpose, granted });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not update your choice.' };
      setConsents((prev) => ({ ...prev, [purpose]: granted }));
      return { success: true, message: res.data?.message };
    },
    []
  );

  const submitDataRequest = useCallback(
    async (requestType: string, details?: string): Promise<ActionResult> => {
      const res = await postJson('/api/dpdp/request', { requestType, details });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not log your request.' };
      return { success: true, message: res.data?.message };
    },
    []
  );

  // --- toasts & watchlist (presentation only) ---

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = toast.duration ?? 2200;
    setToasts((prev) => {
      const trimmed = prev.slice(-1); // Keep max 1 prior toast so with new one it is at most 2
      return [...trimmed, { ...toast, id }];
    });
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(symbol);
      const next = exists ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      try {
        localStorage.setItem('apex_watchlist', JSON.stringify(next));
      } catch {
        /* private browsing */
      }
      showToast({
        type: 'info',
        title: exists ? 'Removed from watchlist' : 'Added to watchlist',
        message: symbol,
      });
      return next;
    });
  }, [showToast]);

  // --- live positions -------------------------------------------------------

  /**
   * Pulls the client's real-money positions. They are recorded by the dealing
   * desk, so the client only ever reads them — there is no client-side write
   * path and the server does not offer one.
   */
  const refreshLiveTrades = useCallback(async () => {
    if (!currentUser) {
      setTradeOrders([]);
      return;
    }
    try {
      const res = await fetch('/api/me/trades', { credentials: 'same-origin' });
      if (!res.ok) return;
      const body = await res.json();
      if (!Array.isArray(body?.trades)) return;

      setTradeOrders(
        body.trades.map((t: any) => ({
          id: t.id,
          userId: currentUser.id,
          symbol: t.symbol,
          pairName: t.pairName,
          type: t.side,
          lotSize: t.lotSize,
          entryPrice: t.entryPrice,
          // Falls back to the entry price only for display; P&L itself stays
          // null when unmarked rather than silently reading as break-even.
          currentPrice: t.markPrice ?? t.entryPrice,
          margin: t.margin,
          leverage: t.leverage,
          stopLoss: t.stopLoss ?? undefined,
          takeProfit: t.takeProfit ?? undefined,
          pnl: t.pnl ?? 0,
          pnlPercentage: t.pnl != null && t.margin ? (t.pnl / t.margin) * 100 : 0,
          status: t.status,
          openedAt: t.openedAt,
          closedAt: t.closedAt ?? undefined,
        })),
      );
    } catch {
      /* keep the last known positions rather than blanking the portfolio */
    }
  }, [currentUser]);

  useEffect(() => {
    void refreshLiveTrades();
  }, [refreshLiveTrades]);

  // --- demo account ---------------------------------------------------------

  const refreshDemo = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/demo', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (body?.demo) setDemo(body.demo);
      if (Array.isArray(body?.quotes)) setQuotes(body.quotes);
    } catch (err) {
      console.warn('Demo refresh failed:', err);
    }
  }, [currentUser]);

  const setAccountMode = useCallback(
    (mode: AccountMode) => {
      if (mode === 'demo' && !canUseDemo) {
        showToast({
          type: 'warning',
          title: 'Demo Restricted',
          message: 'Demo account mode is currently restricted by developer feature flag policy.',
        });
        return;
      }
      setAccountModeState(mode);
      try {
        localStorage.setItem('apex_account_mode', mode);
      } catch {
        /* private browsing */
      }
      if (mode === 'demo') void refreshDemo();
    },
    [canUseDemo, refreshDemo, showToast]
  );

  // --- order entry ---

  const openTrade = useCallback(
    async (symbol: string, _pairName: string, type: 'BUY' | 'SELL', _lotSize: number, margin: number, leverage: number, stopLoss?: number, takeProfit?: number): Promise<ActionResult> => {
      if (accountMode !== 'demo') {
        showToast({ type: 'warning', title: 'Live trading unavailable', message: TRADING_DISABLED_REASON });
        return { success: false, error: TRADING_DISABLED_REASON };
      }
      const res = await postJson('/api/demo/trade', { action: 'open', symbol, side: type, margin, leverage, stopLoss, takeProfit });
      if (!res.ok) {
        showToast({ type: 'error', title: 'Order rejected', message: res.data?.error });
        return { success: false, error: res.data?.error || 'Could not open the position.' };
      }
      await refreshDemo();
      showToast({ type: 'success', title: 'Demo order filled', message: res.data?.message });
      return { success: true, message: res.data?.message };
    },
    [accountMode, showToast, refreshDemo]
  );

  const closeTrade = useCallback(
    async (tradeId: string): Promise<ActionResult> => {
      if (accountMode !== 'demo') {
        showToast({ type: 'warning', title: 'Live trading unavailable', message: TRADING_DISABLED_REASON });
        return { success: false, error: TRADING_DISABLED_REASON };
      }
      const res = await postJson('/api/demo/trade', { action: 'close', tradeId });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not close the position.' };
      await refreshDemo();
      showToast({ type: 'success', title: 'Position closed', message: res.data?.message });
      return { success: true, message: res.data?.message };
    },
    [accountMode, showToast, refreshDemo]
  );

  const openDemoTrade = useCallback(
    async (params: {
      symbol: string;
      side: 'BUY' | 'SELL';
      margin: number;
      leverage: number;
      stopLoss?: number;
      takeProfit?: number;
    }): Promise<ActionResult> => {
      const res = await postJson('/api/demo/trade', { action: 'open', ...params });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not open the position.' };
      await refreshDemo();
      return { success: true, message: res.data?.message };
    },
    [refreshDemo]
  );

  const closeDemoTrade = useCallback(
    async (tradeId: string): Promise<ActionResult> => {
      const res = await postJson('/api/demo/trade', { action: 'close', tradeId });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not close the position.' };
      await refreshDemo();
      return { success: true, message: res.data?.message };
    },
    [refreshDemo]
  );

  const resetDemoAccount = useCallback(async (): Promise<ActionResult> => {
    const res = await postJson('/api/demo', { action: 'reset' });
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not reset the demo account.' };
    await refreshDemo();
    return { success: true, message: res.data?.message };
  }, [refreshDemo]);

  // Demo deposit and withdrawal simulation
  const demoDeposit = useCallback(async (amount: number): Promise<ActionResult> => {
    const res = await postJson('/api/demo', { action: 'deposit', amount });
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not deposit demo funds.' };
    await refreshDemo();
    showToast({ type: 'success', title: 'Demo Deposit', message: `$${amount.toFixed(2)} added to demo balance.` });
    return { success: true, message: res.data?.message };
  }, [refreshDemo, showToast]);

  const demoWithdraw = useCallback(async (amount: number): Promise<ActionResult> => {
    const res = await postJson('/api/demo', { action: 'withdraw', amount });
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not withdraw demo funds.' };
    await refreshDemo();
    showToast({ type: 'info', title: 'Demo Withdrawal', message: `$${amount.toFixed(2)} deducted from demo balance.` });
    return { success: true, message: res.data?.message };
  }, [refreshDemo, showToast]);

  // Onboarding Choice Modal State
  const [isOnboardingChoiceOpen, setIsOnboardingChoiceOpen] = useState(false);
  const openOnboardingChoice = useCallback(() => setIsOnboardingChoiceOpen(true), []);
  const closeOnboardingChoice = useCallback(() => setIsOnboardingChoiceOpen(false), []);

  // KYC Gatekeeper Modal State
  const [isKycGateModalOpen, setIsKycGateModalOpen] = useState(false);
  const openKycGateModal = useCallback(() => setIsKycGateModalOpen(true), []);
  const closeKycGateModal = useCallback(() => setIsKycGateModalOpen(false), []);
  // KYC Draft persistence (strictly user-scoped to prevent data bleeding between accounts)
  const saveKycDraft = useCallback((draft: Partial<KYCDraft>) => {
    if (!currentUser?.id) return;
    try {
      const key = `gf_kyc_draft_${currentUser.id}`;
      const existing = localStorage.getItem(key);
      const current = existing ? JSON.parse(existing) : {};
      const updated = { ...current, ...draft, userId: currentUser.id, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }, [currentUser?.id]);

  const getKycDraft = useCallback((): KYCDraft | null => {
    if (!currentUser?.id) return null;
    try {
      // Clear any legacy unscoped draft from previous builds
      localStorage.removeItem('apex_kyc_draft');
      const key = `gf_kyc_draft_${currentUser.id}`;
      const existing = localStorage.getItem(key);
      if (!existing) return null;
      const parsed = JSON.parse(existing);
      return parsed?.userId === currentUser.id ? parsed : null;
    } catch {
      return null;
    }
  }, [currentUser?.id]);

  const clearKycDraft = useCallback(() => {
    try {
      localStorage.removeItem('apex_kyc_draft');
      if (currentUser?.id) {
        localStorage.removeItem(`gf_kyc_draft_${currentUser.id}`);
      }
    } catch {}
  }, [currentUser?.id]);

  // Observability & click-stream logging
  const logClientEvent = useCallback((action: string, category: 'TRADE' | 'AUTH' | 'KYC' | 'WALLET' | 'UI' | 'ERROR', details: string, metadata?: Record<string, any>) => {
    try {
      void postJson('/api/audit/client-event', {
        eventType: action,
        metadata: { category, details, ...metadata, path: typeof window !== 'undefined' ? window.location.pathname : '' },
      });
    } catch {}
  }, []);

  // Poll while viewing demo so open positions mark to the moving simulated price.
  useEffect(() => {
    if (!currentUser || accountMode !== 'demo') return;
    void refreshDemo();
    const interval = setInterval(() => void refreshDemo(), 5000);
    return () => clearInterval(interval);
  }, [currentUser, accountMode, refreshDemo]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoaded,
        isAuthenticated: Boolean(currentUser),
        refreshSession,

        transactions,
        ledger,
        ledgerEntries: ledger,
        kycRecords,
        paymentSettings,
        pendingLegal,
        consents,
        canTrade,

        tradeOrders,
        tradeSignals,
        marketAssets,
        quoteFeed,
        newsArticles,

        accountMode,
        setAccountMode,
        isDemo: accountMode === 'demo',
        canUseDemo,
        featureFlags,
        demo,
        quotes,
        refreshDemo,
        openDemoTrade,
        closeDemoTrade,
        resetDemoAccount,


        notifications,
        notify,
        sendPushNotification,
        dismissNotification,

        supportTickets,
        ticketMessages,
        createSupportTicket,
        sendChatMessage,
        resolveSupportTicket,

        toasts,
        showToast,
        removeToast,
        watchlist,
        toggleWatchlist,
        openTrade,
        closeTrade,

        theme,
        setTheme,

        requestOtp,
        verifyOtpAndLogin,
        logout,
        revokeAllSessions,

        updateUserProfile,
        submitKYC,
        submitDeposit,
        submitWithdrawal,

        acceptLegalDocuments,
        setConsent,
        submitDataRequest,

        isOnboardingChoiceOpen,
        openOnboardingChoice,
        closeOnboardingChoice,

        isKycGateModalOpen,
        openKycGateModal,
        closeKycGateModal,

        saveKycDraft,
        getKycDraft,
        clearKycDraft,

        demoDeposit,
        demoWithdraw,

        logClientEvent,

        tradingDisabledReason: TRADING_DISABLED_REASON,
      }}
    >
      <NotificationBanner notifications={notifications} onDismiss={dismissNotification} />
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
