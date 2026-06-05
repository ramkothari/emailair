"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavItem = {
  href: string;
  label: string;
};

type DashboardNavProps = {
  items: DashboardNavItem[];
};

export function DashboardNav({ items }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition ${
              isActive
                ? "border-[rgba(0,0,0,0.08)] bg-[#18181B] text-white shadow-sm dark:border-[#3F3F46] dark:bg-[#F5F5F5] dark:text-[#18181B]"
                : "border-transparent text-gray-600 hover:border-[rgba(0,0,0,0.08)] hover:bg-[#F3F3F3] hover:text-gray-900 dark:text-[#A1A1AA] dark:hover:border-[#3F3F46] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
