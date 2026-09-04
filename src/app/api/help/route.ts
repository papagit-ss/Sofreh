import type { NextRequest } from "next/server";
import { SUBSTITUTIONS, TROUBLESHOOT } from "@/data/help";
import { json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const subs = q
    ? SUBSTITUTIONS.filter((s) => s.ingredientName.includes(q) || s.options.some((o) => o.name.includes(q)))
    : SUBSTITUTIONS;
  return json({ troubleshoot: TROUBLESHOOT, substitutions: subs });
}
