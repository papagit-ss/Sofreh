"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/use-api";
import type { Substitution, TroubleshootTip } from "@/data/help";
import { toFa } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PageHeader, Sheet, Skeleton } from "@/components/ui";

export default function HelpPage() {
  const [q, setQ] = useState("");
  const { data, loading } = useApi<{ troubleshoot: TroubleshootTip[]; substitutions: Substitution[] }>(`/api/help${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const [tab, setTab] = useState<"trouble" | "subs">("trouble");
  const [item, setItem] = useState<TroubleshootTip | null>(null);
  useEffect(() => {
    if (window.location.hash === "#subs") setTab("subs");
  }, []);

  return (
    <main className="pb-24">
      <PageHeader title="کمک فوری" subtitle="مشکل حین آشپزی یا جایگزین مواد" back="/" />

      <div className="mx-4 mt-4 grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
        <button onClick={() => setTab("trouble")} className={`h-11 rounded-xl text-sm font-bold press ${tab === "trouble" ? "bg-white shadow-sm" : "text-stone-500"}`}>🚨 مشکلی پیش اومده</button>
        <button onClick={() => setTab("subs")} className={`h-11 rounded-xl text-sm font-bold press ${tab === "subs" ? "bg-white shadow-sm" : "text-stone-500"}`}>🔄 جایگزین مواد</button>
      </div>

      {loading && !data && <div className="mt-4 space-y-2 px-4"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}

      {tab === "trouble" && data && (
        <section className="mt-4 grid grid-cols-2 gap-2 px-4">
          {data.troubleshoot.map((t) => (
            <button key={t.key} onClick={() => setItem(t)} className="card flex flex-col items-start gap-1.5 p-4 text-right press">
              <span className="text-3xl">{t.emoji}</span>
              <span className="text-sm font-extrabold leading-5">{t.title}</span>
            </button>
          ))}
        </section>
      )}

      {tab === "subs" && (
        <section className="mt-4 px-4" id="subs">
          <label className="flex h-12 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-brand-400">
            <Icon name="search" className="h-5 w-5 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="چی نداری؟ مثلاً لیمو عمانی" className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-stone-400" />
          </label>
          <div className="mt-3 space-y-2">
            {data?.substitutions.map((s) => (
              <div key={s.ingredientSlug} className="card p-4">
                <p className="text-sm font-extrabold">{s.ingredientName} نداری؟</p>
                <ul className="mt-2 space-y-2.5">
                  {s.options.map((o) => (
                    <li key={o.name} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${o.impact === "low" ? "bg-sage-500" : o.impact === "medium" ? "bg-amber-500" : "bg-red-500"}`} />
                      <div className="text-sm leading-6">
                        <span className="font-bold">{o.name}</span> <span className="text-stone-500">— {o.ratio}</span>
                        <span className="mr-1 text-[11px] text-stone-400">({o.impact === "low" ? "نتیجه تقریباً یکسان" : o.impact === "medium" ? "کمی فرق می‌کند" : "طعم متفاوت می‌شود"})</span>
                        {o.note && <p className="text-xs text-stone-500">{o.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {data && data.substitutions.length === 0 && <p className="py-6 text-center text-sm text-stone-500">برای این ماده هنوز جایگزینی ثبت نشده.</p>}
          </div>
        </section>
      )}

      <Sheet open={!!item} onClose={() => setItem(null)} title={item?.title}>
        {item && (
          <div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-bold text-brand-700">راه‌حل سریع</p>
              <p className="mt-1 text-base font-bold leading-7">{item.quickFix}</p>
            </div>
            <ol className="mt-4 space-y-3">
              {item.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-6">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-black tabular">{toFa(i + 1)}</span>
                  {s}
                </li>
              ))}
            </ol>
            {item.prevention && (
              <div className="mt-4 rounded-2xl bg-stone-50 p-3.5 text-sm leading-6 text-stone-600">
                <span className="font-bold">دفعه بعد: </span>{item.prevention}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </main>
  );
}
