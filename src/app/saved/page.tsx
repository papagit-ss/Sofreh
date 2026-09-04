"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import type { RecipeSummary } from "@/lib/types";
import { toFa } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { RecipeCard } from "@/components/RecipeCard";
import { Button, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";

type Sessions = {
  active: { id: number; slug: string; title: string; emoji: string; currentStep: number } | null;
  history: { id: number; slug: string; title: string; emoji: string; completedAt: string; servings: number }[];
};

export default function SavedPage() {
  const { data: favs, loading } = useApi<{ recipes: RecipeSummary[] }>("/api/favorites");
  const { data: sessions } = useApi<Sessions>("/api/sessions");
  const history = (sessions?.history ?? []).filter((h, i, arr) => arr.findIndex((x) => x.slug === h.slug) === i);

  return (
    <main className="pb-24">
      <PageHeader title="ذخیره‌ها" subtitle="غذاهای مورد علاقه و تاریخچه آشپزی" />

      {sessions?.active && (
        <section className="px-4 pt-4">
          <Link href={`/cook/${sessions.active.slug}`} className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white press">
            <span className="text-3xl">{sessions.active.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70">در حال پخت</p>
              <p className="truncate font-extrabold">{sessions.active.title}</p>
            </div>
            <span className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold">ادامه از مرحله {toFa(sessions.active.currentStep)}</span>
          </Link>
        </section>
      )}

      <section className="mt-5">
        <SectionTitle title={`مورد علاقه‌ها ${favs ? `(${toFa(favs.recipes.length)})` : ""}`} />
        {loading && !favs && <div className="space-y-2 px-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
        {favs && favs.recipes.length === 0 && (
          <EmptyState emoji="❤️" title="هنوز غذایی ذخیره نکردی" text="روی قلب کنار هر غذا بزن تا اینجا ذخیره بشه." action={<Button href="/recipes" variant="secondary" size="md">دیدن غذاها</Button>} />
        )}
        <div className="space-y-2.5 px-4">
          {favs?.recipes.map((r) => <RecipeCard key={r.id} r={r} />)}
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="قبلاً پختی" />
          <div className="card mx-4 divide-y divide-stone-100">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="text-2xl">{h.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{h.title}</p>
                  <p className="text-[11px] text-stone-500">{new Date(h.completedAt).toLocaleDateString("fa-IR")} · {toFa(h.servings)} نفر</p>
                </div>
                <Link href={`/recipes/${h.slug}`} className="flex h-9 items-center gap-1 rounded-xl bg-brand-50 px-3 text-xs font-bold text-brand-700 press">
                  <Icon name="refresh" className="h-4 w-4" /> دوباره بپز
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
