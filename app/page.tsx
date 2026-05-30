import { LoginButton } from "@/components/LoginButton";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Gmail Hygiene
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          Connect your Gmail account to start cleaning up your inbox.
        </p>

        <div className="mt-8 flex justify-center">
          <LoginButton />
        </div>
      </section>
    </main>
  );
}
