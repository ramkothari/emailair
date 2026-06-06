import { signIn } from "@/lib/auth";

export function LoginButton() {
  return (
    <form
      action={async () => {
        "use server";

        await signIn("google", {
          redirectTo: "/dashboard/inbox"
        });
      }}
    >
      <button
        type="submit"
        className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Connect Gmail
      </button>
    </form>
  );
}
