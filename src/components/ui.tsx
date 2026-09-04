"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-cream/90 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 press"
            aria-label="بازگشت"
          >
            <Icon name="back" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Chip({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "default" | "green";
}) {
  const base = "inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium press";
  const cls = active
    ? tone === "green"
      ? "border-sage-500 bg-sage-500 text-white"
      : "border-brand-600 bg-brand-600 text-white"
    : "border-stone-200 bg-white text-stone-700";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "lg",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "green";
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const sizes = { lg: "h-13 px-5 text-base rounded-2xl", md: "h-11 px-4 text-sm rounded-xl", sm: "h-9 px-3 text-sm rounded-lg" };
  const variants = {
    primary: "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700",
    secondary: "bg-white text-ink ring-1 ring-stone-200 hover:bg-stone-50",
    ghost: "bg-transparent text-stone-700 hover:bg-stone-100",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
    green: "bg-sage-500 text-white shadow-sm shadow-sage-500/25",
  };
  const cls = `inline-flex items-center justify-center gap-2 font-bold press disabled:opacity-50 disabled:pointer-events-none ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full max-w-lg rounded-t-3xl bg-white shadow-2xl slide-up ${tall ? "h-[88dvh]" : "max-h-[85dvh]"} flex flex-col`}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-stone-300" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 press" aria-label="بستن">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 safe-bottom">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card mx-4 my-6 flex flex-col items-center px-6 py-10 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
      {text && <p className="mt-1 text-sm leading-6 text-stone-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/70 ${className}`} />;
}

export function SectionTitle({ title, href, hrefLabel = "همه" }: { title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h2 className="text-base font-extrabold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-brand-600">
          {hrefLabel} ←
        </Link>
      )}
    </div>
  );
}

export function useToast() {
  return (msg: string) => {
    const el = document.createElement("div");
    el.textContent = msg;
    el.className =
      "fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg fade-in";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  };
}
