import { signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardNav } from "./DashboardNav";

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
  {
    href: "/dashboard/commits",
    label: "Commits",
  },
];

export function DashboardShell({ email, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#EAEAEA] dark:bg-[#18181B]">
      <header>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-5 pt-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-[#F5F5F5]">
              Gmail Hygiene
            </h1>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-[#A1A1AA]">
              {email}
            </p>
          </div>

          <div className="flex justify-start md:justify-center">
            <DashboardNav items={navigationItems} />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <ThemeToggle />

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
                className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 pb-8 pt-10">
        {children}
      </main>
    </div>
  );
}
