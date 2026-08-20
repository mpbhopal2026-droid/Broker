import { Resend } from 'resend';
import { escapeHtml } from './crypto';

/**
 * Transactional email templates.
 *
 * RULE: every interpolated value goes through escapeHtml(). These bodies are
 * assembled from user- and admin-supplied strings (names, remarks, UTRs); an
 * unescaped one turns a receipt into a phishing page inside your own domain.
 */

const resendApiKey = process.env.RESEND_API_KEY || '';

export const isResendConfigured = Boolean(
  resendApiKey && !resendApiKey.includes('placeholder') && !resendApiKey.includes('your_')
);

export const resendClient = isResendConfigured ? new Resend(resendApiKey) : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Global Forex <noreply@globalforex.online>';

const BRAND = 'Global Forex';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@mail.globalforex.online';
const GRIEVANCE_EMAIL = process.env.GRIEVANCE_OFFICER_EMAIL || 'grievance@mail.globalforex.online';

/** Brand palette. Matches the app's navy/white theme rather than the old sky blue. */
const NAVY = '#123f7d';
const INK = '#0f172a';
const MUTED = '#475569'; // slate-600: ~7:1 on white. slate-400 was 2.6:1 and effectively invisible.
const HAIRLINE = '#e2e8f0';

/**
 * Logo for email, as a PNG on an absolute URL.
 *
 * Not the SVG the app uses: Gmail strips SVG entirely and Outlook renders it as
 * a broken-image box, so the one place the logo must be a raster is here. It is
 * also why this is a hosted URL rather than an inline data URI — Gmail refuses
 * to render data-URI images in HTML mail.
 */
/**
 * Base URL for anything linked from an email.
 *
 * The fallback used to be the vercel.app host, which is the stale preview
 * deployment — so whenever NEXT_PUBLIC_APP_URL was unset, every sign-up link
 * and logo in outgoing mail pointed at an old build rather than the live site.
 *
 * www is canonical: the apex 308-redirects to it, so linking straight to www
 * saves recipients a redirect and keeps the cookie domain consistent.
 */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.globalforex.online').replace(/\/$/, '');
const LOGO_URL = `${APP_URL}/icons/logo-email.png`;

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function shell(opts: { heading: string; accent: string; deskLabel: string; body: string }): string {
  // Table-based, not flexbox. Outlook renders through Word's HTML engine, which
  // ignores flex and max-width — a div layout collapses to full bleed there and
  // the mail looks broken on the one client business users actually run.
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${escapeHtml(opts.heading)}</title>
  </head>
  <!-- color-scheme above pins this to light. Without it iOS Mail and Outlook
       dark mode invert the palette and the white logo plate turns into a grey
       smear on a dark card. -->
  <body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
      <tr>
        <td align="center" style="padding:24px 12px;">

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                 style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid ${HAIRLINE}; border-radius:16px; overflow:hidden;">

            <tr>
              <td align="center" style="padding:32px 24px 24px 24px; border-bottom:1px solid ${HAIRLINE};">
                <img src="${LOGO_URL}" width="72" height="72" alt="${BRAND}"
                     style="display:block; width:72px; height:72px; border:0; outline:none; text-decoration:none; border-radius:14px;">
                <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:19px; font-weight:bold; color:${INK}; padding-top:12px; letter-spacing:-0.2px;">
                  ${BRAND}
                </div>
                <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; color:${MUTED}; padding-top:2px;">
                  ${escapeHtml(opts.deskLabel)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <h2 style="color:${INK}; font-size:17px; margin:0 0 14px 0; font-weight:bold;">${escapeHtml(opts.heading)}</h2>
                ${opts.body}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 28px 32px; border-top:1px solid ${HAIRLINE}; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:${MUTED}; line-height:1.6;">
                <p style="margin:0 0 10px 0;">
                  Trading in forex, derivatives and leveraged products carries a high risk of loss.
                  You may lose more than your deposit. Past performance does not indicate future results.
                </p>
                <p style="margin:0 0 10px 0;">
                  Questions: <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${NAVY}; text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a>
                  &nbsp;|&nbsp;
                  Grievance Officer: <a href="mailto:${escapeHtml(GRIEVANCE_EMAIL)}" style="color:${NAVY}; text-decoration:none;">${escapeHtml(GRIEVANCE_EMAIL)}</a>
                </p>
                <p style="margin:0;">© ${new Date().getFullYear()} ${BRAND}. This is a transactional message about your account.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

function row(label: string, value: string, opts: { accent?: string; mono?: boolean } = {}): string {
  return `
    <tr>
      <td style="padding: 6px 0; color: ${MUTED};">${escapeHtml(label)}</td>
      <td style="padding: 6px 0; text-align: right; font-weight: bold; color: ${opts.accent || INK};${opts.mono ? " font-family: monospace;" : ''}">${escapeHtml(value)}</td>
    </tr>
  `;
}

function panel(accent: string, rows: string): string {
  return `
    <div style="background-color: #f8fafc; border: 1px solid ${accent}; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">${rows}</table>
    </div>
  `;
}

function inr(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function usd(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)} USD`;
}

// ---------------------------------------------------------------------------
// 1. Login / verification OTP
// ---------------------------------------------------------------------------

export function buildOtpEmailHtml(params: {
  code: string;
  purpose: 'login' | 'email_verify' | 'withdrawal_2fa';
  expiryMinutes: number;
  ipAddress?: string;
}): string {
  const purposeCopy = {
    login: 'Use this code to sign in to your account.',
    email_verify: 'Use this code to confirm your email address.',
    withdrawal_2fa: 'Use this code to authorise your withdrawal request.',
  }[params.purpose];

  return shell({
    heading: 'Your verification code',
    accent: '#123f7d',
    deskLabel: 'Account Security',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">${escapeHtml(purposeCopy)}</p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #123f7d; border-radius: 12px; padding: 18px 32px;">
          <span style="font-family: monospace; font-size: 34px; letter-spacing: 10px; color: #123f7d; font-weight: bold;">${escapeHtml(params.code)}</span>
        </div>
      </div>
      <p style="color: #475569; font-size: 13px; line-height: 1.6;">
        This code expires in ${escapeHtml(String(params.expiryMinutes))} minutes and can be used once.
        If you asked for another code, only the newest email will work — this one stops working the
        moment a newer code is sent.
        ${params.ipAddress ? `Requested from IP ${escapeHtml(params.ipAddress)}.` : ''}
      </p>
      <p style="color: #f43f5e; font-size: 13px; line-height: 1.6; font-weight: bold;">
        We will never ask you for this code by phone, WhatsApp or chat. If you did not request it, ignore this email and your account stays secure.
      </p>
    `,
  });
}

