import type { NextRequest } from "next/server";
import { listRecipes, type RecipeFilters } from "@/lib/server/catalog";
import { getUserId, json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const filters: RecipeFilters = {
    q: sp.get("q") ?? undefined,
    cuisine: sp.get("cuisine") ?? undefined,
    category: sp.get("category") ?? undefined,
    mealType: sp.get("mealType") ?? undefined,
    maxTime: num("maxTime"),
    difficulty: sp.get("difficulty") ?? undefined,
    cost: num("cost"),
    protein: sp.get("protein") ?? undefined,
    vegetarian: sp.get("vegetarian") === "1",
    minMatch: num("minMatch"),
    sort: (sp.get("sort") as RecipeFilters["sort"]) ?? "match",
  };
  const limit = num("limit");
  const list = await listRecipes(userId, filters);
  return json({ recipes: limit ? list.slice(0, limit) : list, total: list.length });
}
