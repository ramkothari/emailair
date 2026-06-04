import Link from "next/link";
import { signOut } from "@/lib/auth";

type DashboardShellProps = {
  email?: string | null;
  children: React.ReactNode;
};

const navigationItems = [
  {
    href: "/dashboard/inbox",
    label: "Inbox",
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
  },
  {
    href: "/dashboard/automation",
    label: "Automation",
  },
];

export function DashboardShell({ email, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gmail Hygiene
            </h1>
            <p className="mt-1 text-sm text-gray-600">{email}</p>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({
                redirectTo: "/",
              });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </form>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-2 px-4 pb-4">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
