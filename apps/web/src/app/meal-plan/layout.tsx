/**
 * Meal plan layout — forces dynamic rendering since pages
 * depend on Supabase at runtime.
 */

export const dynamic = 'force-dynamic';

export default function MealPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
