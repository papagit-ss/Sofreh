import type { NextRequest } from "next/server";
import { db } from "@/db";
import { shoppingItems, storeOrders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { STORE_PROVIDERS, formatListAsText } from "@/lib/stores";
import { bad, getUserId, json } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ providers: STORE_PROVIDERS });
}

/** POST { providerId } → creates a draft order snapshot; real adapters will return a checkout URL. */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null);
  const provider = STORE_PROVIDERS.find((p) => p.id === body?.providerId);
  if (!provider) return bad("unknown provider");

  const items = await db
    .select()
    .from(shoppingItems)
    .where(and(eq(shoppingItems.userId, userId), eq(shoppingItems.checked, false)));
  const exportItems = items.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, ingredientId: i.ingredientId }));

  const [order] = await db
    .insert(storeOrders)
    .values({ userId, provider: provider.id, status: provider.enabled ? "exported" : "draft", payload: JSON.stringify(exportItems) })
    .returning();

  if (provider.id === "manual") {
    return json({ ok: true, orderId: order.id, text: formatListAsText(exportItems) });
  }
  return json({
    ok: false,
    orderId: order.id,
    message: `اتصال به ${provider.name} به‌زودی فعال می‌شود. لیست شما ذخیره شد.`,
  });
}