// ---------------------------------------------------------------------------
// 2. Welcome / onboarding
// ---------------------------------------------------------------------------

export function buildWelcomeEmailHtml(params: { userName: string; nextStepUrl: string }): string {
  return shell({
    heading: `Welcome aboard, ${params.userName}`,
    accent: '#123f7d',
    deskLabel: 'Client Onboarding',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Your account has been created. Before you can deposit funds or trade, two steps remain:
      </p>
      <ol style="color: #334155; font-size: 14px; line-height: 1.9; padding-left: 20px;">
        <li>Complete <strong>KYC verification</strong> (PAN or Aadhaar).</li>
        <li>Read and accept the <strong>Risk Disclosure</strong> and <strong>Client Agreement</strong>.</li>
      </ol>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtml(params.nextStepUrl)}" style="display: inline-block; background-color: #123f7d; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px; font-size: 14px;">
          Continue onboarding
        </a>
      </div>
      <p style="color: #475569; font-size: 13px; line-height: 1.6;">
        Under India's Digital Personal Data Protection Act 2023 you may withdraw consent, request a copy of your data,
        or ask for correction or erasure at any time from Profile → Privacy &amp; Data.
      </p>
    `,
  });
}

// ---------------------------------------------------------------------------
// 3. New-login security alert
// ---------------------------------------------------------------------------

export function buildLoginAlertEmailHtml(params: {
  userName: string;
  ipAddress: string;
  userAgent: string;
  loginAt: string;
  secureAccountUrl: string;
}): string {
  return shell({
    heading: 'New sign-in to your account',
    accent: '#38bdf8',
    deskLabel: 'Account Security',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>, your account was just accessed.
      </p>
      ${panel('#38bdf8', `
        ${row('Time', params.loginAt)}
        ${row('IP address', params.ipAddress, { mono: true })}
        ${row('Device', params.userAgent.slice(0, 60))}
      `)}
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        If this was you, no action is needed. If it was not:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${escapeHtml(params.secureAccountUrl)}" style="display: inline-block; background-color: #f43f5e; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px; font-size: 14px;">
          Sign out all devices
        </a>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// 4. Deposit approved
// ---------------------------------------------------------------------------

export function buildDepositApprovalEmailHtml(params: {
  userName: string;
  amountINR: number;
  amountUSD: number;
  utrNumber: string;
  newBalanceUSD: number;
}): string {
  return shell({
    heading: 'Deposit approved and wallet credited',
    accent: '#123f7d',
    deskLabel: 'Payments Desk',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>,<br/>
        Your deposit has been verified and credited.
      </p>
      ${panel('#123f7d', `
        ${row('Deposited (INR)', inr(params.amountINR))}
        ${row('Credited (USD)', usd(params.amountUSD), { accent: '#123f7d' })}
        ${row('UTR reference', params.utrNumber, { mono: true })}
        ${row('New balance', usd(params.newBalanceUSD), { accent: '#123f7d' })}
      `)}
    `,
  });
}

