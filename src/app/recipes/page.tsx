"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { qs } from "@/lib/api-client";
import type { RecipeSummary } from "@/lib/types";
import { CATEGORY_LABELS, toFa } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { RecipeCard } from "@/components/RecipeCard";
import { Chip, EmptyState, Sheet, Skeleton, Button } from "@/components/ui";

type Filters = {
  q: string;
  cuisine: string;
  category: string;
  maxTime: string;
  difficulty: string;
  cost: string;
  protein: string;
  vegetarian: boolean;
  minMatch: string;
  sort: string;
};

const DEFAULT: Filters = { q: "", cuisine: "", category: "", maxTime: "", difficulty: "", cost: "", protein: "", vegetarian: false, minMatch: "", sort: "match" };

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="p-4"><Skeleton className="h-12" /></div>}>
      <RecipesInner />
    </Suspense>
  );
}

function RecipesInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [f, setF] = useState<Filters>(() => ({
    ...DEFAULT,
    q: sp.get("q") ?? "",
    cuisine: sp.get("cuisine") ?? "",
    category: sp.get("category") ?? "",
    maxTime: sp.get("maxTime") ?? "",
    difficulty: sp.get("difficulty") ?? "",
    cost: sp.get("cost") ?? "",
    protein: sp.get("protein") ?? "",
    vegetarian: sp.get("vegetarian") === "1",
    minMatch: sp.get("minMatch") ?? "",
    sort: sp.get("sort") ?? "match",
  }));
  const [debouncedQ, setDebouncedQ] = useState(f.q);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(f.q), 250);
    return () => clearTimeout(t);
  }, [f.q]);

  const query = useMemo(() => qs({ ...f, q: debouncedQ, vegetarian: f.vegetarian }), [f, debouncedQ]);
  useEffect(() => {
    router.replace(`/recipes${query}`, { scroll: false });
  }, [query, router]);

  const { data, loading } = useApi<{ recipes: RecipeSummary[]; total: number }>(`/api/recipes${query}`);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  const activeCount = [f.cuisine, f.category, f.maxTime, f.difficulty, f.cost, f.protein, f.minMatch].filter(Boolean).length + (f.vegetarian ? 1 : 0);

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-30 bg-cream/95 px-4 pb-2 pt-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-brand-400">
            <Icon name="search" className="h-5 w-5 text-stone-400" />
            <input
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="جستجوی غذا… مثلاً قیمه، مرغ، سریع"
              className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-stone-400"
              inputMode="search"
            />
            {f.q && (
              <button onClick={() => set({ q: "" })} className="text-stone-400">
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </label>
          <button
            onClick={() => setSheet(true)}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-1 press ${activeCount ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-700 ring-stone-200"}`}
            aria-label="فیلترها"
          >
            <Icon name="filter" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                {toFa(activeCount)}
              </span>
            )}
          </button>
        </div>
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Chip active={f.minMatch === "100"} onClick={() => set({ minMatch: f.minMatch === "100" ? "" : "100", sort: "match" })} tone="green">
            ✓ همه موادش رو دارم
          </Chip>
          <Chip active={f.minMatch === "60"} onClick={() => set({ minMatch: f.minMatch === "60" ? "" : "60", sort: "match" })}>
            بیشتر موادش رو دارم
          </Chip>
          <Chip active={f.maxTime === "30"} onClick={() => set({ maxTime: f.maxTime === "30" ? "" : "30" })}>
            زیر ۳۰ دقیقه
          </Chip>
          <Chip active={f.difficulty === "easy"} onClick={() => set({ difficulty: f.difficulty === "easy" ? "" : "easy" })}>
            آسان
          </Chip>
          <Chip active={f.cost === "1"} onClick={() => set({ cost: f.cost === "1" ? "" : "1" })}>
            ارزان
          </Chip>
          <Chip active={f.vegetarian} onClick={() => set({ vegetarian: !f.vegetarian })}>
            بدون گوشت
          </Chip>
          <Chip active={f.protein === "chicken"} onClick={() => set({ protein: f.protein === "chicken" ? "" : "chicken" })}>
            با مرغ
          </Chip>
          <Chip active={f.cuisine === "iranian"} onClick={() => set({ cuisine: f.cuisine === "iranian" ? "" : "iranian" })}>
            ایرانی
          </Chip>
        </div>
      </header>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-stone-500">
        <span>{data ? `${toFa(data.total)} غذا` : ""}</span>
        <select
          value={f.sort}
          onChange={(e) => set({ sort: e.target.value })}
          className="rounded-lg bg-transparent py-1 font-semibold text-stone-700 outline-none"
        >
          <option value="match">مرتب‌سازی: تطابق با یخچال</option>
          <option value="time">سریع‌ترین</option>
          <option value="popular">محبوب‌ترین</option>
          <option value="cost">ارزان‌ترین</option>
        </select>
      </div>

      <div className="space-y-2.5 px-4">
        {loading && !data && [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[104px]" />)}
        {data?.recipes.map((r) => (
          <RecipeCard key={r.id} r={r} />
        ))}
      </div>
      {data && data.recipes.length === 0 && (
        <EmptyState
          emoji="🔍"
          title="غذایی با این شرایط پیدا نشد"
          text="یکی دو تا از فیلترها رو بردار یا مواد بیشتری به یخچالت اضافه کن."
          action={<Button variant="secondary" size="md" onClick={() => setF(DEFAULT)}>پاک کردن فیلترها</Button>}
        />
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="فیلترها">
        <FilterGroup label="نوع غذا">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <Chip key={k} active={f.category === k} onClick={() => set({ category: f.category === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="آشپزی">
          {[["iranian", "ایرانی"], ["italian", "ایتالیایی"], ["american", "آمریکایی"]].map(([k, v]) => (
            <Chip key={k} active={f.cuisine === k} onClick={() => set({ cuisine: f.cuisine === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="حداکثر زمان">
          {[["20", "۲۰ دقیقه"], ["30", "۳۰ دقیقه"], ["60", "۱ ساعت"], ["120", "۲ ساعت"]].map(([k, v]) => (
            <Chip key={k} active={f.maxTime === k} onClick={() => set({ maxTime: f.maxTime === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="سختی">
          {[["easy", "آسان"], ["medium", "متوسط"], ["hard", "سخت"]].map(([k, v]) => (
            <Chip key={k} active={f.difficulty === k} onClick={() => set({ difficulty: f.difficulty === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="هزینه">
          {[["1", "ارزان"], ["2", "تا متوسط"], ["3", "همه"]].map(([k, v]) => (
            <Chip key={k} active={f.cost === k} onClick={() => set({ cost: f.cost === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="پروتئین">
          {[["chicken", "مرغ"], ["beef", "گوشت"], ["lamb", "گوسفندی"], ["fish", "ماهی"], ["egg", "تخم‌مرغ"], ["none", "بدون گوشت"]].map(([k, v]) => (
            <Chip key={k} active={f.protein === k} onClick={() => set({ protein: f.protein === k ? "" : k })}>{v}</Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="بر اساس یخچال">
          <Chip active={f.minMatch === "100"} onClick={() => set({ minMatch: f.minMatch === "100" ? "" : "100" })} tone="green">همه موادش رو دارم</Chip>
          <Chip active={f.minMatch === "60"} onClick={() => set({ minMatch: f.minMatch === "60" ? "" : "60" })}>بیشترش رو دارم</Chip>
        </FilterGroup>
        <div className="mt-6 flex gap-2">
          <Button className="flex-1" onClick={() => setSheet(false)}>نمایش {data ? toFa(data.total) : ""} غذا</Button>
          <Button variant="secondary" onClick={() => setF({ ...DEFAULT, q: f.q })}>پاک کردن</Button>
        </div>
      </Sheet>
    </main>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-bold text-stone-700">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
