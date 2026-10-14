"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import type { ShoppingItemDto } from "@/lib/types";
import { toFa } from "@/lib/types";
import { formatAmount, type StoreProvider } from "@/lib/stores";
import { Icon } from "@/components/Icon";
import { Button, EmptyState, PageHeader, Sheet, Skeleton, useToast } from "@/components/ui";

export default function ShoppingPage() {
  const toast = useToast();
  const { data, loading, setData } = useApi<{ items: ShoppingItemDto[] }>("/api/shopping");
  const { data: stores } = useApi<{ providers: StoreProvider[] }>("/api/stores");
  const [manual, setManual] = useState("");
  const [storeSheet, setStoreSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const items = data?.items ?? [];
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const groups = useMemo(() => {
    const g = new Map<string, ShoppingItemDto[]>();
    for (const it of open) {
      const k = it.recipeTitle ?? "سایر";
      g.set(k, [...(g.get(k) ?? []), it]);
    }
    return [...g.entries()];
  }, [open]);

  const toggle = async (it: ShoppingItemDto) => {
    setData({ items: items.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)) });
    const res = await api<{ items: ShoppingItemDto[] }>("/api/shopping", { method: "PATCH", json: { id: it.id, checked: !it.checked } });
    setData(res);
  };
  const addManual = async () => {
    if (!manual.trim()) return;
    const res = await api<{ items: ShoppingItemDto[] }>("/api/shopping", { method: "POST", json: { name: manual.trim() } });
    setData(res);
    setManual("");
  };
  const clearDone = async () => {
    const res = await api<{ items: ShoppingItemDto[] }>("/api/shopping?checked=1", { method: "DELETE" });
    setData(res);
  };
  const removeItem = async (id: number) => {
    const res = await api<{ items: ShoppingItemDto[] }>(`/api/shopping?id=${id}`, { method: "DELETE" });
    setData(res);
  };
  const addBoughtToPantry = async () => {
    const ids = done.filter((d) => d.ingredientId).map((d) => ({ ingredientId: d.ingredientId!, amount: d.amount, unit: d.unit }));
    if (!ids.length) return toast("موردی برای انتقال نیست");
    setBusy(true);
    await api("/api/pantry", { method: "POST", json: { items: ids } });
    await clearDone();
    setBusy(false);
    toast(`${toFa(ids.length)} قلم به یخچالت اضافه شد`);
  };
  const exportTo = async (p: StoreProvider) => {
    const res = await api<{ ok: boolean; text?: string; message?: string }>("/api/stores", { method: "POST", json: { providerId: p.id } });
    if (res.ok && res.text) {
      try {
        await navigator.clipboard.writeText(res.text);
        toast("لیست کپی شد");
      } catch {
        toast("کپی ناموفق بود");
      }
    } else toast(res.message ?? "به‌زودی");
    setStoreSheet(false);
  };

  return (
    <main className="pb-32">
      <PageHeader
        title="لیست خرید"
        subtitle={open.length ? `${toFa(open.length)} قلم مانده` : "چیزی برای خرید نداری"}
        action={
          items.length ? (
            <button onClick={() => setStoreSheet(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-bold text-white press">
              <Icon name="store" className="h-4 w-4" /> سفارش
            </button>
          ) : undefined
        }
      />

      <section className="px-4 pt-3">
        <form onSubmit={(e) => { e.preventDefault(); addManual(); }} className="flex h-12 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-brand-400">
          <Icon name="plus" className="h-5 w-5 text-stone-400" />
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="افزودن دستی… مثلاً نان، دستمال" className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-stone-400" />
          {manual && <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white">افزودن</button>}
        </form>
      </section>

      {loading && !data && <div className="mt-4 space-y-2 px-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}

      {data && items.length === 0 && (
        <EmptyState
          emoji="🛒"
          title="لیست خریدت خالیه"
          text="از صفحه هر غذا، موادی که نداری رو با یک دکمه به اینجا اضافه کن."
          action={<Button href="/recipes" variant="secondary" size="md">دیدن غذاها</Button>}
        />
      )}

      {groups.map(([title, list]) => (
        <section key={title} className="mt-5">
          <h2 className="mb-2 px-4 text-sm font-extrabold text-stone-700">🍽️ برای {title}</h2>
          <div className="card stagger mx-4 divide-y divide-stone-100">
            {list.map((it) => <Row key={it.id} it={it} onToggle={() => toggle(it)} onRemove={() => removeItem(it.id)} />)}
          </div>
        </section>
      ))}

      {done.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between px-4">
            <h2 className="text-sm font-extrabold text-stone-500">خریده شد ({toFa(done.length)})</h2>
            <button onClick={clearDone} className="text-xs font-semibold text-stone-500">پاک کردن</button>
          </div>
          <div className="card mx-4 divide-y divide-stone-100 opacity-70">
            {done.map((it) => <Row key={it.id} it={it} onToggle={() => toggle(it)} onRemove={() => removeItem(it.id)} />)}
          </div>
          <div className="mx-4 mt-3">
            <Button variant="green" size="md" className="w-full" disabled={busy} onClick={addBoughtToPantry}>
              <Icon name="fridge" className="h-4 w-4" /> خریده‌شده‌ها رو به یخچالم اضافه کن
            </Button>
          </div>
        </section>
      )}

      <Sheet open={storeSheet} onClose={() => setStoreSheet(false)} title="سفارش آنلاین مواد">
        <p className="mb-3 text-sm text-stone-500">{toFa(open.length)} قلم به سبد فروشگاه منتقل می‌شود.</p>
        <div className="space-y-2">
          {stores?.providers.map((p) => (
            <button key={p.id} onClick={() => exportTo(p)} className="card flex w-full items-center gap-3 p-3.5 text-right press">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${p.color}18` }}>{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{p.name}</p>
                <p className="text-xs text-stone-500">{p.description}</p>
              </div>
              {p.enabled ? <Icon name="copy" className="h-5 w-5 text-stone-400" /> : <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">به‌زودی</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

function Row({ it, onToggle, onRemove }: { it: ShoppingItemDto; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <button onClick={onToggle} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 press ${it.checked ? "bg-sage-500 text-white ring-sage-500" : "ring-stone-300"}`} aria-label="خریده شد">
        {it.checked && <Icon name="check" className="h-4 w-4" />}
      </button>
      <button onClick={onToggle} className="min-w-0 flex-1 py-1 text-right">
        <p className={`text-sm font-bold ${it.checked ? "text-stone-400 line-through" : ""}`}>{it.name}</p>
        {it.amount != null && <p className="text-[11px] text-stone-500 tabular">{toFa(formatAmount(it.amount))} {it.unit}</p>}
      </button>
      <button onClick={onRemove} className="p-2 text-stone-300 hover:text-red-500" aria-label="حذف">
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  );
}
