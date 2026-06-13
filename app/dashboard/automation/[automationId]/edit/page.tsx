import { notFound } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { requireSessionUserId } from "@/lib/commits/session";
import { getAutomationById } from "@/lib/automations/run-automation";
import { AutomationForm } from "../../new/automation-form";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const session = await auth();
  const userId = requireSessionUserId(session);
  const { automationId } = await params;
  const automation = await getAutomationById({ automationId, userId });

  if (!automation) {
    notFound();
  }

  return (
    <Suspense>
      <AutomationForm automation={automation} />
    </Suspense>
  );
}
