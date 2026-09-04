import type { NextRequest } from "next/server";
import { getRecipeDetail } from "@/lib/server/catalog";
import { bad, getUserId, json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const servings = req.nextUrl.searchParams.get("servings");
  const detail = await getRecipeDetail(slug, getUserId(req), servings ? Number(servings) : undefined);
  if (!detail) return bad("recipe not found", 404);
  return json(detail);
}
