"use client";

import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { DIFFICULTY_LABELS, formatMinutes, toFa } from "@/lib/types";
import { Icon } from "./Icon";

export function MatchPill({ percent, missingCount, compact }: { percent: number; missingCount: number; compact?: boolean }) {
  const tone =
    percent === 100 ? "bg-sage-100 text-sage-600" : percent >= 70 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular ${tone}`}>
      {percent === 100 ? (
        <>
          <Icon name="check" className="h-3 w-3" /> {compact ? "همه رو داری" : "بدون خرید"}
        </>
      ) : (
        <>
          {toFa(percent)}٪ {compact ? "" : `· ${toFa(missingCount)} قلم خرید`}
        </>
      )}
    </span>
  );
}

export function MatchBar({ percent }: { percent: number }) {
  const color =
    percent === 100
      ? "bg-gradient-to-l from-sage-500 to-emerald-400"
      : percent >= 70
        ? "bg-gradient-to-l from-amber-500 to-amber-400"
        : "bg-stone-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full match-grow ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function RecipeCard({ r, showMatch = true }: { r: RecipeSummary; showMatch?: boolean }) {
  return (
    <Link href={`/recipes/${r.slug}`} className="card card-lift flex gap-3 p-3 press">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-brand-100 to-amber-100 text-3xl">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.75),transparent_55%)]" />
        <span className="relative drop-shadow-sm">{r.emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-extrabold">{r.title}</h3>
          {r.isFavorite && <Icon name="heartFill" className="h-4 w-4 shrink-0 text-brand-600" />}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{r.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-3.5 w-3.5" /> {formatMinutes(r.totalMinutes)}
          </span>
          <span>{DIFFICULTY_LABELS[r.difficulty]}</span>
          <span>{["", "ارزان", "متوسط", "گران"][r.costLevel]}</span>
          {r.match.useSoonHits > 0 && <span className="text-amber-700">⚡ مصرف زودتر</span>}
        </div>
        {showMatch && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <MatchBar percent={r.match.percent} />
            </div>
            <MatchPill percent={r.match.percent} missingCount={r.match.missingCount} />
          </div>
        )}
      </div>
    </Link>
  );
}

export function RecipeTile({ r }: { r: RecipeSummary }) {
  return (
    <Link href={`/recipes/${r.slug}`} className="card card-lift flex w-40 shrink-0 flex-col p-3 press">
      <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 via-brand-100 to-amber-100 text-4xl">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.75),transparent_55%)]" />
        <span className="relative drop-shadow-sm">{r.emoji}</span>
      </div>
      <h3 className="mt-2 truncate text-sm font-extrabold">{r.title}</h3>
      <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
        <span>{formatMinutes(r.totalMinutes)}</span>
        <MatchPill percent={r.match.percent} missingCount={r.match.missingCount} compact />
      </div>
    </Link>
  );
}
