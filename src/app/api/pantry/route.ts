import type { NextRequest } from "next/server";
import { db } from "@/db";
import { ingredients, pantryItems } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { and, eq } from "drizzle-orm";
import { bad, getUserId, json } from "@/lib/server/user";
import type { PantryItemDto } from "@/lib/types";

export const dynamic = "force-dynamic";

async function list(userId: string): Promise<PantryItemDto[]> {
  const rows = await db
    .select({
      id: pantryItems.id,
      ingredientId: pantryItems.ingredientId,
      name: ingredients.name,
      category: ingredients.category,
      amount: pantryItems.amount,
      unit: pantryItems.unit,
      location: pantryItems.location,
      expiresAt: pantryItems.expiresAt,
      useSoon: pantryItems.useSoon,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .where(eq(pantryItems.userId, userId))
    .orderBy(ingredients.category, ingredients.name);
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    expiresAt: r.expiresAt ? String(r.expiresAt) : null,
    daysLeft: r.expiresAt ? Math.ceil((new Date(r.expiresAt).getTime() - now) / 86400000) : null,
  }));
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  return json({ items: await list(getUserId(req)) });
}

// upsert one or many: { items: [{ ingredientId, amount?, unit?, location?, expiresAt?, useSoon? }] }
export async function POST(req: NextRequest) {
  await ensureSeeded();
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  const items: Array<{
    ingredientId: number;
    amount?: number | null;
    unit?: string | null;
    location?: string;
    expiresAt?: string | null;
    useSoon?: boolean;
  }> = Array.isArray(body?.items) ? body.items : body?.ingredientId ? [body] : [];
  if (!items.length) return bad("items required");

  for (const it of items) {
    if (!Number.isInteger(it.ingredientId)) continue;
    await db
      .insert(pantryItems)
      .values({
        userId,
        ingredientId: it.ingredientId,
        amount: it.amount ?? null,
        unit: it.unit ?? null,
        location: it.location ?? "pantry",
        expiresAt: it.expiresAt || null,
        useSoon: !!it.useSoon,
      })
      .onConflictDoUpdate({
        target: [pantryItems.userId, pantryItems.ingredientId],
        set: {
          amount: it.amount ?? null,
          unit: it.unit ?? null,
          location: it.location ?? "pantry",
          expiresAt: it.expiresAt || null,
          useSoon: !!it.useSoon,
          updatedAt: new Date(),
        },
      });
  }
  return json({ items: await list(userId) });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  if (!body?.id) return bad("id required");
  const set: Partial<typeof pantryItems.$inferInsert> = { updatedAt: new Date() };
  if ("amount" in body) set.amount = body.amount ?? null;
  if ("unit" in body) set.unit = body.unit ?? null;
  if ("location" in body) set.location = body.location;
  if ("expiresAt" in body) set.expiresAt = body.expiresAt || null;
  if ("useSoon" in body) set.useSoon = !!body.useSoon;
  await db.update(pantryItems).set(set).where(and(eq(pantryItems.id, body.id), eq(pantryItems.userId, userId)));
  return json({ items: await list(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return bad("id required");
  await db.delete(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
  return json({ items: await list(userId) });
}
