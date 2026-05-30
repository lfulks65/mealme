/**
 * @module recipe/seed
 * Recipe seed script — populates the database with the first 25 recipes.
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

const recipes: SeedRecipe[] = [
  // ══ Mexican (5) ══════════════════════════════════════════════════════════
  {
    title: 'Classic Beef Tacos',
    description: 'Seasoned ground beef in crispy corn tortillas with fresh toppings. A family-friendly weeknight staple.',
    cuisine: 'Mexican',
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    calories: 380,
    ingredients: [
      { name: 'Ground beef', quantity: '1', unit: 'lb' },
      { name: 'Corn tortillas', quantity: '8', unit: 'piece' },
      { name: 'Taco seasoning', quantity: '2', unit: 'tbsp' },
      { name: 'Shredded lettuce', quantity: '1', unit: 'cup' },
      { name: 'Diced tomatoes', quantity: '1', unit: 'cup' },
      { name: 'Shredded cheddar cheese', quantity: '0.5', unit: 'cup' },
      { name: 'Sour cream', quantity: '0.25', unit: 'cup' },
      { name: 'Salsa', quantity: '0.5', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Brown ground beef in a large skillet over medium-high heat, breaking it apart with a spoon.' },
      { step_number: 2, instruction: 'Drain excess fat and add taco seasoning with 1/4 cup water. Simmer 5 minutes.' },
      { step_number: 3, instruction: 'Warm corn tortillas in a dry skillet or directly over a gas flame for 30 seconds per side.' },
      { step_number: 4, instruction: 'Spoon seasoned beef into each tortilla.' },
      { step_number: 5, instruction: 'Top with lettuce, tomatoes, cheese, sour cream, and salsa as desired.' },
      { step_number: 6, instruction: 'Serve immediately with lime wedges on the side.' },
    ],
    tags: ['quick', 'weeknight', 'family-friendly', 'kid-approved'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Chicken Enchiladas',
    description: 'Corn tortillas rolled around shredded chicken and smothered in red enchilada sauce and melted cheese.',
    cuisine: 'Mexican',
    prep_minutes: 20,
    cook_minutes: 25,
    servings: 6,
    calories: 420,
    ingredients: [
      { name: 'Shredded chicken', quantity: '3', unit: 'cup' },
      { name: 'Corn tortillas', quantity: '12', unit: 'piece' },
      { name: 'Red enchilada sauce', quantity: '28', unit: 'oz' },
      { name: 'Shredded Monterey Jack cheese', quantity: '2', unit: 'cup' },
      { name: 'Diced onion', quantity: '0.5', unit: 'cup' },
      { name: 'Ground cumin', quantity: '1', unit: 'tsp' },
      { name: 'Chopped cilantro', quantity: '0.25', unit: 'cup' },
      { name: 'Sour cream', quantity: '0.5', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Preheat oven to 375°F. Spread 1/2 cup enchilada sauce on the bottom of a 9x13 baking dish.' },
      { step_number: 2, instruction: 'Mix shredded chicken, half the cheese, onion, cumin, and 1/2 cup enchilada sauce in a bowl.' },
      { step_number: 3, instruction: 'Warm tortillas briefly to make them pliable. Spoon filling down the center of each tortilla.' },
      { step_number: 4, instruction: 'Roll tortillas tightly and place seam-side down in the baking dish.' },
      { step_number: 5, instruction: 'Pour remaining enchilada sauce over the rolled tortillas and top with remaining cheese.' },
      { step_number: 6, instruction: 'Bake for 20 minutes until cheese is bubbly and golden.' },
      { step_number: 7, instruction: 'Let rest 5 minutes, then garnish with cilantro and sour cream. Serve.' },
    ],
    tags: ['baked', 'comfort-food', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Guacamole',
    description: 'Fresh and zesty avocado dip with lime, cilantro, and jalapeño. Ready in 10 minutes.',
    cuisine: 'Mexican',
    prep_minutes: 10,
    cook_minutes: 0,
    servings: 6,
    calories: 120,
    ingredients: [
      { name: 'Ripe avocados', quantity: '3', unit: 'whole' },
      { name: 'Fresh lime juice', quantity: '2', unit: 'tbsp' },
      { name: 'Diced red onion', quantity: '0.25', unit: 'cup' },
      { name: 'Chopped cilantro', quantity: '2', unit: 'tbsp' },
      { name: 'Minced jalapeño', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
      { name: 'Diced tomato', quantity: '0.5', unit: 'cup', optional: true },
    ],
    instructions: [
      { step_number: 1, instruction: 'Halve avocados, remove pits, and scoop flesh into a bowl.' },
      { step_number: 2, instruction: 'Mash with a fork to desired consistency — chunky or smooth.' },
      { step_number: 3, instruction: 'Add lime juice, red onion, cilantro, jalapeño, and salt. Stir to combine.' },
      { step_number: 4, instruction: 'Fold in diced tomato if using. Taste and adjust salt and lime.' },
      { step_number: 5, instruction: 'Serve immediately with tortilla chips or cover tightly and refrigerate.' },
    ],
    tags: ['quick', 'no-cook', 'appetizer', 'snack', 'vegan'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: true },
    ],
  },
  {
    title: 'Vegan Black Bean Soup',
    description: 'Hearty and smoky black bean soup topped with avocado and tortilla strips. Naturally vegan and gluten-free.',
    cuisine: 'Mexican',
    prep_minutes: 10,
    cook_minutes: 30,
    servings: 4,
    calories: 280,
    ingredients: [
      { name: 'Canned black beans', quantity: '3', unit: 'can' },
      { name: 'Vegetable broth', quantity: '3', unit: 'cup' },
      { name: 'Diced onion', quantity: '1', unit: 'cup' },
      { name: 'Minced garlic', quantity: '3', unit: 'clove' },
      { name: 'Ground cumin', quantity: '1.5', unit: 'tsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Diced avocado', quantity: '1', unit: 'whole' },
      { name: 'Tortilla strips', quantity: '1', unit: 'cup' },
      { name: 'Fresh cilantro', quantity: '2', unit: 'tbsp' },
      { name: 'Lime juice', quantity: '1', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Sauté onion in a large pot with olive oil over medium heat until soft, about 5 minutes.' },
      { step_number: 2, instruction: 'Add garlic, cumin, and smoked paprika. Cook 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Add black beans (undrained) and vegetable broth. Bring to a boil.' },
      { step_number: 4, instruction: 'Reduce heat and simmer 20 minutes.' },
      { step_number: 5, instruction: 'Blend half the soup with an immersion blender for a creamy texture, leaving some beans whole.' },
      { step_number: 6, instruction: 'Stir in lime juice. Ladle into bowls and top with avocado, tortilla strips, and cilantro.' },
    ],
    tags: ['soup', 'vegan', 'gluten-free', 'comfort-food', 'weeknight'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Carnitas',
    description: 'Slow-braised pork shoulder, crispy on the outside and tender inside. Perfect for tacos, burritos, or rice bowls.',
    cuisine: 'Mexican',
    prep_minutes: 15,
    cook_minutes: 180,
    servings: 8,
    calories: 340,
    ingredients: [
      { name: 'Pork shoulder', quantity: '3', unit: 'lb' },
      { name: 'Orange juice', quantity: '0.5', unit: 'cup' },
      { name: 'Lime juice', quantity: '2', unit: 'tbsp' },
      { name: 'Minced garlic', quantity: '4', unit: 'clove' },
      { name: 'Ground cumin', quantity: '1', unit: 'tbsp' },
      { name: 'Dried oregano', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1.5', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.5', unit: 'tsp' },
      { name: 'Bay leaves', quantity: '2', unit: 'whole' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cut pork shoulder into 2-inch chunks. Season generously with salt, pepper, cumin, and oregano.' },
      { step_number: 2, instruction: 'Place pork in a Dutch oven. Add garlic, bay leaves, orange juice, and lime juice.' },
      { step_number: 3, instruction: 'Add enough water to barely cover the pork. Bring to a boil over medium-high heat.' },
      { step_number: 4, instruction: 'Reduce heat to low, cover, and simmer for 2 to 2.5 hours until pork is fork-tender.' },
      { step_number: 5, instruction: 'Remove lid and increase heat. Cook off remaining liquid until pork begins to fry in its own fat, about 15 minutes.' },
      { step_number: 6, instruction: 'Shred pork with two forks. Let edges crisp in the pot for another 5 minutes.' },
      { step_number: 7, instruction: 'Remove bay leaves. Serve with warm tortillas, diced onion, cilantro, and salsa.' },
    ],
    tags: ['slow-cook', 'weekend-project', 'make-ahead', 'keto'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },

  // ══ Italian (5) ══════════════════════════════════════════════════════════
  {
    title: 'Spaghetti Carbonara',
    description: 'Classic Roman pasta with guanciale, egg yolk, Pecorino Romano, and black pepper. No cream allowed.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 520,
    ingredients: [
      { name: 'Spaghetti', quantity: '1', unit: 'lb' },
      { name: 'Guanciale (or pancetta)', quantity: '6', unit: 'oz' },
      { name: 'Egg yolks', quantity: '4', unit: 'whole' },
      { name: 'Whole egg', quantity: '1', unit: 'whole' },
      { name: 'Pecorino Romano', quantity: '1', unit: 'cup' },
      { name: 'Black pepper', quantity: '2', unit: 'tsp' },
      { name: 'Salt', quantity: '1', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Bring a large pot of well-salted water to a boil. Cook spaghetti until al dente.' },
      { step_number: 2, instruction: 'While pasta cooks, cut guanciale into small strips and render in a cold skillet over medium heat until crispy, about 8 minutes.' },
      { step_number: 3, instruction: 'Whisk together egg yolks, whole egg, grated Pecorino, and black pepper in a bowl.' },
      { step_number: 4, instruction: 'Reserve 1 cup pasta water, then drain pasta.' },
      { step_number: 5, instruction: 'Add hot pasta to the guanciale skillet (heat OFF). Toss vigorously.' },
      { step_number: 6, instruction: 'Pour egg mixture over pasta and toss quickly, adding pasta water a splash at a time to create a silky sauce.' },
      { step_number: 7, instruction: 'Serve immediately topped with extra Pecorino and cracked black pepper.' },
    ],
    tags: ['classic', 'pasta', 'weeknight', 'comfort-food'],
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
    description: 'Neapolitan-style pizza with San Marzano tomato sauce, fresh mozzarella, and basil. Simple perfection.',
    cuisine: 'Italian',
    prep_minutes: 20,
    cook_minutes: 12,
    servings: 2,
    calories: 450,
    ingredients: [
      { name: 'Pizza dough', quantity: '1', unit: 'lb' },
      { name: 'San Marzano tomatoes', quantity: '1', unit: 'can' },
      { name: 'Fresh mozzarella', quantity: '8', unit: 'oz' },
      { name: 'Fresh basil leaves', quantity: '10', unit: 'piece' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
      { name: 'Semolina flour', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Preheat oven to 500°F (or as hot as it goes) with a pizza stone or inverted baking sheet inside for 30 minutes.' },
      { step_number: 2, instruction: 'Crush San Marzano tomatoes by hand, season with salt, and set aside.' },
      { step_number: 3, instruction: 'Stretch dough on a floured surface into a 12-inch round. Transfer to a semolina-dusted peel or parchment.' },
      { step_number: 4, instruction: 'Spread crushed tomatoes evenly, leaving a 1-inch border.' },
      { step_number: 5, instruction: 'Tear mozzarella into pieces and distribute over the sauce.' },
      { step_number: 6, instruction: 'Slide pizza onto the hot stone. Bake 10-12 minutes until crust is charred and cheese is bubbling.' },
      { step_number: 7, instruction: 'Remove, top with fresh basil and a drizzle of olive oil. Slice and serve.' },
    ],
    tags: ['pizza', 'classic', 'vegetarian', 'baked'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Pesto Pasta',
    description: 'Fresh basil pesto tossed with trofie pasta, green beans, and potatoes. A Ligurian classic.',
    cuisine: 'Italian',
    prep_minutes: 15,
    cook_minutes: 15,
    servings: 4,
    calories: 440,
    ingredients: [
      { name: 'Trofie pasta (or fusilli)', quantity: '1', unit: 'lb' },
      { name: 'Fresh basil leaves', quantity: '2', unit: 'cup' },
      { name: 'Pine nuts', quantity: '0.25', unit: 'cup' },
      { name: 'Garlic', quantity: '2', unit: 'clove' },
      { name: 'Parmigiano-Reggiano', quantity: '0.5', unit: 'cup' },
      { name: 'Olive oil', quantity: '0.5', unit: 'cup' },
      { name: 'Green beans', quantity: '0.5', unit: 'lb' },
      { name: 'Small potatoes', quantity: '2', unit: 'whole' },
      { name: 'Salt', quantity: '1', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Blend basil, pine nuts, garlic, Parmigiano, and olive oil in a food processor until smooth. Season with salt.' },
      { step_number: 2, instruction: 'Bring a large pot of salted water to a boil. Cut potatoes into chunks and trim green beans.' },
      { step_number: 3, instruction: 'Add potatoes to the boiling water and cook 5 minutes. Add green beans and pasta; cook until pasta is al dente.' },
      { step_number: 4, instruction: 'Reserve 1 cup pasta water, then drain everything together.' },
      { step_number: 5, instruction: 'Return to the pot, add pesto, and toss. Add pasta water as needed for a creamy consistency.' },
      { step_number: 6, instruction: 'Serve with extra Parmigiano on top.' },
    ],
    tags: ['pasta', 'pesto', 'weeknight', 'vegetarian'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Minestrone Soup',
    description: 'A rustic vegetable and bean soup with pasta, simmered in a tomato broth. Hearty and nourishing.',
    cuisine: 'Italian',
    prep_minutes: 15,
    cook_minutes: 35,
    servings: 6,
    calories: 260,
    ingredients: [
      { name: 'Diced onion', quantity: '1', unit: 'cup' },
      { name: 'Diced carrot', quantity: '1', unit: 'cup' },
      { name: 'Diced celery', quantity: '1', unit: 'cup' },
      { name: 'Minced garlic', quantity: '3', unit: 'clove' },
      { name: 'Crushed tomatoes', quantity: '28', unit: 'oz' },
      { name: 'Vegetable broth', quantity: '4', unit: 'cup' },
      { name: 'Canned cannellini beans', quantity: '1', unit: 'can' },
      { name: 'Diced zucchini', quantity: '1', unit: 'cup' },
      { name: 'Small pasta (ditalini)', quantity: '0.5', unit: 'cup' },
      { name: 'Chopped kale', quantity: '2', unit: 'cup' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Parmesan rind', quantity: '1', unit: 'piece', optional: true },
    ],
    instructions: [
      { step_number: 1, instruction: 'Heat olive oil in a large pot. Sauté onion, carrot, and celery for 5 minutes.' },
      { step_number: 2, instruction: 'Add garlic and cook 1 minute.' },
      { step_number: 3, instruction: 'Add crushed tomatoes, vegetable broth, and Parmesan rind if using. Bring to a boil.' },
      { step_number: 4, instruction: 'Reduce heat, add zucchini and beans, and simmer 15 minutes.' },
      { step_number: 5, instruction: 'Add pasta and cook until al dente, about 8 minutes.' },
      { step_number: 6, instruction: 'Stir in kale and cook 3 more minutes until wilted.' },
      { step_number: 7, instruction: 'Season with salt and pepper. Remove Parmesan rind. Serve with crusty bread.' },
    ],
    tags: ['soup', 'vegetarian', 'weeknight', 'comfort-food', 'healthy'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Risotto alla Milanese',
    description: 'Creamy Arborio rice infused with saffron, white wine, and Parmigiano. A luxurious weekend dish.',
    cuisine: 'Italian',
    prep_minutes: 10,
    cook_minutes: 35,
    servings: 4,
    calories: 480,
    ingredients: [
      { name: 'Arborio rice', quantity: '1.5', unit: 'cup' },
      { name: 'Saffron threads', quantity: '0.5', unit: 'tsp' },
      { name: 'Chicken broth', quantity: '5', unit: 'cup' },
      { name: 'Dry white wine', quantity: '0.5', unit: 'cup' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Finely diced onion', quantity: '0.5', unit: 'cup' },
      { name: 'Parmigiano-Reggiano', quantity: '0.75', unit: 'cup' },
      { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Warm broth in a saucepan; steep saffron threads in 2 tablespoons warm broth.' },
      { step_number: 2, instruction: 'Heat olive oil and 1 tbsp butter in a wide pan. Sauté onion until translucent, about 3 minutes.' },
      { step_number: 3, instruction: 'Add rice and stir 2 minutes until edges become translucent.' },
      { step_number: 4, instruction: 'Pour in wine and stir until absorbed.' },
      { step_number: 5, instruction: 'Add warm broth one ladle at a time, stirring frequently. Wait until each addition is mostly absorbed before adding the next.' },
      { step_number: 6, instruction: 'After about 20 minutes, stir in saffron mixture. Continue adding broth until rice is creamy but still al dente.' },
      { step_number: 7, instruction: 'Remove from heat. Stir in remaining butter and Parmigiano. Season with salt and serve.' },
    ],
    tags: ['rice', 'weekend-project', 'comfort-food', 'special-occasion'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },

  // ══ Asian (5) ════════════════════════════════════════════════════════════
  {
    title: 'Chicken Stir-Fry',
    description: 'Quick wok-fired chicken and vegetables in a savory soy-ginger sauce. Ready in 20 minutes.',
    cuisine: 'Asian',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 320,
    ingredients: [
      { name: 'Chicken breast', quantity: '1', unit: 'lb' },
      { name: 'Broccoli florets', quantity: '2', unit: 'cup' },
      { name: 'Sliced bell pepper', quantity: '1', unit: 'cup' },
      { name: 'Soy sauce', quantity: '3', unit: 'tbsp' },
      { name: 'Grated ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Minced garlic', quantity: '2', unit: 'clove' },
      { name: 'Sesame oil', quantity: '1', unit: 'tbsp' },
      { name: 'Cornstarch', quantity: '1', unit: 'tbsp' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'Sliced green onion', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Slice chicken into thin strips. Toss with 1 tbsp soy sauce and cornstarch.' },
      { step_number: 2, instruction: 'Heat vegetable oil in a wok over high heat until smoking.' },
      { step_number: 3, instruction: 'Add chicken in a single layer; sear 2 minutes per side. Remove and set aside.' },
      { step_number: 4, instruction: 'Add broccoli and bell pepper to the wok. Stir-fry 3 minutes until crisp-tender.' },
      { step_number: 5, instruction: 'Return chicken to the wok. Add remaining soy sauce, ginger, garlic, and sesame oil.' },
      { step_number: 6, instruction: 'Toss everything together for 1 minute until sauce coats evenly.' },
      { step_number: 7, instruction: 'Serve over steamed rice, garnished with green onion.' },
    ],
    tags: ['quick', 'stir-fry', 'weeknight', 'high-protein'],
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
    description: 'Classic Thai rice noodles with shrimp, bean sprouts, peanuts, and tangy tamarind sauce.',
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
      { name: 'Sugar', quantity: '2', unit: 'tbsp' },
      { name: 'Eggs', quantity: '2', unit: 'whole' },
      { name: 'Bean sprouts', quantity: '1', unit: 'cup' },
      { name: 'Crushed peanuts', quantity: '0.25', unit: 'cup' },
      { name: 'Lime wedges', quantity: '4', unit: 'piece' },
      { name: 'Chopped green onion', quantity: '3', unit: 'tbsp' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Soak rice noodles in hot water for 8-10 minutes until pliable but firm. Drain.' },
      { step_number: 2, instruction: 'Mix tamarind paste, fish sauce, and sugar in a small bowl to make the sauce.' },
      { step_number: 3, instruction: 'Heat oil in a wok over high heat. Cook shrimp 2 minutes until pink; push to the side.' },
      { step_number: 4, instruction: 'Crack eggs into the wok and scramble quickly.' },
      { step_number: 5, instruction: 'Add drained noodles and pour sauce over everything. Toss vigorously for 2 minutes.' },
      { step_number: 6, instruction: 'Add bean sprouts and toss 30 seconds more.' },
      { step_number: 7, instruction: 'Plate and top with crushed peanuts, green onion, and lime wedges.' },
    ],
    tags: ['noodles', 'thai', 'weeknight', 'seafood'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Miso Ramen',
    description: 'Rich miso broth with ramen noodles, chashu pork, soft-boiled egg, and corn. A soul-warming bowl.',
    cuisine: 'Asian',
    prep_minutes: 15,
    cook_minutes: 30,
    servings: 2,
    calories: 580,
    ingredients: [
      { name: 'Ramen noodles', quantity: '6', unit: 'oz' },
      { name: 'White miso paste', quantity: '3', unit: 'tbsp' },
      { name: 'Chicken broth', quantity: '4', unit: 'cup' },
      { name: 'Sliced pork belly', quantity: '6', unit: 'oz' },
      { name: 'Soft-boiled eggs', quantity: '2', unit: 'whole' },
      { name: 'Corn kernels', quantity: '0.5', unit: 'cup' },
      { name: 'Nori sheets', quantity: '2', unit: 'piece' },
      { name: 'Soy sauce', quantity: '1', unit: 'tbsp' },
      { name: 'Sesame oil', quantity: '1', unit: 'tsp' },
      { name: 'Minced garlic', quantity: '2', unit: 'clove' },
      { name: 'Grated ginger', quantity: '1', unit: 'tsp' },
      { name: 'Sliced green onion', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Sear pork belly slices in a hot skillet until caramelized, about 3 minutes per side. Set aside.' },
      { step_number: 2, instruction: 'In a pot, sauté garlic and ginger in sesame oil for 1 minute.' },
      { step_number: 3, instruction: 'Add chicken broth and bring to a simmer. Whisk in miso paste and soy sauce until smooth.' },
      { step_number: 4, instruction: 'Cook ramen noodles according to package directions. Drain.' },
      { step_number: 5, instruction: 'Divide noodles between bowls. Ladle hot miso broth over noodles.' },
      { step_number: 6, instruction: 'Top with sliced pork belly, halved soft-boiled egg, corn, nori, and green onion.' },
      { step_number: 7, instruction: 'Serve immediately while piping hot.' },
    ],
    tags: ['soup', 'noodles', 'japanese', 'comfort-food'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Veggie Fried Rice',
    description: 'Day-old rice wok-tossed with colorful vegetables, egg, and soy sauce. Better than takeout.',
    cuisine: 'Asian',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 350,
    ingredients: [
      { name: 'Cold cooked rice', quantity: '4', unit: 'cup' },
      { name: 'Diced carrot', quantity: '0.5', unit: 'cup' },
      { name: 'Frozen peas', quantity: '0.5', unit: 'cup' },
      { name: 'Scrambled egg', quantity: '2', unit: 'whole' },
      { name: 'Soy sauce', quantity: '3', unit: 'tbsp' },
      { name: 'Sesame oil', quantity: '1', unit: 'tbsp' },
      { name: 'Minced garlic', quantity: '2', unit: 'clove' },
      { name: 'Grated ginger', quantity: '1', unit: 'tsp' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'Sliced green onion', quantity: '3', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Heat vegetable oil in a wok over high heat until shimmering.' },
      { step_number: 2, instruction: 'Add carrot and peas; stir-fry 2 minutes.' },
      { step_number: 3, instruction: 'Push veggies to the side. Crack eggs into the wok and scramble.' },
      { step_number: 4, instruction: 'Add rice, breaking up any clumps. Stir-fry 3 minutes until rice is slightly crispy.' },
      { step_number: 5, instruction: 'Add soy sauce, sesame oil, garlic, and ginger. Toss everything together.' },
      { step_number: 6, instruction: 'Cook 1 more minute. Garnish with green onion and serve.' },
    ],
    tags: ['quick', 'rice', 'weeknight', 'vegetarian'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Thai Green Curry',
    description: 'Coconut milk curry with chicken, bamboo shoots, and Thai basil. Aromatic and mildly spicy.',
    cuisine: 'Asian',
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 4,
    calories: 410,
    ingredients: [
      { name: 'Chicken thigh', quantity: '1', unit: 'lb' },
      { name: 'Coconut milk', quantity: '14', unit: 'oz' },
      { name: 'Green curry paste', quantity: '3', unit: 'tbsp' },
      { name: 'Bamboo shoots', quantity: '1', unit: 'cup' },
      { name: 'Thai basil leaves', quantity: '0.5', unit: 'cup' },
      { name: 'Fish sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Sugar', quantity: '1', unit: 'tbsp' },
      { name: 'Sliced bell pepper', quantity: '1', unit: 'cup' },
      { name: 'Vegetable oil', quantity: '1', unit: 'tbsp' },
      { name: 'Jasmine rice', quantity: '2', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cook jasmine rice according to package directions.' },
      { step_number: 2, instruction: 'Heat oil in a large pan. Fry green curry paste for 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Add half the coconut milk and stir to combine with the paste. Cook 2 minutes.' },
      { step_number: 4, instruction: 'Add sliced chicken and cook 5 minutes, turning occasionally.' },
      { step_number: 5, instruction: 'Pour in remaining coconut milk, bamboo shoots, and bell pepper. Simmer 10 minutes.' },
      { step_number: 6, instruction: 'Season with fish sauce and sugar. Stir in Thai basil leaves.' },
      { step_number: 7, instruction: 'Serve over jasmine rice.' },
    ],
    tags: ['curry', 'thai', 'weeknight', 'spicy'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },

  // ══ American (5) ══════════════════════════════════════════════════════════
  {
    title: 'Classic Cheeseburger',
    description: 'Juicy beef patty with melted American cheese, lettuce, tomato, and pickles on a toasted brioche bun.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 4,
    calories: 560,
    ingredients: [
      { name: 'Ground beef (80/20)', quantity: '1', unit: 'lb' },
      { name: 'Brioche buns', quantity: '4', unit: 'piece' },
      { name: 'American cheese slices', quantity: '4', unit: 'piece' },
      { name: 'Lettuce leaves', quantity: '4', unit: 'piece' },
      { name: 'Tomato slices', quantity: '4', unit: 'piece' },
      { name: 'Dill pickle slices', quantity: '8', unit: 'piece' },
      { name: 'Ketchup', quantity: '2', unit: 'tbsp' },
      { name: 'Mustard', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.25', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Divide ground beef into 4 equal portions. Form into patties slightly wider than the buns. Season with salt and pepper.' },
      { step_number: 2, instruction: 'Heat a grill or cast-iron skillet over high heat.' },
      { step_number: 3, instruction: 'Cook patties 3-4 minutes per side for medium. Add cheese in the last minute and cover to melt.' },
      { step_number: 4, instruction: 'Toast buns cut-side down on the grill for 30 seconds.' },
      { step_number: 5, instruction: 'Assemble: bottom bun, lettuce, patty with cheese, tomato, pickles, ketchup, mustard, top bun.' },
      { step_number: 6, instruction: 'Serve immediately with fries or a side salad.' },
    ],
    tags: ['quick', 'grill', 'family-friendly', 'classic'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'BBQ Pulled Pork',
    description: 'Slow-smoked pork shoulder pulled and tossed in tangy BBQ sauce. Perfect for sandwiches or platters.',
    cuisine: 'American',
    prep_minutes: 15,
    cook_minutes: 240,
    servings: 8,
    calories: 390,
    ingredients: [
      { name: 'Pork shoulder', quantity: '4', unit: 'lb' },
      { name: 'BBQ sauce', quantity: '18', unit: 'oz' },
      { name: 'Brown sugar', quantity: '2', unit: 'tbsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Onion powder', quantity: '1', unit: 'tsp' },
      { name: 'Apple cider vinegar', quantity: '2', unit: 'tbsp' },
      { name: 'Hamburger buns', quantity: '8', unit: 'piece' },
      { name: 'Coleslaw', quantity: '2', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Combine brown sugar, smoked paprika, garlic powder, onion powder, salt, and pepper to make a dry rub.' },
      { step_number: 2, instruction: 'Coat pork shoulder generously with the dry rub on all sides.' },
      { step_number: 3, instruction: 'Place pork in a slow cooker. Add apple cider vinegar and 1/2 cup water.' },
      { step_number: 4, instruction: 'Cook on low for 8 hours (or high for 4-5 hours) until pork easily pulls apart with a fork.' },
      { step_number: 5, instruction: 'Remove pork and shred with two forks, discarding large fat pieces.' },
      { step_number: 6, instruction: 'Return shredded pork to the slow cooker. Add BBQ sauce and stir to coat.' },
      { step_number: 7, instruction: 'Cook 15 more minutes on low to let flavors meld.' },
      { step_number: 8, instruction: 'Pile onto hamburger buns and top with coleslaw. Serve.' },
    ],
    tags: ['slow-cook', 'bbq', 'weekend-project', 'make-ahead', 'family-friendly'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Keto Bacon Avocado Salad',
    description: 'Crispy bacon, ripe avocado, hard-boiled eggs, and cherry tomatoes over mixed greens with ranch dressing.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 2,
    calories: 450,
    ingredients: [
      { name: 'Bacon', quantity: '6', unit: 'slice' },
      { name: 'Ripe avocado', quantity: '1', unit: 'whole' },
      { name: 'Hard-boiled eggs', quantity: '2', unit: 'whole' },
      { name: 'Cherry tomatoes', quantity: '0.5', unit: 'cup' },
      { name: 'Mixed greens', quantity: '4', unit: 'cup' },
      { name: 'Ranch dressing', quantity: '3', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.25', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.125', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cook bacon in a skillet until crispy, about 5 minutes. Drain on paper towels and crumble.' },
      { step_number: 2, instruction: 'Halve avocado, remove pit, and slice. Peel and quarter hard-boiled eggs.' },
      { step_number: 3, instruction: 'Arrange mixed greens on plates or in bowls.' },
      { step_number: 4, instruction: 'Top with avocado slices, egg quarters, cherry tomatoes, and crumbled bacon.' },
      { step_number: 5, instruction: 'Drizzle with ranch dressing. Season with salt and pepper. Serve.' },
    ],
    tags: ['quick', 'salad', 'keto', 'low-carb', 'high-protein'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },
  {
    title: 'Mac and Cheese',
    description: 'Creamy stovetop mac and cheese with a sharp cheddar and gruyère blend. The ultimate comfort food.',
    cuisine: 'American',
    prep_minutes: 5,
    cook_minutes: 20,
    servings: 6,
    calories: 520,
    ingredients: [
      { name: 'Elbow macaroni', quantity: '1', unit: 'lb' },
      { name: 'Sharp cheddar cheese', quantity: '2', unit: 'cup' },
      { name: 'Gruyère cheese', quantity: '1', unit: 'cup' },
      { name: 'Butter', quantity: '4', unit: 'tbsp' },
      { name: 'All-purpose flour', quantity: '3', unit: 'tbsp' },
      { name: 'Whole milk', quantity: '3', unit: 'cup' },
      { name: 'Dijon mustard', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.5', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cook macaroni in salted boiling water until al dente. Drain and set aside.' },
      { step_number: 2, instruction: 'In the same pot, melt butter over medium heat. Whisk in flour and cook 1 minute to make a roux.' },
      { step_number: 3, instruction: 'Slowly whisk in milk. Cook, stirring constantly, until sauce thickens, about 5 minutes.' },
      { step_number: 4, instruction: 'Remove from heat. Stir in cheddar and gruyère until melted and smooth.' },
      { step_number: 5, instruction: 'Add Dijon mustard, salt, and pepper. Stir to combine.' },
      { step_number: 6, instruction: 'Return pasta to the pot and fold into the cheese sauce until evenly coated.' },
      { step_number: 7, instruction: 'Serve hot. Optionally top with breadcrumbs and broil for a crispy crust.' },
    ],
    tags: ['comfort-food', 'pasta', 'cheese', 'family-friendly', 'kid-approved'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Buffalo Wings',
    description: 'Crispy baked chicken wings tossed in a spicy buffalo sauce. Served with celery and blue cheese dip.',
    cuisine: 'American',
    prep_minutes: 10,
    cook_minutes: 45,
    servings: 4,
    calories: 480,
    ingredients: [
      { name: 'Chicken wings', quantity: '2', unit: 'lb' },
      { name: 'Hot sauce', quantity: '0.5', unit: 'cup' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Baking powder', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
      { name: 'Celery sticks', quantity: '4', unit: 'piece' },
      { name: 'Blue cheese dressing', quantity: '0.5', unit: 'cup' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Pat wings dry with paper towels. Toss with baking powder, salt, and garlic powder.' },
      { step_number: 2, instruction: 'Arrange wings on a wire rack set over a foil-lined baking sheet.' },
      { step_number: 3, instruction: 'Bake at 425°F for 40-45 minutes, flipping halfway, until crispy and golden.' },
      { step_number: 4, instruction: 'Melt butter in a saucepan and stir in hot sauce to make the buffalo sauce.' },
      { step_number: 5, instruction: 'Toss baked wings in the buffalo sauce until evenly coated.' },
      { step_number: 6, instruction: 'Serve with celery sticks and blue cheese dressing on the side.' },
    ],
    tags: ['appetizer', 'game-day', 'spicy', 'baked', 'keto'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },

  // ══ Mediterranean (3) ════════════════════════════════════════════════════
  {
    title: 'Greek Salad',
    description: 'Crisp cucumbers, tomatoes, red onion, Kalamata olives, and feta cheese with a lemon-oregano vinaigrette.',
    cuisine: 'Mediterranean',
    prep_minutes: 15,
    cook_minutes: 0,
    servings: 4,
    calories: 220,
    ingredients: [
      { name: 'Cucumber', quantity: '1', unit: 'whole' },
      { name: 'Cherry tomatoes', quantity: '1', unit: 'cup' },
      { name: 'Sliced red onion', quantity: '0.5', unit: 'cup' },
      { name: 'Kalamata olives', quantity: '0.5', unit: 'cup' },
      { name: 'Feta cheese', quantity: '4', unit: 'oz' },
      { name: 'Olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'Red wine vinegar', quantity: '1', unit: 'tbsp' },
      { name: 'Dried oregano', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '0.25', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.125', unit: 'tsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Chop cucumber into bite-sized chunks. Halve cherry tomatoes. Thinly slice red onion.' },
      { step_number: 2, instruction: 'Combine cucumber, tomatoes, red onion, and olives in a large bowl.' },
      { step_number: 3, instruction: 'Whisk together olive oil, red wine vinegar, oregano, salt, and pepper to make the vinaigrette.' },
      { step_number: 4, instruction: 'Pour vinaigrette over the salad and toss gently.' },
      { step_number: 5, instruction: 'Top with a slab of feta cheese (do not crumble for authentic style). Serve immediately.' },
    ],
    tags: ['quick', 'no-cook', 'salad', 'gluten-free', 'healthy'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },
  {
    title: 'Hummus',
    description: 'Smooth and creamy chickpea dip with tahini, lemon, and garlic. Serve with pita or crudités.',
    cuisine: 'Mediterranean',
    prep_minutes: 10,
    cook_minutes: 0,
    servings: 8,
    calories: 100,
    ingredients: [
      { name: 'Canned chickpeas', quantity: '2', unit: 'can' },
      { name: 'Tahini', quantity: '0.25', unit: 'cup' },
      { name: 'Lemon juice', quantity: '3', unit: 'tbsp' },
      { name: 'Minced garlic', quantity: '2', unit: 'clove' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Cumin', quantity: '0.5', unit: 'tsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
      { name: 'Paprika', quantity: '0.25', unit: 'tsp' },
      { name: 'Pita bread', quantity: '4', unit: 'piece' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Drain and rinse chickpeas. Reserve a few for garnish.' },
      { step_number: 2, instruction: 'Add chickpeas, tahini, lemon juice, garlic, cumin, and salt to a food processor.' },
      { step_number: 3, instruction: 'Blend until very smooth, scraping down sides as needed. Add 2-3 tbsp ice water if too thick.' },
      { step_number: 4, instruction: 'Taste and adjust salt and lemon juice.' },
      { step_number: 5, instruction: 'Transfer to a plate. Make a shallow well with a spoon. Drizzle olive oil and sprinkle paprika.' },
      { step_number: 6, instruction: 'Garnish with reserved chickpeas. Serve with warm pita bread.' },
    ],
    tags: ['quick', 'no-cook', 'appetizer', 'vegan', 'dip'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: false },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Shakshuka',
    description: 'Eggs poached in a spiced tomato and pepper sauce. A beloved Mediterranean breakfast or brunch dish.',
    cuisine: 'Mediterranean',
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 280,
    ingredients: [
      { name: 'Crushed tomatoes', quantity: '28', unit: 'oz' },
      { name: 'Diced bell pepper', quantity: '1', unit: 'cup' },
      { name: 'Diced onion', quantity: '1', unit: 'cup' },
      { name: 'Minced garlic', quantity: '3', unit: 'clove' },
      { name: 'Eggs', quantity: '4', unit: 'whole' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Cayenne pepper', quantity: '0.25', unit: 'tsp' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Crumbled feta', quantity: '2', unit: 'tbsp' },
      { name: 'Chopped cilantro', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Heat olive oil in a large skillet. Sauté onion and bell pepper until soft, about 5 minutes.' },
      { step_number: 2, instruction: 'Add garlic, cumin, smoked paprika, and cayenne. Cook 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Pour in crushed tomatoes. Season with salt and pepper. Simmer 10 minutes until sauce thickens slightly.' },
      { step_number: 4, instruction: 'Make 4 wells in the sauce with the back of a spoon. Crack an egg into each well.' },
      { step_number: 5, instruction: 'Cover the skillet and cook 5-7 minutes until egg whites are set but yolks are still runny.' },
      { step_number: 6, instruction: 'Top with crumbled feta and cilantro. Serve straight from the skillet with crusty bread.' },
    ],
    tags: ['breakfast', 'brunch', 'vegetarian', 'one-pan', 'gluten-free'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: true },
    ],
  },

  // ══ Indian (2) ════════════════════════════════════════════════════════════
  {
    title: 'Butter Chicken',
    description: 'Tender chicken in a rich, creamy tomato-butter sauce with warm spices. The most beloved Indian curry.',
    cuisine: 'Indian',
    prep_minutes: 20,
    cook_minutes: 30,
    servings: 4,
    calories: 490,
    ingredients: [
      { name: 'Chicken thigh', quantity: '1.5', unit: 'lb' },
      { name: 'Plain yogurt', quantity: '0.5', unit: 'cup' },
      { name: 'Garam masala', quantity: '1', unit: 'tbsp' },
      { name: 'Turmeric', quantity: '1', unit: 'tsp' },
      { name: 'Crushed tomatoes', quantity: '14', unit: 'oz' },
      { name: 'Heavy cream', quantity: '0.5', unit: 'cup' },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Minced garlic', quantity: '4', unit: 'clove' },
      { name: 'Grated ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Ground cumin', quantity: '1', unit: 'tsp' },
      { name: 'Chili powder', quantity: '1', unit: 'tsp' },
      { name: 'Basmati rice', quantity: '1.5', unit: 'cup' },
      { name: 'Fresh cilantro', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Cut chicken into bite-sized pieces. Marinate with yogurt, garam masala, turmeric, and salt for 15 minutes.' },
      { step_number: 2, instruction: 'Cook basmati rice according to package directions.' },
      { step_number: 3, instruction: 'Melt 2 tbsp butter in a large skillet over medium-high heat. Cook marinated chicken 5-6 minutes until browned. Remove and set aside.' },
      { step_number: 4, instruction: 'In the same pan, add remaining butter. Sauté garlic and ginger for 1 minute.' },
      { step_number: 5, instruction: 'Add crushed tomatoes, cumin, chili powder, and a pinch of salt. Simmer 10 minutes.' },
      { step_number: 6, instruction: 'Blend sauce with an immersion blender until smooth. Return to heat.' },
      { step_number: 7, instruction: 'Stir in heavy cream and return chicken to the sauce. Simmer 10 minutes until chicken is cooked through.' },
      { step_number: 8, instruction: 'Garnish with cilantro. Serve over basmati rice with naan on the side.' },
    ],
    tags: ['curry', 'indian', 'comfort-food', 'weeknight'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: false },
      { restriction: 'vegetarian', is_compliant: false },
      { restriction: 'vegan', is_compliant: false },
      { restriction: 'keto', is_compliant: false },
    ],
  },
  {
    title: 'Chana Masala',
    description: 'Spiced chickpea curry in a tangy tomato sauce. A protein-packed vegan Indian classic.',
    cuisine: 'Indian',
    prep_minutes: 10,
    cook_minutes: 25,
    servings: 4,
    calories: 290,
    ingredients: [
      { name: 'Canned chickpeas', quantity: '2', unit: 'can' },
      { name: 'Crushed tomatoes', quantity: '14', unit: 'oz' },
      { name: 'Diced onion', quantity: '1', unit: 'cup' },
      { name: 'Minced garlic', quantity: '3', unit: 'clove' },
      { name: 'Grated ginger', quantity: '1', unit: 'tbsp' },
      { name: 'Garam masala', quantity: '1.5', unit: 'tsp' },
      { name: 'Ground cumin', quantity: '1', unit: 'tsp' },
      { name: 'Ground coriander', quantity: '1', unit: 'tsp' },
      { name: 'Turmeric', quantity: '0.5', unit: 'tsp' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'Lemon juice', quantity: '1', unit: 'tbsp' },
      { name: 'Fresh cilantro', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      { step_number: 1, instruction: 'Heat oil in a large pot. Sauté onion until golden, about 6 minutes.' },
      { step_number: 2, instruction: 'Add garlic and ginger. Cook 1 minute until fragrant.' },
      { step_number: 3, instruction: 'Stir in garam masala, cumin, coriander, and turmeric. Toast spices 30 seconds.' },
      { step_number: 4, instruction: 'Add crushed tomatoes and chickpeas (drained and rinsed). Stir to combine.' },
      { step_number: 5, instruction: 'Simmer 15-20 minutes, stirring occasionally, until sauce thickens.' },
      { step_number: 6, instruction: 'Stir in lemon juice and season with salt to taste.' },
      { step_number: 7, instruction: 'Garnish with cilantro. Serve with basmati rice or warm naan.' },
    ],
    tags: ['curry', 'indian', 'vegan', 'gluten-free', 'weeknight', 'high-protein'],
    dietary_info: [
      { restriction: 'gluten-free', is_compliant: true },
      { restriction: 'dairy-free', is_compliant: true },
      { restriction: 'vegetarian', is_compliant: true },
      { restriction: 'vegan', is_compliant: true },
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
