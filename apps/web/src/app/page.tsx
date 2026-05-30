import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🍽️ MealMe</h1>
        <p className="text-lg text-gray-600 mb-8">Family meal planning made easy</p>
        <div className="flex flex-col gap-3 items-center">
          <Link
            href="/meal-plan"
            className="px-6 py-3 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-md"
          >
            📅 Meal Plan Calendar
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Plan meals, discover recipes, and order groceries
          </p>
        </div>
      </div>
    </main>
  );
}
