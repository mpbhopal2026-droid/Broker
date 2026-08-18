import { redirect } from 'next/navigation';

/**
 * Everything is behind sign-in, so the root goes straight to the login page.
 *
 * The previous marketing landing page has been removed: it advertised
 * "1-minute wallet credit", a leverage profit calculator and a Super Admin
 * console to the open internet, none of which should be public — and the
 * calculator projected returns the platform cannot deliver.
 */
export default function RootPage() {
  redirect('/login');
}
