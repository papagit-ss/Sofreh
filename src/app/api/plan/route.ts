import type { NextRequest } from "next/server";
import { loadCatalog, loadPantryContext, loadFavoriteIds, toSummary, matchIngredients, type CatalogRecipe, type PantryContext } from "@/lib/server/catalog";
import { getUserId, json } from "@/lib/server/user";
import type { MatchedIngredient, RecipeSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

type PlanInput = {
  guests: number; // تعداد نفرات (شامل خود کاربر)
  maxMinutes: number;
  budget: 1 | 2 | 3;
  cuisine?: string;
  vegetarian?: boolean;
  preferPantry?: boolean; // مواد زیادی نمی‌خوام بخرم
  withSides?: boolean; // منوی مهمانی (پیش‌غذا و سالاد هم اضافه شود)
};

export type PlanMenu = {
  mains: RecipeSummary[];
  sides: RecipeSummary[];
  totalMinutes: number;
  missing: MatchedIngredient[];
  estimatedCost: number;
  servings: number;
  reason: string;
};

function aggregateMissing(recipesList: CatalogRecipe[], ctx: PantryContext, servings: number): MatchedIngredient[] {
  const map = new Map<number, MatchedIngredient>();
  for (const r of recipesList) {
    for (const m of matchIngredients(r, ctx, servings)) {
      if (m.status !== "missing") continue;
      const cur = map.get(m.ingredientId);
      if (cur && cur.unit === m.unit) cur.amount = Math.round((cur.amount + m.amount) * 100) / 100;
      else if (!cur) map.set(m.ingredientId, { ...m });
    }
  }
  return [...map.values()];
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = (await req.json().catch(() => ({}))) as Partial<PlanInput>;
  const input: PlanInput = {
    guests: Math.max(1, Math.min(30, Number(body.guests) || 4)),
    maxMinutes: Math.max(15, Number(body.maxMinutes) || 90),
    budget: ([1, 2, 3].includes(Number(body.budget)) ? Number(body.budget) : 2) as 1 | 2 | 3,
    cuisine: body.cuisine || undefined,
    vegetarian: !!body.vegetarian,
    preferPantry: !!body.preferPantry,
    withSides: body.withSides !== false,
  };

  const [catalog, ctx, favs] = await Promise.all([loadCatalog(), loadPantryContext(userId), loadFavoriteIds(userId)]);
  const summaries = new Map(catalog.map((r) => [r.id, toSummary(r, ctx, favs)]));
  const byId = new Map(catalog.map((r) => [r.id, r]));

  const mains = catalog
    .filter((r) => r.mealType === "main")
    .filter((r) => r.prepMinutes + r.cookMinutes <= input.maxMinutes)
    .filter((r) => r.costLevel <= input.budget)
    .filter((r) => !input.cuisine || r.cuisine === input.cuisine)
    .filter((r) => !input.vegetarian || r.isVegetarian)
    .map((r) => {
      const s = summaries.get(r.id)!;
      const isGuestWorthy = r.tags.some((t) => ["مهمانی", "مجلسی"].includes(t));
      const guestBonus = input.guests >= 4 ? (isGuestWorthy ? 35 : 0) - (r.tags.includes("دانشجویی") ? 25 : 0) : 0;
      const pantryWeight = input.preferPantry ? 1.2 : 0.3;
      const score = s.popularity * 0.6 + s.match.percent * pantryWeight + guestBonus - s.match.missingCount * (input.preferPantry ? 8 : 2) + (s.isFavorite ? 10 : 0);
      return { r, s, score };
    })
    .sort((a, b) => b.score - a.score);

  const sides = catalog
    .filter((r) => r.mealType === "appetizer" || r.mealType === "side")
    .filter((r) => !input.vegetarian || r.isVegetarian)
    .map((r) => ({ r, s: summaries.get(r.id)!, score: summaries.get(r.id)!.popularity + summaries.get(r.id)!.match.percent }))
    .sort((a, b) => b.score - a.score);

  const mainCount = input.guests >= 8 ? 2 : 1;
  const menus: PlanMenu[] = [];
  const used = new Set<number>();

  for (let k = 0; k < 3 && mains.length; k++) {
    const picked: typeof mains = [];
    for (const m of mains) {
      if (used.has(m.r.id)) continue;
      if (picked.length && picked[0].r.mainProtein === m.r.mainProtein && mainCount > 1) continue;
      picked.push(m);
      if (picked.length === mainCount) break;
    }
    if (!picked.length) break;
    picked.forEach((p) => used.add(p.r.id));

    const mainTime = Math.max(...picked.map((p) => p.r.prepMinutes + p.r.cookMinutes));
    const remaining = input.maxMinutes - mainTime;
    const pickedSides: typeof sides = [];
    if (input.withSides) {
      for (const sd of sides) {
        if (pickedSides.length >= (input.guests >= 6 ? 2 : 1)) break;
        if (sd.r.prepMinutes + sd.r.cookMinutes <= Math.max(remaining, 15) + 15) pickedSides.push(sd);
      }
    }
    const all = [...picked.map((p) => p.r), ...pickedSides.map((p) => p.r)];
    const missing = aggregateMissing(all, ctx, input.guests);
    const estimatedCost = missing.reduce((sum, i) => sum + Math.ceil(i.amount) * i.approxPrice, 0);
    const reasons: string[] = [];
    if (picked.every((p) => p.s.match.percent >= 80)) reasons.push("بیشتر موادش را داری");
    if (picked.some((p) => p.r.tags.includes("مهمانی") || p.r.tags.includes("مجلسی"))) reasons.push("مناسب مهمانی");
    if (mainTime <= input.maxMinutes * 0.7) reasons.push("با وقت کافی آماده می‌شود");
    if (picked.every((p) => p.r.costLevel <= 2)) reasons.push("اقتصادی");
    menus.push({
      mains: picked.map((p) => p.s),
      sides: pickedSides.map((p) => p.s),
      totalMinutes: mainTime + Math.round(pickedSides.reduce((a, p) => a + p.r.prepMinutes + p.r.cookMinutes, 0) * 0.5),
      missing,
      estimatedCost,
      servings: input.guests,
      reason: reasons.join(" · ") || "بهترین گزینه با این شرایط",
    });
  }

  void byId;
  return json({ input, menus });
}
