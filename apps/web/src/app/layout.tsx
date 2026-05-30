import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MealMe - Family Meal Planning',
  description: 'Plan meals, discover recipes, and order groceries from HEB',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
