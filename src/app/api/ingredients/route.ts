import type { NextRequest } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const all = await db.select().from(ingredients).orderBy(ingredients.name);
  const list = q
    ? all.filter((i) => i.name.includes(q) || i.aliases.some((a) => a.includes(q)))
    : all;
  return json({ ingredients: list });
}
