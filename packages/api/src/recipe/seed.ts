/**
 * @module recipe/seed
 * Recipe seed script — populates the database with initial recipes.
 *
 * Usage:  pnpm --filter @mealme/api seed:recipes
 *
 * Inserts into all related tables respecting foreign-key order:
 *   1. recipes
 *   2. recipe_ingredients
 *   3. recipe_steps
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

interface SeedStep {
  step_number: number;
  instruction: string;
  timer_minutes?: number;
}

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
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
  steps: SeedStep[];
  tags: string[];
  dietary_info: { restriction: string; is_compliant: boolean }[];
  nutrition: NutritionData;
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
    steps: [
      {
        step_number: 1,
        instruction:
          'Marinate sliced pork in achiote paste and lime juice for at least 30 minutes.',
      },
      {
        step_number: 2,
        instruction:
          'Grill or pan-sear pork over high heat until charred, about 4 minutes per side.',
      },
      {
        step_number: 3,
        instruction: 'Grill pineapple chunks alongside the pork until caramelized.',
      },
      { step_number: 4, instruction: 'Warm corn tortillas on a dry skillet.' },
      {
        step_number: 5,
        instruction:
          'Chop pork into small pieces. Assemble tacos with pork, pineapple, onion, and cilantro.',
      },
    ],
    tags: ['mexican', 'tacos', 'gluten-free', 'dairy-free', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
    nutrition: {
      calories: 380,
      protein_g: 28,
      carbs_g: 32,
      fat_g: 16,
      fiber_g: 4,
      sugar_g: 5,
      sodium_mg: 520,
    },
  },
  {
    title: 'Chicken Enchiladas',
    description:
      'Corn tortillas rolled around shredded chicken, smothered in red sauce and cheese.',
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
    steps: [
      {
        step_number: 1,
        instruction: 'Preheat oven to 375°F. Spread ½ cup sauce on the bottom of a 9×13 dish.',
      },
      {
        step_number: 2,
        instruction: 'Mix chicken, half the cheese, onion, cumin, and ½ cup sauce.',
      },
      {
        step_number: 3,
        instruction:
          'Warm tortillas, fill with chicken mixture, roll tightly, and place seam-side down.',
      },
      {
        step_number: 4,
        instruction: 'Pour remaining sauce over enchiladas and top with remaining cheese.',
      },
      {
        step_number: 5,
        instruction: 'Bake 20 minutes until bubbly. Top with sour cream and serve.',
      },
    ],
    tags: ['mexican', 'baked', 'comfort-food', 'family-friendly', 'gluten-free'],
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
    steps: [
      { step_number: 1, instruction: 'Boil spaghetti in well-salted water until al dente.' },
      {
        step_number: 2,
        instruction:
          'Render guanciale in a cold skillet over medium heat until crispy, about 8 minutes.',
      },
      {
        step_number: 3,
        instruction: 'Whisk egg yolks, whole egg, Pecorino, and pepper in a bowl.',
      },
      {
        step_number: 4,
        instruction:
          'Reserve 1 cup pasta water, drain pasta, and add to guanciale skillet (heat OFF).',
      },
      {
        step_number: 5,
        instruction:
          'Pour egg mixture over pasta and toss quickly, adding pasta water for a silky sauce.',
      },
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
    steps: [
      { step_number: 1, instruction: 'Preheat oven to 500°F with a pizza stone for 30 minutes.' },
      { step_number: 2, instruction: 'Crush tomatoes by hand and season with salt.' },
      { step_number: 3, instruction: 'Stretch dough into a 12-inch round on a floured surface.' },
      {
        step_number: 4,
        instruction: 'Spread sauce, tear mozzarella over top, drizzle with olive oil.',
      },
      {
        step_number: 5,
        instruction: 'Bake 10–12 minutes until crust is charred and cheese is bubbling.',
      },
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
    steps: [
      {
        step_number: 1,
        instruction: 'Slice chicken and toss with 1 tbsp soy sauce and cornstarch.',
      },
      {
        step_number: 2,
        instruction: 'Heat oil in a wok over high heat. Sear chicken 2 minutes per side; remove.',
      },
      {
        step_number: 3,
        instruction: 'Stir-fry broccoli and bell pepper 3 minutes until crisp-tender.',
      },
      {
        step_number: 4,
        instruction: 'Return chicken, add remaining soy sauce, ginger, garlic, and sesame oil.',
      },
      { step_number: 5, instruction: 'Toss 1 minute until sauce coats evenly. Serve over rice.' },
    ],
    tags: ['asian', 'stir-fry', 'dairy-free', 'quick', 'high-protein'],
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
    steps: [
      {
        step_number: 1,
        instruction: 'Soak rice noodles in hot water 8 minutes until pliable; drain.',
      },
      { step_number: 2, instruction: 'Mix tamarind paste, fish sauce, and sugar for the sauce.' },
      {
        step_number: 3,
        instruction: 'Sear shrimp in a hot wok 2 minutes; push aside. Scramble eggs.',
      },
      { step_number: 4, instruction: 'Add noodles and sauce; toss vigorously 2 minutes.' },
      {
        step_number: 5,
        instruction: 'Add bean sprouts, toss 30 seconds. Plate with peanuts and lime.',
      },
    ],
    tags: ['asian', 'thai', 'noodles', 'seafood', 'gluten-free', 'dairy-free'],
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
    steps: [
      { step_number: 1, instruction: 'Form beef into 4 patties, season with salt and pepper.' },
      {
        step_number: 2,
        instruction: 'Grill or sear patties over high heat, 4 minutes per side for medium.',
      },
      { step_number: 3, instruction: 'Add cheese in the last minute of cooking; cover to melt.' },
      { step_number: 4, instruction: 'Toast buns cut-side down on the grill for 30 seconds.' },
      {
        step_number: 5,
        instruction: 'Assemble: bun, lettuce, patty, tomato, onion, ketchup, bun.',
      },
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
    description:
      'Creamy baked macaroni with a sharp cheddar cheese sauce and crispy breadcrumb topping.',
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
    steps: [
      { step_number: 1, instruction: 'Cook macaroni until al dente; drain and set aside.' },
      {
        step_number: 2,
        instruction: 'Melt butter, whisk in flour and mustard powder; cook 1 minute.',
      },
      {
        step_number: 3,
        instruction: 'Gradually add milk, whisking until thickened, about 5 minutes.',
      },
      { step_number: 4, instruction: 'Stir in cheddar until melted. Fold in macaroni.' },
      {
        step_number: 5,
        instruction: 'Top with breadcrumbs and bake at 375°F for 15 minutes until golden.',
      },
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

  // ══ Batch 5: More Variety (10 recipes) ═══════════════════════════════════

  // ── More Asian (2) ──────────────────────────────────────────────────────
  {
    title: 'Sushi Bowl',
    description:
      'Deconstructed sushi with seasoned rice, raw fish, avocado, cucumber, and nori — all the flavors without the rolling.',
    cuisine: 'Asian',
    prep_minutes: 20,
    cook_minutes: 15,
    servings: 4,
    calories: 390,
    ingredients: [
      { name: 'Sushi-grade tuna', quantity: '0.75', unit: 'lb' },
      { name: 'Sushi rice', quantity: '2', unit: 'cup' },
      { name: 'Rice vinegar', quantity: '3', unit: 'tbsp' },
      { name: 'Avocado', quantity: '1', unit: 'whole' },
      { name: 'Cucumber', quantity: '1', unit: 'whole' },
      { name: 'Nori sheets', quantity: '4', unit: 'piece' },
      { name: 'Tamari', quantity: '2', unit: 'tbsp' },
      { name: 'Sesame seeds', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Cook sushi rice and season with rice vinegar, sugar, and salt while still warm.',
      },
      {
        step_number: 2,
        instruction: 'Dice sushi-grade tuna into half-inch cubes; toss lightly with tamari.',
      },
      { step_number: 3, instruction: 'Slice avocado and cucumber into thin pieces.' },
      { step_number: 4, instruction: 'Cut nori sheets into thin strips with scissors.' },
      {
        step_number: 5,
        instruction: 'Divide rice among bowls and arrange tuna, avocado, and cucumber on top.',
      },
      {
        step_number: 6,
        instruction: 'Garnish with nori strips, sesame seeds, and extra tamari on the side.',
      },
    ],
    tags: ['asian', 'japanese', 'bowl', 'gluten-free', 'dairy-free', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Thai Green Curry',
    description:
      'Aromatic coconut curry with chicken, Thai eggplant, and fresh basil in green curry paste.',
    cuisine: 'Asian',
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 4,
    calories: 410,
    ingredients: [
      { name: 'Chicken thighs', quantity: '1', unit: 'lb' },
      { name: 'Green curry paste', quantity: '3', unit: 'tbsp' },
      { name: 'Coconut milk', quantity: '14', unit: 'oz' },
      { name: 'Thai eggplant', quantity: '1', unit: 'cup' },
      { name: 'Bamboo shoots', quantity: '0.5', unit: 'cup' },
      { name: 'Fish sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Thai basil', quantity: '0.5', unit: 'cup' },
      { name: 'Jasmine rice', quantity: '2', unit: 'cup' },
    ],
    steps: [
      { step_number: 1, instruction: 'Slice chicken into bite-sized pieces.' },
      {
        step_number: 2,
        instruction:
          'Fry green curry paste in a splash of coconut cream over medium heat until fragrant, about 2 minutes.',
      },
      {
        step_number: 3,
        instruction: 'Add chicken and stir to coat; cook 3 minutes until sealed on all sides.',
      },
      {
        step_number: 4,
        instruction:
          'Pour in remaining coconut milk, Thai eggplant, and bamboo shoots. Simmer 15 minutes.',
      },
      { step_number: 5, instruction: 'Season with fish sauce. Stir in Thai basil off the heat.' },
      { step_number: 6, instruction: 'Serve over steamed jasmine rice.' },
    ],
    tags: ['asian', 'thai', 'curry', 'dairy-free', 'gluten-free', 'spicy'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── More Mexican (2) ────────────────────────────────────────────────────
  {
    title: 'Guacamole',
    description:
      'Fresh and chunky avocado dip with lime, cilantro, jalapeño, and tomato — the ultimate whole30 snack.',
    cuisine: 'Mexican',
    prep_minutes: 10,
    cook_minutes: 0,
    servings: 6,
    calories: 120,
    ingredients: [
      { name: 'Ripe avocados', quantity: '3', unit: 'whole' },
      { name: 'Lime juice', quantity: '2', unit: 'tbsp' },
      { name: 'Cilantro', quantity: '0.25', unit: 'cup' },
      { name: 'Jalapeño', quantity: '1', unit: 'whole' },
      { name: 'Roma tomato', quantity: '1', unit: 'whole' },
      { name: 'White onion', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      { step_number: 1, instruction: 'Halve avocados, remove pits, and scoop flesh into a bowl.' },
      { step_number: 2, instruction: 'Mash with a fork to desired chunkiness.' },
      { step_number: 3, instruction: 'Dice tomato, finely mince jalapeño and onion; add to bowl.' },
      { step_number: 4, instruction: 'Stir in lime juice, chopped cilantro, and salt.' },
      {
        step_number: 5,
        instruction: 'Taste and adjust seasoning. Serve immediately with chips or veggie sticks.',
      },
    ],
    tags: [
      'mexican',
      'dip',
      'whole30',
      'vegan',
      'vegetarian',
      'gluten-free',
      'dairy-free',
      'no-cook',
      'keto',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Pozole Rojo',
    description:
      'Hearty Mexican stew with tender pork, hominy, and dried chile broth — topped with cabbage and radish.',
    cuisine: 'Mexican',
    prep_minutes: 20,
    cook_minutes: 60,
    servings: 6,
    calories: 380,
    ingredients: [
      { name: 'Pork shoulder', quantity: '1.5', unit: 'lb' },
      { name: 'Hominy', quantity: '30', unit: 'oz' },
      { name: 'Guajillo chiles', quantity: '4', unit: 'whole' },
      { name: 'Ancho chiles', quantity: '2', unit: 'whole' },
      { name: 'White onion', quantity: '1', unit: 'whole' },
      { name: 'Garlic', quantity: '4', unit: 'clove' },
      { name: 'Oregano', quantity: '1', unit: 'tsp' },
      { name: 'Radishes', quantity: '6', unit: 'whole' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Toast guajillo and ancho chiles in a dry pan; soak in hot water 20 minutes.',
      },
      {
        step_number: 2,
        instruction: 'Blend rehydrated chiles with onion, garlic, and oregano into a smooth sauce.',
      },
      {
        step_number: 3,
        instruction: 'Brown cubed pork shoulder in a large pot; drain excess fat.',
      },
      {
        step_number: 4,
        instruction:
          'Add chile sauce, hominy, and enough water to cover. Bring to a boil, then simmer 45 minutes.',
      },
      {
        step_number: 5,
        instruction:
          'Season with salt. Ladle into bowls and serve with sliced radishes, shredded cabbage, and lime.',
      },
    ],
    tags: ['mexican', 'stew', 'gluten-free', 'dairy-free', 'whole30', 'comfort-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ── More Italian (2) ────────────────────────────────────────────────────
  {
    title: 'Mushroom Risotto',
    description:
      'Creamy arborio rice slowly stirred with mixed mushrooms, white wine, and Parmesan.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 30,
    servings: 4,
    calories: 420,
    ingredients: [
      { name: 'Arborio rice', quantity: '1.5', unit: 'cup' },
      { name: 'Mixed mushrooms', quantity: '12', unit: 'oz' },
      { name: 'Vegetable broth', quantity: '5', unit: 'cup' },
      { name: 'White wine', quantity: '0.5', unit: 'cup' },
      { name: 'Parmesan cheese', quantity: '0.75', unit: 'cup' },
      { name: 'Shallot', quantity: '1', unit: 'whole' },
      { name: 'Butter', quantity: '2', unit: 'tbsp' },
      { name: 'Thyme', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      { step_number: 1, instruction: 'Warm broth in a saucepan; keep at a low simmer.' },
      {
        step_number: 2,
        instruction: 'Sauté sliced mushrooms in butter until golden, about 5 minutes; set aside.',
      },
      {
        step_number: 3,
        instruction: 'Cook diced shallot until translucent. Add arborio rice and toast 2 minutes.',
      },
      { step_number: 4, instruction: 'Deglaze with white wine, stirring until absorbed.' },
      {
        step_number: 5,
        instruction:
          'Add warm broth one ladle at a time, stirring often, for about 20 minutes until rice is creamy.',
      },
      {
        step_number: 6,
        instruction: 'Fold in mushrooms, Parmesan, and thyme. Season and serve immediately.',
      },
    ],
    tags: ['italian', 'risotto', 'vegetarian', 'gluten-free', 'comfort-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Bruschetta al Pomodoro',
    description:
      'Crispy toasted bread topped with fresh tomatoes, garlic, basil, and a drizzle of extra-virgin olive oil.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 5,
    servings: 6,
    calories: 180,
    ingredients: [
      { name: 'Ciabatta bread', quantity: '1', unit: 'loaf' },
      { name: 'Roma tomatoes', quantity: '4', unit: 'whole' },
      { name: 'Fresh basil', quantity: '0.25', unit: 'cup' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Extra-virgin olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'Balsamic vinegar', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Dice tomatoes and toss with chopped basil, balsamic vinegar, salt, and 1 tbsp olive oil.',
      },
      { step_number: 2, instruction: 'Slice ciabatta into half-inch thick pieces.' },
      {
        step_number: 3,
        instruction:
          'Brush bread with olive oil and toast under a broiler or on a grill until golden, about 2 minutes per side.',
      },
      { step_number: 4, instruction: 'Rub cut garlic clove across the warm toast surface.' },
      {
        step_number: 5,
        instruction:
          'Spoon tomato mixture onto each toast and drizzle with remaining olive oil. Serve immediately.',
      },
    ],
    tags: ['italian', 'appetizer', 'vegetarian', 'vegan', 'dairy-free', 'quick', 'no-cook-topping'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── American Comfort (2) ────────────────────────────────────────────────
  {
    title: 'Southern Fried Chicken',
    description:
      'Buttermilk-brined chicken dredged in seasoned flour and fried to golden, crispy perfection.',
    cuisine: 'American',
    prep_minutes: 20,
    cook_minutes: 25,
    servings: 4,
    calories: 580,
    ingredients: [
      { name: 'Chicken pieces', quantity: '3', unit: 'lb' },
      { name: 'Buttermilk', quantity: '2', unit: 'cup' },
      { name: 'All-purpose flour', quantity: '2', unit: 'cup' },
      { name: 'Paprika', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Cayenne pepper', quantity: '0.5', unit: 'tsp' },
      { name: 'Vegetable oil', quantity: '3', unit: 'cup' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Soak chicken pieces in buttermilk with 1 tsp salt for at least 2 hours (overnight is best).',
      },
      {
        step_number: 2,
        instruction: 'Mix flour, paprika, garlic powder, cayenne, and salt in a shallow dish.',
      },
      {
        step_number: 3,
        instruction:
          'Remove chicken from buttermilk; dredge in seasoned flour, pressing firmly to coat.',
      },
      {
        step_number: 4,
        instruction:
          'Heat oil to 350°F in a heavy skillet. Fry chicken 6–8 minutes per side until deep golden and cooked through.',
      },
      {
        step_number: 5,
        instruction: 'Drain on a wire rack set over a sheet pan. Rest 5 minutes before serving.',
      },
    ],
    tags: ['american', 'fried', 'comfort-food', 'family-friendly', 'southern'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'New England Clam Chowder',
    description:
      'Thick and creamy chowder loaded with tender clams, potatoes, and bacon in a rich cream base.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 30,
    servings: 6,
    calories: 350,
    ingredients: [
      { name: 'Clams', quantity: '2', unit: 'can' },
      { name: 'Bacon', quantity: '4', unit: 'slice' },
      { name: 'Yukon gold potatoes', quantity: '1.5', unit: 'lb' },
      { name: 'Heavy cream', quantity: '2', unit: 'cup' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Butter', quantity: '2', unit: 'tbsp' },
      { name: 'Thyme', quantity: '1', unit: 'tsp' },
      { name: 'Bay leaf', quantity: '1', unit: 'piece' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Cook chopped bacon in a large pot until crispy; remove and set aside.',
      },
      {
        step_number: 2,
        instruction: 'Sauté diced onion in bacon drippings and butter until soft, about 5 minutes.',
      },
      {
        step_number: 3,
        instruction:
          'Add diced potatoes, clam juice from cans, thyme, and bay leaf. Simmer 15 minutes until potatoes are tender.',
      },
      {
        step_number: 4,
        instruction:
          'Stir in heavy cream and chopped clams; heat through gently for 5 minutes (do not boil).',
      },
      {
        step_number: 5,
        instruction:
          'Discard bay leaf. Season with salt and pepper. Top with crumbled bacon and serve with oyster crackers.',
      },
    ],
    tags: ['american', 'soup', 'comfort-food', 'seafood', 'new-england', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── Snacks / Appetizers (3) ─────────────────────────────────────────────
  {
    title: 'Stuffed Mushrooms',
    description:
      'Savory mushroom caps filled with sausage, garlic, and herbs — a crowd-pleasing whole30 appetizer.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 6,
    calories: 160,
    ingredients: [
      { name: 'Cremini mushrooms', quantity: '24', unit: 'whole' },
      { name: 'Italian sausage', quantity: '0.5', unit: 'lb' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
      { name: 'Onion', quantity: '0.5', unit: 'whole' },
      { name: 'Almond flour', quantity: '0.25', unit: 'cup' },
      { name: 'Parsley', quantity: '2', unit: 'tbsp' },
      { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Preheat oven to 375°F. Remove mushroom stems and hollow caps slightly; chop stems finely.',
      },
      {
        step_number: 2,
        instruction:
          'Brown sausage in a skillet, breaking it up. Add chopped stems, diced onion, and garlic; cook 5 minutes.',
      },
      { step_number: 3, instruction: 'Remove from heat and stir in almond flour and parsley.' },
      {
        step_number: 4,
        instruction: 'Fill each mushroom cap with the sausage mixture, pressing gently.',
      },
      {
        step_number: 5,
        instruction:
          'Place on a parchment-lined sheet pan, drizzle with olive oil, and bake 18–20 minutes until mushrooms are tender.',
      },
    ],
    tags: ['american', 'appetizer', 'whole30', 'gluten-free', 'dairy-free', 'keto', 'party-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Deviled Eggs',
    description:
      'Classic hard-boiled eggs with a creamy, tangy yolk filling and a dash of paprika — the timeless appetizer.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 12,
    servings: 6,
    calories: 130,
    ingredients: [
      { name: 'Eggs', quantity: '12', unit: 'whole' },
      { name: 'Mayonnaise', quantity: '3', unit: 'tbsp' },
      { name: 'Dijon mustard', quantity: '1', unit: 'tbsp' },
      { name: 'Apple cider vinegar', quantity: '1', unit: 'tsp' },
      { name: 'Paprika', quantity: '0.5', unit: 'tsp' },
      { name: 'Chives', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.25', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Place eggs in a single layer in a pot; cover with cold water by 1 inch. Bring to a boil, then cover and remove from heat for 12 minutes.',
      },
      {
        step_number: 2,
        instruction: 'Transfer eggs to an ice bath for 5 minutes. Peel carefully.',
      },
      { step_number: 3, instruction: 'Halve eggs lengthwise and gently remove yolks into a bowl.' },
      {
        step_number: 4,
        instruction: 'Mash yolks with mayonnaise, mustard, vinegar, and salt until smooth.',
      },
      {
        step_number: 5,
        instruction:
          'Pipe or spoon yolk mixture back into egg whites. Dust with paprika and garnish with chives.',
      },
    ],
    tags: [
      'american',
      'appetizer',
      'gluten-free',
      'dairy-free',
      'vegetarian',
      'whole30',
      'keto',
      'party-food',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Trail Mix Energy Bites',
    description:
      'No-bake oat and nut butter balls packed with seeds, chocolate chips, and dried fruit — the perfect grab-and-go snack.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 0,
    servings: 12,
    calories: 140,
    ingredients: [
      { name: 'Rolled oats', quantity: '1', unit: 'cup' },
      { name: 'Peanut butter', quantity: '0.5', unit: 'cup' },
      { name: 'Honey', quantity: '0.33', unit: 'cup' },
      { name: 'Mini chocolate chips', quantity: '0.25', unit: 'cup' },
      { name: 'Chia seeds', quantity: '2', unit: 'tbsp' },
      { name: 'Dried cranberries', quantity: '0.25', unit: 'cup' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tsp' },
      { name: 'Flax meal', quantity: '2', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Combine oats, peanut butter, honey, and vanilla in a large bowl; stir until a thick dough forms.',
      },
      {
        step_number: 2,
        instruction: 'Fold in chocolate chips, chia seeds, dried cranberries, and flax meal.',
      },
      { step_number: 3, instruction: 'Refrigerate the mixture for 20 minutes to firm up.' },
      {
        step_number: 4,
        instruction: 'Roll into 1-inch balls (about 24 bites). Place on a parchment-lined tray.',
      },
      {
        step_number: 5,
        instruction:
          'Chill for at least 30 minutes before serving. Store in an airtight container in the fridge for up to a week.',
      },
    ],
    tags: ['american', 'snack', 'no-bake', 'vegetarian', 'meal-prep', 'kids-friendly', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ══ Batch 2: Mediterranean & Indian (8 recipes) ═════════════════════════

  // ── Mediterranean (4) ───────────────────────────────────────────────────
  {
    title: 'Greek Salad',
    description:
      'Crisp cucumber, juicy tomatoes, olives, and red onion tossed in a bright lemon-oregano vinaigrette.',
    cuisine: 'Mediterranean',
    prep_minutes: 15,
    cook_minutes: 0,
    servings: 4,
    calories: 180,
    ingredients: [
      { name: 'Cucumber', quantity: '1', unit: 'whole' },
      { name: 'Roma tomatoes', quantity: '4', unit: 'whole' },
      { name: 'Red onion', quantity: '0.5', unit: 'whole' },
      { name: 'Kalamata olives', quantity: '0.5', unit: 'cup' },
      { name: 'Extra-virgin olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'Red wine vinegar', quantity: '2', unit: 'tbsp' },
      { name: 'Dried oregano', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      { step_number: 1, instruction: 'Chop cucumber into half-moons and tomatoes into wedges.' },
      {
        step_number: 2,
        instruction:
          'Thinly slice red onion into rings and soak in cold water for 5 minutes to mellow bite.',
      },
      {
        step_number: 3,
        instruction:
          'Whisk olive oil, red wine vinegar, oregano, salt, and pepper into a vinaigrette.',
      },
      { step_number: 4, instruction: 'Combine vegetables and olives in a large bowl.' },
      {
        step_number: 5,
        instruction: 'Drizzle vinaigrette over salad, toss gently, and serve immediately.',
      },
    ],
    tags: [
      'mediterranean',
      'salad',
      'vegan',
      'vegetarian',
      'gluten-free',
      'dairy-free',
      'keto',
      'whole30',
      'no-cook',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Hummus Bowl',
    description:
      'Creamy chickpea hummus loaded bowl with roasted veggies, pickled onion, and a drizzle of tahini.',
    cuisine: 'Mediterranean',
    prep_minutes: 15,
    cook_minutes: 25,
    servings: 4,
    calories: 340,
    ingredients: [
      { name: 'Chickpeas', quantity: '2', unit: 'can' },
      { name: 'Tahini', quantity: '3', unit: 'tbsp' },
      { name: 'Lemon juice', quantity: '3', unit: 'tbsp' },
      { name: 'Sweet potato', quantity: '1', unit: 'whole' },
      { name: 'Red onion', quantity: '0.5', unit: 'whole' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Drain and rinse one can of chickpeas. Blend with tahini, lemon juice, garlic, and salt until smooth.',
      },
      {
        step_number: 2,
        instruction:
          'Cube sweet potato, toss with olive oil and smoked paprika, and roast at 400°F for 25 minutes.',
      },
      {
        step_number: 3,
        instruction:
          'Quick-pickle thinly sliced red onion in lemon juice and a pinch of sugar for 10 minutes.',
      },
      {
        step_number: 4,
        instruction:
          'Spread hummus in shallow bowls. Top with roasted sweet potato, pickled onion, and remaining whole chickpeas.',
      },
      {
        step_number: 5,
        instruction:
          'Drizzle with extra tahini and olive oil. Serve with warm pita or veggie sticks.',
      },
    ],
    tags: [
      'mediterranean',
      'bowl',
      'vegan',
      'vegetarian',
      'dairy-free',
      'gluten-free',
      'plant-based',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Shakshuka',
    description:
      'Eggs poached in a spiced tomato-pepper sauce with cumin and paprika — a Mediterranean brunch staple.',
    cuisine: 'Mediterranean',
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 280,
    ingredients: [
      { name: 'Eggs', quantity: '6', unit: 'whole' },
      { name: 'Canned crushed tomatoes', quantity: '28', unit: 'oz' },
      { name: 'Bell pepper', quantity: '1', unit: 'whole' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Crumbled feta', quantity: '0.25', unit: 'cup', optional: true },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Sauté diced onion and bell pepper in olive oil until softened, about 5 minutes.',
      },
      {
        step_number: 2,
        instruction: 'Add garlic, cumin, and smoked paprika; cook 1 minute until fragrant.',
      },
      {
        step_number: 3,
        instruction:
          'Pour in crushed tomatoes, season with salt, and simmer 10 minutes until thickened.',
      },
      {
        step_number: 4,
        instruction:
          'Make six wells in the sauce and crack an egg into each. Cover and cook 6–8 minutes until whites are set.',
      },
      {
        step_number: 5,
        instruction:
          'Top with crumbled feta and fresh cilantro. Serve straight from the skillet with crusty bread.',
      },
    ],
    tags: [
      'mediterranean',
      'breakfast',
      'vegetarian',
      'dairy-free',
      'gluten-free',
      'whole30',
      'one-pan',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Lemon Herb Fish',
    description:
      'Pan-seared white fish fillets with a bright lemon, garlic, and herb sauce — light and whole30-friendly.',
    cuisine: 'Mediterranean',
    prep_minutes: 10,
    cook_minutes: 12,
    servings: 4,
    calories: 260,
    ingredients: [
      { name: 'Cod fillets', quantity: '4', unit: 'piece' },
      { name: 'Lemon', quantity: '1', unit: 'whole' },
      { name: 'Olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
      { name: 'Fresh oregano', quantity: '1', unit: 'tbsp' },
      { name: 'Fresh thyme', quantity: '1', unit: 'tbsp' },
      { name: 'Cherry tomatoes', quantity: '0.5', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Pat cod fillets dry and season with salt, pepper, and a squeeze of lemon juice.',
      },
      {
        step_number: 2,
        instruction:
          'Heat olive oil in a skillet over medium-high heat. Sear fish 4 minutes per side until golden and flaky.',
      },
      {
        step_number: 3,
        instruction:
          'Remove fish; reduce heat. Add minced garlic, oregano, and thyme to the pan; sauté 30 seconds.',
      },
      {
        step_number: 4,
        instruction:
          'Add halved cherry tomatoes and lemon juice; cook 2 minutes until tomatoes soften.',
      },
      {
        step_number: 5,
        instruction: 'Spoon herb-tomato pan sauce over fish and serve immediately.',
      },
    ],
    tags: ['mediterranean', 'seafood', 'whole30', 'dairy-free', 'gluten-free', 'quick', 'keto'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ── Indian (4) ─────────────────────────────────────────────────────────
  {
    title: 'Butter Chicken',
    description:
      'Tender chicken in a rich, creamy tomato-butter sauce with warm spices — the iconic Indian comfort dish.',
    cuisine: 'Indian',
    prep_minutes: 20,
    cook_minutes: 30,
    servings: 4,
    calories: 450,
    ingredients: [
      { name: 'Chicken thighs', quantity: '1.5', unit: 'lb' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Tomato sauce', quantity: '14', unit: 'oz' },
      { name: 'Heavy cream', quantity: '0.75', unit: 'cup' },
      { name: 'Garam masala', quantity: '2', unit: 'tsp' },
      { name: 'Ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic', quantity: '4', unit: 'clove' },
      { name: 'Basmati rice', quantity: '2', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Cut chicken into bite-sized pieces and marinate in yogurt, garam masala, and salt for 30 minutes.',
      },
      {
        step_number: 2,
        instruction:
          'Sear marinated chicken in a hot skillet until browned on all sides; set aside.',
      },
      {
        step_number: 3,
        instruction:
          'Melt butter in the same pan. Sauté ginger and garlic 1 minute, then add tomato sauce and remaining garam masala.',
      },
      {
        step_number: 4,
        instruction:
          'Simmer sauce 15 minutes, then stir in heavy cream and return chicken. Cook 10 minutes until chicken is cooked through.',
      },
      { step_number: 5, instruction: 'Serve over steamed basmati rice, garnished with cilantro.' },
    ],
    tags: ['indian', 'curry', 'comfort-food', 'family-friendly', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Chana Masala',
    description:
      'Hearty chickpea curry simmered in a fragrant tomato sauce with cumin, coriander, and garam masala.',
    cuisine: 'Indian',
    prep_minutes: 10,
    cook_minutes: 25,
    servings: 4,
    calories: 310,
    ingredients: [
      { name: 'Chickpeas', quantity: '2', unit: 'can' },
      { name: 'Diced tomatoes', quantity: '14', unit: 'oz' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
      { name: 'Ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Garam masala', quantity: '1.5', unit: 'tsp' },
      { name: 'Cilantro', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      { step_number: 1, instruction: 'Sauté diced onion in oil until golden, about 6 minutes.' },
      {
        step_number: 2,
        instruction: 'Add garlic, ginger, cumin, and garam masala; cook 1 minute until fragrant.',
      },
      {
        step_number: 3,
        instruction:
          'Pour in diced tomatoes and simmer 10 minutes, mashing some tomatoes for a thicker sauce.',
      },
      {
        step_number: 4,
        instruction:
          'Add drained chickpeas and simmer 15 minutes until flavors meld and sauce reduces.',
      },
      {
        step_number: 5,
        instruction:
          'Season with salt and a squeeze of lemon. Garnish with cilantro and serve with rice or naan.',
      },
    ],
    tags: [
      'indian',
      'curry',
      'vegan',
      'vegetarian',
      'dairy-free',
      'gluten-free',
      'plant-based',
      'high-protein',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Palak Paneer',
    description:
      'Creamy spiced spinach sauce studded with golden seared paneer cubes — a beloved Indian vegetarian classic.',
    cuisine: 'Indian',
    prep_minutes: 15,
    cook_minutes: 25,
    servings: 4,
    calories: 350,
    ingredients: [
      { name: 'Spinach', quantity: '16', unit: 'oz' },
      { name: 'Paneer', quantity: '8', unit: 'oz' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
      { name: 'Ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Heavy cream', quantity: '0.25', unit: 'cup' },
      { name: 'Garam masala', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Blanch spinach in boiling water 2 minutes; transfer to ice water, drain, and blend into a smooth purée.',
      },
      {
        step_number: 2,
        instruction: 'Cube paneer and pan-fry in oil until golden on all sides; set aside.',
      },
      {
        step_number: 3,
        instruction:
          'Sauté diced onion until golden. Add garlic, ginger, cumin, and garam masala; cook 1 minute.',
      },
      {
        step_number: 4,
        instruction:
          'Stir in spinach purée and heavy cream; simmer 10 minutes until thick and velvety.',
      },
      {
        step_number: 5,
        instruction: 'Fold in paneer cubes, season with salt, and serve with naan or rice.',
      },
    ],
    tags: ['indian', 'curry', 'vegetarian', 'gluten-free', 'comfort-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Biryani',
    description:
      'Fragrant layered rice dish with spiced chicken, saffron, caramelized onions, and fresh mint — a celebratory Indian feast.',
    cuisine: 'Indian',
    prep_minutes: 25,
    cook_minutes: 40,
    servings: 6,
    calories: 480,
    ingredients: [
      { name: 'Basmati rice', quantity: '2', unit: 'cup' },
      { name: 'Chicken thighs', quantity: '1', unit: 'lb' },
      { name: 'Yogurt', quantity: '0.5', unit: 'cup' },
      { name: 'Onion', quantity: '2', unit: 'whole' },
      { name: 'Saffron', quantity: '0.25', unit: 'tsp' },
      { name: 'Garam masala', quantity: '2', unit: 'tsp' },
      { name: 'Ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Fresh mint', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Marinate chicken in yogurt, garam masala, ginger, garlic, and salt for at least 30 minutes.',
      },
      {
        step_number: 2,
        instruction:
          'Parboil basmati rice until 70% cooked; drain. Steep saffron in 2 tbsp warm milk.',
      },
      {
        step_number: 3,
        instruction:
          'Thinly slice onions and fry until deep golden and crispy; set aside for garnish.',
      },
      {
        step_number: 4,
        instruction:
          'Layer marinated chicken in a heavy pot, top with parboiled rice, saffron milk, and fried onions.',
      },
      {
        step_number: 5,
        instruction:
          'Seal pot with a tight lid and cook on low heat (dum) for 25 minutes until rice is fluffy and chicken is tender.',
      },
      {
        step_number: 6,
        instruction:
          'Gently mix layers before serving. Garnish with fresh mint and remaining fried onions.',
      },
    ],
    tags: ['indian', 'rice', 'celebration', 'family-friendly', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ══ Batch 3: Quick Meals & Keto/Paleo (8 recipes) ═══════════════════════

  // ── Quick Meals under 20 min (4) ────────────────────────────────────────
  {
    title: 'Avocado Toast',
    description:
      'Crusty sourdough topped with mashed avocado, cherry tomatoes, red pepper flakes, and a squeeze of lemon.',
    cuisine: 'American',
    prep_minutes: 5,
    cook_minutes: 3,
    servings: 2,
    calories: 280,
    ingredients: [
      { name: 'Sourdough bread', quantity: '2', unit: 'slice' },
      { name: 'Ripe avocado', quantity: '1', unit: 'whole' },
      { name: 'Cherry tomatoes', quantity: '0.25', unit: 'cup' },
      { name: 'Lemon juice', quantity: '1', unit: 'tbsp' },
      { name: 'Red pepper flakes', quantity: '0.25', unit: 'tsp' },
      { name: 'Flaky sea salt', quantity: '0.25', unit: 'tsp' },
    ],
    steps: [
      { step_number: 1, instruction: 'Toast sourdough slices until golden and crisp.' },
      {
        step_number: 2,
        instruction: 'Halve avocado, remove pit, and mash flesh with lemon juice and sea salt.',
      },
      { step_number: 3, instruction: 'Spread mashed avocado generously onto each toast.' },
      {
        step_number: 4,
        instruction: 'Top with halved cherry tomatoes and a pinch of red pepper flakes.',
      },
      { step_number: 5, instruction: 'Serve immediately while toast is still warm and crunchy.' },
    ],
    tags: ['american', 'breakfast', 'quick', 'vegetarian', 'dairy-free', 'vegan'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Egg Fried Rice',
    description:
      'Day-old rice wok-tossed with scrambled egg, soy sauce, scallions, and a hint of sesame oil.',
    cuisine: 'Asian',
    prep_minutes: 5,
    cook_minutes: 10,
    servings: 3,
    calories: 340,
    ingredients: [
      { name: 'Day-old jasmine rice', quantity: '3', unit: 'cup' },
      { name: 'Eggs', quantity: '3', unit: 'whole' },
      { name: 'Soy sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Scallions', quantity: '4', unit: 'stalk' },
      { name: 'Sesame oil', quantity: '1', unit: 'tsp' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Heat vegetable oil in a wok over high heat until shimmering.',
      },
      {
        step_number: 2,
        instruction:
          'Beat eggs and scramble in the wok until just set; break into small pieces and push aside.',
      },
      { step_number: 3, instruction: 'Add rice and stir-fry 3 minutes, breaking up any clumps.' },
      {
        step_number: 4,
        instruction: 'Drizzle soy sauce and sesame oil over rice; toss to coat evenly.',
      },
      {
        step_number: 5,
        instruction:
          'Fold in chopped scallions and minced garlic; stir-fry 1 more minute. Serve hot.',
      },
    ],
    tags: [
      'asian',
      'chinese',
      'rice',
      'dairy-free',
      'vegetarian',
      'quick',
      'budget-friendly',
      'weeknight',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Quesadilla',
    description:
      'Crispy flour tortilla folded around melted cheddar and jack cheese with optional chicken and peppers.',
    cuisine: 'Mexican',
    prep_minutes: 5,
    cook_minutes: 8,
    servings: 2,
    calories: 420,
    ingredients: [
      { name: 'Flour tortillas', quantity: '2', unit: 'piece' },
      { name: 'Cheddar cheese', quantity: '1', unit: 'cup' },
      { name: 'Monterey Jack cheese', quantity: '0.5', unit: 'cup' },
      { name: 'Bell pepper', quantity: '0.5', unit: 'whole' },
      { name: 'Cooked chicken', quantity: '0.75', unit: 'cup', optional: true },
      { name: 'Butter', quantity: '1', unit: 'tbsp' },
      { name: 'Salsa', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      { step_number: 1, instruction: 'Shred cheeses and thinly slice bell pepper.' },
      {
        step_number: 2,
        instruction:
          'Butter one side of each tortilla and place butter-side down in a medium skillet.',
      },
      {
        step_number: 3,
        instruction: 'Layer cheeses, bell pepper, and chicken on half the tortilla; fold over.',
      },
      {
        step_number: 4,
        instruction:
          'Cook 3–4 minutes per side over medium heat until tortilla is golden and cheese is melted.',
      },
      { step_number: 5, instruction: 'Cut into wedges and serve with salsa and sour cream.' },
    ],
    tags: ['mexican', 'quick', 'cheese', 'weeknight', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Smoothie Bowl',
    description:
      'Thick blended açaí and banana topped with granola, fresh berries, coconut, and a drizzle of honey.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 0,
    servings: 2,
    calories: 320,
    ingredients: [
      { name: 'Frozen açaí packets', quantity: '2', unit: 'packet' },
      { name: 'Banana', quantity: '1', unit: 'whole' },
      { name: 'Mixed berries', quantity: '0.5', unit: 'cup' },
      { name: 'Granola', quantity: '0.25', unit: 'cup' },
      { name: 'Shredded coconut', quantity: '2', unit: 'tbsp' },
      { name: 'Agave nectar or honey', quantity: '1', unit: 'tbsp', optional: true },
      { name: 'Almond milk', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Blend açaí packets, banana, and almond milk until thick and smooth — thicker than a regular smoothie.',
      },
      { step_number: 2, instruction: 'Pour into two bowls.' },
      { step_number: 3, instruction: 'Arrange fresh mixed berries and granola on top in rows.' },
      {
        step_number: 4,
        instruction: 'Sprinkle with shredded coconut and drizzle with agave nectar or honey.',
      },
      { step_number: 5, instruction: 'Serve immediately before the bowl softens.' },
    ],
    tags: [
      'american',
      'breakfast',
      'quick',
      'vegan',
      'vegetarian',
      'dairy-free',
      'gluten-free',
      'no-cook',
      'healthy',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── Keto (2) ────────────────────────────────────────────────────────────
  {
    title: 'Bacon Cheeseburger Bowl',
    description:
      'All the burger flavor without the bun — ground beef, bacon, cheddar, pickles, and special sauce over greens.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 480,
    ingredients: [
      { name: 'Ground beef 80/20', quantity: '1', unit: 'lb' },
      { name: 'Bacon', quantity: '6', unit: 'slice' },
      { name: 'Cheddar cheese', quantity: '1', unit: 'cup' },
      { name: 'Dill pickles', quantity: '0.5', unit: 'cup' },
      { name: 'Mixed greens', quantity: '4', unit: 'cup' },
      { name: 'Mayonnaise', quantity: '2', unit: 'tbsp' },
      { name: 'Yellow mustard', quantity: '1', unit: 'tsp' },
      { name: 'Onion', quantity: '0.25', unit: 'whole' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Cook bacon in a skillet until crispy; crumble and set aside.',
      },
      {
        step_number: 2,
        instruction:
          'In the same skillet, brown ground beef with diced onion over medium-high heat; drain excess fat.',
      },
      { step_number: 3, instruction: 'Stir cheddar cheese into the hot beef until melted.' },
      { step_number: 4, instruction: 'Mix mayonnaise and mustard together for the special sauce.' },
      {
        step_number: 5,
        instruction:
          'Divide mixed greens among bowls. Top with cheesy beef, crumbled bacon, sliced pickles, and a drizzle of sauce.',
      },
    ],
    tags: ['american', 'keto', 'bowl', 'low-carb', 'high-protein', 'gluten-free', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Keto Pizza Crust',
    description:
      'Crispy low-carb pizza crust made from mozzarella and almond flour, topped with pepperoni and marinara.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    calories: 350,
    ingredients: [
      { name: 'Mozzarella cheese', quantity: '2', unit: 'cup' },
      { name: 'Almond flour', quantity: '1.5', unit: 'cup' },
      { name: 'Cream cheese', quantity: '2', unit: 'oz' },
      { name: 'Egg', quantity: '1', unit: 'whole' },
      { name: 'Marinara sauce', quantity: '0.5', unit: 'cup' },
      { name: 'Pepperoni', quantity: '20', unit: 'piece' },
      { name: 'Italian seasoning', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Microwave mozzarella and cream cheese together in 30-second intervals until fully melted and smooth.',
      },
      {
        step_number: 2,
        instruction: 'Stir in almond flour, egg, and Italian seasoning; knead until a dough forms.',
      },
      {
        step_number: 3,
        instruction: 'Press dough into a 12-inch circle on a parchment-lined baking sheet.',
      },
      { step_number: 4, instruction: 'Bake at 425°F for 10 minutes until golden and set.' },
      {
        step_number: 5,
        instruction:
          'Top with marinara and pepperoni; bake 5 more minutes until cheese bubbles. Cool 2 minutes before slicing.',
      },
    ],
    tags: ['italian', 'keto', 'pizza', 'low-carb', 'gluten-free', 'high-protein'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── Paleo (2) ───────────────────────────────────────────────────────────
  {
    title: 'Grilled Salmon',
    description:
      'Wild-caught salmon fillets grilled with lemon, garlic, and dill — clean, simple, and paleo-perfect.',
    cuisine: 'American',
    prep_minutes: 5,
    cook_minutes: 12,
    servings: 4,
    calories: 340,
    ingredients: [
      { name: 'Salmon fillets', quantity: '4', unit: 'piece' },
      { name: 'Lemon', quantity: '1', unit: 'whole' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Fresh dill', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      { step_number: 1, instruction: 'Pat salmon fillets dry and season with salt and pepper.' },
      {
        step_number: 2,
        instruction: 'Brush fillets with olive oil and minced garlic; let sit 5 minutes.',
      },
      {
        step_number: 3,
        instruction: 'Preheat grill to medium-high. Place salmon skin-side down; grill 5 minutes.',
      },
      {
        step_number: 4,
        instruction:
          'Flip carefully and grill 4–5 more minutes until fish flakes easily with a fork.',
      },
      {
        step_number: 5,
        instruction:
          'Squeeze fresh lemon over fillets and garnish with dill. Serve with roasted vegetables.',
      },
    ],
    tags: [
      'american',
      'paleo',
      'seafood',
      'gluten-free',
      'dairy-free',
      'whole30',
      'keto',
      'quick',
      'high-protein',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'paleo', is_compliant: true },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Sweet Potato Hash',
    description:
      'Diced sweet potatoes sautéed with bell pepper, onion, and ground turkey — a hearty paleo breakfast or dinner.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 380,
    ingredients: [
      { name: 'Sweet potatoes', quantity: '2', unit: 'whole' },
      { name: 'Ground turkey', quantity: '1', unit: 'lb' },
      { name: 'Bell pepper', quantity: '1', unit: 'whole' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Coconut oil', quantity: '2', unit: 'tbsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Fresh parsley', quantity: '2', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Dice sweet potatoes into half-inch cubes; dice bell pepper and onion.',
      },
      {
        step_number: 2,
        instruction:
          'Heat coconut oil in a large skillet over medium-high heat. Add sweet potatoes and cook 10 minutes, stirring occasionally.',
      },
      {
        step_number: 3,
        instruction: 'Add bell pepper, onion, and garlic; cook 5 minutes until softened.',
      },
      {
        step_number: 4,
        instruction:
          'Push veggies aside and brown ground turkey with smoked paprika, breaking into crumbles, about 6 minutes.',
      },
      {
        step_number: 5,
        instruction:
          'Mix everything together, season with salt, and cook 2 more minutes. Garnish with fresh parsley and serve.',
      },
    ],
    tags: [
      'american',
      'paleo',
      'breakfast',
      'hash',
      'gluten-free',
      'dairy-free',
      'whole30',
      'high-protein',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'paleo', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ══ Batch 4: Weekend Projects & Desserts (8 recipes) ═════════════════

  // ── Weekend / Complex (5) ───────────────────────────────────────────────
  {
    title: 'Beef Bourguignon',
    description:
      'Classic French stew of tender beef braised in red wine with mushrooms, pearl onions, and aromatic herbs — the ultimate weekend project.',
    cuisine: 'French',
    prep_minutes: 30,
    cook_minutes: 180,
    servings: 6,
    calories: 520,
    ingredients: [
      { name: 'Beef chuck', quantity: '3', unit: 'lb' },
      { name: 'Red wine (Burgundy)', quantity: '3', unit: 'cup' },
      { name: 'Pearl onions', quantity: '1', unit: 'cup' },
      { name: 'Cremini mushrooms', quantity: '8', unit: 'oz' },
      { name: 'Carrots', quantity: '3', unit: 'whole' },
      { name: 'Bacon', quantity: '4', unit: 'oz' },
      { name: 'Tomato paste', quantity: '2', unit: 'tbsp' },
      { name: 'Beef broth', quantity: '2', unit: 'cup' },
      { name: 'Bouquet garni', quantity: '1', unit: 'piece' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Cut beef into 2-inch cubes and pat dry. Season generously with salt and pepper.',
      },
      {
        step_number: 2,
        instruction:
          'Render diced bacon in a heavy Dutch oven until crispy; remove and set aside. Brown beef in batches in the bacon fat, 3–4 minutes per side; set aside.',
      },
      {
        step_number: 3,
        instruction:
          'Sauté sliced carrots, pearl onions, and garlic in the same pot for 5 minutes. Stir in tomato paste and cook 1 minute.',
      },
      {
        step_number: 4,
        instruction:
          'Deglaze with red wine, scraping up all browned bits. Add beef broth and bouquet garni. Return beef and bacon to the pot.',
      },
      {
        step_number: 5,
        instruction:
          'Bring to a simmer, cover, and transfer to a 325°F oven. Braise for 2.5 hours until beef is fork-tender.',
      },
      {
        step_number: 6,
        instruction:
          'Sauté mushrooms in butter until golden, about 5 minutes. Add to the stew during the last 30 minutes of braising.',
      },
      {
        step_number: 7,
        instruction:
          'Discard bouquet garni. Adjust seasoning with salt and pepper. Serve over mashed potatoes or egg noodles.',
      },
    ],
    tags: ['french', 'stew', 'braise', 'comfort-food', 'weekend-project', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Homemade Ramen',
    description:
      'Rich tonkotsu-style pork broth with handmade noodles, chashu pork, soft-boiled egg, and all the fixings — a labor of love.',
    cuisine: 'Asian',
    prep_minutes: 45,
    cook_minutes: 360,
    servings: 4,
    calories: 620,
    ingredients: [
      { name: 'Pork bones', quantity: '3', unit: 'lb' },
      { name: 'Pork belly', quantity: '1', unit: 'lb' },
      { name: 'Ramen noodles', quantity: '16', unit: 'oz' },
      { name: 'Soy sauce', quantity: '4', unit: 'tbsp' },
      { name: 'Mirin', quantity: '3', unit: 'tbsp' },
      { name: 'Soft-boiled eggs', quantity: '4', unit: 'whole' },
      { name: 'Nori sheets', quantity: '8', unit: 'piece' },
      { name: 'Green onions', quantity: '4', unit: 'stalk' },
      { name: 'Garlic', quantity: '6', unit: 'clove' },
      { name: 'Ginger', quantity: '3', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Blanch pork bones in boiling water for 10 minutes; drain and rinse to remove impurities.',
      },
      {
        step_number: 2,
        instruction:
          'Return clean bones to a large pot with fresh water, smashed garlic, and sliced ginger. Boil vigorously for 4–6 hours, stirring occasionally to emulsify the broth into a creamy white.',
      },
      {
        step_number: 3,
        instruction:
          'Meanwhile, roll and tie pork belly. Sear on all sides, then braise in soy sauce, mirin, and water for 2 hours until tender. Slice chashu when cooled.',
      },
      {
        step_number: 4,
        instruction:
          'Make marinated soft-boiled eggs: boil 6.5 minutes, ice bath, peel, then soak in soy-mirin marinade for at least 4 hours.',
      },
      {
        step_number: 5,
        instruction:
          'Strain the broth and season with soy sauce, salt, and a splash of mirin to taste.',
      },
      {
        step_number: 6,
        instruction:
          'Cook ramen noodles according to package directions; drain and divide among bowls.',
      },
      {
        step_number: 7,
        instruction:
          'Ladle hot broth over noodles. Top with chashu slices, halved marinated egg, nori, sliced green onions, and any other toppings.',
      },
    ],
    tags: ['asian', 'japanese', 'soup', 'noodles', 'dairy-free', 'weekend-project', 'comfort-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'BBQ Brisket',
    description:
      'Low-and-slow smoked beef brisket with a dry rub and tangy mop sauce — Texas-style barbecue at its finest.',
    cuisine: 'American',
    prep_minutes: 30,
    cook_minutes: 720,
    servings: 12,
    calories: 380,
    ingredients: [
      { name: 'Beef brisket', quantity: '12', unit: 'lb' },
      { name: 'Coarse black pepper', quantity: '0.5', unit: 'cup' },
      { name: 'Kosher salt', quantity: '0.25', unit: 'cup' },
      { name: 'Garlic powder', quantity: '2', unit: 'tbsp' },
      { name: 'Onion powder', quantity: '2', unit: 'tbsp' },
      { name: 'Paprika', quantity: '2', unit: 'tbsp' },
      { name: 'Apple cider vinegar', quantity: '1', unit: 'cup' },
      { name: 'Worcestershire sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Yellow mustard', quantity: '2', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Trim brisket fat cap to about ¼ inch. Mix black pepper, salt, garlic powder, onion powder, and paprika into a dry rub.',
      },
      {
        step_number: 2,
        instruction:
          'Coat brisket with a thin layer of yellow mustard as a binder, then apply dry rub generously on all sides.',
      },
      {
        step_number: 3,
        instruction:
          'Let the rubbed brisket rest in the refrigerator uncovered for at least 8 hours (overnight is best).',
      },
      {
        step_number: 4,
        instruction:
          'Set smoker to 225°F with oak or hickory wood. Place brisket fat-side up and smoke for 6 hours, spritzing with apple cider vinegar every hour.',
      },
      {
        step_number: 5,
        instruction:
          'When bark is set and internal temp reaches 165°F, wrap tightly in butcher paper. Return to smoker.',
      },
      {
        step_number: 6,
        instruction:
          'Continue smoking until internal temperature reaches 203°F and the brisket probes like butter, about 4–6 more hours.',
      },
      {
        step_number: 7,
        instruction:
          'Rest brisket wrapped in a towel inside a cooler for at least 1 hour. Slice against the grain and serve with Worcestershire mop sauce.',
      },
    ],
    tags: [
      'american',
      'bbq',
      'smoked',
      'texas',
      'weekend-project',
      'gluten-free',
      'dairy-free',
      'keto',
      'whole30',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },
  {
    title: 'Lasagna',
    description:
      'Layer upon layer of pasta, rich meat ragù, creamy béchamel, and bubbling mozzarella — the Italian-American weekend classic.',
    cuisine: 'Italian',
    prep_minutes: 45,
    cook_minutes: 90,
    servings: 8,
    calories: 580,
    ingredients: [
      { name: 'Lasagna noodles', quantity: '12', unit: 'piece' },
      { name: 'Ground beef', quantity: '1', unit: 'lb' },
      { name: 'Italian sausage', quantity: '0.5', unit: 'lb' },
      { name: 'Ricotta cheese', quantity: '15', unit: 'oz' },
      { name: 'Mozzarella cheese', quantity: '2', unit: 'cup' },
      { name: 'Parmesan cheese', quantity: '0.75', unit: 'cup' },
      { name: 'Marinara sauce', quantity: '48', unit: 'oz' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Flour', quantity: '3', unit: 'tbsp' },
      { name: 'Milk', quantity: '2', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Brown ground beef and Italian sausage in a large skillet; drain excess fat. Stir in marinara sauce and simmer 20 minutes for the ragù.',
      },
      {
        step_number: 2,
        instruction:
          'Make béchamel: melt butter, whisk in flour, cook 1 minute. Gradually add milk, whisking until thick and smooth, about 5 minutes.',
      },
      {
        step_number: 3,
        instruction: 'Mix ricotta with half the Parmesan, an egg, and chopped parsley.',
      },
      {
        step_number: 4,
        instruction:
          'Spread a thin layer of ragù on the bottom of a 9×13 baking dish. Layer noodles, ricotta mixture, ragù, béchamel, and mozzarella. Repeat for 3 layers.',
      },
      {
        step_number: 5,
        instruction: 'Top the final layer with remaining mozzarella and Parmesan.',
      },
      {
        step_number: 6,
        instruction:
          'Cover with foil and bake at 375°F for 45 minutes. Remove foil and bake 20 more minutes until golden and bubbly.',
      },
      {
        step_number: 7,
        instruction:
          'Rest for 15 minutes before slicing so layers set. Serve with a side salad and garlic bread.',
      },
    ],
    tags: ['italian', 'pasta', 'baked', 'comfort-food', 'weekend-project', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Sourdough Bread',
    description:
      'Crusty artisan sourdough with an open crumb and tangy flavor — the quintessential baking weekend project from starter to loaf.',
    cuisine: 'American',
    prep_minutes: 30,
    cook_minutes: 45,
    servings: 8,
    calories: 180,
    ingredients: [
      { name: 'Bread flour', quantity: '4', unit: 'cup' },
      { name: 'Water', quantity: '1.5', unit: 'cup' },
      { name: 'Active sourdough starter', quantity: '0.5', unit: 'cup' },
      { name: 'Salt', quantity: '2', unit: 'tsp' },
      { name: 'Rice flour', quantity: '2', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Mix flour, water, and starter in a large bowl until a shaggy dough forms. Rest 30 minutes (autolyse).',
      },
      {
        step_number: 2,
        instruction:
          'Add salt and a splash of water. Pinch and fold the dough until salt is fully incorporated.',
      },
      {
        step_number: 3,
        instruction:
          'Perform stretch-and-folds every 30 minutes for the first 2 hours (4 sets total). Let dough bulk ferment at room temperature for 4–6 hours until doubled.',
      },
      {
        step_number: 4,
        instruction:
          'Pre-shape dough into a round on a lightly floured surface. Bench rest 20 minutes.',
      },
      {
        step_number: 5,
        instruction:
          'Shape into a tight boule or batard. Place seam-side up in a rice-floured banneton. Cover and cold retard in the refrigerator for 12–16 hours.',
      },
      {
        step_number: 6,
        instruction:
          'Preheat a Dutch oven inside the oven at 500°F for 1 hour. Score the cold dough with a lame.',
      },
      {
        step_number: 7,
        instruction:
          'Bake covered 20 minutes at 500°F, then remove lid, reduce to 450°F, and bake 20–25 minutes until deep golden. Cool completely on a wire rack before slicing.',
      },
    ],
    tags: ['american', 'bread', 'baking', 'weekend-project', 'vegan', 'dairy-free', 'vegetarian'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── Desserts (3) ────────────────────────────────────────────────────────
  {
    title: 'Chocolate Lava Cake',
    description:
      'Individual dark chocolate cakes with a molten, gooey center that flows when you cut in — pure indulgence.',
    cuisine: 'French',
    prep_minutes: 15,
    cook_minutes: 14,
    servings: 4,
    calories: 420,
    ingredients: [
      { name: 'Dark chocolate', quantity: '6', unit: 'oz' },
      { name: 'Butter', quantity: '0.5', unit: 'cup' },
      { name: 'Eggs', quantity: '2', unit: 'whole' },
      { name: 'Egg yolks', quantity: '2', unit: 'whole' },
      { name: 'Sugar', quantity: '0.25', unit: 'cup' },
      { name: 'All-purpose flour', quantity: '2', unit: 'tbsp' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tsp' },
      { name: 'Powdered sugar', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Preheat oven to 425°F. Butter and dust 4 ramekins with cocoa powder; place on a baking sheet.',
      },
      {
        step_number: 2,
        instruction:
          'Melt dark chocolate and butter together in a double boiler, stirring until smooth. Let cool slightly.',
      },
      {
        step_number: 3,
        instruction:
          'Whisk eggs, egg yolks, sugar, and vanilla until pale and thick, about 2 minutes.',
      },
      {
        step_number: 4,
        instruction:
          'Fold the chocolate mixture into the egg mixture gently. Sift in flour and fold until just combined — do not overmix.',
      },
      {
        step_number: 5,
        instruction: 'Divide batter among prepared ramekins, filling about three-quarters full.',
      },
      {
        step_number: 6,
        instruction:
          'Bake 12–14 minutes until edges are firm but centers jiggle slightly when shaken.',
      },
      {
        step_number: 7,
        instruction:
          'Let rest 1 minute, then invert onto plates. Dust with powdered sugar and serve immediately with vanilla ice cream.',
      },
    ],
    tags: ['french', 'dessert', 'chocolate', 'vegetarian', 'date-night', 'quick-dessert'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Tiramisu',
    description:
      'Espresso-soaked ladyfingers layered with mascarpone cream and dusted with cocoa — the iconic Italian pick-me-up dessert.',
    cuisine: 'Italian',
    prep_minutes: 30,
    cook_minutes: 0,
    servings: 8,
    calories: 380,
    ingredients: [
      { name: 'Mascarpone cheese', quantity: '16', unit: 'oz' },
      { name: 'Ladyfingers', quantity: '24', unit: 'piece' },
      { name: 'Espresso', quantity: '1.5', unit: 'cup' },
      { name: 'Egg yolks', quantity: '4', unit: 'whole' },
      { name: 'Sugar', quantity: '0.5', unit: 'cup' },
      { name: 'Heavy cream', quantity: '1', unit: 'cup' },
      { name: 'Cocoa powder', quantity: '2', unit: 'tbsp' },
      { name: 'Coffee liqueur', quantity: '2', unit: 'tbsp', optional: true },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Brew espresso and let it cool. Stir in coffee liqueur if using.',
      },
      {
        step_number: 2,
        instruction:
          'Whisk egg yolks and sugar over a double boiler until thick, pale, and ribbon-like — about 5 minutes. Remove from heat.',
      },
      {
        step_number: 3,
        instruction: 'Fold mascarpone into the yolk mixture until smooth and creamy.',
      },
      {
        step_number: 4,
        instruction:
          'In a separate bowl, whip heavy cream to stiff peaks. Gently fold whipped cream into the mascarpone mixture.',
      },
      {
        step_number: 5,
        instruction:
          "Quickly dip each ladyfinger into the cooled espresso (don't soak too long) and arrange in a single layer in a 9×13 dish.",
      },
      {
        step_number: 6,
        instruction:
          'Spread half the mascarpone cream over the ladyfingers. Repeat with another layer of dipped ladyfingers and remaining cream.',
      },
      {
        step_number: 7,
        instruction:
          'Cover and refrigerate at least 4 hours (overnight is best). Dust generously with cocoa powder just before serving.',
      },
    ],
    tags: ['italian', 'dessert', 'coffee', 'vegetarian', 'no-bake', 'make-ahead', 'date-night'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Berry Crumble',
    description:
      'Juicy mixed berries bubbling under a buttery, oat-streusel topping — simple, rustic, and best served warm with ice cream.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 35,
    servings: 6,
    calories: 320,
    ingredients: [
      { name: 'Mixed berries', quantity: '5', unit: 'cup' },
      { name: 'Sugar', quantity: '0.5', unit: 'cup' },
      { name: 'Cornstarch', quantity: '1', unit: 'tbsp' },
      { name: 'Lemon juice', quantity: '1', unit: 'tbsp' },
      { name: 'Old-fashioned oats', quantity: '1', unit: 'cup' },
      { name: 'All-purpose flour', quantity: '0.5', unit: 'cup' },
      { name: 'Brown sugar', quantity: '0.5', unit: 'cup' },
      { name: 'Butter', quantity: '0.33', unit: 'cup' },
      { name: 'Cinnamon', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Preheat oven to 375°F. Toss mixed berries with sugar, cornstarch, and lemon juice in a bowl; transfer to a 9-inch baking dish.',
      },
      {
        step_number: 2,
        instruction: 'In a separate bowl, combine oats, flour, brown sugar, and cinnamon.',
      },
      {
        step_number: 3,
        instruction:
          'Cut cold butter into the oat mixture using a pastry cutter or your fingers until it resembles coarse crumbs with some pea-sized pieces.',
      },
      { step_number: 4, instruction: 'Scatter the crumble topping evenly over the berry filling.' },
      {
        step_number: 5,
        instruction:
          'Bake 35 minutes until the topping is deep golden and the berry filling is bubbling around the edges.',
      },
      {
        step_number: 6,
        instruction:
          'Cool for 10 minutes before serving. Serve warm with a scoop of vanilla ice cream or a dollop of whipped cream.',
      },
    ],
    tags: [
      'american',
      'dessert',
      'fruit',
      'baked',
      'comfort-food',
      'family-friendly',
      'vegetarian',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ══ Batch 6: Final 10 — Breakfast, Soups, Salads, Desserts ═══════════

  // ── Breakfast (3) ──────────────────────────────────────────────────────
  {
    title: 'Fluffy Buttermilk Pancakes',
    description:
      'Light and airy buttermilk pancakes stacked tall with maple syrup and a pat of butter — the classic American breakfast.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    calories: 320,
    ingredients: [
      { name: 'All-purpose flour', quantity: '2', unit: 'cup' },
      { name: 'Buttermilk', quantity: '2', unit: 'cup' },
      { name: 'Eggs', quantity: '2', unit: 'whole' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Sugar', quantity: '2', unit: 'tbsp' },
      { name: 'Baking powder', quantity: '2', unit: 'tsp' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Whisk flour, sugar, baking powder, and salt together in a large bowl.',
      },
      {
        step_number: 2,
        instruction:
          'In a separate bowl, beat eggs, then mix in buttermilk, melted butter, and vanilla.',
      },
      {
        step_number: 3,
        instruction:
          'Pour wet ingredients into dry and stir gently until just combined — a few lumps are okay; do not overmix.',
      },
      {
        step_number: 4,
        instruction:
          'Heat a lightly buttered griddle or skillet over medium heat. Pour ¼ cup batter per pancake; cook until bubbles form on the surface and edges set, about 2 minutes.',
      },
      {
        step_number: 5,
        instruction:
          'Flip and cook 1–2 more minutes until golden brown. Serve stacked with maple syrup and butter.',
      },
    ],
    tags: ['american', 'breakfast', 'pancakes', 'vegetarian', 'family-friendly', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Cinnamon French Toast',
    description:
      'Thick brioche slices soaked in a vanilla-cinnamon egg custard and pan-fried to golden perfection — a cozy weekend breakfast.',
    cuisine: 'French',
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    calories: 350,
    ingredients: [
      { name: 'Brioche bread', quantity: '8', unit: 'slice' },
      { name: 'Eggs', quantity: '3', unit: 'whole' },
      { name: 'Whole milk', quantity: '1', unit: 'cup' },
      { name: 'Cinnamon', quantity: '1', unit: 'tsp' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tsp' },
      { name: 'Butter', quantity: '2', unit: 'tbsp' },
      { name: 'Maple syrup', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Whisk eggs, milk, cinnamon, vanilla, and a pinch of salt in a shallow dish until smooth.',
      },
      {
        step_number: 2,
        instruction: 'Heat butter in a large skillet or griddle over medium heat.',
      },
      {
        step_number: 3,
        instruction:
          'Dip each brioche slice into the egg mixture, letting it soak 10 seconds per side.',
      },
      {
        step_number: 4,
        instruction:
          'Cook soaked slices 2–3 minutes per side until golden brown and slightly crisp on the edges.',
      },
      {
        step_number: 5,
        instruction:
          'Serve immediately topped with maple syrup and a dusting of powdered sugar or fresh berries.',
      },
    ],
    tags: ['french', 'breakfast', 'french-toast', 'vegetarian', 'weekend', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Breakfast Burrito',
    description:
      'Flour tortilla stuffed with scrambled eggs, crispy potatoes, chorizo, and salsa — a hearty whole30-friendly morning wrap (skip the tortilla for strict compliance).',
    cuisine: 'Mexican',
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    calories: 420,
    ingredients: [
      { name: 'Eggs', quantity: '6', unit: 'whole' },
      { name: 'Chorizo', quantity: '0.5', unit: 'lb' },
      { name: 'Yukon gold potatoes', quantity: '2', unit: 'whole' },
      { name: 'Flour tortillas', quantity: '4', unit: 'piece', optional: true },
      { name: 'Salsa', quantity: '0.5', unit: 'cup' },
      { name: 'Avocado', quantity: '1', unit: 'whole' },
      { name: 'Cilantro', quantity: '0.25', unit: 'cup' },
      { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Dice potatoes into half-inch cubes. Heat olive oil in a skillet and cook potatoes until crispy and golden, about 10 minutes.',
      },
      {
        step_number: 2,
        instruction:
          'Remove chorizo casing and crumble into the skillet with the potatoes; cook 4 minutes until browned.',
      },
      {
        step_number: 3,
        instruction:
          'Beat eggs and scramble into the potato-chorizo mixture until just set, about 3 minutes.',
      },
      {
        step_number: 4,
        instruction:
          'Warm flour tortillas in a dry skillet or microwave (skip the tortilla for strict whole30 compliance and serve as a bowl).',
      },
      {
        step_number: 5,
        instruction:
          'Fill each tortilla with the egg mixture, sliced avocado, salsa, and cilantro. Roll into burritos and serve.',
      },
    ],
    tags: [
      'mexican',
      'breakfast',
      'burrito',
      'dairy-free',
      'whole30',
      'high-protein',
      'family-friendly',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ── Soups (3) ──────────────────────────────────────────────────────────
  {
    title: 'Minestrone',
    description:
      'Hearty Italian vegetable soup loaded with beans, pasta, and seasonal vegetables in a tomato broth — a nourishing vegan staple.',
    cuisine: 'Italian',
    prep_minutes: 15,
    cook_minutes: 30,
    servings: 6,
    calories: 220,
    ingredients: [
      { name: 'Canned diced tomatoes', quantity: '14', unit: 'oz' },
      { name: 'Cannellini beans', quantity: '1', unit: 'can' },
      { name: 'Small pasta', quantity: '1', unit: 'cup' },
      { name: 'Zucchini', quantity: '1', unit: 'whole' },
      { name: 'Carrot', quantity: '2', unit: 'whole' },
      { name: 'Celery', quantity: '2', unit: 'stalk' },
      { name: 'Vegetable broth', quantity: '6', unit: 'cup' },
      { name: 'Garlic', quantity: '3', unit: 'clove' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Dice carrot, celery, zucchini, and onion into small uniform pieces.',
      },
      {
        step_number: 2,
        instruction:
          'Sauté onion and garlic in olive oil until fragrant, about 3 minutes. Add carrot and celery; cook 5 minutes.',
      },
      {
        step_number: 3,
        instruction: 'Pour in diced tomatoes and vegetable broth; bring to a boil.',
      },
      {
        step_number: 4,
        instruction:
          'Add zucchini, drained beans, and small pasta. Simmer 15 minutes until pasta and vegetables are tender.',
      },
      {
        step_number: 5,
        instruction:
          'Season with salt, pepper, and a drizzle of olive oil. Serve with crusty bread.',
      },
    ],
    tags: [
      'italian',
      'soup',
      'vegan',
      'dairy-free',
      'vegetarian',
      'comfort-food',
      'family-friendly',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Chicken Noodle Soup',
    description:
      'The ultimate comfort soup — tender chicken, egg noodles, carrots, and celery in a golden, savory broth.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 25,
    servings: 6,
    calories: 240,
    ingredients: [
      { name: 'Chicken breast', quantity: '1', unit: 'lb' },
      { name: 'Egg noodles', quantity: '3', unit: 'cup' },
      { name: 'Carrots', quantity: '3', unit: 'whole' },
      { name: 'Celery', quantity: '3', unit: 'stalk' },
      { name: 'Chicken broth', quantity: '8', unit: 'cup' },
      { name: 'Onion', quantity: '1', unit: 'whole' },
      { name: 'Fresh dill', quantity: '2', unit: 'tbsp' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Place chicken breast in a large pot with chicken broth; bring to a boil, then reduce to a simmer and cook 15 minutes until chicken is cooked through.',
      },
      { step_number: 2, instruction: 'Remove chicken and shred with two forks; set aside.' },
      {
        step_number: 3,
        instruction:
          'Sauté diced onion, sliced carrots, and celery in the same pot with a drizzle of olive oil for 5 minutes.',
      },
      {
        step_number: 4,
        instruction:
          'Return broth to the pot, add shredded chicken, and bring to a simmer. Add egg noodles and cook 6–8 minutes until tender.',
      },
      {
        step_number: 5,
        instruction:
          'Stir in fresh dill and season with salt and pepper. Ladle into bowls and serve hot.',
      },
    ],
    tags: [
      'american',
      'soup',
      'dairy-free',
      'comfort-food',
      'family-friendly',
      'classic',
      'weeknight',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Tom Yum Goong',
    description:
      'Spicy and sour Thai soup with shrimp, mushrooms, lemongrass, and galangal — a paleo-friendly aromatic bowl.',
    cuisine: 'Thai',
    prep_minutes: 15,
    cook_minutes: 15,
    servings: 4,
    calories: 180,
    ingredients: [
      { name: 'Shrimp', quantity: '1', unit: 'lb' },
      { name: 'Lemongrass', quantity: '3', unit: 'stalk' },
      { name: 'Galangal', quantity: '3', unit: 'slice' },
      { name: 'Mushrooms', quantity: '6', unit: 'oz' },
      { name: 'Lime juice', quantity: '3', unit: 'tbsp' },
      { name: 'Fish sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Thai chiles', quantity: '3', unit: 'whole' },
      { name: 'Cilantro', quantity: '0.25', unit: 'cup' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Bruise lemongrass stalks with the back of a knife and slice galangal. Bring 4 cups of water or light chicken broth to a boil.',
      },
      {
        step_number: 2,
        instruction:
          'Add lemongrass, galangal, and torn kaffir lime leaves (if available). Simmer 5 minutes to infuse aromatics.',
      },
      { step_number: 3, instruction: 'Add halved mushrooms and Thai chiles; cook 3 minutes.' },
      {
        step_number: 4,
        instruction: 'Add shrimp and cook 3–4 minutes until pink and curled. Remove from heat.',
      },
      {
        step_number: 5,
        instruction:
          'Stir in lime juice and fish sauce. Garnish with cilantro and serve steaming hot.',
      },
    ],
    tags: [
      'thai',
      'soup',
      'paleo',
      'gluten-free',
      'dairy-free',
      'whole30',
      'keto',
      'spicy',
      'seafood',
      'quick',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'paleo', is_compliant: true },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ── Salads (2) ──────────────────────────────────────────────────────────
  {
    title: 'Classic Caesar Salad',
    description:
      'Crisp romaine lettuce tossed in a tangy garlic-anchovy dressing with crunchy croutons and shaved Parmesan.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 10,
    servings: 4,
    calories: 280,
    ingredients: [
      { name: 'Romaine lettuce', quantity: '2', unit: 'head' },
      { name: 'Parmesan cheese', quantity: '0.5', unit: 'cup' },
      { name: 'Anchovy fillets', quantity: '4', unit: 'piece' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Lemon juice', quantity: '2', unit: 'tbsp' },
      { name: 'Olive oil', quantity: '0.33', unit: 'cup' },
      { name: 'Croutons', quantity: '1', unit: 'cup' },
      { name: 'Dijon mustard', quantity: '1', unit: 'tsp' },
      { name: 'Egg yolk', quantity: '1', unit: 'whole' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Mash anchovy fillets and garlic into a paste with the flat side of a knife.',
      },
      {
        step_number: 2,
        instruction:
          'Whisk anchovy paste, lemon juice, Dijon mustard, and egg yolk together in a bowl.',
      },
      {
        step_number: 3,
        instruction:
          'Slowly drizzle in olive oil while whisking constantly to emulsify into a creamy dressing. Season with salt and pepper.',
      },
      {
        step_number: 4,
        instruction:
          'Tear romaine into bite-sized pieces and toss with the dressing until evenly coated.',
      },
      {
        step_number: 5,
        instruction:
          'Top with croutons and shaved Parmesan. Serve immediately as a side or add grilled chicken for a main.',
      },
    ],
    tags: ['american', 'salad', 'classic', 'quick'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Cobb Salad',
    description:
      'A loaded main-course salad with chicken, bacon, avocado, hard-boiled eggs, blue cheese, and a red-wine vinaigrette — keto perfection.',
    cuisine: 'American',
    prep_minutes: 20,
    cook_minutes: 15,
    servings: 4,
    calories: 480,
    ingredients: [
      { name: 'Chicken breast', quantity: '1', unit: 'lb' },
      { name: 'Bacon', quantity: '6', unit: 'slice' },
      { name: 'Avocado', quantity: '1', unit: 'whole' },
      { name: 'Eggs', quantity: '4', unit: 'whole' },
      { name: 'Blue cheese', quantity: '0.5', unit: 'cup' },
      { name: 'Mixed greens', quantity: '6', unit: 'cup' },
      { name: 'Red wine vinegar', quantity: '2', unit: 'tbsp' },
      { name: 'Olive oil', quantity: '3', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Season and grill or pan-sear chicken breast until cooked through, about 6 minutes per side. Slice into strips.',
      },
      {
        step_number: 2,
        instruction:
          'Cook bacon until crispy; crumble into pieces. Hard-boil eggs 12 minutes, cool, peel, and quarter.',
      },
      { step_number: 3, instruction: 'Dice avocado and crumble blue cheese.' },
      {
        step_number: 4,
        instruction:
          'Whisk red wine vinegar, olive oil, Dijon mustard, salt, and pepper into a vinaigrette.',
      },
      {
        step_number: 5,
        instruction:
          'Arrange mixed greens on a platter. Arrange chicken, bacon, avocado, eggs, and blue cheese in neat rows over the greens.',
      },
      { step_number: 6, instruction: 'Drizzle with vinaigrette and serve immediately.' },
    ],
    tags: ['american', 'salad', 'keto', 'high-protein', 'gluten-free', 'low-carb', 'main-course'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── More Desserts (2) ──────────────────────────────────────────────────
  {
    title: 'New York Cheesecake',
    description:
      'Dense, creamy cheesecake with a buttery graham cracker crust — the iconic rich and velvety American dessert.',
    cuisine: 'American',
    prep_minutes: 20,
    cook_minutes: 60,
    servings: 10,
    calories: 410,
    ingredients: [
      { name: 'Cream cheese', quantity: '32', unit: 'oz' },
      { name: 'Graham cracker crumbs', quantity: '1.5', unit: 'cup' },
      { name: 'Sugar', quantity: '1', unit: 'cup' },
      { name: 'Eggs', quantity: '4', unit: 'whole' },
      { name: 'Sour cream', quantity: '0.5', unit: 'cup' },
      { name: 'Butter', quantity: '6', unit: 'tbsp' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tbsp' },
      { name: 'Lemon juice', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction:
          'Preheat oven to 350°F. Mix graham cracker crumbs with melted butter and 2 tbsp sugar; press into a 9-inch springform pan. Bake 10 minutes; cool.',
      },
      {
        step_number: 2,
        instruction:
          'Beat cream cheese and remaining sugar until smooth and fluffy, about 3 minutes.',
      },
      {
        step_number: 3,
        instruction:
          'Add eggs one at a time, mixing on low after each. Blend in sour cream, vanilla, and lemon juice until just combined — do not overmix.',
      },
      {
        step_number: 4,
        instruction:
          'Pour filling over the cooled crust. Bake 55–60 minutes until edges are set but the center still has a slight jiggle.',
      },
      {
        step_number: 5,
        instruction:
          'Turn off oven, crack the door, and let cheesecake cool inside for 1 hour to prevent cracking.',
      },
      {
        step_number: 6,
        instruction:
          'Refrigerate at least 4 hours (overnight is best). Slice with a clean, hot knife and serve with fresh berries.',
      },
    ],
    tags: ['american', 'dessert', 'cheesecake', 'vegetarian', 'baked', 'make-ahead', 'celebration'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
  {
    title: 'Coconut Panna Cotta',
    description:
      'Silky coconut milk panna cotta set with agar and topped with fresh mango — a light, elegant, and entirely vegan Italian dessert.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 5,
    servings: 4,
    calories: 210,
    ingredients: [
      { name: 'Full-fat coconut milk', quantity: '14', unit: 'oz' },
      { name: 'Agar agar powder', quantity: '1.5', unit: 'tsp' },
      { name: 'Sugar', quantity: '3', unit: 'tbsp' },
      { name: 'Vanilla extract', quantity: '1', unit: 'tsp' },
      { name: 'Mango', quantity: '1', unit: 'whole' },
      { name: 'Coconut flakes', quantity: '2', unit: 'tbsp' },
      { name: 'Lime zest', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      {
        step_number: 1,
        instruction: 'Whisk coconut milk, sugar, and agar agar powder together in a saucepan.',
      },
      {
        step_number: 2,
        instruction:
          'Bring to a boil over medium heat, whisking constantly. Boil 1 minute to fully activate the agar.',
      },
      {
        step_number: 3,
        instruction:
          'Remove from heat and stir in vanilla extract. Pour into 4 ramekins or glasses.',
      },
      {
        step_number: 4,
        instruction: 'Refrigerate at least 2 hours until fully set and firm to the touch.',
      },
      {
        step_number: 5,
        instruction:
          'Dice mango and toss with lime zest. Top each panna cotta with mango and toasted coconut flakes before serving.',
      },
    ],
    tags: [
      'italian',
      'dessert',
      'vegan',
      'vegetarian',
      'dairy-free',
      'gluten-free',
      'no-bake',
      'light',
      'elegant',
    ],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },
];

// ── Seed Function ───────────────────────────────────────────────────────────

/**
 * Seed all recipes into the database.
 * Inserts into recipes, recipe_ingredients, recipe_steps,
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
    const instructionRows = recipe.steps.map((inst) => ({
      recipe_id: recipeId,
      step_number: inst.step_number,
      instruction: inst.instruction,
      timer_minutes: inst.timer_minutes ?? null,
    }));

    const { error: instError } = await sb.from('recipe_steps').insert(instructionRows);
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

    // 6. Insert nutrition data
    if (recipe.nutrition) {
      const { error: nutError } = await sb.from('recipe_nutrition').insert({
        recipe_id: recipeId,
        calories: recipe.nutrition.calories,
        protein_g: recipe.nutrition.protein_g,
        carbs_g: recipe.nutrition.carbs_g,
        fat_g: recipe.nutrition.fat_g,
        fiber_g: recipe.nutrition.fiber_g,
        sugar_g: recipe.nutrition.sugar_g,
        sodium_mg: recipe.nutrition.sodium_mg,
      });
      if (nutError) {
        console.error(`  Nutrition error for "${recipe.title}":`, nutError.message);
      }
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
