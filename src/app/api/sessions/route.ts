import type { NextRequest } from "next/server";
import { db } from "@/db";
import { cookSessions, recipes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { bad, getUserId, json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const rows = await db
    .select({
      id: cookSessions.id,
      recipeId: cookSessions.recipeId,
      servings: cookSessions.servings,
      currentStep: cookSessions.currentStep,
      status: cookSessions.status,
      startedAt: cookSessions.startedAt,
      completedAt: cookSessions.completedAt,
      slug: recipes.slug,
      title: recipes.title,
      emoji: recipes.emoji,
      totalMinutes: recipes.prepMinutes,
    })
    .from(cookSessions)
    .innerJoin(recipes, eq(cookSessions.recipeId, recipes.id))
    .where(eq(cookSessions.userId, userId))
    .orderBy(desc(cookSessions.startedAt))
    .limit(30);
  return json({
    active: rows.find((r) => r.status === "in_progress") ?? null,
    history: rows.filter((r) => r.status === "completed"),
  });
}

// start or resume: { recipeId, servings, restart? }
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  const recipeId = Number(body?.recipeId);
  if (!recipeId) return bad("recipeId required");
  const servings = Number(body?.servings) || 4;

  // abandon other active sessions
  await db
    .update(cookSessions)
    .set({ status: "abandoned" })
    .where(and(eq(cookSessions.userId, userId), eq(cookSessions.status, "in_progress"), body?.restart ? eq(cookSessions.recipeId, recipeId) : undefined));

  const existing = await db
    .select()
    .from(cookSessions)
    .where(and(eq(cookSessions.userId, userId), eq(cookSessions.recipeId, recipeId), eq(cookSessions.status, "in_progress")))
    .limit(1);
  if (existing.length && !body?.restart) return json({ session: existing[0] });

  const [session] = await db.insert(cookSessions).values({ userId, recipeId, servings, currentStep: 1 }).returning();
  return json({ session });
}

// update: { id, currentStep?, status?, rating? }
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return bad("id required");
  const set: Partial<typeof cookSessions.$inferInsert> = {};
  if (body.currentStep) set.currentStep = Number(body.currentStep);
  if (body.status) {
    set.status = body.status;
    if (body.status === "completed") set.completedAt = new Date();
  }
  if (body.rating) set.rating = Number(body.rating);
  const [session] = await db
    .update(cookSessions)
    .set(set)
    .where(and(eq(cookSessions.id, id), eq(cookSessions.userId, userId)))
    .returning();
  return json({ session });
}
