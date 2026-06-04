import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <DashboardShell email={session.user.email}>
      {children}
    </DashboardShell>
  );
}
