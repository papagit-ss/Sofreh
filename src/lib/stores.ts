// ساختار اتصال به فروشگاه‌های آنلاین — فعلاً فقط تعریف Provider؛ در آینده Adapter واقعی هر فروشگاه اضافه می‌شود.

export type StoreProvider = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  enabled: boolean; // وقتی adapter واقعی آماده شد true می‌شود
  description: string;
};

export type ShoppingExportItem = {
  name: string;
  amount: number | null;
  unit: string | null;
  ingredientId: number | null;
};

export const STORE_PROVIDERS: StoreProvider[] = [
  { id: "digikala_jet", name: "دیجی‌کالا جت", color: "#ef394e", emoji: "🛵", enabled: false, description: "ارسال سریع سوپرمارکتی" },
  { id: "snapp_market", name: "اسنپ مارکت", color: "#00a76f", emoji: "🛒", enabled: false, description: "خرید از سوپرمارکت‌های اطراف" },
  { id: "okala", name: "اکالا", color: "#e5322d", emoji: "🧺", enabled: false, description: "فروشگاه‌های زنجیره‌ای افق کوروش" },
  { id: "manual", name: "کپی لیست خرید", color: "#6b7280", emoji: "📋", enabled: true, description: "لیست را کپی کن و در هر جایی استفاده کن" },
];

/** Interface for future adapters (server-side): build a cart on the provider and return a redirect URL. */
export interface StoreAdapter {
  providerId: string;
  createCart(items: ShoppingExportItem[], userId: string): Promise<{ url: string; externalRef?: string }>;
}

export function formatListAsText(items: ShoppingExportItem[]): string {
  return items
    .map((i) => `• ${i.name}${i.amount ? ` — ${formatAmount(i.amount)} ${i.unit ?? ""}` : ""}`.trim())
    .join("\n");
}

export function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0.5) return "½";
  if (rounded === 0.25) return "¼";
  if (rounded === 0.75) return "¾";
  return String(rounded);
}
