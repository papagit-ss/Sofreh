import type { NextRequest } from "next/server";
import { db } from "@/db";
import { cookSessions, favorites, pantryItems, recipes, shoppingItems, ingredients } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { listRecipes } from "@/lib/server/catalog";
import { getUserId, json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const all = await listRecipes(userId, { sort: "match" });

  const [pantryRows, favCount, shopCount, active, recent] = await Promise.all([
    db
      .select({ id: pantryItems.id, name: ingredients.name, useSoon: pantryItems.useSoon, expiresAt: pantryItems.expiresAt })
      .from(pantryItems)
      .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
      .where(eq(pantryItems.userId, userId)),
    db.select({ c: sql<number>`count(*)::int` }).from(favorites).where(eq(favorites.userId, userId)),
    db.select({ c: sql<number>`count(*)::int` }).from(shoppingItems).where(and(eq(shoppingItems.userId, userId), eq(shoppingItems.checked, false))),
    db
      .select({ id: cookSessions.id, currentStep: cookSessions.currentStep, servings: cookSessions.servings, slug: recipes.slug, title: recipes.title, emoji: recipes.emoji })
      .from(cookSessions)
      .innerJoin(recipes, eq(cookSessions.recipeId, recipes.id))
      .where(and(eq(cookSessions.userId, userId), eq(cookSessions.status, "in_progress")))
      .orderBy(desc(cookSessions.startedAt))
      .limit(1),
    db
      .select({ slug: recipes.slug, title: recipes.title, emoji: recipes.emoji, completedAt: cookSessions.completedAt, id: recipes.id })
      .from(cookSessions)
      .innerJoin(recipes, eq(cookSessions.recipeId, recipes.id))
      .where(and(eq(cookSessions.userId, userId), eq(cookSessions.status, "completed")))
      .orderBy(desc(cookSessions.completedAt))
      .limit(6),
  ]);

  const now = Date.now();
  const useSoon = pantryRows.filter((p) => p.useSoon || (p.expiresAt && (new Date(p.expiresAt).getTime() - now) / 86400000 <= 3));

  const hour = new Date().getHours();
  const mealHint = hour < 11 ? "breakfast" : hour < 16 ? "lunch" : "dinner";

  const canCookNow = all.filter((r) => r.match.missingCount === 0 && r.match.requiredCount > 0).slice(0, 6);
  const almost = all.filter((r) => r.match.missingCount > 0 && r.match.missingCount <= 2).slice(0, 6);
  const quick = all.filter((r) => r.totalMinutes <= 30).sort((a, b) => b.match.percent - a.match.percent || b.popularity - a.popularity).slice(0, 6);
  const todayPicks = [...all]
    .sort((a, b) => b.popularity + b.match.percent * 0.5 - (a.popularity + a.match.percent * 0.5))
    .filter((r) => (mealHint === "breakfast" ? true : r.mealType === "main"))
    .slice(0, 6);

  const dedupRecent = recent.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  return json({
    pantryCount: pantryRows.length,
    useSoonCount: useSoon.length,
    useSoonNames: useSoon.slice(0, 4).map((u) => u.name),
    favoritesCount: favCount[0]?.c ?? 0,
    shoppingCount: shopCount[0]?.c ?? 0,
    activeSession: active[0] ?? null,
    recentlyCooked: dedupRecent,
    canCookNow,
    almost,
    quick,
    todayPicks,
    mealHint,
    totalRecipes: all.length,
  });
}
