"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import type { RecipeDetail, MatchedIngredient } from "@/lib/types";
import { CUISINE_LABELS, DIFFICULTY_LABELS, formatMinutes, formatPrice, toFa } from "@/lib/types";
import { formatAmount } from "@/lib/stores";
import { Icon } from "@/components/Icon";
import { MatchBar } from "@/components/RecipeCard";
import { Button, PageHeader, Skeleton, useToast } from "@/components/ui";

export default function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [servings, setServings] = useState<number | null>(null);
  const url = `/api/recipes/${slug}${servings ? `?servings=${servings}` : ""}`;
  const { data, loading, setData, refetch } = useApi<RecipeDetail>(url);
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  if (loading && !data) {
    return (
      <main className="p-4">
        <Skeleton className="h-40" />
        <Skeleton className="mt-4 h-24" />
        <Skeleton className="mt-4 h-64" />
      </main>
    );
  }
  if (!data) return <main className="p-6 text-center text-stone-500">غذا پیدا نشد.</main>;

  const r = data;
  const s = r.servings;
  const have = r.ingredients.filter((i) => i.status === "have");
  const missing = r.ingredients.filter((i) => i.status === "missing");
  const optionalMissing = r.ingredients.filter((i) => i.status === "optional-missing");
  const staples = r.ingredients.filter((i) => i.status === "staple");

  const toggleFav = async () => {
    const res = await api<{ isFavorite: boolean }>("/api/favorites", { method: "POST", json: { recipeId: r.id } });
    setData({ ...r, isFavorite: res.isFavorite });
    toast(res.isFavorite ? "به ذخیره‌ها اضافه شد" : "از ذخیره‌ها حذف شد");
  };

  const addMissing = async () => {
    setAdding(true);
    try {
      const res = await api<{ added: number }>("/api/shopping", {
        method: "POST",
        json: { recipeIds: [r.id], servings: { [r.id]: s } },
      });
      toast(res.added ? `${toFa(res.added)} قلم به لیست خرید اضافه شد` : "این اقلام از قبل در لیست خرید بودند");
    } finally {
      setAdding(false);
    }
  };

  const startCooking = async (restart = false) => {
    await api("/api/sessions", { method: "POST", json: { recipeId: r.id, servings: s, restart } });
    router.push(`/cook/${r.slug}`);
  };

  return (
    <main className="pb-32">
      <PageHeader
        title={r.title}
        subtitle={`${CUISINE_LABELS[r.cuisine] ?? r.cuisine} · ${DIFFICULTY_LABELS[r.difficulty]} · ${formatMinutes(r.totalMinutes)}`}
        back="/recipes"
        action={
          <button
            onClick={toggleFav}
            className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 press ${r.isFavorite ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-600 ring-stone-200"}`}
            aria-label="ذخیره"
          >
            <Icon name={r.isFavorite ? "heartFill" : "heart"} />
          </button>
        }
      />

      <section className="px-4 pt-4">
        <div className="card overflow-hidden">
          <div className="relative flex items-center gap-4 overflow-hidden bg-gradient-to-bl from-brand-50 via-white to-amber-50 p-4">
            <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-brand-100/60 blur-2xl" />
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-5xl shadow-md ring-1 ring-brand-100 float-slow">{r.emoji}</div>
            <div className="relative min-w-0 flex-1">
              <p className="text-sm leading-6 text-stone-600">{r.description}</p>
              {r.timesCooked > 0 && <p className="mt-1 text-xs font-semibold text-sage-600">✓ {toFa(r.timesCooked)} بار پختی</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-stone-100 border-t border-stone-100 text-center">
            <Stat label="آماده‌سازی" value={formatMinutes(r.prepMinutes)} />
            <Stat label="پخت" value={formatMinutes(r.cookMinutes)} />
            <Stat label="سختی" value={DIFFICULTY_LABELS[r.difficulty]} />
            <Stat label="هزینه" value={["", "ارزان", "متوسط", "گران"][r.costLevel]} />
          </div>
        </div>
      </section>

      {/* Match summary */}
      <section className="mt-4 px-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black tabular">
                {toFa(r.match.percent)}٪ <span className="text-sm font-bold text-stone-500">مواد رو داری</span>
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {missing.length === 0
                  ? "همه مواد اصلی رو داری — بدون خرید می‌تونی بپزی 🎉"
                  : `فقط ${toFa(missing.length)} قلم باید بخری${r.match.estimatedMissingCost ? ` · حدوداً ${formatPrice(r.match.estimatedMissingCost)}` : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1">
              <button onClick={() => setServings(Math.max(1, s - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm press" aria-label="کمتر">
                <Icon name="minus" className="h-4 w-4" />
              </button>
              <div className="w-14 text-center">
                <div className="text-base font-black tabular">{toFa(s)}</div>
                <div className="-mt-1 text-[10px] text-stone-500">نفر</div>
              </div>
              <button onClick={() => setServings(Math.min(30, s + 1))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm press" aria-label="بیشتر">
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <MatchBar percent={r.match.percent} />
          </div>
          {missing.length > 0 && (
            <Button onClick={addMissing} disabled={adding} variant="secondary" size="md" className="mt-3 w-full">
              <Icon name="cart" className="h-4 w-4" /> افزودن {toFa(missing.length)} قلم به لیست خرید
            </Button>
          )}
        </div>
      </section>

      {/* Ingredients */}
      <section className="mt-5 px-4">
        <h2 className="mb-2 text-base font-extrabold">مواد لازم <span className="text-sm font-medium text-stone-500">برای {toFa(s)} نفر</span></h2>
        <div className="card stagger divide-y divide-stone-100">
          {missing.map((i) => <IngRow key={i.ingredientId} i={i} />)}
          {have.map((i) => <IngRow key={i.ingredientId} i={i} />)}
          {optionalMissing.map((i) => <IngRow key={i.ingredientId} i={i} />)}
          {staples.map((i) => <IngRow key={i.ingredientId} i={i} />)}
        </div>
        {staples.length > 0 && <p className="mt-2 px-1 text-[11px] text-stone-400">مواد پایه (نمک، روغن، زردچوبه…) معمولاً در خانه هست و در درصد حساب نمی‌شن.</p>}
      </section>

      {/* Substitutions */}
      {r.substitutionsForMissing.length > 0 && (
        <section className="mt-5 px-4">
          <h2 className="mb-2 text-base font-extrabold">جایگزین برای چیزایی که نداری</h2>
          <div className="space-y-2">
            {r.substitutionsForMissing.map((sub) => (
              <div key={sub.ingredientName} className="card p-3.5">
                <p className="text-sm font-extrabold">{sub.ingredientName} نداری؟</p>
                <ul className="mt-2 space-y-2">
                  {sub.options.slice(0, 2).map((o) => (
                    <li key={o.name} className="flex items-start gap-2 text-sm">
                      <ImpactDot impact={o.impact} />
                      <div>
                        <span className="font-bold">{o.name}</span> <span className="text-stone-500">— {o.ratio}</span>
                        {o.note && <p className="text-xs text-stone-500">{o.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Steps preview */}
      <section className="mt-5 px-4">
        <button onClick={() => setShowSteps((v) => !v)} className="flex w-full items-center justify-between py-1">
          <h2 className="text-base font-extrabold">مراحل پخت <span className="text-sm font-medium text-stone-500">({toFa(r.steps.length)} مرحله)</span></h2>
          <Icon name="chevronDown" className={`h-5 w-5 text-stone-400 transition ${showSteps ? "rotate-180" : ""}`} />
        </button>
        {showSteps && (
          <ol className="card mt-2 divide-y divide-stone-100">
            {r.steps.map((st) => (
              <li key={st.stepNumber} className="flex gap-3 p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-black text-brand-700 tabular">{toFa(st.stepNumber)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6">{st.instruction}</p>
                  {st.timerSeconds && <span className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500"><Icon name="clock" className="h-3.5 w-3.5" /> {formatMinutes(Math.round(st.timerSeconds / 60))}</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-[5.75rem] z-30 mx-auto max-w-lg px-4 pb-3 pt-2">
        <div className="flex gap-2">
          {r.activeSession ? (
            <>
              <Button className="flex-1" onClick={() => router.push(`/cook/${r.slug}`)}>
                <Icon name="play" className="h-5 w-5" /> ادامه از مرحله {toFa(r.activeSession.currentStep)}
              </Button>
              <Button variant="secondary" onClick={() => startCooking(true)}>
                <Icon name="refresh" className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button className="flex-1 glow-pulse" onClick={() => startCooking(false)}>
              <Icon name="chef" className="h-5 w-5" /> {r.timesCooked > 0 ? "دوباره بپز" : "شروع آشپزی"} · {toFa(s)} نفر
            </Button>
          )}
        </div>
      </div>
      <button onClick={() => refetch(true)} className="hidden" aria-hidden />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5">
      <div className="text-[13px] font-extrabold">{value}</div>
      <div className="text-[10px] text-stone-500">{label}</div>
    </div>
  );
}

function ImpactDot({ impact }: { impact: string }) {
  const map: Record<string, [string, string]> = {
    low: ["bg-sage-500", "تفاوت کم"],
    medium: ["bg-amber-500", "کمی فرق می‌کنه"],
    high: ["bg-red-500", "طعم فرق می‌کنه"],
  };
  const [cls, label] = map[impact] ?? map.medium;
  return <span title={label} className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

function IngRow({ i }: { i: MatchedIngredient }) {
  const styles: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    have: { icon: <Icon name="check" className="h-4 w-4" />, text: "موجود", cls: "bg-sage-100 text-sage-600" },
    missing: { icon: <Icon name="x" className="h-4 w-4" />, text: "باید بخری", cls: "bg-red-50 text-red-600" },
    "optional-missing": { icon: <span className="text-xs">؟</span>, text: "اختیاری", cls: "bg-stone-100 text-stone-500" },
    staple: { icon: <span className="text-xs">•</span>, text: "پایه", cls: "bg-stone-100 text-stone-500" },
  };
  const st = styles[i.status];
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${st.cls}`}>{st.icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${i.status === "missing" ? "text-ink" : "text-stone-700"}`}>
          {i.name}
          {i.pantryUseSoon && <span className="mr-1 text-[10px] font-semibold text-amber-700">⚡ زودتر مصرف کن</span>}
        </p>
        {i.note && <p className="text-[11px] text-stone-400">{i.note}</p>}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold tabular">{toFa(formatAmount(i.amount))} <span className="text-xs font-medium text-stone-500">{i.unit}</span></p>
        <p className={`text-[10px] font-semibold ${i.status === "missing" ? "text-red-600" : "text-stone-400"}`}>{st.text}</p>
      </div>
    </div>
  );
}
