import { db } from "@/db";
import {
  ingredients,
  recipes,
  recipeIngredients,
  recipeSteps,
  pantryItems,
  favorites,
  cookSessions,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { and, eq, inArray, desc } from "drizzle-orm";
import type { MatchedIngredient, RecipeDetail, RecipeMatch, RecipeSummary, RecipeStepDto } from "@/lib/types";
import { SUBSTITUTIONS } from "@/data/help";

export type CatalogRecipe = typeof recipes.$inferSelect & {
  ingredients: (typeof recipeIngredients.$inferSelect & { ingredient: typeof ingredients.$inferSelect })[];
  steps: typeof recipeSteps.$inferSelect[];
};

const g = globalThis as typeof globalThis & { __ashpazCatalog?: { at: number; data: CatalogRecipe[] } };
const TTL = 5 * 60 * 1000;

export async function loadCatalog(): Promise<CatalogRecipe[]> {
  await ensureSeeded();
  if (g.__ashpazCatalog && Date.now() - g.__ashpazCatalog.at < TTL) return g.__ashpazCatalog.data;

  const [rs, ris, ings, steps] = await Promise.all([
    db.select().from(recipes),
    db.select().from(recipeIngredients),
    db.select().from(ingredients),
    db.select().from(recipeSteps),
  ]);
  const ingMap = new Map(ings.map((i) => [i.id, i]));
  const data: CatalogRecipe[] = rs.map((r) => ({
    ...r,
    ingredients: ris
      .filter((ri) => ri.recipeId === r.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ri) => ({ ...ri, ingredient: ingMap.get(ri.ingredientId)! }))
      .filter((ri) => ri.ingredient),
    steps: steps.filter((s) => s.recipeId === r.id).sort((a, b) => a.stepNumber - b.stepNumber),
  }));
  g.__ashpazCatalog = { at: Date.now(), data };
  return data;
}

export function invalidateCatalog() {
  g.__ashpazCatalog = undefined;
}

export type PantryContext = {
  have: Set<number>;
  useSoon: Set<number>;
};

export async function loadPantryContext(userId: string): Promise<PantryContext> {
  const rows = await db.select().from(pantryItems).where(eq(pantryItems.userId, userId));
  const have = new Set<number>();
  const useSoon = new Set<number>();
  const now = Date.now();
  for (const r of rows) {
    have.add(r.ingredientId);
    let soon = r.useSoon;
    if (r.expiresAt) {
      const days = (new Date(r.expiresAt).getTime() - now) / 86400000;
      if (days <= 3) soon = true;
    }
    if (soon) useSoon.add(r.ingredientId);
  }
  return { have, useSoon };
}

export async function loadFavoriteIds(userId: string): Promise<Set<number>> {
  const rows = await db.select({ recipeId: favorites.recipeId }).from(favorites).where(eq(favorites.userId, userId));
  return new Set(rows.map((r) => r.recipeId));
}

export function scaleAmount(amount: number, baseServings: number, servings: number): number {
  const v = (amount * servings) / baseServings;
  return Math.round(v * 100) / 100;
}

export function matchIngredients(r: CatalogRecipe, ctx: PantryContext, servings?: number): MatchedIngredient[] {
  const s = servings ?? r.baseServings;
  return r.ingredients.map((ri) => {
    const ing = ri.ingredient;
    const inPantry = ctx.have.has(ing.id);
    let status: MatchedIngredient["status"];
    if (inPantry) status = "have";
    else if (ing.isStaple) status = "staple";
    else if (ri.isOptional) status = "optional-missing";
    else status = "missing";
    return {
      ingredientId: ing.id,
      name: ing.name,
      slug: ing.slug,
      amount: scaleAmount(ri.amount, r.baseServings, s),
      unit: ri.unit,
      note: ri.note,
      isOptional: ri.isOptional,
      isStaple: ing.isStaple,
      status,
      approxPrice: ing.approxPrice,
      pantryUseSoon: ctx.useSoon.has(ing.id),
    };
  });
}

export function computeMatch(r: CatalogRecipe, ctx: PantryContext, servings?: number): RecipeMatch {
  const list = matchIngredients(r, ctx, servings);
  const required = list.filter((i) => !i.isOptional && !i.isStaple);
  const have = required.filter((i) => i.status === "have");
  const missing = required.filter((i) => i.status === "missing");
  const percent = required.length === 0 ? 100 : Math.round((have.length / required.length) * 100);
  const useSoonHits = list.filter((i) => i.pantryUseSoon).length;
  const estimatedMissingCost = missing.reduce((sum, i) => sum + Math.ceil(i.amount) * i.approxPrice, 0);
  return {
    percent,
    haveCount: have.length,
    requiredCount: required.length,
    missingCount: missing.length,
    missing,
    useSoonHits,
    estimatedMissingCost,
  };
}

