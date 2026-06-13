import { Suspense } from "react";
import { AutomationForm } from "./automation-form";

export default function NewAutomationPage() {
  return (
    <Suspense>
      <AutomationForm />
    </Suspense>
  );
}
