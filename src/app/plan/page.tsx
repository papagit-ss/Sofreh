"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { MatchedIngredient, RecipeSummary } from "@/lib/types";
import { formatMinutes, formatPrice, toFa } from "@/lib/types";
import { formatAmount } from "@/lib/stores";
import { Icon } from "@/components/Icon";
import { MatchPill } from "@/components/RecipeCard";
import { Button, Chip, PageHeader, useToast } from "@/components/ui";

type Menu = {
  mains: RecipeSummary[];
  sides: RecipeSummary[];
  totalMinutes: number;
  missing: MatchedIngredient[];
  estimatedCost: number;
  servings: number;
  reason: string;
};

const TIME_OPTS = [["30", "۳۰ دقیقه"], ["60", "۱ ساعت"], ["90", "۱.۵ ساعت"], ["150", "۲.۵ ساعت"], ["240", "وقت زیاد"]];

export default function PlanPage() {
  const toast = useToast();
  const [guests, setGuests] = useState(4);
  const [maxMinutes, setMaxMinutes] = useState("90");
  const [budget, setBudget] = useState<1 | 2 | 3>(2);
  const [cuisine, setCuisine] = useState("iranian");
  const [vegetarian, setVegetarian] = useState(false);
  const [preferPantry, setPreferPantry] = useState(false);
  const [withSides, setWithSides] = useState(true);
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api<{ menus: Menu[] }>("/api/plan", {
        method: "POST",
        json: { guests, maxMinutes: Number(maxMinutes), budget, cuisine: cuisine || undefined, vegetarian, preferPantry, withSides },
      });
      setMenus(res.menus);
      setExpanded(0);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setLoading(false);
    }
  };

  const addMenuToShopping = async (m: Menu) => {
    const ids = [...m.mains, ...m.sides].map((r) => r.id);
    const servings = Object.fromEntries(ids.map((id) => [id, m.servings]));
    const res = await api<{ added: number }>("/api/shopping", { method: "POST", json: { recipeIds: ids, servings } });
    toast(res.added ? `${toFa(res.added)} قلم به لیست خرید اضافه شد` : "همه اقلام از قبل در لیست بودند");
  };

  return (
    <main className="pb-24">
      <PageHeader title="مهمون دارم / چی بپزم؟" subtitle="شرایطت رو بگو تا منوی مناسب پیشنهاد بدم" back="/" />

      <section className="space-y-5 px-4 pt-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold">چند نفر؟</p>
              <p className="text-xs text-stone-500">با احتساب خودت</p>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1">
              <button onClick={() => setGuests(Math.max(1, guests - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm press"><Icon name="minus" className="h-4 w-4" /></button>
              <span className="w-12 text-center text-xl font-black tabular">{toFa(guests)}</span>
              <button onClick={() => setGuests(Math.min(30, guests + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm press"><Icon name="plus" className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-extrabold">چقدر وقت داری؟</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TIME_OPTS.map(([v, l]) => <Chip key={v} active={maxMinutes === v} onClick={() => setMaxMinutes(v)}>{l}</Chip>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-extrabold">بودجه</p>
          <div className="grid grid-cols-3 gap-2">
            {([[1, "اقتصادی", "💸"], [2, "معمولی", "💳"], [3, "مهم نیست", "💎"]] as const).map(([v, l, e]) => (
              <button key={v} onClick={() => setBudget(v)} className={`h-14 rounded-2xl text-sm font-bold ring-1 press ${budget === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-stone-200"}`}>
                <span className="ml-1">{e}</span>{l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-extrabold">ترجیحات</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={cuisine === "iranian"} onClick={() => setCuisine(cuisine === "iranian" ? "" : "iranian")}>غذای ایرانی</Chip>
            <Chip active={cuisine === "italian"} onClick={() => setCuisine(cuisine === "italian" ? "" : "italian")}>ایتالیایی</Chip>
            <Chip active={vegetarian} onClick={() => setVegetarian(!vegetarian)}>بدون گوشت</Chip>
            <Chip active={preferPantry} onClick={() => setPreferPantry(!preferPantry)} tone="green">مواد زیادی نمی‌خوام بخرم</Chip>
            <Chip active={withSides} onClick={() => setWithSides(!withSides)}>با پیش‌غذا و سالاد</Chip>
          </div>
        </div>

        <Button className="w-full" onClick={run} disabled={loading}>
          <Icon name="sparkles" className="h-5 w-5" /> {loading ? "در حال بررسی…" : "منو پیشنهاد بده"}
        </Button>
      </section>

      <section id="results" className="mt-8 px-4">
        {menus && menus.length === 0 && (
          <div className="card p-6 text-center text-sm text-stone-500">با این شرایط غذایی پیدا نشد؛ زمان یا بودجه رو کمی بیشتر کن.</div>
        )}
        {menus?.map((m, idx) => (
          <div key={idx} className={`card mb-4 overflow-hidden ${idx === 0 ? "ring-2 ring-brand-500" : ""}`}>
            <button onClick={() => setExpanded(expanded === idx ? null : idx)} className="w-full p-4 text-right">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-brand-600">{idx === 0 ? "⭐ پیشنهاد اول" : `گزینه ${toFa(idx + 1)}`}</p>
                <Icon name="chevronDown" className={`h-5 w-5 text-stone-400 transition ${expanded === idx ? "rotate-180" : ""}`} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {m.mains.map((r) => <span key={r.id} className="text-lg font-black">{r.emoji} {r.title}</span>)}
                {m.sides.map((r) => <span key={r.id} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{r.emoji} {r.title}</span>)}
              </div>
              <p className="mt-2 text-xs text-stone-500">{m.reason}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Info label="زمان" value={formatMinutes(m.totalMinutes)} />
                <Info label="خرید لازم" value={m.missing.length ? `${toFa(m.missing.length)} قلم` : "هیچی!"} />
                <Info label="هزینه تقریبی" value={m.estimatedCost ? formatPrice(m.estimatedCost) : "—"} />
              </div>
            </button>
            {expanded === idx && (
              <div className="border-t border-stone-100 p-4 fade-in">
                <p className="mb-2 text-sm font-extrabold">غذاها ({toFa(m.servings)} نفر)</p>
                <div className="space-y-2">
                  {[...m.mains, ...m.sides].map((r) => (
                    <Link key={r.id} href={`/recipes/${r.slug}`} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 press">
                      <span className="text-2xl">{r.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{r.title}</p>
                        <p className="text-[11px] text-stone-500">{formatMinutes(r.totalMinutes)}</p>
                      </div>
                      <MatchPill percent={r.match.percent} missingCount={r.match.missingCount} compact />
                    </Link>
                  ))}
                </div>
                {m.missing.length > 0 && (
                  <>
                    <p className="mb-2 mt-4 text-sm font-extrabold">باید بخری</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {m.missing.map((i) => (
                        <li key={i.ingredientId} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 tabular">
                          {i.name} · {toFa(formatAmount(i.amount))} {i.unit}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-4 flex gap-2">
                  {m.missing.length > 0 && (
                    <Button className="flex-1" size="md" onClick={() => addMenuToShopping(m)}>
                      <Icon name="cart" className="h-4 w-4" /> لیست خرید کل منو
                    </Button>
                  )}
                  <Button variant="secondary" size="md" href={`/recipes/${m.mains[0].slug}`} className="flex-1">
                    <Icon name="chef" className="h-4 w-4" /> شروع با {m.mains[0].title}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 py-2">
      <p className="text-[13px] font-extrabold">{value}</p>
      <p className="text-[10px] text-stone-500">{label}</p>
    </div>
  );
}
