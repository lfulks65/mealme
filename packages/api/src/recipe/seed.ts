/**
 * @module recipe/seed
 * Recipe seed script — populates the database with initial recipes.
 *
 * Usage:  pnpm --filter @mealme/api seed:recipes
 *
 * Inserts into all related tables respecting foreign-key order:
 *   1. recipes
 *   2. recipe_ingredients
 *   3. recipe_instructions
 *   4. recipe_tags
 *   5. recipe_dietary_info
 */

import { getSupabaseClient } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface SeedIngredient {
  name: string;
  quantity: string;
  unit: string;
  optional?: boolean;
}

interface SeedInstruction {
  step_number: number;
  instruction: string;
  timer_minutes?: number;
}

interface SeedRecipe {
  title: string;
  description: string;
  cuisine: string;
  image_url?: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  calories?: number;
  ingredients: SeedIngredient[];
  instructions: SeedInstruction[];
  tags: string[];
  dietary_info: { restriction: string; is_compliant: boolean }[];
}

// ── Recipe Data ──────────────────────────────────────────────────────────────
// Sibling tasks: append additional recipe objects to this array.

const recipes: SeedRecipe[] = [
  // ══ Mexican (2) ══════════════════════════════════════════════════════════
  {
    title: 'Tacos al Pastor',
    description: 'Marinated pork tacos with pineapple, cilantro, and onion on corn tortillas.',
    cuisine: 'Mexican',
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 4,
    calories: 380,
    ingredients: [
      { name: 'Pork shoulder', quantity: '1', unit: 'lb' },
      { name: 'Pineapple chunks', quantity: '0.5', unit: 'cup' },
      { name: 'Achiote paste', quantity: '2', unit: 'tbsp' },
      { name: 'Corn tortillas', quantity: '8', unit: 'piece' },
      { name: 'White onion', quantity: '0.5', unit: 'cup' },
      { name: 'Cilantro', quantity: '0.25', unit: 'cup' },
      { name: 'Lime juice', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Marinate sliced pork in achiote paste and lime juice for at least 30 minutes.' },
      { step_number: 2, instruction: 'Grill or pan-sear pork over high heat until charred, about 4 minutes per side.' },
      { step_number: 3, instruction: 'Grill pineapple chunks alongside the pork until caramelized.' },
      { step_number: 4, instruction: 'Warm corn tortillas on a dry skillet.' },
      { step_number: 5, instruction: 'Chop pork into small pieces. Assemble tacos with pork, pineapple, onion, and cilantro.' },
    ],
    tags: ['mexican', 'tacos', 'gluten-free', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Chicken Enchiladas',
    description: 'Corn tortillas rolled around shredded chicken, smothered in red sauce and cheese.',
    cuisine: 'Mexican',
    prep_minutes: 20,
    cook_minutes: 25,
    servings: 6,
    calories: 420,
    ingredients: [
      { name: 'Shredded chicken', quantity: '3', unit: 'cup' },
      { name: 'Corn tortillas', quantity: '12', unit: 'piece' },
      { name: 'Enchilada sauce', quantity: '28', unit: 'oz' },
      { name: 'Monterey Jack cheese', quantity: '2', unit: 'cup' },
      { name: 'Diced onion', quantity: '0.5', unit: 'cup' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Sour cream', quantity: '0.5', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Preheat oven to 375°F. Spread ½ cup sauce on the bottom of a 9×13 dish.' },
      { step_number: 2, instruction: 'Mix chicken, half the cheese, onion, cumin, and ½ cup sauce.' },
      { step_number: 3, instruction: 'Warm tortillas, fill with chicken mixture, roll tightly, and place seam-side down.' },
      { step_number: 4, instruction: 'Pour remaining sauce over enchiladas and top with remaining cheese.' },
      { step_number: 5, instruction: 'Bake 20 minutes until bubbly. Top with sour cream and serve.' },
    ],
    tags: ['mexican', 'baked', 'comfort-food', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },

  // ══ Italian (2) ══════════════════════════════════════════════════════════
  {
    title: 'Pasta Carbonara',
    description: 'Classic Roman pasta with guanciale, egg yolk, Pecorino, and black pepper.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 520,
    ingredients: [
      { name: 'Spaghetti', quantity: '1', unit: 'lb' },
      { name: 'Guanciale', quantity: '6', unit: 'oz' },
      { name: 'Egg yolks', quantity: '4', unit: 'whole' },
      { name: 'Whole egg', quantity: '1', unit: 'whole' },
      { name: 'Pecorino Romano', quantity: '1', unit: 'cup' },
      { name: 'Black pepper', quantity: '2', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Boil spaghetti in well-salted water until al dente.' },
      { step_number: 2, instruction: 'Render guanciale in a cold skillet over medium heat until crispy, about 8 minutes.' },
      { step_number: 3, instruction: 'Whisk egg yolks, whole egg, Pecorino, and pepper in a bowl.' },
      { step_number: 4, instruction: 'Reserve 1 cup pasta water, drain pasta, and add to guanciale skillet (heat OFF).' },
      { step_number: 5, instruction: 'Pour egg mixture over pasta and toss quickly, adding pasta water for a silky sauce.' },
      { step_number: 6, instruction: 'Serve immediately with extra Pecorino and cracked pepper.' },
    ],
    tags: ['italian', 'pasta', 'classic', 'weeknight'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Margherita Pizza',
    description: 'Neapolitan pizza with San Marzano sauce, fresh mozzarella, and basil.',
    cuisine: 'Italian',
    prep_minutes: 20,
    cook_minutes: 12,
    servings: 2,
    calories: 450,
    ingredients: [
      { name: 'Pizza dough', quantity: '1', unit: 'lb' },
      { name: 'San Marzano tomatoes', quantity: '1', unit: 'can' },
      { name: 'Fresh mozzarella', quantity: '8', unit: 'oz' },
      { name: 'Fresh basil', quantity: '10', unit: 'piece' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Preheat oven to 500°F with a pizza stone for 30 minutes.' },
      { step_number: 2, instruction: 'Crush tomatoes by hand and season with salt.' },
      { step_number: 3, instruction: 'Stretch dough into a 12-inch round on a floured surface.' },
      { step_number: 4, instruction: 'Spread sauce, tear mozzarella over top, drizzle with olive oil.' },
      { step_number: 5, instruction: 'Bake 10–12 minutes until crust is charred and cheese is bubbling.' },
      { step_number: 6, instruction: 'Top with fresh basil, slice, and serve.' },
    ],
    tags: ['italian', 'pizza', 'vegetarian', 'classic'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },

  // ══ Asian (2) ════════════════════════════════════════════════════════════
  {
    title: 'Chicken Stir Fry',
    description: 'Wok-fired chicken and vegetables in a savory soy-ginger sauce.',
    cuisine: 'Asian',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 320,
    ingredients: [
      { name: 'Chicken breast', quantity: '1', unit: 'lb' },
      { name: 'Broccoli florets', quantity: '2', unit: 'cup' },
      { name: 'Bell pepper', quantity: '1', unit: 'cup' },
      { name: 'Soy sauce', quantity: '3', unit: 'tbsp' },
      { name: 'Ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Sesame oil', quantity: '1', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Slice chicken and toss with 1 tbsp soy sauce and cornstarch.' },
      { step_number: 2, instruction: 'Heat oil in a wok over high heat. Sear chicken 2 minutes per side; remove.' },
      { step_number: 3, instruction: 'Stir-fry broccoli and bell pepper 3 minutes until crisp-tender.' },
      { step_number: 4, instruction: 'Return chicken, add remaining soy sauce, ginger, garlic, and sesame oil.' },
      { step_number: 5, instruction: 'Toss 1 minute until sauce coats evenly. Serve over rice.' },
    ],
    tags: ['asian', 'stir-fry', 'quick', 'high-protein'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Pad Thai',
    description: 'Thai rice noodles with shrimp, bean sprouts, peanuts, and tamarind sauce.',
    cuisine: 'Asian',
    prep_minutes: 15,
    cook_minutes: 10,
    servings: 4,
    calories: 440,
    ingredients: [
      { name: 'Rice noodles', quantity: '8', unit: 'oz' },
      { name: 'Shrimp', quantity: '0.75', unit: 'lb' },
      { name: 'Tamarind paste', quantity: '3', unit: 'tbsp' },
      { name: 'Fish sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Eggs', quantity: '2', unit: 'whole' },
      { name: 'Bean sprouts', quantity: '1', unit: 'cup' },
      { name: 'Crushed peanuts', quantity: '0.25', unit: 'cup' },
      { name: 'Lime wedges', quantity: '4', unit: 'piece' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Soak rice noodles in hot water 8 minutes until pliable; drain.' },
      { step_number: 2, instruction: 'Mix tamarind paste, fish sauce, and sugar for the sauce.' },
      { step_number: 3, instruction: 'Sear shrimp in a hot wok 2 minutes; push aside. Scramble eggs.' },
      { step_number: 4, instruction: 'Add noodles and sauce; toss vigorously 2 minutes.' },
      { step_number: 5, instruction: 'Add bean sprouts, toss 30 seconds. Plate with peanuts and lime.' },
    ],
    tags: ['asian', 'thai', 'noodles', 'seafood', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },

  // ══ American (2) ══════════════════════════════════════════════════════════
  {
    title: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, and cheese on a toasted bun.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 550,
    ingredients: [
      { name: 'Ground beef 80/20', quantity: '1', unit: 'lb' },
      { name: 'Burger buns', quantity: '4', unit: 'piece' },
      { name: 'Cheddar cheese', quantity: '4', unit: 'slice' },
      { name: 'Lettuce', quantity: '4', unit: 'piece' },
      { name: 'Tomato', quantity: '1', unit: 'whole' },
      { name: 'Onion', quantity: '0.5', unit: 'whole' },
      { name: 'Ketchup', quantity: '2', unit: 'tbsp' },
      { name: 'Salt and pepper', quantity: '1', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Form beef into 4 patties, season with salt and pepper.' },
      { step_number: 2, instruction: 'Grill or sear patties over high heat, 4 minutes per side for medium.' },
      { step_number: 3, instruction: 'Add cheese in the last minute of cooking; cover to melt.' },
      { step_number: 4, instruction: 'Toast buns cut-side down on the grill for 30 seconds.' },
      { step_number: 5, instruction: 'Assemble: bun, lettuce, patty, tomato, onion, ketchup, bun.' },
    ],
    tags: ['american', 'burger', 'grill', 'keto', 'high-protein'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },
  {
    title: 'Mac and Cheese',
    description: 'Creamy baked macaroni with a sharp cheddar cheese sauce and crispy breadcrumb topping.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 25,
    servings: 6,
    calories: 480,
    ingredients: [
      { name: 'Macaroni', quantity: '1', unit: 'lb' },
      { name: 'Cheddar cheese', quantity: '2', unit: 'cup' },
      { name: 'Milk', quantity: '2', unit: 'cup' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Flour', quantity: '3', unit: 'tbsp' },
      { name: 'Breadcrumbs', quantity: '0.5', unit: 'cup' },
      { name: 'Mustard powder', quantity: '1', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cook macaroni until al dente; drain and set aside.' },
      { step_number: 2, instruction: 'Melt butter, whisk in flour and mustard powder; cook 1 minute.' },
      { step_number: 3, instruction: 'Gradually add milk, whisking until thickened, about 5 minutes.' },
      { step_number: 4, instruction: 'Stir in cheddar until melted. Fold in macaroni.' },
      { step_number: 5, instruction: 'Top with breadcrumbs and bake at 375°F for 15 minutes until golden.' },
    ],
    tags: ['american', 'comfort-food', 'baked', 'vegetarian', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
];

// ── Seed Function ───────────────────────────────────────────────────────────

/**
 * Seed all recipes into the database.
 * Inserts into recipes, recipe_ingredients, recipe_instructions,
 * recipe_tags, and recipe_dietary_info in the correct FK order.
 */
export async function seedRecipes(): Promise<void> {
  const sb = getSupabaseClient();

  for (const recipe of recipes) {
    // 1. Insert recipe row
    const { data: recipeRow, error: recipeError } = await sb
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        image_url: recipe.image_url ?? null,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        servings: recipe.servings,
        calories: recipe.calories ?? null,
      })
      .select('id')
      .single();

    if (recipeError) {
      console.error(`Failed to insert recipe "${recipe.title}":`, recipeError.message);
      continue;
    }

    const recipeId: string = recipeRow.id;

    // 2. Insert ingredients
    const ingredientRows = recipe.ingredients.map((ing) => ({
      recipe_id: recipeId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional ?? false,
    }));

    const { error: ingError } = await sb.from('recipe_ingredients').insert(ingredientRows);
    if (ingError) {
      console.error(`  Ingredients error for "${recipe.title}":`, ingError.message);
    }

    // 3. Insert instructions
    const instructionRows = recipe.instructions.map((inst) => ({
      recipe_id: recipeId,
      step_number: inst.step_number,
      instruction: inst.instruction,
      timer_minutes: inst.timer_minutes ?? null,
    }));

    const { error: instError } = await sb.from('recipe_instructions').insert(instructionRows);
    if (instError) {
      console.error(`  Instructions error for "${recipe.title}":`, instError.message);
    }

    // 4. Insert tags
    const tagRows = recipe.tags.map((tag) => ({
      recipe_id: recipeId,
      tag,
    }));

    const { error: tagError } = await sb.from('recipe_tags').insert(tagRows);
    if (tagError) {
      console.error(`  Tags error for "${recipe.title}":`, tagError.message);
    }

    // 5. Insert dietary info
    const dietaryRows = recipe.dietary_info.map((di) => ({
      recipe_id: recipeId,
      restriction: di.restriction,
      is_compliant: di.is_compliant,
    }));

    const { error: dietError } = await sb.from('recipe_dietary_info').insert(dietaryRows);
    if (dietError) {
      console.error(`  Dietary info error for "${recipe.title}":`, dietError.message);
    }

    console.log(`✓ Seeded: ${recipe.title}`);
  }

  console.log(`\nDone. Seeded ${recipes.length} recipes.`);
}

// ── CLI runner ──────────────────────────────────────────────────────────────

/**
 * Run the seed script when executed directly.
 * Usage: npx tsx src/recipe/seed.ts
 */
async function main(): Promise<void> {
  console.log('Seeding recipes...');
  await seedRecipes();
  process.exit(0);
}

// Run if called directly (not imported)
if (typeof require !== 'undefined' && require.main === module) {
  main();
}
