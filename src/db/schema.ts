import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";

// ---------- Catalog ----------

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(), // protein | grain | vegetable | herb | dairy | spice | legume | oil | fruit | nut | other
    defaultUnit: text("default_unit").notNull().default("عدد"),
    isStaple: boolean("is_staple").notNull().default(false), // نمک، روغن، آب ... (معمولاً در خانه هست)
    approxPrice: integer("approx_price").notNull().default(0), // تومان تقریبی برای یک واحد (برای تخمین هزینه)
    aliases: text("aliases").array().notNull().default([]),
  },
  (t) => [uniqueIndex("ingredients_slug_idx").on(t.slug)]
);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    cuisine: text("cuisine").notNull(), // iranian | italian | american | japanese | international
    category: text("category").notNull(), // stew | rice | kebab | side | breakfast | soup | fastfood | salad | snack
    difficulty: text("difficulty").notNull(), // easy | medium | hard
    prepMinutes: integer("prep_minutes").notNull(),
    cookMinutes: integer("cook_minutes").notNull(),
    baseServings: integer("base_servings").notNull().default(4),
    costLevel: integer("cost_level").notNull().default(2), // 1 ارزان | 2 متوسط | 3 گران
    mainProtein: text("main_protein").notNull().default("none"), // chicken | beef | lamb | fish | egg | none
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    emoji: text("emoji").notNull().default("🍽️"),
    tags: text("tags").array().notNull().default([]),
    popularity: integer("popularity").notNull().default(50),
    mealType: text("meal_type").notNull().default("main"), // main | side | breakfast | appetizer | dessert
  },
  (t) => [uniqueIndex("recipes_slug_idx").on(t.slug)]
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    amount: real("amount").notNull(),
    unit: text("unit").notNull(),
    note: text("note"),
    isOptional: boolean("is_optional").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("recipe_ingredients_recipe_idx").on(t.recipeId)]
);

export const recipeSteps = pgTable(
  "recipe_steps",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    instruction: text("instruction").notNull(),
    timerSeconds: integer("timer_seconds"),
    tip: text("tip"),
  },
  (t) => [index("recipe_steps_recipe_idx").on(t.recipeId)]
);

// ---------- User data (scoped by device/user id; آماده برای auth واقعی در آینده) ----------

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    amount: real("amount"),
    unit: text("unit"),
    location: text("location").notNull().default("pantry"), // fridge | freezer | pantry
    expiresAt: date("expires_at"),
    useSoon: boolean("use_soon").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("pantry_user_idx").on(t.userId),
    uniqueIndex("pantry_user_ingredient_idx").on(t.userId, t.ingredientId),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorites_user_recipe_idx").on(t.userId, t.recipeId)]
);

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    ingredientId: integer("ingredient_id").references(() => ingredients.id),
    name: text("name").notNull(),
    amount: real("amount"),
    unit: text("unit"),
    recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    recipeTitle: text("recipe_title"),
    checked: boolean("checked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("shopping_user_idx").on(t.userId)]
);

export const cookSessions = pgTable(
  "cook_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    servings: integer("servings").notNull().default(4),
    currentStep: integer("current_step").notNull().default(1),
    status: text("status").notNull().default("in_progress"), // in_progress | completed | abandoned
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    rating: integer("rating"),
  },
  (t) => [index("cook_sessions_user_idx").on(t.userId)]
);

// ---------- Future: store integrations (دیجی‌کالا جت، اکالا، اسنپ مارکت...) ----------

export const storeOrders = pgTable("store_orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // digikala_jet | okala | snapp_market | ...
  status: text("status").notNull().default("draft"),
  payload: text("payload"), // JSON snapshot of items
  externalRef: text("external_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type RecipeStep = typeof recipeSteps.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type CookSession = typeof cookSessions.$inferSelect;
