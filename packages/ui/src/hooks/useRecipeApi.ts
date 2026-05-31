import { useState, useCallback, useEffect } from 'react';
import type {
  RecipeFull,
  RecipeSearchFilters,
  RecipeSearchResult,
  RecipeCategory,
  RecipeRecommendation,
} from '@mealme/shared';

// ── Placeholder API functions ─────────────────────────────────────────────────
// In production these would call the @mealme/api package via Supabase.
// For the UI package we use placeholder URLs and mock data so screens
// can be developed and tested independently.

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1551183053-bf91a1d8b439?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
];

const MOCK_RECIPES: RecipeFull[] = [
  {
    id: '1',
    title: 'Mediterranean Quinoa Bowl',
    description: 'A vibrant bowl with quinoa, roasted vegetables, and tahini dressing.',
    cuisine: 'Mediterranean',
    image_url: PLACEHOLDER_IMAGES[0],
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 4,
    calories: 420,
    source_url: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ingredients: [
      { id: 'i1', recipe_id: '1', name: 'Quinoa', quantity: '1', unit: 'cup', optional: false },
      {
        id: 'i2',
        recipe_id: '1',
        name: 'Cherry Tomatoes',
        quantity: '1',
        unit: 'pint',
        optional: false,
      },
      {
        id: 'i3',
        recipe_id: '1',
        name: 'Cucumber',
        quantity: '1',
        unit: 'medium',
        optional: false,
      },
      { id: 'i4', recipe_id: '1', name: 'Feta Cheese', quantity: '2', unit: 'oz', optional: true },
      { id: 'i5', recipe_id: '1', name: 'Tahini', quantity: '2', unit: 'tbsp', optional: false },
    ],
    instructions: [
      {
        id: 's1',
        recipe_id: '1',
        step_number: 1,
        instruction: 'Cook quinoa according to package directions.',
        timer_minutes: 15,
      },
      {
        id: 's2',
        recipe_id: '1',
        step_number: 2,
        instruction: 'Dice cucumber and halve cherry tomatoes.',
        timer_minutes: null,
      },
      {
        id: 's3',
        recipe_id: '1',
        step_number: 3,
        instruction: 'Whisk tahini with lemon juice and water until smooth.',
        timer_minutes: null,
      },
      {
        id: 's4',
        recipe_id: '1',
        step_number: 4,
        instruction: 'Assemble bowls with quinoa base, top with veggies and drizzle with tahini.',
        timer_minutes: null,
      },
    ],
    tags: [
      { id: 't1', recipe_id: '1', tag: 'healthy' },
      { id: 't2', recipe_id: '1', tag: 'quick' },
      { id: 't3', recipe_id: '1', tag: 'vegetarian' },
    ],
    dietary_info: [
      { id: 'd1', recipe_id: '1', restriction: 'vegetarian', is_compliant: true },
      { id: 'd2', recipe_id: '1', restriction: 'vegan', is_compliant: false },
      { id: 'd3', recipe_id: '1', restriction: 'gluten-free', is_compliant: true },
    ],
  },
  {
    id: '2',
    title: 'Spicy Thai Basil Chicken',
    description: 'Aromatic stir-fry with Thai basil, chili, and jasmine rice.',
    cuisine: 'Thai',
    image_url: PLACEHOLDER_IMAGES[1],
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 2,
    calories: 380,
    source_url: null,
    created_by: null,
    created_at: '2026-01-02T00:00:00Z',
    ingredients: [
      {
        id: 'i6',
        recipe_id: '2',
        name: 'Chicken Thigh',
        quantity: '1',
        unit: 'lb',
        optional: false,
      },
      { id: 'i7', recipe_id: '2', name: 'Thai Basil', quantity: '1', unit: 'cup', optional: false },
      {
        id: 'i8',
        recipe_id: '2',
        name: 'Jasmine Rice',
        quantity: '1.5',
        unit: 'cups',
        optional: false,
      },
      {
        id: 'i9',
        recipe_id: '2',
        name: 'Fish Sauce',
        quantity: '2',
        unit: 'tbsp',
        optional: false,
      },
      {
        id: 'i10',
        recipe_id: '2',
        name: 'Thai Chili',
        quantity: '3',
        unit: 'whole',
        optional: true,
      },
    ],
    instructions: [
      {
        id: 's5',
        recipe_id: '2',
        step_number: 1,
        instruction: 'Cook jasmine rice.',
        timer_minutes: 15,
      },
      {
        id: 's6',
        recipe_id: '2',
        step_number: 2,
        instruction: 'Mince chicken and slice chilies.',
        timer_minutes: null,
      },
      {
        id: 's7',
        recipe_id: '2',
        step_number: 3,
        instruction: 'Stir-fry chicken over high heat until browned.',
        timer_minutes: 5,
      },
      {
        id: 's8',
        recipe_id: '2',
        step_number: 4,
        instruction: 'Add garlic, chili, and sauce. Toss in Thai basil and serve over rice.',
        timer_minutes: 2,
      },
    ],
    tags: [
      { id: 't4', recipe_id: '2', tag: 'spicy' },
      { id: 't5', recipe_id: '2', tag: 'quick' },
    ],
    dietary_info: [
      { id: 'd4', recipe_id: '2', restriction: 'vegetarian', is_compliant: false },
      { id: 'd5', recipe_id: '2', restriction: 'dairy-free', is_compliant: true },
    ],
  },
  {
    id: '3',
    title: 'Classic Margherita Pizza',
    description: 'Wood-fired style pizza with fresh mozzarella and basil.',
    cuisine: 'Italian',
    image_url: PLACEHOLDER_IMAGES[2],
    prep_minutes: 20,
    cook_minutes: 12,
    servings: 4,
    calories: 550,
    source_url: null,
    created_by: null,
    created_at: '2026-01-03T00:00:00Z',
    ingredients: [
      {
        id: 'i11',
        recipe_id: '3',
        name: 'Pizza Dough',
        quantity: '1',
        unit: 'ball',
        optional: false,
      },
      {
        id: 'i12',
        recipe_id: '3',
        name: 'San Marzano Tomatoes',
        quantity: '1',
        unit: 'can',
        optional: false,
      },
      {
        id: 'i13',
        recipe_id: '3',
        name: 'Fresh Mozzarella',
        quantity: '8',
        unit: 'oz',
        optional: false,
      },
      {
        id: 'i14',
        recipe_id: '3',
        name: 'Fresh Basil',
        quantity: '10',
        unit: 'leaves',
        optional: false,
      },
    ],
    instructions: [
      {
        id: 's9',
        recipe_id: '3',
        step_number: 1,
        instruction: 'Preheat oven to 500°F with pizza stone.',
        timer_minutes: 30,
      },
      {
        id: 's10',
        recipe_id: '3',
        step_number: 2,
        instruction: 'Stretch dough into a 12-inch round.',
        timer_minutes: null,
      },
      {
        id: 's11',
        recipe_id: '3',
        step_number: 3,
        instruction: 'Spread crushed tomatoes, add torn mozzarella.',
        timer_minutes: null,
      },
      {
        id: 's12',
        recipe_id: '3',
        step_number: 4,
        instruction: 'Bake until crust is golden and cheese is bubbly.',
        timer_minutes: 12,
      },
      {
        id: 's13',
        recipe_id: '3',
        step_number: 5,
        instruction: 'Top with fresh basil, slice and serve.',
        timer_minutes: null,
      },
    ],
    tags: [
      { id: 't6', recipe_id: '3', tag: 'comfort' },
      { id: 't7', recipe_id: '3', tag: 'family' },
    ],
    dietary_info: [{ id: 'd6', recipe_id: '3', restriction: 'vegetarian', is_compliant: true }],
  },
  {
    id: '4',
    title: 'Avocado Toast with Poached Egg',
    description: 'Creamy avocado on sourdough topped with a perfectly poached egg.',
    cuisine: 'American',
    image_url: PLACEHOLDER_IMAGES[3],
    prep_minutes: 5,
    cook_minutes: 5,
    servings: 1,
    calories: 310,
    source_url: null,
    created_by: null,
    created_at: '2026-01-04T00:00:00Z',
    ingredients: [
      {
        id: 'i15',
        recipe_id: '4',
        name: 'Sourdough Bread',
        quantity: '2',
        unit: 'slices',
        optional: false,
      },
      { id: 'i16', recipe_id: '4', name: 'Avocado', quantity: '1', unit: 'whole', optional: false },
      { id: 'i17', recipe_id: '4', name: 'Egg', quantity: '1', unit: 'large', optional: false },
      {
        id: 'i18',
        recipe_id: '4',
        name: 'Red Pepper Flakes',
        quantity: '1',
        unit: 'pinch',
        optional: true,
      },
    ],
    instructions: [
      {
        id: 's14',
        recipe_id: '4',
        step_number: 1,
        instruction: 'Toast sourdough slices until golden.',
        timer_minutes: 3,
      },
      {
        id: 's15',
        recipe_id: '4',
        step_number: 2,
        instruction: 'Mash avocado and spread on toast.',
        timer_minutes: null,
      },
      {
        id: 's16',
        recipe_id: '4',
        step_number: 3,
        instruction: 'Poach egg in simmering water.',
        timer_minutes: 4,
      },
      {
        id: 's17',
        recipe_id: '4',
        step_number: 4,
        instruction: 'Place egg on toast, season with pepper flakes.',
        timer_minutes: null,
      },
    ],
    tags: [
      { id: 't8', recipe_id: '4', tag: 'quick' },
      { id: 't9', recipe_id: '4', tag: 'breakfast' },
    ],
    dietary_info: [{ id: 'd7', recipe_id: '4', restriction: 'vegetarian', is_compliant: true }],
  },
  {
    id: '5',
    title: 'Japanese Miso Ramen',
    description: 'Rich miso broth with chashu pork, soft-boiled egg, and noodles.',
    cuisine: 'Japanese',
    image_url: PLACEHOLDER_IMAGES[4],
    prep_minutes: 15,
    cook_minutes: 45,
    servings: 2,
    calories: 620,
    source_url: null,
    created_by: null,
    created_at: '2026-01-05T00:00:00Z',
    ingredients: [
      {
        id: 'i19',
        recipe_id: '5',
        name: 'Ramen Noodles',
        quantity: '8',
        unit: 'oz',
        optional: false,
      },
      {
        id: 'i20',
        recipe_id: '5',
        name: 'Miso Paste',
        quantity: '3',
        unit: 'tbsp',
        optional: false,
      },
      { id: 'i21', recipe_id: '5', name: 'Pork Belly', quantity: '8', unit: 'oz', optional: false },
      {
        id: 'i22',
        recipe_id: '5',
        name: 'Soft-Boiled Egg',
        quantity: '2',
        unit: 'whole',
        optional: false,
      },
      {
        id: 'i23',
        recipe_id: '5',
        name: 'Green Onion',
        quantity: '2',
        unit: 'stalks',
        optional: false,
      },
    ],
    instructions: [
      {
        id: 's18',
        recipe_id: '5',
        step_number: 1,
        instruction: 'Braise pork belly in soy sauce and mirin.',
        timer_minutes: 30,
      },
      {
        id: 's19',
        recipe_id: '5',
        step_number: 2,
        instruction: 'Prepare soft-boiled eggs (6.5 minutes).',
        timer_minutes: 7,
      },
      {
        id: 's20',
        recipe_id: '5',
        step_number: 3,
        instruction: 'Bring dashi stock to a simmer, whisk in miso paste.',
        timer_minutes: 5,
      },
      {
        id: 's21',
        recipe_id: '5',
        step_number: 4,
        instruction: 'Cook ramen noodles according to package.',
        timer_minutes: 3,
      },
      {
        id: 's22',
        recipe_id: '5',
        step_number: 5,
        instruction: 'Assemble: noodles, broth, sliced chashu, halved egg, sliced green onion.',
        timer_minutes: null,
      },
    ],
    tags: [
      { id: 't10', recipe_id: '5', tag: 'comfort' },
      { id: 't11', recipe_id: '5', tag: 'soup' },
    ],
    dietary_info: [{ id: 'd8', recipe_id: '5', restriction: 'dairy-free', is_compliant: true }],
  },
  {
    id: '6',
    title: 'Mexican Street Corn Salad',
    description: 'Elote-inspired salad with charred corn, lime, and cotija cheese.',
    cuisine: 'Mexican',
    image_url: PLACEHOLDER_IMAGES[5],
    prep_minutes: 10,
    cook_minutes: 8,
    servings: 4,
    calories: 210,
    source_url: null,
    created_by: null,
    created_at: '2026-01-06T00:00:00Z',
    ingredients: [
      {
        id: 'i24',
        recipe_id: '6',
        name: 'Corn Kernels',
        quantity: '4',
        unit: 'cups',
        optional: false,
      },
      {
        id: 'i25',
        recipe_id: '6',
        name: 'Cotija Cheese',
        quantity: '3',
        unit: 'oz',
        optional: false,
      },
      { id: 'i26', recipe_id: '6', name: 'Lime', quantity: '2', unit: 'whole', optional: false },
      {
        id: 'i27',
        recipe_id: '6',
        name: 'Mayonnaise',
        quantity: '2',
        unit: 'tbsp',
        optional: false,
      },
      {
        id: 'i28',
        recipe_id: '6',
        name: 'Chili Powder',
        quantity: '1',
        unit: 'tsp',
        optional: true,
      },
    ],
    instructions: [
      {
        id: 's23',
        recipe_id: '6',
        step_number: 1,
        instruction: 'Char corn kernels in a hot skillet.',
        timer_minutes: 8,
      },
      {
        id: 's24',
        recipe_id: '6',
        step_number: 2,
        instruction: 'Mix mayo, lime juice, and chili powder.',
        timer_minutes: null,
      },
      {
        id: 's25',
        recipe_id: '6',
        step_number: 3,
        instruction: 'Toss charred corn with dressing and crumbled cotija.',
        timer_minutes: null,
      },
    ],
    tags: [
      { id: 't12', recipe_id: '6', tag: 'quick' },
      { id: 't13', recipe_id: '6', tag: 'side' },
    ],
    dietary_info: [
      { id: 'd9', recipe_id: '6', restriction: 'vegetarian', is_compliant: true },
      { id: 'd10', recipe_id: '6', restriction: 'gluten-free', is_compliant: true },
    ],
  },
];

