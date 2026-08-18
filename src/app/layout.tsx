import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { ErrorReporter } from '@/components/system/ErrorReporter';
import { ServiceWorkerUpdater } from '@/components/pwa/ServiceWorkerUpdater';
import { AdminProvider } from '@/lib/admin-store';
import { AppLayoutShell } from '@/components/layout/AppLayoutShell';
import { GlobalToastContainer } from '@/components/ui/Toast';
import { SupportChatWidget } from '@/components/support/SupportChatWidget';
import { InstallAppPrompt } from '@/components/pwa/InstallAppPrompt';
import { NetworkStatusDetector } from '@/components/system/NetworkStatusDetector';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Global Forex',
  description: 'Global Forex — forex, commodities and market trading. Markets, transparently.',
  manifest: '/manifest.json',
  appleWebApp: { statusBarStyle: 'default', title: 'Global Forex' },
  other: {
    // The standard replacement for apple-mobile-web-app-capable, which Chrome
    // now warns about. Both are emitted: iOS below 15 still needs the old one.
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/logo-mark.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/logo-mark.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  // maximumScale/userScalable removed: locking zoom blocks users who need to
  // enlarge text, and iOS ignores it anyway.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `light` is the server-rendered default and matches the design's white
    // theme. The store swaps this class from the user's saved preference.
    <html
      lang="en"
      className={`light ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      {/*
        No bg-/text- utilities on body. globals.css styles it from --bg-main and
        --text-main, which switch with the .light / .dark class. A Tailwind
        utility (0,1,0) outranks the bare `body` rule (0,0,1), so hardcoding
        bg-[#f8fafc] here would pin the app to white and make the theme toggle
        do nothing visible.
      */}
      <body className="min-h-screen antialiased">
        <ErrorReporter />
        <ServiceWorkerUpdater />
        <AppProvider>
          <NetworkStatusDetector />
          <GlobalToastContainer />
          <AdminProvider>
            <AppLayoutShell>{children}</AppLayoutShell>
          </AdminProvider>
          <InstallAppPrompt />
        </AppProvider>
      </body>
    </html>
  );
}
