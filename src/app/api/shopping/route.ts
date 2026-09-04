import type { NextRequest } from "next/server";
import { db } from "@/db";
import { shoppingItems } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { bad, getUserId, json } from "@/lib/server/user";
import { getRecipesByIds, loadPantryContext, matchIngredients } from "@/lib/server/catalog";
import type { ShoppingItemDto } from "@/lib/types";

export const dynamic = "force-dynamic";

async function list(userId: string): Promise<ShoppingItemDto[]> {
  const rows = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.userId, userId))
    .orderBy(asc(shoppingItems.checked), asc(shoppingItems.createdAt));
  return rows.map((r) => ({
    id: r.id,
    ingredientId: r.ingredientId,
    name: r.name,
    amount: r.amount,
    unit: r.unit,
    recipeId: r.recipeId,
    recipeTitle: r.recipeTitle,
    checked: r.checked,
  }));
}

export async function GET(req: NextRequest) {
  return json({ items: await list(getUserId(req)) });
}

/**
 * POST body:
 *  { recipeIds: number[], servings?: Record<recipeId, number>, includeOptional?: boolean }  → add all missing ingredients of those recipes
 *  { name, amount?, unit?, ingredientId? } → add a manual item
 */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  if (!body) return bad("body required");

  if (Array.isArray(body.recipeIds)) {
    const ids: number[] = body.recipeIds.map(Number).filter(Boolean);
    const servingsMap: Record<string, number> = body.servings ?? {};
    const includeOptional = !!body.includeOptional;
    const [recipesList, ctx, existing] = await Promise.all([getRecipesByIds(ids), loadPantryContext(userId), list(userId)]);

    // merge same ingredient across recipes
    const merged = new Map<number, { name: string; amount: number; unit: string; recipeTitles: string[]; recipeId: number }>();
    for (const r of recipesList) {
      const s = servingsMap[String(r.id)] ?? r.baseServings;
      const matched = matchIngredients(r, ctx, s);
      for (const m of matched) {
        if (m.status === "missing" || (includeOptional && m.status === "optional-missing")) {
          const cur = merged.get(m.ingredientId);
          if (cur && cur.unit === m.unit) {
            cur.amount += m.amount;
            cur.recipeTitles.push(r.title);
          } else if (!cur) {
            merged.set(m.ingredientId, { name: m.name, amount: m.amount, unit: m.unit, recipeTitles: [r.title], recipeId: r.id });
          }
        }
      }
    }
    const existingByIng = new Map(existing.filter((e) => e.ingredientId && !e.checked).map((e) => [e.ingredientId!, e]));
    let added = 0;
    for (const [ingredientId, v] of merged) {
      const ex = existingByIng.get(ingredientId);
      if (ex) {
        if (ex.unit === v.unit && ex.amount != null) {
          await db
            .update(shoppingItems)
            .set({ amount: Math.round((ex.amount + v.amount) * 100) / 100 })
            .where(eq(shoppingItems.id, ex.id));
        }
        continue;
      }
      await db.insert(shoppingItems).values({
        userId,
        ingredientId,
        name: v.name,
        amount: Math.round(v.amount * 100) / 100,
        unit: v.unit,
        recipeId: v.recipeId,
        recipeTitle: v.recipeTitles.join("، "),
      });
      added++;
    }
    return json({ added, items: await list(userId) });
  }

  if (typeof body.name === "string" && body.name.trim()) {
    await db.insert(shoppingItems).values({
      userId,
      ingredientId: body.ingredientId ?? null,
      name: body.name.trim(),
      amount: body.amount ?? null,
      unit: body.unit ?? null,
    });
    return json({ added: 1, items: await list(userId) });
  }
  return bad("invalid body");
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  if (body?.action === "uncheckAll") {
    await db.update(shoppingItems).set({ checked: false }).where(eq(shoppingItems.userId, userId));
    return json({ items: await list(userId) });
  }
  if (!body?.id) return bad("id required");
  await db
    .update(shoppingItems)
    .set({ checked: !!body.checked })
    .where(and(eq(shoppingItems.id, body.id), eq(shoppingItems.userId, userId)));
  return json({ items: await list(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  const sp = req.nextUrl.searchParams;
  if (sp.get("checked") === "1") {
    await db.delete(shoppingItems).where(and(eq(shoppingItems.userId, userId), eq(shoppingItems.checked, true)));
  } else if (sp.get("all") === "1") {
    await db.delete(shoppingItems).where(eq(shoppingItems.userId, userId));
  } else {
    const id = Number(sp.get("id"));
    if (!id) return bad("id required");
    await db.delete(shoppingItems).where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)));
  }
  return json({ items: await list(userId) });
}
