"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import type { Ingredient } from "@/db/schema";
import type { PantryItemDto } from "@/lib/types";
import { LOCATION_LABELS, toFa } from "@/lib/types";
import { formatAmount } from "@/lib/stores";
import { Icon } from "@/components/Icon";
import { Button, Chip, EmptyState, PageHeader, Sheet, Skeleton, useToast } from "@/components/ui";

const CATEGORY_ORDER: [string, string][] = [
  ["protein", "پروتئین"], ["vegetable", "سبزیجات"], ["herb", "سبزی‌ها"], ["grain", "غلات و نان"], ["legume", "حبوبات"],
  ["dairy", "لبنیات"], ["spice", "ادویه"], ["other", "سایر"], ["oil", "روغن"], ["nut", "مغزها"], ["fruit", "میوه"],
];

const QUICK_SLUGS = ["rice", "chicken", "ground-beef", "beef-stew", "egg", "onion", "potato", "tomato", "tomato-paste", "garlic", "pasta", "lentil", "red-bean", "split-pea", "yogurt", "bread", "eggplant", "flour", "butter", "milk"];

export default function PantryPage() {
  const toast = useToast();
  const { data, loading, setData } = useApi<{ items: PantryItemDto[] }>("/api/pantry");
  const { data: ingData } = useApi<{ ingredients: Ingredient[] }>("/api/ingredients");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PantryItemDto | null>(null);
  const [adding, setAdding] = useState<Ingredient | null>(null);
  const [browse, setBrowse] = useState(false);

  const items = data?.items ?? [];
  const inPantry = useMemo(() => new Set(items.map((i) => i.ingredientId)), [items]);
  const allIng = ingData?.ingredients ?? [];
  const quick = QUICK_SLUGS.map((s) => allIng.find((i) => i.slug === s)).filter((x): x is Ingredient => !!x && !inPantry.has(x.id));
  const results = q.trim() ? allIng.filter((i) => i.name.includes(q.trim()) || i.aliases.some((a) => a.includes(q.trim()))).slice(0, 12) : [];
  const useSoon = items.filter((i) => i.useSoon || (i.daysLeft !== null && i.daysLeft <= 3));

  const quickAdd = async (ing: Ingredient) => {
    const res = await api<{ items: PantryItemDto[] }>("/api/pantry", { method: "POST", json: { ingredientId: ing.id, unit: ing.defaultUnit, location: defaultLocation(ing.category) } });
    setData(res);
    setQ("");
    toast(`${ing.name} اضافه شد`);
  };
  const remove = async (item: PantryItemDto) => {
    const res = await api<{ items: PantryItemDto[] }>(`/api/pantry?id=${item.id}`, { method: "DELETE" });
    setData(res);
    setEditing(null);
  };
  const save = async (payload: Record<string, unknown>) => {
    const res = editing
      ? await api<{ items: PantryItemDto[] }>("/api/pantry", { method: "PATCH", json: { id: editing.id, ...payload } })
      : await api<{ items: PantryItemDto[] }>("/api/pantry", { method: "POST", json: { ingredientId: adding!.id, ...payload } });
    setData(res);
    setEditing(null);
    setAdding(null);
    toast("ذخیره شد");
  };

  const grouped = useMemo(() => {
    const g: Record<string, PantryItemDto[]> = { fridge: [], freezer: [], pantry: [] };
    for (const it of items) (g[it.location] ??= []).push(it);
    return g;
  }, [items]);

  return (
    <main className="pb-28">
      <PageHeader title="یخچال من" subtitle={items.length ? `${toFa(items.length)} ماده ثبت شده` : "چی تو خونه داری؟"} />

      <section className="px-4 pt-3">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-brand-400">
          <Icon name="search" className="h-5 w-5 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اضافه کردن ماده… مثلاً مرغ، لپه، زرشک" className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-stone-400" />
          {q && <button onClick={() => setQ("")}><Icon name="x" className="h-4 w-4 text-stone-400" /></button>}
        </label>
        {results.length > 0 && (
          <div className="card mt-2 divide-y divide-stone-100 fade-in">
            {results.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-sm font-bold">{i.name}</span>
                {inPantry.has(i.id) ? (
                  <span className="text-xs font-semibold text-sage-600">✓ داری</span>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => { setAdding(i); setQ(""); }} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-bold press">با جزئیات</button>
                    <button onClick={() => quickAdd(i)} className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-bold text-white press">+ افزودن</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {q && results.length === 0 && <p className="mt-2 px-1 text-xs text-stone-500">چیزی پیدا نشد.</p>}
      </section>

      {quick.length > 0 && !q && (
        <section className="mt-4">
          <div className="flex items-center justify-between px-4">
            <p className="text-sm font-bold text-stone-700">افزودن سریع</p>
            <button onClick={() => setBrowse(true)} className="text-xs font-semibold text-brand-600">همه مواد</button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
            {quick.map((i) => (
              <Chip key={i.id} onClick={() => quickAdd(i)}>+ {i.name}</Chip>
            ))}
          </div>
        </section>
      )}

      {useSoon.length > 0 && (
        <section className="mt-4 px-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-sm font-extrabold text-amber-900">⚡ {toFa(useSoon.length)} ماده بهتره زودتر مصرف بشه</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {useSoon.map((i) => (
                <button key={i.id} onClick={() => setEditing(i)} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                  {i.name}{i.daysLeft !== null && i.daysLeft <= 3 ? ` · ${i.daysLeft <= 0 ? "منقضی" : `${toFa(i.daysLeft)} روز`}` : ""}
                </button>
              ))}
            </div>
            <Link href="/recipes?sort=match" className="mt-2 inline-block text-xs font-bold text-amber-900 underline">غذاهایی که ازشون استفاده می‌کنن ←</Link>
          </div>
        </section>
      )}

      {loading && !data && <div className="mt-4 space-y-2 px-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}

      {data && items.length === 0 && (
        <EmptyState emoji="🧊" title="یخچالت خالیه!" text="از افزودن سریع بالا شروع کن؛ بعدش می‌گم با چیزایی که داری چی می‌شه پخت." />
      )}

      {(["fridge", "freezer", "pantry"] as const).map((loc) =>
        grouped[loc]?.length ? (
          <section key={loc} className="mt-5">
            <h2 className="mb-2 px-4 text-sm font-extrabold text-stone-700">
              {loc === "fridge" ? "🧊" : loc === "freezer" ? "❄️" : "🗄️"} {LOCATION_LABELS[loc]} <span className="text-xs font-medium text-stone-400">({toFa(grouped[loc].length)})</span>
            </h2>
            <div className="card mx-4 divide-y divide-stone-100">
              {grouped[loc].map((it) => (
                <button key={it.id} onClick={() => setEditing(it)} className="flex w-full items-center gap-3 px-3.5 py-3 text-right press">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{it.name}</p>
                    <p className="text-[11px] text-stone-500">
                      {it.amount ? `${toFa(formatAmount(it.amount))} ${it.unit ?? ""}` : "مقدار ثبت نشده"}
                      {it.daysLeft !== null && (
                        <span className={it.daysLeft <= 3 ? " text-amber-700 font-semibold" : ""}> · {it.daysLeft <= 0 ? "منقضی شده" : `${toFa(it.daysLeft)} روز تا انقضا`}</span>
                      )}
                      {it.useSoon && <span className="text-amber-700 font-semibold"> · زودتر مصرف شود</span>}
                    </p>
                  </div>
                  <Icon name="forward" className="h-4 w-4 text-stone-300" />
                </button>
              ))}
            </div>
          </section>
        ) : null
      )}

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-30 mx-auto max-w-lg px-4 pb-3 pt-2">
          <Button href="/recipes?minMatch=60&sort=match" className="w-full shadow-lg">
            <Icon name="sparkles" className="h-5 w-5" /> با این‌ها چی می‌شه پخت؟
          </Button>
        </div>
      )}

      <ItemSheet
        open={!!editing || !!adding}
        onClose={() => { setEditing(null); setAdding(null); }}
        item={editing}
        ingredient={adding}
        onSave={save}
        onDelete={editing ? () => remove(editing) : undefined}
      />

      <Sheet open={browse} onClose={() => setBrowse(false)} title="همه مواد" tall>
        {CATEGORY_ORDER.map(([cat, label]) => {
          const list = allIng.filter((i) => i.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="mb-4">
              <p className="mb-2 text-sm font-bold text-stone-700">{label}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((i) => (
                  <Chip key={i.id} active={inPantry.has(i.id)} tone="green" onClick={() => !inPantry.has(i.id) && quickAdd(i)}>
                    {inPantry.has(i.id) ? "✓ " : "+ "}{i.name}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
      </Sheet>
    </main>
  );
}

function defaultLocation(category: string) {
  if (["protein"].includes(category)) return "freezer";
  if (["vegetable", "herb", "dairy", "fruit"].includes(category)) return "fridge";
  return "pantry";
}

const UNITS = ["عدد", "کیلوگرم", "گرم", "بسته", "پیمانه", "لیتر", "دسته", "حبه", "قاشق غذاخوری"];

function ItemSheet({ open, onClose, item, ingredient, onSave, onDelete }: {
  open: boolean; onClose: () => void; item: PantryItemDto | null; ingredient: Ingredient | null;
  onSave: (p: Record<string, unknown>) => Promise<void>; onDelete?: () => void;
}) {
  const name = item?.name ?? ingredient?.name ?? "";
  const key = `${item?.id ?? "new"}-${ingredient?.id ?? ""}`;
  return (
    <Sheet open={open} onClose={onClose} title={name}>
      {open && <ItemForm key={key} item={item} ingredient={ingredient} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function ItemForm({ item, ingredient, onSave, onDelete }: { item: PantryItemDto | null; ingredient: Ingredient | null; onSave: (p: Record<string, unknown>) => Promise<void>; onDelete?: () => void }) {
  const [amount, setAmount] = useState(item?.amount?.toString() ?? "");
  const [unit, setUnit] = useState(item?.unit ?? ingredient?.defaultUnit ?? "عدد");
  const [location, setLocation] = useState(item?.location ?? (ingredient ? defaultLocation(ingredient.category) : "pantry"));
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ?? "");
  const [useSoon, setUseSoon] = useState(item?.useSoon ?? false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">مقدار تقریبی</p>
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلاً ۲" className="h-12 w-28 rounded-xl bg-stone-50 px-3 text-center text-lg font-bold ring-1 ring-stone-200 outline-none focus:ring-brand-400" />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-12 flex-1 rounded-xl bg-stone-50 px-3 font-semibold ring-1 ring-stone-200 outline-none">
            {[unit, ...UNITS.filter((u) => u !== unit)].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">کجاست؟</p>
        <div className="grid grid-cols-3 gap-2">
          {(["fridge", "freezer", "pantry"] as const).map((l) => (
            <button key={l} onClick={() => setLocation(l)} className={`h-11 rounded-xl text-sm font-bold ring-1 press ${location === l ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-stone-200"}`}>
              {l === "fridge" ? "🧊 یخچال" : l === "freezer" ? "❄️ فریزر" : "🗄️ کابینت"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">تاریخ انقضا (اختیاری)</p>
        <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-12 w-full rounded-xl bg-stone-50 px-3 ring-1 ring-stone-200 outline-none" />
      </div>
      <label className="flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-3">
        <span className="text-sm font-bold text-amber-900">⚡ بهتره زودتر مصرف بشه</span>
        <input type="checkbox" checked={useSoon} onChange={(e) => setUseSoon(e.target.checked)} className="h-5 w-5 accent-amber-600" />
      </label>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={saving} onClick={async () => { setSaving(true); await onSave({ amount: amount ? Number(amount) : null, unit, location, expiresAt: expiresAt || null, useSoon }); setSaving(false); }}>
          ذخیره
        </Button>
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            <Icon name="trash" className="h-5 w-5" /> تموم شد
          </Button>
        )}
      </div>
    </div>
  );
}
