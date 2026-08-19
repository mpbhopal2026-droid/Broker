// Single source of truth. This used to be a separate `'client' | 'admin'`
// union that silently disagreed with permissions.ts, so a UserProfile could not
// represent a staff or developer account even though the database and the
// permission matrix both allow one.
export type { UserRole } from './permissions';
import type { UserRole } from './permissions';
export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type KYCDocumentType = 'aadhaar' | 'pan' | 'passport' | 'voter_id' | 'driving_license';
export type TransactionType = 'deposit' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed' | 'rejected';
export type ThemeMode = 'dark' | 'light' | 'system';

/** Instrument grouping used by the markets and watchlist screens. */
export type AssetCategory = 'Forex' | 'Commodities' | 'Crypto' | 'Equities' | 'Indices';

/** One level of a simulated order book. Display only — not a real depth feed. */
export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: KYCStatus;
  walletBalance: number; // in USD
  walletBalanceINR: number;
  isActive: boolean;
  
  // Extended Profile & Banking Details
  city?: string;
  address?: string;
  postalCode?: string;
  state?: string;
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  userUpiId?: string;
  tradingExperience?: 'beginner' | 'intermediate' | 'expert';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  twoFactorOtpEnabled?: boolean;
  accountTier?: 'Standard Trader' | 'Pro Member' | 'VIP Institutional';
  // Firebase & Push Notification integrations
  firebaseUid?: string;
  fcmToken?: string;
  authProvider?: 'firebase' | 'local';

  createdAt: string;
  updatedAt: string;
}

export interface NotificationMessage {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type: 'deposit' | 'withdrawal' | 'kyc' | 'signal' | 'system';
  read: boolean;
  createdAt: string;
}

export interface EmailNotificationPayload {
  type: 'deposit_approval' | 'withdrawal_status' | 'kyc_status' | 'custom';
  recipientEmail: string;
  payload: Record<string, any>;
}

export interface KYCRecord {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  documentType: KYCDocumentType;
  documentNumber: string;
  filePaths: string[];
  status: KYCStatus;
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface WithdrawalDetails {
  bankName: string;
  accountHolder: string;
  /** Alias the withdrawal modal submits under. Server reads accountHolder. */
  accountHolderName?: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  type: TransactionType;
  amount: number; // in USD
  amountINR?: number;
  paymentMode?: string;
  utrNumber?: string;
  proofImagePath?: string;
  withdrawalDetails?: WithdrawalDetails;
  status: TransactionStatus;
  adminRemarks?: string;
  createdAt: string;
  processedAt?: string;
}

/** One append-only movement of money. The ledger, not the profile, is the truth. */
export interface LedgerEntry {
  id: string;
  user_id: string;
  direction: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  reason: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;

  /**
   * Presentation aliases used by the statement screen. Populated by
   * mapLedgerEntry alongside the snake_case fields, so the UI can render a
   * credit/debit column view without re-deriving it in the component.
   */
  userId?: string;
  date?: string;
  /** Human label for the statement row, e.g. Deposit / Withdrawal / Trade P&L. */
  type?: string;
  description?: string;
  credit?: number;
  debit?: number;
  balance?: number;
  /** Populated when the query joins profiles, for the admin ledger view. */
  userFullName?: string;
  referenceId?: string | null;
}

export interface BrokerPaymentSettings {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  qrImageUrl: string;
  cryptoUsdtAddress: string;
  /** Mid rate. Clients never transact at this — see depositRate / withdrawalRate. */
  usdToInrRate: number;
  /** Mid + spread. Applied when the client buys USD (deposits). */
  depositRate: number;
  /** Mid - spread. Applied when the client sells USD (withdraws). */
  withdrawalRate: number;
  inrSpreadDeposit: number;
  inrSpreadWithdrawal: number;
  quoteValiditySeconds: number;
  /** Deposit handling fee, disclosed to the client before they commit. */
  commissionPercent?: number;
  instructions: string;
  updatedAt: string;
}

/** One tradeable instrument with its client-facing two-way price. */
export interface DemoQuote {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Crypto';
  tvSymbol: string;
  mid: number;
  bid: number;
  ask: number;
  spreadBps: number;
  spreadAbsolute: number;
}

export interface DemoPosition {
  id: string;
  symbol: string;
  pairName: string;
  side: 'BUY' | 'SELL';
  lotSize: number;
  margin: number;
  leverage: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  currentPrice?: number;
}

export interface DemoState {
  balance: number;
  marginUsed: number;
  openPnl: number;
  equity: number;
  positions: DemoPosition[];
  resetAt: string | null;
  startingBalance: number;
}

/** Which account the UI is operating on. Demo money is never withdrawable. */
export type AccountMode = 'demo' | 'live';

export interface TradeOrder {
  id: string;
  userId: string;
  userFullName?: string;
  symbol: string;
  pairName: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  margin: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercentage: number;
  // PENDING and CANCELLED cover the order lifecycle the UI displays, ahead of
  // a real execution path that can produce them.
  status: 'OPEN' | 'CLOSED' | 'PENDING' | 'CANCELLED';
  adminModified?: boolean;
  openedAt: string;
  closedAt?: string;
  exitPrice?: number;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  pairName: string;
  category: 'Forex' | 'Commodities' | 'Crypto';
  type: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  recommendedLeverage: number;
  expectedRoi: string;
  analystNotes: string;
  status: 'ACTIVE' | 'TARGET_HIT' | 'EXPIRED';
  createdAt: string;
  author: string;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Crypto' | 'GAINERS' | 'LOSERS';
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  tvSymbol: string;
  description?: string;
  /**
   * Client-facing two-way price, derived from `price` (mid) and the configured
   * instrument spread. Optional because the static display list carries mid only.
   */
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'Forex' | 'Commodities' | 'Crypto';
  summary: string;
  content: string;
  date: string;
  readTime: string;
  imageUrl: string;
}

export interface ConsentLog {
  id: string;
  userId: string;
  userEmail: string;
  consentType: string;
  consentVersion: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/** Transient UI notice. Presentation only — never used to convey money state. */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderRole: 'client' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  subject: string;
  category: 'deposit' | 'withdrawal' | 'kyc' | 'trading' | 'general';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface ClientPaymentConfig {
  userId: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  qrImageUrl?: string;
  customRate?: number;
  notes?: string;
  isCustom: boolean;
}

export interface UserAuditEvent {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  category: 'TRADE' | 'AUTH' | 'KYC' | 'WALLET' | 'UI' | 'ERROR';
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface UserLoginLog {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  location?: string;
  twoFactorStatus: 'passed' | 'skipped' | 'failed';
  status: 'SUCCESS' | 'FAILED' | 'REVOKED';
  timestamp: string;
}

export interface KYCDraft {
  currentStep: number;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  panNumber: string;
  aadhaarNumber: string;
  panImage?: string;
  aadhaarFront?: string;
  aadhaarBack?: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
  updatedAt: string;
}

