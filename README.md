# 🚀 Apex Trade — Forex & Market Trading Advisory PWA

A high-performance, mobile-first **Progressive Web Application (PWA)** tailored for Forex, Commodities, and Share Market Brokerage & Advisory operations.

Built for **₹0/month operational infrastructure costs** (Vercel + Supabase) with complete **Indian Cyber Law & Regulatory Compliance** (DPDP Act 2023, IT Rules 2021, RBI FEMA Disclaimers, and CERT-In 180-day audit logging).

---

## 📱 Core Features & Workflows

### 1. Client Portal
- **PWA Mobile-First**: Installable directly from mobile Chrome/Safari without App Store or Play Store friction.
- **Passwordless Auth**: Fast 6-digit Email OTP login & registration.
- **Interactive Trading Dashboard**: Clear available capital display with direct **"Add Money"** and **"Withdraw"** actions.
- **Dynamic 3rd-Party Broker Deposit**: Displays designated broker bank accounts, IFSC, UPI ID, and QR codes updated dynamically by the admin. Users submit UTR numbers with screenshot receipts for instant admin verification.
- **Bank & UPI Payouts**: Direct payout request flow to verified Indian bank accounts with automatic balance locking.
- **5-Document KYC Verification**: Multi-choice identity proof selection (Aadhaar Card, PAN Card, Passport, Voter ID, Driving License) with front/back camera photo uploads.
- **Live TradingView Candlestick Charting**: Real-time charts covering Forex (EUR/USD, GBP/USD, USD/INR), Gold (XAU/USD), and Commodities with technical indicators.
- **Advisory Guidance Terminal**: Simulated Buy/Sell execution with lot sizing, Stop Loss, Take Profit, and open positions tracker.

### 2. Super Admin Suite (`/admin`)
- **Payment Approvals Console**: 1-click **"Approve & Credit Balance"** or **"Reject"** for submitted UTRs and screenshot proofs.
- **KYC Review Queue**: Inspect submitted documents side-by-side with 1-click **"Approve KYC"**.
- **Dynamic Broker Settings**: Edit active bank accounts, IFSC, UPI ID, and QR code image URL in real time without redeploying code.
- **Client Registry**: View all registered users, balances, and KYC statuses.
- **CERT-In & DPDP Audit Explorer**: 180-day immutable security log explorer with JSON export.

### 3. Indian Regulatory Compliance
- **DPDP Act 2023**: Unbundled consent logging + `/privacy` Data Principal Rights (1-click JSON export, correction, and account erasure).
- **IT Rules 2021**: Statutory `/grievance` page with designated Grievance Officer details.
- **RBI FEMA Notice**: Persistent risk disclaimers across trading views.

---

## 🛠️ Tech Stack & Zero-Cost Architecture

| Layer | Technology | Plan / Cost |
| :--- | :--- | :--- |
| **Frontend & PWA** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons | Vercel Hobby Tier (₹0/mo) |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security) | Free Tier (500MB DB, ₹0/mo) |
| **Storage (KYC & Receipts)** | Supabase Private Storage / AWS S3 | Free Tier (1GB, ₹0/mo) |
| **Live Charting** | TradingView Advanced Real-Time Chart Widget | Free Public Embed (₹0/mo) |
| **Email Service (OTP)** | Resend / Brevo API | Free Tier (3,000 emails/mo, ₹0/mo) |

---

## 🏁 Getting Started Locally

```bash
# 1. Clone the repository
git clone https://github.com/VeerBhanushali/BrokerApp.git
cd BrokerApp

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000 in your browser
```

---

## 📄 License
Private and Proprietary — Built for Apex Global Trade Advisory.