export function toSummary(r: CatalogRecipe, ctx: PantryContext, favs: Set<number>): RecipeSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    category: r.category,
    difficulty: r.difficulty,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    totalMinutes: r.prepMinutes + r.cookMinutes,
    baseServings: r.baseServings,
    costLevel: r.costLevel,
    mainProtein: r.mainProtein,
    isVegetarian: r.isVegetarian,
    emoji: r.emoji,
    tags: r.tags,
    popularity: r.popularity,
    mealType: r.mealType,
    match: computeMatch(r, ctx),
    isFavorite: favs.has(r.id),
  };
}

export type RecipeFilters = {
  q?: string;
  cuisine?: string;
  category?: string;
  maxTime?: number;
  difficulty?: string;
  cost?: number;
  protein?: string;
  vegetarian?: boolean;
  minMatch?: number;
  mealType?: string;
  sort?: "match" | "time" | "popular" | "cost";
  ids?: number[];
};

export function applyFilters(list: RecipeSummary[], f: RecipeFilters): RecipeSummary[] {
  let out = list;
  if (f.ids) out = out.filter((r) => f.ids!.includes(r.id));
  if (f.q) {
    const q = f.q.trim();
    out = out.filter(
      (r) =>
        r.title.includes(q) ||
        r.description.includes(q) ||
        r.tags.some((t) => t.includes(q))
    );
  }
  if (f.cuisine) out = out.filter((r) => r.cuisine === f.cuisine);
  if (f.category) out = out.filter((r) => r.category === f.category);
  if (f.mealType) out = out.filter((r) => r.mealType === f.mealType);
  if (f.maxTime) out = out.filter((r) => r.totalMinutes <= f.maxTime!);
  if (f.difficulty) out = out.filter((r) => r.difficulty === f.difficulty);
  if (f.cost) out = out.filter((r) => r.costLevel <= f.cost!);
  if (f.protein) out = out.filter((r) => r.mainProtein === f.protein);
  if (f.vegetarian) out = out.filter((r) => r.isVegetarian);
  if (f.minMatch !== undefined) out = out.filter((r) => r.match.percent >= f.minMatch!);

  const sort = f.sort ?? "match";
  out = [...out].sort((a, b) => {
    if (sort === "time") return a.totalMinutes - b.totalMinutes;
    if (sort === "popular") return b.popularity - a.popularity;
    if (sort === "cost") return a.costLevel - b.costLevel || a.match.estimatedMissingCost - b.match.estimatedMissingCost;
    // match: percent desc, then missing count asc, useSoon boost, popularity
    const sa = a.match.percent + a.match.useSoonHits * 4;
    const sb = b.match.percent + b.match.useSoonHits * 4;
    if (sb !== sa) return sb - sa;
    if (a.match.missingCount !== b.match.missingCount) return a.match.missingCount - b.match.missingCount;
    return b.popularity - a.popularity;
  });
  return out;
}

export async function listRecipes(userId: string, filters: RecipeFilters): Promise<RecipeSummary[]> {
  const [catalog, ctx, favs] = await Promise.all([loadCatalog(), loadPantryContext(userId), loadFavoriteIds(userId)]);
  return applyFilters(catalog.map((r) => toSummary(r, ctx, favs)), filters);
}

export async function getRecipeDetail(slug: string, userId: string, servings?: number): Promise<RecipeDetail | null> {
  const [catalog, ctx, favs] = await Promise.all([loadCatalog(), loadPantryContext(userId), loadFavoriteIds(userId)]);
  const r = catalog.find((x) => x.slug === slug);
  if (!r) return null;
  const s = servings && servings > 0 ? servings : r.baseServings;
  const summary = toSummary(r, ctx, favs);
  const ingredientsList = matchIngredients(r, ctx, s);
  const steps: RecipeStepDto[] = r.steps.map((st) => ({
    stepNumber: st.stepNumber,
    instruction: st.instruction,
    timerSeconds: st.timerSeconds,
    tip: st.tip,
  }));
  const missingSlugs = ingredientsList.filter((i) => i.status === "missing" || i.status === "optional-missing").map((i) => i.slug);
  const substitutionsForMissing = SUBSTITUTIONS.filter((sub) => missingSlugs.includes(sub.ingredientSlug)).map((sub) => ({
    ingredientName: sub.ingredientName,
    options: sub.options,
  }));

  const sessions = await db
    .select()
    .from(cookSessions)
    .where(and(eq(cookSessions.userId, userId), eq(cookSessions.recipeId, r.id)))
    .orderBy(desc(cookSessions.startedAt));
  const active = sessions.find((x) => x.status === "in_progress") ?? null;
  const timesCooked = sessions.filter((x) => x.status === "completed").length;

  return {
    ...summary,
    servings: s,
    ingredients: ingredientsList,
    steps,
    substitutionsForMissing,
    activeSession: active ? { id: active.id, currentStep: active.currentStep, servings: active.servings } : null,
    timesCooked,
  };
}

export async function getRecipesByIds(ids: number[]): Promise<CatalogRecipe[]> {
  const catalog = await loadCatalog();
  return catalog.filter((r) => ids.includes(r.id));
}

export { inArray };
