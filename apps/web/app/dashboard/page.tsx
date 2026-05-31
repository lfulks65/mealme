/**
 * @module DashboardPage
 * Server Component for the dashboard page.
 *
 * Exports generateMetadata for SEO and renders the
 * interactive DashboardClient component.
 */

import { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — MealMe',
  description: 'Your MealMe dashboard. Manage families, meal plans, and shopping lists.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
