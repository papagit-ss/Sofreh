"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import type { RecipeDetail, PantryItemDto } from "@/lib/types";
import { toFa } from "@/lib/types";
import { formatAmount } from "@/lib/stores";
import type { TroubleshootTip } from "@/data/help";
import { Icon } from "@/components/Icon";
import { Button, Sheet, Skeleton, useToast } from "@/components/ui";

type TimerState = { endAt: number | null; remaining: number; total: number; done: boolean };

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${toFa(String(m).padStart(2, "0"))}:${toFa(String(r).padStart(2, "0"))}`;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5, 0.9, 1.15, 1.4].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
  } catch {}
  try {
    navigator.vibrate?.([300, 150, 300, 150, 600]);
  } catch {}
}

export default function CookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data: recipe } = useApi<RecipeDetail>(`/api/recipes/${slug}`);
  const [session, setSession] = useState<{ id: number; currentStep: number; servings: number } | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [step, setStep] = useState(1);
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [sheet, setSheet] = useState<null | "help" | "ingredients" | "done">(null);
  const [helpItem, setHelpItem] = useState<TroubleshootTip | null>(null);
  const [finished, setFinished] = useState(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // bootstrap session + scaled detail
  useEffect(() => {
    if (!recipe) return;
    (async () => {
      const res = await api<{ session: { id: number; currentStep: number; servings: number } }>("/api/sessions", {
        method: "POST",
        json: { recipeId: recipe.id, servings: recipe.activeSession?.servings ?? recipe.baseServings },
      });
      setSession(res.session);
      setStep(Math.min(Math.max(1, res.session.currentStep), recipe.steps.length));
      const d = await api<RecipeDetail>(`/api/recipes/${slug}?servings=${res.session.servings}`);
      setDetail(d);
    })();
  }, [recipe, slug]);

  // keep screen awake
  useEffect(() => {
    const request = async () => {
      try {
        if ("wakeLock" in navigator) wakeLock.current = await navigator.wakeLock.request("screen");
      } catch {}
    };
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeLock.current?.release().catch(() => {});
    };
  }, []);

  // persist step
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => api("/api/sessions", { method: "PATCH", json: { id: session.id, currentStep: step } }).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [step, session]);

  // tick timers
  useEffect(() => {
    const id = setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          const t = next[Number(k)];
          if (t.endAt && !t.done) {
            const remaining = (t.endAt - Date.now()) / 1000;
            if (remaining <= 0) {
              next[Number(k)] = { ...t, remaining: 0, done: true, endAt: null };
              beep();
              toast(`⏰ تایمر مرحله ${toFa(k)} تمام شد`);
            } else next[Number(k)] = { ...t, remaining };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = detail?.steps.length ?? recipe?.steps.length ?? 0;
  const current = detail?.steps[step - 1] ?? recipe?.steps[step - 1];
  const timer = current?.timerSeconds ? timers[step] ?? { endAt: null, remaining: current.timerSeconds, total: current.timerSeconds, done: false } : null;

  const startTimer = useCallback(() => {
    if (!current?.timerSeconds) return;
    setTimers((p) => {
      const t = p[step] ?? { endAt: null, remaining: current.timerSeconds!, total: current.timerSeconds!, done: false };
      return { ...p, [step]: { ...t, endAt: Date.now() + t.remaining * 1000, done: false } };
    });
  }, [current, step]);
  const pauseTimer = () => setTimers((p) => ({ ...p, [step]: { ...p[step], endAt: null } }));
  const resetTimer = () => current?.timerSeconds && setTimers((p) => ({ ...p, [step]: { endAt: null, remaining: current.timerSeconds!, total: current.timerSeconds!, done: false } }));
  const addMinute = () =>
    setTimers((p) => {
      const t = p[step];
      if (!t) return p;
      const remaining = t.remaining + 60;
      return { ...p, [step]: { ...t, remaining, total: t.total + 60, done: false, endAt: t.endAt ? t.endAt + 60000 : null } };
    });

  const otherRunning = useMemo(
    () => Object.entries(timers).filter(([k, t]) => Number(k) !== step && t.endAt && !t.done).map(([k, t]) => ({ step: Number(k), remaining: t.remaining })),
    [timers, step]
  );

  const goNext = async () => {
    if (step < total) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      if (session) await api("/api/sessions", { method: "PATCH", json: { id: session.id, status: "completed" } }).catch(() => {});
      setFinished(true);
    }
  };

  if (!recipe || !current) {
    return (
      <main className="min-h-dvh p-4">
        <Skeleton className="h-10" />
        <Skeleton className="mt-6 h-60" />
      </main>
    );
  }

  if (finished) return <FinishedScreen recipe={detail ?? recipe} onRestart={() => { setStep(1); setFinished(false); setTimers({}); }} />;

  const progress = Math.round(((step - 1) / total) * 100);
  const r = detail ?? recipe;

  return (
    <main className="flex min-h-dvh flex-col bg-white">
      {/* top bar */}
      <header className="sticky top-0 z-20 bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/recipes/${slug}`)} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 press" aria-label="خروج">
            <Icon name="x" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-extrabold">{r.emoji} {r.title}</p>
            <p className="text-[11px] text-stone-500">{toFa(r.servings ?? r.baseServings)} نفر</p>
          </div>
          <button onClick={() => setSheet("ingredients")} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 press" aria-label="مواد لازم">
            <Icon name="list" />
          </button>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="shine h-full rounded-full bg-gradient-to-l from-brand-600 via-brand-500 to-amber-500 transition-all duration-500"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </header>

      {/* other timers */}
      {otherRunning.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-2 no-scrollbar">
          {otherRunning.map((t) => (
            <button key={t.step} onClick={() => setStep(t.step)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 press">
              <Icon name="clock" className="h-3.5 w-3.5" /> مرحله {toFa(t.step)} · {fmt(t.remaining)}
            </button>
          ))}
        </div>
      )}

      {/* step content */}
      <section key={step} className="flex flex-1 flex-col px-5 pt-6 step-in">
        <p className="text-sm font-bold text-brand-600">
          مرحله {toFa(step)} از {toFa(total)}
        </p>
        <p className="mt-3 text-[26px] font-black leading-[1.6] text-ink">{current.instruction}</p>
        {current.tip && (
          <div className="mt-5 flex gap-2 rounded-2xl bg-amber-50 p-3.5 text-sm leading-6 text-amber-900">
            <span className="shrink-0">💡</span>
            <p>{current.tip}</p>
          </div>
        )}

        {timer && (
          <div className={`mt-6 rounded-3xl p-5 text-center ring-1 ${timer.done ? "bg-sage-50 ring-sage-500/40" : `bg-stone-50 ring-stone-200 ${timer.endAt ? "timer-glow" : ""}`}`}>
            {timer.done ? (
              <>
                <p className="text-4xl wiggle">✅</p>
                <p className="mt-2 text-lg font-black text-sage-600">زمان تمام شد — این مرحله انجام شد</p>
                <button onClick={resetTimer} className="mt-2 text-sm font-semibold text-stone-500">تنظیم دوباره</button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-stone-500">تایمر این مرحله</p>
                <div className="relative mx-auto mt-3 h-44 w-44">
                  {timer.endAt && (
                    <span className="steam absolute left-1/2 top-1 z-10 -translate-x-1/2" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="9" className="stroke-stone-200" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      strokeWidth="9"
                      strokeLinecap="round"
                      stroke="url(#timerGrad)"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (timer.remaining / timer.total)}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f24e0f" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[42px] font-black leading-none tabular tracking-tight">{fmt(timer.remaining)}</span>
                    <span className="mt-1.5 text-[11px] font-semibold text-stone-400">
                      از {timer.total >= 60 ? `${toFa(Math.round(timer.total / 60))} دقیقه` : `${toFa(timer.total)} ثانیه`}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {timer.endAt ? (
                    <Button onClick={pauseTimer} variant="secondary" className="min-w-36">
                      <Icon name="pause" className="h-5 w-5" /> توقف
                    </Button>
                  ) : (
                    <Button onClick={startTimer} className="min-w-44">
                      <Icon name="play" className="h-5 w-5" /> {timer.remaining === timer.total ? `شروع تایمر ${timer.total >= 60 ? toFa(Math.round(timer.total / 60)) + " دقیقه" : toFa(timer.total) + " ثانیه"}` : "ادامه"}
                    </Button>
                  )}
                  <button onClick={addMinute} className="flex h-13 items-center justify-center rounded-2xl bg-white px-3 text-sm font-bold ring-1 ring-stone-200 press">+۱ دقیقه</button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        <button onClick={() => setSheet("help")} className="mx-auto mb-3 mt-6 flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700 press">
          <Icon name="help" className="h-4 w-4" /> مشکلی پیش اومده؟ کمک بگیر
        </button>
      </section>

      {/* controls */}
      <footer className="sticky bottom-0 z-20 border-t border-stone-100 bg-white px-4 pb-4 pt-3 safe-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex h-16 w-20 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 press disabled:opacity-40"
            aria-label="مرحله قبل"
          >
            <Icon name="back" className="h-6 w-6" />
          </button>
          <button onClick={goNext} className="shine flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 text-lg font-black text-white shadow-lg shadow-brand-600/30 press">
            {step === total ? (
              <>تمام شد 🎉</>
            ) : (
              <>
                انجام شد، بعدی <Icon name="forward" className="h-6 w-6" />
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Ingredients sheet */}
      <Sheet open={sheet === "ingredients"} onClose={() => setSheet(null)} title={`مواد لازم — ${toFa(r.servings ?? r.baseServings)} نفر`}>
        <ul className="divide-y divide-stone-100">
          {r.ingredients.map((i) => (
            <li key={i.ingredientId} className="flex items-center justify-between py-3 text-sm">
              <span className={i.status === "missing" ? "font-bold text-red-600" : "font-semibold"}>
                {i.name} {i.note && <span className="text-xs font-normal text-stone-400">({i.note})</span>}
              </span>
              <span className="tabular text-stone-600">{toFa(formatAmount(i.amount))} {i.unit}</span>
            </li>
          ))}
        </ul>
      </Sheet>

      {/* Help sheet */}
      <HelpSheet open={sheet === "help"} onClose={() => { setSheet(null); setHelpItem(null); }} item={helpItem} setItem={setHelpItem} />
    </main>
  );
}

function HelpSheet({ open, onClose, item, setItem }: { open: boolean; onClose: () => void; item: TroubleshootTip | null; setItem: (t: TroubleshootTip | null) => void }) {
  const { data } = useApi<{ troubleshoot: TroubleshootTip[] }>(open ? "/api/help" : null);
  return (
    <Sheet open={open} onClose={onClose} title={item ? item.title : "چه مشکلی پیش اومده؟"} tall>
      {!item ? (
        <div className="grid grid-cols-2 gap-2">
          {data?.troubleshoot.map((t) => (
            <button key={t.key} onClick={() => setItem(t)} className="card flex flex-col items-start gap-1 p-3.5 text-right press">
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-sm font-extrabold">{t.title}</span>
            </button>
          ))}
          <Link href="/help#subs" className="card col-span-2 flex items-center gap-3 p-3.5 press">
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-extrabold">جایگزین مواد رو ببین</span>
          </Link>
        </div>
      ) : (
        <div className="fade-in">
          <button onClick={() => setItem(null)} className="mb-3 text-sm font-semibold text-brand-600">← همه مشکلات</button>
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
  );
}

const CONFETTI_COLORS = ["#e2531d", "#f59e0b", "#1b8a5a", "#ff9e70", "#15704a", "#ffc6a8"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        right: `${(i * 37 + 13) % 100}%`,
        width: 6 + ((i * 7) % 6),
        height: 8 + ((i * 11) % 8),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(i % 12) * 0.14}s`,
        duration: `${2.6 + (i % 5) * 0.45}s`,
        sway: `${((i * 53) % 120) - 60}px`,
        spin: `${360 + ((i * 97) % 420)}deg`,
        round: i % 4 === 0,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              right: p.right,
              width: p.width,
              height: p.height,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              borderRadius: p.round ? "50%" : "2px",
              "--sway": p.sway,
              "--spin": p.spin,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function FinishedScreen({ recipe, onRestart }: { recipe: RecipeDetail; onRestart: () => void }) {
  const toast = useToast();
  const { data: pantry } = useApi<{ items: PantryItemDto[] }>("/api/pantry");
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const used = useMemo(() => {
    const ids = new Set(recipe.ingredients.filter((i) => i.status === "have").map((i) => i.ingredientId));
    return (pantry?.items ?? []).filter((p) => ids.has(p.ingredientId));
  }, [pantry, recipe]);

  const removeItem = async (p: PantryItemDto) => {
    await api(`/api/pantry?id=${p.id}`, { method: "DELETE" });
    setRemoved((s) => new Set(s).add(p.id));
    toast(`${p.name} از یخچال حذف شد`);
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-sage-50 to-white px-5 pb-8 pt-16 text-center fade-in">
      <Confetti />
      <div className="text-7xl anim-pop">🎉</div>
      <h1 className="mt-4 text-2xl font-black anim-fade-up">نوش جان!</h1>
      <p className="mt-1 text-stone-600">{recipe.title} آماده شد.</p>

      {used.length > 0 && (
        <div className="card mt-8 p-4 text-right">
          <p className="text-sm font-extrabold">چیزی از یخچالت تموم شد؟</p>
          <p className="mt-0.5 text-xs text-stone-500">روی موادی که دیگه نداری بزن تا از یخچالت حذف بشن.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {used.map((p) => (
              <button
                key={p.id}
                onClick={() => !removed.has(p.id) && removeItem(p)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold press ${removed.has(p.id) ? "bg-stone-100 text-stone-400 line-through" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />
      <div className="mt-8 space-y-2">
        <Button href="/" className="w-full">برگشت به خانه</Button>
        <Button variant="secondary" className="w-full" onClick={onRestart}>
          <Icon name="refresh" className="h-5 w-5" /> دوباره بپز
        </Button>
        <Button variant="ghost" href={`/recipes/${recipe.slug}`} className="w-full">
          مشاهده دستور
        </Button>
      </div>
    </main>
  );
}
