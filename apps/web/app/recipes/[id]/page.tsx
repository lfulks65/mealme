/**
 * @module RecipeDetailPage
 * SSG + ISR page for an individual recipe detail view.
 *
 * Uses generateStaticParams to pre-render popular recipe pages,
 * generateMetadata for dynamic SEO tags, and ISR revalidation
 * to keep pages fresh.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getRecipe, getPopularRecipeIds } from '@/lib/recipe';
import { RecipeDetailClient } from '@/components/recipe/RecipeDetailClient';

// ISR: revalidate every hour
export const revalidate = 3600;

interface RecipeDetailPageProps {
  params: { id: string };
}

/**
 * Pre-render popular recipe detail pages at build time.
 * Other recipes will be rendered on-demand (ISR fallback).
 */
export async function generateStaticParams() {
  const ids = await getPopularRecipeIds(20);
  return ids.map((id) => ({ id }));
}

/**
 * Generate dynamic metadata for SEO and social sharing.
 */
export async function generateMetadata({
  params,
}: RecipeDetailPageProps): Promise<Metadata> {
  const { id } = params;
  const result = await getRecipe(id);

  if (result.error || !result.recipe) {
    return {
      title: 'Recipe Not Found — MealMe',
      description: 'The requested recipe could not be found.',
    };
  }

  const recipe = result.recipe;
  const description =
    recipe.description ??
    `${recipe.title}${recipe.cuisine ? ` — ${recipe.cuisine} cuisine` : ''}. ${recipe.prep_minutes ?? 0 + (recipe.cook_minutes ?? 0)} minutes, ${recipe.servings ?? ''} servings.`;

  return {
    title: `${recipe.title} — MealMe`,
    description,
    openGraph: {
      title: recipe.title,
      description,
      ...(recipe.image_url ? { images: [{ url: recipe.image_url }] } : {}),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.title,
      description,
      ...(recipe.image_url ? { images: [recipe.image_url] } : {}),
    },
  };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = params;
  const result = await getRecipe(id);

  if (result.error || !result.recipe) {
    notFound();
  }

  const recipe = result.recipe;

  return (
    <div>
      {/* Hero image */}
      {recipe.image_url && (
        <div className="relative h-64 w-full overflow-hidden bg-gray-100 sm:h-80 md:h-96">
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {recipe.cuisine && (
              <span className="mb-2 inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur-sm">
                {recipe.cuisine}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recipe detail client component */}
      <RecipeDetailClient recipe={recipe} />
    </div>
  );
}
