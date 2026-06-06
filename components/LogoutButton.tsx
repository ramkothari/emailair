"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/" })}
      className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700"
    >
      Sign Out
    </button>
  );
}