const MOCK_CATEGORIES: RecipeCategory[] = [
  { cuisine: 'Mediterranean', count: 24 },
  { cuisine: 'Italian', count: 18 },
  { cuisine: 'Thai', count: 12 },
  { cuisine: 'Japanese', count: 15 },
  { cuisine: 'Mexican', count: 20 },
  { cuisine: 'American', count: 30 },
  { cuisine: 'Indian', count: 16 },
  { cuisine: 'Korean', count: 10 },
];

// ── Search Hook ──────────────────────────────────────────────────────────────

export function useRecipeSearch() {
  const [results, setResults] = useState<RecipeSearchResult>({
    recipes: [],
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query?: string, filters?: RecipeSearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API delay
      await new Promise((r) => setTimeout(r, 300));

      let filtered = [...MOCK_RECIPES];

      // Text search
      if (query && query.trim().length > 0) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q) ||
            r.cuisine?.toLowerCase().includes(q) ||
            r.tags.some((t) => t.tag.toLowerCase().includes(q)),
        );
      }

      // Cuisine filter
      if (filters?.cuisine) {
        filtered = filtered.filter(
          (r) => r.cuisine?.toLowerCase() === filters.cuisine!.toLowerCase(),
        );
      }

      // Max prep time
      if (filters?.max_prep_minutes !== undefined) {
        filtered = filtered.filter(
          (r) => r.prep_minutes !== null && r.prep_minutes <= filters.max_prep_minutes!,
        );
      }

      // Max total time
      if (filters?.max_total_minutes !== undefined) {
        filtered = filtered.filter(
          (r) =>
            r.prep_minutes !== null &&
            r.cook_minutes !== null &&
            r.prep_minutes + r.cook_minutes <= filters.max_total_minutes!,
        );
      }

      // Max calories
      if (filters?.max_calories !== undefined) {
        filtered = filtered.filter(
          (r) => r.calories !== null && r.calories <= filters.max_calories!,
        );
      }

      // Dietary restrictions
      if (filters?.dietary_restrictions && filters.dietary_restrictions.length > 0) {
        filtered = filtered.filter((recipe) =>
          filters.dietary_restrictions!.every((restriction) =>
            recipe.dietary_info.some((di) => di.restriction === restriction && di.is_compliant),
          ),
        );
      }

      // Tags
      if (filters?.tags && filters.tags.length > 0) {
        filtered = filtered.filter((recipe) =>
          filters.tags!.every((tag) =>
            recipe.tags.some((t) => t.tag.toLowerCase() === tag.toLowerCase()),
          ),
        );
      }

      setResults({
        recipes: filtered,
        total: filtered.length,
        limit: 20,
        offset: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// ── Recipe Detail Hook ───────────────────────────────────────────────────────

export function useRecipeDetail(recipeId: string | null) {
  const [recipe, setRecipe] = useState<RecipeFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipe = useCallback(async () => {
    if (!recipeId) return;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 200));
      const found = MOCK_RECIPES.find((r) => r.id === recipeId) ?? null;
      setRecipe(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  return { recipe, loading, error, refetch: fetchRecipe };
}

// ── Categories Hook ───────────────────────────────────────────────────────────

export function useRecipeCategories() {
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      setCategories(MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}

// ── Recommendations Hook ─────────────────────────────────────────────────────

export function useRecipeRecommendations() {
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      // Generate mock recommendations from all recipes
      const recs: RecipeRecommendation[] = MOCK_RECIPES.map((recipe) => ({
        recipe,
        score: Math.random() * 0.5 + 0.5, // 0.5 – 1.0
        reasons: [`${recipe.cuisine ?? 'Popular'} cuisine match`],
      }));
      setRecommendations(recs.sort((a, b) => b.score - a.score));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, refetch: fetchRecommendations };
}

// ── Quick Meals Hook ─────────────────────────────────────────────────────────

export function useQuickMeals() {
  const [recipes, setRecipes] = useState<RecipeFull[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuickMeals = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      // Quick meals = prep + cook ≤ 30 min
      const quick = MOCK_RECIPES.filter((r) => {
        const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
        return total <= 30;
      });
      setRecipes(quick);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickMeals();
  }, [fetchQuickMeals]);

  return { recipes, loading, refetch: fetchQuickMeals };
}

// ── Category Recipes Hook ────────────────────────────────────────────────────

export function useCategoryRecipes(category: string | null) {
  const [recipes, setRecipes] = useState<RecipeFull[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategoryRecipes = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      const filtered = MOCK_RECIPES.filter(
        (r) => r.cuisine?.toLowerCase() === category.toLowerCase(),
      );
      setRecipes(filtered);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchCategoryRecipes();
  }, [fetchCategoryRecipes]);

  return { recipes, loading, refetch: fetchCategoryRecipes };
}
