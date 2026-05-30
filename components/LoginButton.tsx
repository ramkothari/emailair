import { signIn } from "@/lib/auth";

export function LoginButton() {
  return (
    <form
      action={async () => {
        "use server";

        await signIn("google", {
          redirectTo: "/dashboard"
        });
      }}
    >
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Connect Gmail
      </button>
    </form>
  );
}
