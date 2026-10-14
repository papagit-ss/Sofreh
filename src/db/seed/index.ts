import { db } from "@/db";
import { ingredients, recipes, recipeIngredients, recipeSteps } from "@/db/schema";
import { sql } from "drizzle-orm";
import { SEED_INGREDIENTS } from "./ingredients";
import { RECIPES_A } from "./recipes-a";
import { RECIPES_B } from "./recipes-b";

const ALL_RECIPES = [...RECIPES_A, ...RECIPES_B];

const g = globalThis as typeof globalThis & { __sofreSeedPromise?: Promise<void> };

/** Idempotent: seeds catalog data if the recipes table is empty. */
export function ensureSeeded(): Promise<void> {
  if (!g.__sofreSeedPromise) {
    g.__sofreSeedPromise = runSeed().catch((e) => {
      g.__sofreSeedPromise = undefined;
      throw e;
    });
  }
  return g.__sofreSeedPromise;
}

async function runSeed() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recipes);
  if (count > 0) return;

  await db
    .insert(ingredients)
    .values(
      SEED_INGREDIENTS.map(([slug, name, category, defaultUnit, isStaple, approxPrice, aliases]) => ({
        slug,
        name,
        category,
        defaultUnit,
        isStaple,
        approxPrice,
        aliases: aliases ?? [],
      }))
    )
    .onConflictDoNothing();

  const allIng = await db.select({ id: ingredients.id, slug: ingredients.slug }).from(ingredients);
  const ingBySlug = new Map(allIng.map((i) => [i.slug, i.id]));

  for (const r of ALL_RECIPES) {
    const [inserted] = await db
      .insert(recipes)
      .values({
        slug: r.slug,
        title: r.title,
        description: r.description,
        cuisine: r.cuisine,
        category: r.category,
        difficulty: r.difficulty,
        prepMinutes: r.prep,
        cookMinutes: r.cook,
        baseServings: r.servings,
        costLevel: r.cost,
        mainProtein: r.protein,
        isVegetarian: r.veg,
        emoji: r.emoji,
        tags: r.tags,
        popularity: r.popularity,
        mealType: r.mealType ?? "main",
      })
      .onConflictDoNothing()
      .returning({ id: recipes.id });
    if (!inserted) continue;

    const ingRows = r.ing
      .map(([slug, amount, unit, note, optional], i) => {
        const ingredientId = ingBySlug.get(slug);
        if (!ingredientId) {
          console.warn(`[seed] unknown ingredient slug: ${slug} in ${r.slug}`);
          return null;
        }
        return {
          recipeId: inserted.id,
          ingredientId,
          amount,
          unit,
          note: note || null,
          isOptional: !!optional,
          sortOrder: i,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (ingRows.length) await db.insert(recipeIngredients).values(ingRows);

    await db.insert(recipeSteps).values(
      r.steps.map(([instruction, timer, tip], i) => ({
        recipeId: inserted.id,
        stepNumber: i + 1,
        instruction,
        timerSeconds: timer ?? null,
        tip: tip ?? null,
      }))
    );
  }
  console.log(`[seed] inserted ${ALL_RECIPES.length} recipes`);
}
