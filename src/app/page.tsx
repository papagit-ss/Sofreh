"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import type { RecipeSummary } from "@/lib/types";
import { toFa } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { RecipeCard, RecipeTile } from "@/components/RecipeCard";
import { SectionTitle, Skeleton } from "@/components/ui";

type Dashboard = {
  pantryCount: number;
  useSoonCount: number;
  useSoonNames: string[];
  favoritesCount: number;
  shoppingCount: number;
  activeSession: { id: number; currentStep: number; slug: string; title: string; emoji: string } | null;
  recentlyCooked: { slug: string; title: string; emoji: string }[];
  canCookNow: RecipeSummary[];
  almost: RecipeSummary[];
  quick: RecipeSummary[];
  todayPicks: RecipeSummary[];
  mealHint: "breakfast" | "lunch" | "dinner";
  totalRecipes: number;
};

const GREETING: Record<Dashboard["mealHint"], string> = {
  breakfast: "صبح بخیر! صبحانه چی بخوریم؟",
  lunch: "ناهار امروز چی بپزیم؟",
  dinner: "شام امشب چی بپزیم؟",
};

export default function HomePage() {
  const { data, loading } = useApi<Dashboard>("/api/dashboard");
  const hasPantry = (data?.pantryCount ?? 0) > 0;

  return (
    <main className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-brand-600 via-brand-500 to-brand-400 px-5 pb-16 pt-8 text-white">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <Icon name="chef" className="h-5 w-5" /> آشپز
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight">{data ? GREETING[data.mealHint] : "امروز چی بپزیم؟"}</h1>
          <p className="mt-1 text-sm text-white/80">
            {hasPantry
              ? `${toFa(data!.pantryCount)} ماده در یخچالت ثبت شده · ${toFa(data!.canCookNow.length)} غذا بدون خرید آماده‌ای`
              : "یخچالت رو وارد کن تا بگم الان چی می‌تونی بپزی"}
          </p>
        </div>
      </section>

      {/* Primary action */}
      <section className="relative -mt-10 px-4">
        <Link
          href={hasPantry ? "/recipes?minMatch=60&sort=match" : "/pantry"}
          className="card flex items-center gap-4 border-0 p-4 shadow-lg shadow-brand-900/10 ring-1 ring-brand-100 press"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Icon name="sparkles" className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold">با چیزایی که الان دارم چی می‌شه درست کرد؟</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {hasPantry ? "بر اساس یخچال و کابینتت مرتب‌شده" : "اول چند ماده به یخچالت اضافه کن"}
            </p>
          </div>
          <Icon name="forward" className="h-5 w-5 text-stone-400" />
        </Link>
      </section>

      {/* Active session */}
      {data?.activeSession && (
        <section className="mt-4 px-4">
          <Link
            href={`/cook/${data.activeSession.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white press"
          >
            <span className="text-3xl">{data.activeSession.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70">آشپزی نیمه‌تمام</p>
              <p className="truncate font-extrabold">{data.activeSession.title}</p>
              <p className="text-xs text-white/70">مرحله {toFa(data.activeSession.currentStep)} · ادامه بده</p>
            </div>
            <span className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold">ادامه</span>
          </Link>
        </section>
      )}

      {/* Quick actions grid */}
      <section className="mt-5 grid grid-cols-4 gap-2 px-4">
        <QuickAction href="/plan" icon="users" label="مهمون دارم" />
        <QuickAction href="/pantry" icon="fridge" label="یخچال من" badge={data?.useSoonCount ? toFa(data.useSoonCount) : undefined} badgeTone="amber" />
        <QuickAction href="/shopping" icon="cart" label="لیست خرید" badge={data?.shoppingCount ? toFa(data.shoppingCount) : undefined} />
        <QuickAction href="/help" icon="help" label="کمک فوری" />
      </section>

      {/* Use soon alert */}
      {!!data?.useSoonCount && (
        <section className="mt-4 px-4">
          <Link href="/recipes?sort=match" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 press">
            <span className="text-2xl">⚡</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-amber-900">
                {toFa(data.useSoonCount)} ماده غذایی داری که بهتره زودتر مصرف بشن
              </p>
              <p className="truncate text-xs text-amber-800/80">{data.useSoonNames.join("، ")} — غذاهای مرتبط بالاتر نشون داده می‌شن</p>
            </div>
            <Icon name="forward" className="h-4 w-4 text-amber-700" />
          </Link>
        </section>
      )}

      {loading && !data && (
        <div className="mt-6 space-y-3 px-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {data && hasPantry && data.canCookNow.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="الان می‌تونی اینا رو درست کنی" href="/recipes?minMatch=100" />
          <div className="space-y-2.5 px-4">
            {data.canCookNow.slice(0, 4).map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {data && hasPantry && data.almost.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="فقط ۱ تا ۲ قلم خرید لازم داره" href="/recipes?minMatch=60" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {data.almost.map((r) => (
              <RecipeTile key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="mt-7">
          <SectionTitle title="پیشنهاد امروز" href="/recipes?sort=popular" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {data.todayPicks.map((r) => (
              <RecipeTile key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="mt-7">
          <SectionTitle title="زیر ۳۰ دقیقه" href="/recipes?maxTime=30" />
          <div className="space-y-2.5 px-4">
            {data.quick.slice(0, 3).map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {data && data.recentlyCooked.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="اخیراً پختی — دوباره بپز" href="/saved" />
          <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {data.recentlyCooked.map((r) => (
              <Link key={r.slug} href={`/recipes/${r.slug}`} className="card flex shrink-0 items-center gap-2 px-3 py-2 press">
                <span className="text-xl">{r.emoji}</span>
                <span className="text-sm font-bold">{r.title}</span>
                <Icon name="refresh" className="h-4 w-4 text-brand-600" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {data && !hasPantry && (
        <section className="mt-7 px-4">
          <div className="card bg-gradient-to-bl from-sage-50 to-white p-5">
            <h3 className="text-base font-extrabold">🧊 یخچالت رو در ۱ دقیقه وارد کن</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              مواد پرمصرف مثل برنج، مرغ، پیاز، رب و تخم‌مرغ رو با یک ضربه اضافه کن؛ بعدش برای هر غذا دقیق می‌گم چی داری و چی باید بخری.
            </p>
            <Link href="/pantry" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-sage-500 px-4 text-sm font-bold text-white press">
              شروع کن <Icon name="forward" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function QuickAction({
  href,
  icon,
  label,
  badge,
  badgeTone = "brand",
}: {
  href: string;
  icon: "users" | "fridge" | "cart" | "help";
  label: string;
  badge?: string;
  badgeTone?: "brand" | "amber";
}) {
  return (
    <Link href={href} className="card relative flex flex-col items-center gap-1.5 py-3.5 press">
      {badge && (
        <span
          className={`absolute -top-1.5 left-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${badgeTone === "amber" ? "bg-amber-500" : "bg-brand-600"}`}
        >
          {badge}
        </span>
      )}
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-bold text-stone-700">{label}</span>
    </Link>
  );
}
