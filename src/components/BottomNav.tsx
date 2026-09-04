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
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-stone-200 bg-white/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium press ${
                  active ? "text-brand-600" : "text-stone-500"
                }`}
              >
                <Icon name={t.icon} className={`h-6 w-6 ${active ? "stroke-[2.2]" : ""}`} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