// ---------------------------------------------------------------------------
// 5. Withdrawal status
// ---------------------------------------------------------------------------

export function buildWithdrawalStatusEmailHtml(params: {
  userName: string;
  amountUSD: number;
  amountINR: number;
  status: 'completed' | 'rejected';
  bankDetails: string;
  remarks?: string;
}): string {
  const approved = params.status === 'completed';
  const accent = approved ? '#38bdf8' : '#f43f5e';

  return shell({
    heading: approved ? 'Withdrawal processed' : 'Withdrawal declined',
    accent,
    deskLabel: 'Payout Desk',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>,<br/>
        ${approved
          ? 'Your payout has been processed and transferred to your registered bank account.'
          : `Your withdrawal request could not be processed.${params.remarks ? ` Reason: ${escapeHtml(params.remarks)}` : ''} The amount has been returned to your wallet.`}
      </p>
      ${panel(accent, `
        ${row('Requested (USD)', usd(params.amountUSD))}
        ${row('Payout (INR)', inr(params.amountINR), { accent })}
        ${row('Destination', params.bankDetails, { mono: true })}
      `)}
    `,
  });
}

// ---------------------------------------------------------------------------
// 6. KYC status
// ---------------------------------------------------------------------------

export function buildKycStatusEmailHtml(params: {
  userName: string;
  status: 'approved' | 'rejected';
  documentType: string;
  remarks?: string;
}): string {
  const approved = params.status === 'approved';

  return shell({
    heading: approved ? 'KYC verification approved' : 'KYC needs correction',
    accent: approved ? '#123f7d' : '#f43f5e',
    deskLabel: 'Compliance & KYC Desk',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>,<br/>
        ${approved
          ? `Your <strong>${escapeHtml(params.documentType.toUpperCase())}</strong> verification has been approved. Deposits and withdrawals are now enabled.`
          : `Your <strong>${escapeHtml(params.documentType.toUpperCase())}</strong> document needs correction. ${params.remarks ? `Remarks: ${escapeHtml(params.remarks)}` : 'Please re-upload a clear photo.'}`}
      </p>
    `,
  });
}

// ---------------------------------------------------------------------------
// 7. DPDP data-request acknowledgement
// ---------------------------------------------------------------------------

export function buildDataRequestAckEmailHtml(params: {
  userName: string;
  requestType: string;
  referenceId: string;
  dueDate: string;
}): string {
  return shell({
    heading: 'We received your data request',
    accent: '#a78bfa',
    deskLabel: 'Data Protection Office',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>, your request has been logged under the
        Digital Personal Data Protection Act 2023.
      </p>
      ${panel('#a78bfa', `
        ${row('Request type', params.requestType)}
        ${row('Reference', params.referenceId, { mono: true })}
        ${row('Response due by', params.dueDate)}
      `)}
      <p style="color: #475569; font-size: 13px; line-height: 1.6;">
        If you are not satisfied with the outcome, you may escalate to our Grievance Officer at
        ${escapeHtml(GRIEVANCE_EMAIL)}, and thereafter to the Data Protection Board of India.
      </p>
    `,
  });
}

export function buildCustomEmailHtml(params: {
  userName: string;
  title: string;
  paragraphs: string[];
  callToAction?: { text: string; url: string };
}): string {
  return shell({
    heading: params.title,
    accent: '#123f7d',
    deskLabel: 'Platform Services',
    body: `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hello <strong>${escapeHtml(params.userName)}</strong>,<br/>
      </p>
      ${params.paragraphs.map((p) => `<p style="color: #334155; font-size: 14px; line-height: 1.6;">${escapeHtml(p)}</p>`).join('')}
      ${params.callToAction ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(params.callToAction.url)}" style="background-color: #123f7d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ${escapeHtml(params.callToAction.text)}
          </a>
        </div>
      ` : ''}
    `,
  });
}
