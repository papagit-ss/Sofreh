import type { NextRequest } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { bad, getUserId, json } from "@/lib/server/user";
import { listRecipes } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const rows = await db.select().from(favorites).where(eq(favorites.userId, userId));
  const ids = rows.map((r) => r.recipeId);
  const list = ids.length ? await listRecipes(userId, { ids, sort: "match" }) : [];
  return json({ recipes: list });
}

// toggle: { recipeId }
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  const recipeId = Number(body?.recipeId);
  if (!recipeId) return bad("recipeId required");
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)));
  if (existing.length) {
    await db.delete(favorites).where(eq(favorites.id, existing[0].id));
    return json({ isFavorite: false });
  }
  await db.insert(favorites).values({ userId, recipeId });
  return json({ isFavorite: true });
}
