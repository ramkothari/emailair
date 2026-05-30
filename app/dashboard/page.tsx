import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>

        <p className="mt-4 text-sm text-gray-600">
          You are signed in as:
        </p>

        <p className="mt-2 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-200">
          {session?.user?.email}
        </p>
      </div>
    </main>
  );
}
