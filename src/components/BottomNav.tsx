"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/", label: "خانه", icon: "home" as const },
  { href: "/recipes", label: "غذاها", icon: "book" as const },
  { href: "/pantry", label: "یخچال", icon: "fridge" as const },
  { href: "/shopping", label: "خرید", icon: "cart" as const },
  { href: "/saved", label: "ذخیره‌ها", icon: "heart" as const },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/cook/")) return null;
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg px-3 pb-3 safe-bottom">
      <ul className="pointer-events-auto grid grid-cols-5 rounded-[1.5rem] border border-stone-200/80 bg-white/95 p-1 shadow-[0_8px_28px_-14px_rgba(24,39,29,0.32)] backdrop-blur-xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`relative flex h-13 flex-col items-center justify-center gap-0.5 rounded-3xl text-[11px] transition-colors duration-200 press ${
                  active ? "font-bold text-brand-700" : "font-medium text-stone-500"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-[1.1rem] bg-brand-50 ring-1 ring-brand-100 transition-all duration-300 ${
                    active ? "scale-100 opacity-100" : "scale-75 opacity-0"
                  }`}
                />
                <Icon
                  name={t.icon}
                  className={`relative h-6 w-6 transition-transform duration-300 ${active ? "-translate-y-0.5 stroke-[2.2]" : ""}`}
                />
                <span className="relative leading-none">{t.label}</span>
                <span
                  className={`absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand-600 transition-all duration-300 ${
                    active ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
