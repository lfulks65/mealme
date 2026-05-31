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

  // ══ Batch 5: More Variety (10 recipes) ═══════════════════════════════════

  // ── More Asian (2) ──────────────────────────────────────────────────────
  {
    title: 'Sushi Bowl',
    description: 'Deconstructed sushi with seasoned rice, raw fish, avocado, cucumber, and nori — all the flavors without the rolling.',
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
    instructions: [
      { step_number: 1, instruction: 'Cook sushi rice and season with rice vinegar, sugar, and salt while still warm.' },
      { step_number: 2, instruction: 'Dice sushi-grade tuna into half-inch cubes; toss lightly with tamari.' },
      { step_number: 3, instruction: 'Slice avocado and cucumber into thin pieces.' },
      { step_number: 4, instruction: 'Cut nori sheets into thin strips with scissors.' },
      { step_number: 5, instruction: 'Divide rice among bowls and arrange tuna, avocado, and cucumber on top.' },
      { step_number: 6, instruction: 'Garnish with nori strips, sesame seeds, and extra tamari on the side.' },
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
    description: 'Aromatic coconut curry with chicken, Thai eggplant, and fresh basil in green curry paste.',
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
    instructions: [
      { step_number: 1, instruction: 'Slice chicken into bite-sized pieces.' },
      { step_number: 2, instruction: 'Fry green curry paste in a splash of coconut cream over medium heat until fragrant, about 2 minutes.' },
      { step_number: 3, instruction: 'Add chicken and stir to coat; cook 3 minutes until sealed on all sides.' },
      { step_number: 4, instruction: 'Pour in remaining coconut milk, Thai eggplant, and bamboo shoots. Simmer 15 minutes.' },
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
    description: 'Fresh and chunky avocado dip with lime, cilantro, jalapeño, and tomato — the ultimate whole30 snack.',
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
    instructions: [
      { step_number: 1, instruction: 'Halve avocados, remove pits, and scoop flesh into a bowl.' },
      { step_number: 2, instruction: 'Mash with a fork to desired chunkiness.' },
      { step_number: 3, instruction: 'Dice tomato, finely mince jalapeño and onion; add to bowl.' },
      { step_number: 4, instruction: 'Stir in lime juice, chopped cilantro, and salt.' },
      { step_number: 5, instruction: 'Taste and adjust seasoning. Serve immediately with chips or veggie sticks.' },
    ],
    tags: ['mexican', 'dip', 'whole30', 'vegan', 'gluten-free', 'dairy-free', 'no-cook'],
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
    description: 'Hearty Mexican stew with tender pork, hominy, and dried chile broth — topped with cabbage and radish.',
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
    instructions: [
      { step_number: 1, instruction: 'Toast guajillo and ancho chiles in a dry pan; soak in hot water 20 minutes.' },
      { step_number: 2, instruction: 'Blend rehydrated chiles with onion, garlic, and oregano into a smooth sauce.' },
      { step_number: 3, instruction: 'Brown cubed pork shoulder in a large pot; drain excess fat.' },
      { step_number: 4, instruction: 'Add chile sauce, hominy, and enough water to cover. Bring to a boil, then simmer 45 minutes.' },
      { step_number: 5, instruction: 'Season with salt. Ladle into bowls and serve with sliced radishes, shredded cabbage, and lime.' },
    ],
    tags: ['mexican', 'stew', 'gluten-free', 'dairy-free', 'comfort-food'],
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
    description: 'Creamy arborio rice slowly stirred with mixed mushrooms, white wine, and Parmesan.',
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
    instructions: [
      { step_number: 1, instruction: 'Warm broth in a saucepan; keep at a low simmer.' },
      { step_number: 2, instruction: 'Sauté sliced mushrooms in butter until golden, about 5 minutes; set aside.' },
      { step_number: 3, instruction: 'Cook diced shallot until translucent. Add arborio rice and toast 2 minutes.' },
      { step_number: 4, instruction: 'Deglaze with white wine, stirring until absorbed.' },
      { step_number: 5, instruction: 'Add warm broth one ladle at a time, stirring often, for about 20 minutes until rice is creamy.' },
      { step_number: 6, instruction: 'Fold in mushrooms, Parmesan, and thyme. Season and serve immediately.' },
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
    description: 'Crispy toasted bread topped with fresh tomatoes, garlic, basil, and a drizzle of extra-virgin olive oil.',
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
    instructions: [
      { step_number: 1, instruction: 'Dice tomatoes and toss with chopped basil, balsamic vinegar, salt, and 1 tbsp olive oil.' },
      { step_number: 2, instruction: 'Slice ciabatta into half-inch thick pieces.' },
      { step_number: 3, instruction: 'Brush bread with olive oil and toast under a broiler or on a grill until golden, about 2 minutes per side.' },
      { step_number: 4, instruction: 'Rub cut garlic clove across the warm toast surface.' },
      { step_number: 5, instruction: 'Spoon tomato mixture onto each toast and drizzle with remaining olive oil. Serve immediately.' },
    ],
    tags: ['italian', 'appetizer', 'vegetarian', 'quick', 'no-cook-topping'],
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
    description: 'Buttermilk-brined chicken dredged in seasoned flour and fried to golden, crispy perfection.',
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
    instructions: [
      { step_number: 1, instruction: 'Soak chicken pieces in buttermilk with 1 tsp salt for at least 2 hours (overnight is best).' },
      { step_number: 2, instruction: 'Mix flour, paprika, garlic powder, cayenne, and salt in a shallow dish.' },
      { step_number: 3, instruction: 'Remove chicken from buttermilk; dredge in seasoned flour, pressing firmly to coat.' },
      { step_number: 4, instruction: 'Heat oil to 350°F in a heavy skillet. Fry chicken 6–8 minutes per side until deep golden and cooked through.' },
      { step_number: 5, instruction: 'Drain on a wire rack set over a sheet pan. Rest 5 minutes before serving.' },
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
    description: 'Thick and creamy chowder loaded with tender clams, potatoes, and bacon in a rich cream base.',
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
    instructions: [
      { step_number: 1, instruction: 'Cook chopped bacon in a large pot until crispy; remove and set aside.' },
      { step_number: 2, instruction: 'Sauté diced onion in bacon drippings and butter until soft, about 5 minutes.' },
      { step_number: 3, instruction: 'Add diced potatoes, clam juice from cans, thyme, and bay leaf. Simmer 15 minutes until potatoes are tender.' },
      { step_number: 4, instruction: 'Stir in heavy cream and chopped clams; heat through gently for 5 minutes (do not boil).' },
      { step_number: 5, instruction: 'Discard bay leaf. Season with salt and pepper. Top with crumbled bacon and serve with oyster crackers.' },
    ],
    tags: ['american', 'soup', 'comfort-food', 'seafood', 'new-england'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
      { restriction: 'whole30', is_compliant: false },
    ],
  },

  // ── Snacks / Appetizers (2) ─────────────────────────────────────────────
  {
    title: 'Stuffed Mushrooms',
    description: 'Savory mushroom caps filled with sausage, garlic, and herbs — a crowd-pleasing whole30 appetizer.',
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
    instructions: [
      { step_number: 1, instruction: 'Preheat oven to 375°F. Remove mushroom stems and hollow caps slightly; chop stems finely.' },
      { step_number: 2, instruction: 'Brown sausage in a skillet, breaking it up. Add chopped stems, diced onion, and garlic; cook 5 minutes.' },
      { step_number: 3, instruction: 'Remove from heat and stir in almond flour and parsley.' },
      { step_number: 4, instruction: 'Fill each mushroom cap with the sausage mixture, pressing gently.' },
      { step_number: 5, instruction: 'Place on a parchment-lined sheet pan, drizzle with olive oil, and bake 18–20 minutes until mushrooms are tender.' },
    ],
    tags: ['american', 'appetizer', 'whole30', 'gluten-free', 'dairy-free', 'party-food'],
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
    description: 'Classic hard-boiled eggs with a creamy, tangy yolk filling and a dash of paprika — the timeless appetizer.',
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
    instructions: [
      { step_number: 1, instruction: 'Place eggs in a single layer in a pot; cover with cold water by 1 inch. Bring to a boil, then cover and remove from heat for 12 minutes.' },
      { step_number: 2, instruction: 'Transfer eggs to an ice bath for 5 minutes. Peel carefully.' },
      { step_number: 3, instruction: 'Halve eggs lengthwise and gently remove yolks into a bowl.' },
      { step_number: 4, instruction: 'Mash yolks with mayonnaise, mustard, vinegar, and salt until smooth.' },
      { step_number: 5, instruction: 'Pipe or spoon yolk mixture back into egg whites. Dust with paprika and garnish with chives.' },
    ],
    tags: ['american', 'appetizer', 'gluten-free', 'dairy-free', 'whole30', 'keto', 'party-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
      { restriction: 'whole30', is_compliant: true },
    ],
  },

  // ══ Batch 2: Mediterranean & Indian (8 recipes) ═════════════════════════

  // ── Mediterranean (4) ───────────────────────────────────────────────────
  {
    title: 'Greek Salad',
    description: 'Crisp cucumber, juicy tomatoes, olives, and red onion tossed in a bright lemon-oregano vinaigrette.',
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
    instructions: [
      { step_number: 1, instruction: 'Chop cucumber into half-moons and tomatoes into wedges.' },
      { step_number: 2, instruction: 'Thinly slice red onion into rings and soak in cold water for 5 minutes to mellow bite.' },
      { step_number: 3, instruction: 'Whisk olive oil, red wine vinegar, oregano, salt, and pepper into a vinaigrette.' },
      { step_number: 4, instruction: 'Combine vegetables and olives in a large bowl.' },
      { step_number: 5, instruction: 'Drizzle vinaigrette over salad, toss gently, and serve immediately.' },
    ],
    tags: ['mediterranean', 'salad', 'vegan', 'gluten-free', 'dairy-free', 'whole30', 'no-cook'],
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
    description: 'Creamy chickpea hummus loaded bowl with roasted veggies, pickled onion, and a drizzle of tahini.',
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
    instructions: [
      { step_number: 1, instruction: 'Drain and rinse one can of chickpeas. Blend with tahini, lemon juice, garlic, and salt until smooth.' },
      { step_number: 2, instruction: 'Cube sweet potato, toss with olive oil and smoked paprika, and roast at 400°F for 25 minutes.' },
      { step_number: 3, instruction: 'Quick-pickle thinly sliced red onion in lemon juice and a pinch of sugar for 10 minutes.' },
      { step_number: 4, instruction: 'Spread hummus in shallow bowls. Top with roasted sweet potato, pickled onion, and remaining whole chickpeas.' },
      { step_number: 5, instruction: 'Drizzle with extra tahini and olive oil. Serve with warm pita or veggie sticks.' },
    ],
    tags: ['mediterranean', 'bowl', 'vegan', 'dairy-free', 'gluten-free', 'plant-based'],
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
    description: 'Eggs poached in a spiced tomato-pepper sauce with cumin and paprika — a Mediterranean brunch staple.',
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
    instructions: [
      { step_number: 1, instruction: 'Sauté diced onion and bell pepper in olive oil until softened, about 5 minutes.' },
      { step_number: 2, instruction: 'Add garlic, cumin, and smoked paprika; cook 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Pour in crushed tomatoes, season with salt, and simmer 10 minutes until thickened.' },
      { step_number: 4, instruction: 'Make six wells in the sauce and crack an egg into each. Cover and cook 6–8 minutes until whites are set.' },
      { step_number: 5, instruction: 'Top with crumbled feta and fresh cilantro. Serve straight from the skillet with crusty bread.' },
    ],
    tags: ['mediterranean', 'breakfast', 'vegetarian', 'dairy-free', 'gluten-free', 'one-pan'],
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
    description: 'Pan-seared white fish fillets with a bright lemon, garlic, and herb sauce — light and whole30-friendly.',
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
    instructions: [
      { step_number: 1, instruction: 'Pat cod fillets dry and season with salt, pepper, and a squeeze of lemon juice.' },
      { step_number: 2, instruction: 'Heat olive oil in a skillet over medium-high heat. Sear fish 4 minutes per side until golden and flaky.' },
      { step_number: 3, instruction: 'Remove fish; reduce heat. Add minced garlic, oregano, and thyme to the pan; sauté 30 seconds.' },
      { step_number: 4, instruction: 'Add halved cherry tomatoes and lemon juice; cook 2 minutes until tomatoes soften.' },
      { step_number: 5, instruction: 'Spoon herb-tomato pan sauce over fish and serve immediately.' },
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
    description: 'Tender chicken in a rich, creamy tomato-butter sauce with warm spices — the iconic Indian comfort dish.',
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
    instructions: [
      { step_number: 1, instruction: 'Cut chicken into bite-sized pieces and marinate in yogurt, garam masala, and salt for 30 minutes.' },
      { step_number: 2, instruction: 'Sear marinated chicken in a hot skillet until browned on all sides; set aside.' },
      { step_number: 3, instruction: 'Melt butter in the same pan. Sauté ginger and garlic 1 minute, then add tomato sauce and remaining garam masala.' },
      { step_number: 4, instruction: 'Simmer sauce 15 minutes, then stir in heavy cream and return chicken. Cook 10 minutes until chicken is cooked through.' },
      { step_number: 5, instruction: 'Serve over steamed basmati rice, garnished with cilantro.' },
    ],
    tags: ['indian', 'curry', 'comfort-food', 'family-friendly'],
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
    description: 'Hearty chickpea curry simmered in a fragrant tomato sauce with cumin, coriander, and garam masala.',
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
    instructions: [
      { step_number: 1, instruction: 'Sauté diced onion in oil until golden, about 6 minutes.' },
      { step_number: 2, instruction: 'Add garlic, ginger, cumin, and garam masala; cook 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Pour in diced tomatoes and simmer 10 minutes, mashing some tomatoes for a thicker sauce.' },
      { step_number: 4, instruction: 'Add drained chickpeas and simmer 15 minutes until flavors meld and sauce reduces.' },
      { step_number: 5, instruction: 'Season with salt and a squeeze of lemon. Garnish with cilantro and serve with rice or naan.' },
    ],
    tags: ['indian', 'curry', 'vegan', 'dairy-free', 'gluten-free', 'plant-based', 'high-protein'],
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
    description: 'Creamy spiced spinach sauce studded with golden seared paneer cubes — a beloved Indian vegetarian classic.',
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
    instructions: [
      { step_number: 1, instruction: 'Blanch spinach in boiling water 2 minutes; transfer to ice water, drain, and blend into a smooth purée.' },
      { step_number: 2, instruction: 'Cube paneer and pan-fry in oil until golden on all sides; set aside.' },
      { step_number: 3, instruction: 'Sauté diced onion until golden. Add garlic, ginger, cumin, and garam masala; cook 1 minute.' },
      { step_number: 4, instruction: 'Stir in spinach purée and heavy cream; simmer 10 minutes until thick and velvety.' },
      { step_number: 5, instruction: 'Fold in paneer cubes, season with salt, and serve with naan or rice.' },
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
    description: 'Fragrant layered rice dish with spiced chicken, saffron, caramelized onions, and fresh mint — a celebratory Indian feast.',
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
    instructions: [
      { step_number: 1, instruction: 'Marinate chicken in yogurt, garam masala, ginger, garlic, and salt for at least 30 minutes.' },
      { step_number: 2, instruction: 'Parboil basmati rice until 70% cooked; drain. Steep saffron in 2 tbsp warm milk.' },
      { step_number: 3, instruction: 'Thinly slice onions and fry until deep golden and crispy; set aside for garnish.' },
      { step_number: 4, instruction: 'Layer marinated chicken in a heavy pot, top with parboiled rice, saffron milk, and fried onions.' },
      { step_number: 5, instruction: 'Seal pot with a tight lid and cook on low heat (dum) for 25 minutes until rice is fluffy and chicken is tender.' },
      { step_number: 6, instruction: 'Gently mix layers before serving. Garnish with fresh mint and remaining fried onions.' },
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
