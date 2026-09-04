// تایپ‌های مشترک بین API و کلاینت (در آینده برای اپ اندروید هم قابل استفاده)

export type IngredientStatus = "have" | "missing" | "staple" | "optional-missing";

export type MatchedIngredient = {
  ingredientId: number;
  name: string;
  slug: string;
  amount: number;
  unit: string;
  note: string | null;
  isOptional: boolean;
  isStaple: boolean;
  status: IngredientStatus;
  approxPrice: number;
  pantryUseSoon?: boolean;
};

export type RecipeMatch = {
  percent: number; // 0..100 over required (non-optional, non-staple) ingredients
  haveCount: number;
  requiredCount: number;
  missingCount: number;
  missing: MatchedIngredient[];
  useSoonHits: number; // how many "use soon" pantry items this recipe uses
  estimatedMissingCost: number;
};

export type RecipeSummary = {
  id: number;
  slug: string;
  title: string;
  description: string;
  cuisine: string;
  category: string;
  difficulty: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  baseServings: number;
  costLevel: number;
  mainProtein: string;
  isVegetarian: boolean;
  emoji: string;
  tags: string[];
  popularity: number;
  mealType: string;
  match: RecipeMatch;
  isFavorite: boolean;
};

export type RecipeStepDto = {
  stepNumber: number;
  instruction: string;
  timerSeconds: number | null;
  tip: string | null;
};

export type RecipeDetail = RecipeSummary & {
  servings: number;
  ingredients: MatchedIngredient[];
  steps: RecipeStepDto[];
  substitutionsForMissing: {
    ingredientName: string;
    options: { name: string; ratio: string; impact: string; note?: string }[];
  }[];
  activeSession: { id: number; currentStep: number; servings: number } | null;
  timesCooked: number;
};

export type PantryItemDto = {
  id: number;
  ingredientId: number;
  name: string;
  category: string;
  amount: number | null;
  unit: string | null;
  location: string;
  expiresAt: string | null;
  useSoon: boolean;
  daysLeft: number | null;
};

export type ShoppingItemDto = {
  id: number;
  ingredientId: number | null;
  name: string;
  amount: number | null;
  unit: string | null;
  recipeId: number | null;
  recipeTitle: string | null;
  checked: boolean;
};

export const CUISINE_LABELS: Record<string, string> = {
  iranian: "ایرانی",
  italian: "ایتالیایی",
  american: "آمریکایی",
  international: "بین‌المللی",
};

export const CATEGORY_LABELS: Record<string, string> = {
  stew: "خورش",
  rice: "پلو",
  kebab: "کباب",
  side: "کوکو و خوراک",
  breakfast: "صبحانه",
  soup: "آش و سوپ",
  fastfood: "فست‌فود",
  salad: "سالاد و پیش‌غذا",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "آسان",
  medium: "متوسط",
  hard: "سخت",
};

export const PROTEIN_LABELS: Record<string, string> = {
  chicken: "مرغ",
  beef: "گوشت",
  lamb: "گوسفندی",
  fish: "ماهی",
  egg: "تخم‌مرغ",
  none: "بدون گوشت",
};

export const LOCATION_LABELS: Record<string, string> = {
  fridge: "یخچال",
  freezer: "فریزر",
  pantry: "کابینت",
};

export const COST_LABELS: Record<number, string> = {
  1: "ارزان",
  2: "متوسط",
  3: "گران",
};

export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${toFa(m)} دقیقه`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${toFa(h)} ساعت و ${toFa(r)} دقیقه` : `${toFa(h)} ساعت`;
}

export function formatPrice(t: number): string {
  if (t >= 1000000) return `${toFa((t / 1000000).toFixed(1).replace(/\.0$/, ""))} میلیون تومان`;
  if (t >= 1000) return `${toFa(Math.round(t / 1000))} هزار تومان`;
  return `${toFa(t)} تومان`;
}
